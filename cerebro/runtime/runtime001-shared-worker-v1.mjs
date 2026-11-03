const ALLOWED_ENVIRONMENTS = new Set(['LAB', 'PREPROD']);
const FORBIDDEN_ENGINE = /(?:LAB-TRD|TRADING)/i;

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function freezeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context required');
  const context = Object.freeze({
    company_id: requiredString(value.company_id, 'context.company_id'),
    engine_id: requiredString(value.engine_id, 'context.engine_id'),
    environment: requiredString(value.environment, 'context.environment'),
    version: requiredString(value.version, 'context.version'),
  });
  if (!ALLOWED_ENVIRONMENTS.has(context.environment)) throw new Error('RUNTIME001_PROD_TARGET_NOT_AUTHORIZED');
  if (FORBIDDEN_ENGINE.test(context.engine_id)) throw new Error('RUNTIME001_TRADING_ISOLATION_DENIED');
  return context;
}

function assertAdapter(adapter, name, methods) {
  if (!adapter || typeof adapter !== 'object') throw new TypeError(`${name} required`);
  for (const method of methods) if (typeof adapter[method] !== 'function') throw new TypeError(`${name}.${method} required`);
}

function safeJob(job, context) {
  if (!job || typeof job !== 'object') throw new Error('RUNTIME001_JOB_REQUIRED');
  const normalized = Object.freeze({
    job_id: requiredString(job.job_id, 'job.job_id'),
    idempotency_key: requiredString(job.idempotency_key, 'job.idempotency_key'),
    company_id: requiredString(job.company_id, 'job.company_id'),
    engine_id: requiredString(job.engine_id, 'job.engine_id'),
    environment: requiredString(job.environment, 'job.environment'),
    version: requiredString(job.version, 'job.version'),
    attempt: Number.isSafeInteger(job.attempt) && job.attempt > 0 ? job.attempt : 1,
    payload: job.payload ?? null,
  });
  for (const key of ['company_id', 'engine_id', 'environment', 'version']) {
    if (normalized[key] !== context[key]) throw new Error(`RUNTIME001_JOB_CONTEXT_MISMATCH:${key}`);
  }
  return normalized;
}

export class Runtime001SharedWorkerV1 {
  #ledger;
  #engineResolver;
  #policy;
  #audit;
  #clock;

  constructor({ ledger, engine_resolver, policy, audit, clock = () => new Date().toISOString() }) {
    assertAdapter(ledger, 'ledger', ['leaseNext', 'heartbeat', 'succeed', 'fail', 'recoverExpired']);
    assertAdapter(engine_resolver, 'engine_resolver', ['resolve']);
    assertAdapter(policy, 'policy', ['authorize']);
    assertAdapter(audit, 'audit', ['append']);
    if (typeof clock !== 'function') throw new TypeError('clock required');
    this.#ledger = ledger;
    this.#engineResolver = engine_resolver;
    this.#policy = policy;
    this.#audit = audit;
    this.#clock = clock;
  }

  recover({ context, lease_timeout_ms = 60_000 }) {
    const ctx = freezeContext(context);
    if (!Number.isSafeInteger(lease_timeout_ms) || lease_timeout_ms < 1_000) throw new TypeError('lease_timeout_ms invalid');
    const result = this.#ledger.recoverExpired({ context: ctx, lease_timeout_ms, now: this.#clock() });
    this.#audit.append({ type: 'RUNTIME001_RECOVERY', context: ctx, result, at: this.#clock(), prod_write: false, trading_access: false });
    return Object.freeze({ recovered: Number(result?.recovered || 0), context: ctx, prod_authorized: false, trading_access: false });
  }

  async runOnce({ context, actor = { id: 'runtime001-worker' } }) {
    const ctx = freezeContext(context);
    const engine = await this.#engineResolver.resolve(ctx);
    if (!engine || typeof engine.execute !== 'function') throw new Error('RUNTIME001_ENGINE_EXECUTOR_NOT_RESOLVED');

    const decision = await this.#policy.authorize({ actor, context: ctx, action: 'ENGINE_JOB_EXECUTE' });
    if (decision?.allowed !== true) {
      this.#audit.append({ type: 'RUNTIME001_POLICY_DENIED', context: ctx, actor: actor?.id ?? null, at: this.#clock(), reason: decision?.reason ?? 'DENIED' });
      return Object.freeze({ status: 'POLICY_DENIED', prod_authorized: false, trading_access: false });
    }

    const leasedRaw = this.#ledger.leaseNext({ context: ctx, worker_id: actor?.id ?? 'runtime001-worker', now: this.#clock() });
    if (!leasedRaw) return Object.freeze({ status: 'IDLE', context: ctx, prod_authorized: false, trading_access: false });
    const job = safeJob(leasedRaw, ctx);
    this.#audit.append({ type: 'RUNTIME001_JOB_LEASED', context: ctx, job_id: job.job_id, idempotency_key: job.idempotency_key, attempt: job.attempt, at: this.#clock() });

    try {
      this.#ledger.heartbeat({ job_id: job.job_id, context: ctx, now: this.#clock() });
      const result = await engine.execute({ context: ctx, job_id: job.job_id, idempotency_key: job.idempotency_key, payload: job.payload });
      const completion = this.#ledger.succeed({ job_id: job.job_id, context: ctx, idempotency_key: job.idempotency_key, result, now: this.#clock() });
      this.#audit.append({ type: 'RUNTIME001_JOB_SUCCEEDED', context: ctx, job_id: job.job_id, idempotency_key: job.idempotency_key, deduplicated: Boolean(completion?.deduplicated), at: this.#clock() });
      return Object.freeze({ status: 'SUCCEEDED', job_id: job.job_id, idempotency_key: job.idempotency_key, deduplicated: Boolean(completion?.deduplicated), result, prod_authorized: false, trading_access: false });
    } catch (error) {
      const failure = this.#ledger.fail({ job_id: job.job_id, context: ctx, idempotency_key: job.idempotency_key, error: String(error?.message || error), now: this.#clock() });
      this.#audit.append({ type: 'RUNTIME001_JOB_FAILED', context: ctx, job_id: job.job_id, idempotency_key: job.idempotency_key, retryable: Boolean(failure?.retryable), at: this.#clock() });
      return Object.freeze({ status: failure?.retryable ? 'RETRY_WAIT' : 'FAILED', job_id: job.job_id, idempotency_key: job.idempotency_key, retryable: Boolean(failure?.retryable), prod_authorized: false, trading_access: false });
    }
  }
}

export const RUNTIME001_SHARED_WORKER_V1_CONTRACT = Object.freeze({
  capability: 'RUNTIME-001/SHARED-WORKER-V1',
  environments: Object.freeze(['LAB', 'PREPROD']),
  required_scope_keys: Object.freeze(['company_id', 'engine_id', 'environment', 'version']),
  reuses_existing_job_ledger: true,
  creates_second_queue: false,
  creates_second_scheduler: false,
  supports_idempotency_key: true,
  supports_lease_recovery: true,
  policy_before_execution: true,
  audit_every_transition: true,
  cross_company_default_deny: true,
  prod_target_exposed: false,
  prod_authorized: false,
  trading_access: false,
  additional_cost_eur: 0,
});
