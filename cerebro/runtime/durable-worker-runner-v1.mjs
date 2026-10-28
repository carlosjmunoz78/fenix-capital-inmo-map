const PREPROD = 'PREPROD';
const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be a safe integer between ${min} and ${max}`);
  return value;
}

function safeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const context = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id'),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id'),
    environment: nonEmpty(value.environment, 'context.environment'),
    version: nonEmpty(value.version, 'context.version')
  });
  if (context.environment !== PREPROD) throw new Error('durable worker runner V1 accepts exact PREPROD only');
  return context;
}

function runtimeContract(runtime) {
  const required = ['claim','heartbeat','checkpoint','complete','fail','cancel','get'];
  if (!runtime || typeof runtime !== 'object') throw new TypeError('job_runtime is required');
  for (const method of required) if (typeof runtime[method] !== 'function') throw new TypeError(`job_runtime.${method} is required`);
  return runtime;
}

function errorText(error) {
  if (error instanceof Error && error.message) return error.message;
  try { return String(error); } catch {}
  return '[unstringifiable error]';
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function abortError(reason = 'ABORTED') {
  const error = new Error(String(reason));
  error.name = 'AbortError';
  return error;
}

function activeLease(runtime, job_id, worker_id) {
  const current = runtime.get(job_id);
  return current && current.status === 'RUNNING' && current.worker_id === worker_id ? current : null;
}

export class DurableWorkerRunnerV1 {
  #runtime;
  #workerId;
  #leaseMs;
  #heartbeatMs;
  #maxConcurrency;
  #maxPerCompany;
  #handlers = new Map();
  #active = new Map();
  #companyActive = new Map();
  #fairCursor = 0;

  constructor({
    job_runtime,
    worker_id,
    environment = PREPROD,
    lease_ms = 60_000,
    heartbeat_ms = 15_000,
    max_concurrency = 4,
    max_per_company = 2
  }) {
    if (environment !== PREPROD) throw new Error('durable worker runner V1 accepts exact PREPROD only');
    this.#runtime = runtimeContract(job_runtime);
    this.#workerId = nonEmpty(worker_id, 'worker_id');
    this.#leaseMs = integer(lease_ms, 'lease_ms', { min: 1000, max: 86_400_000 });
    this.#heartbeatMs = integer(heartbeat_ms, 'heartbeat_ms', { min: 10, max: 86_400_000 });
    if (this.#heartbeatMs >= this.#leaseMs) throw new Error('heartbeat_ms must be lower than lease_ms');
    this.#maxConcurrency = integer(max_concurrency, 'max_concurrency', { min: 1, max: 1024 });
    this.#maxPerCompany = integer(max_per_company, 'max_per_company', { min: 1, max: this.#maxConcurrency });
  }

  register({ name, handler }) {
    const safeName = nonEmpty(name, 'name');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    this.#handlers.set(safeName, handler);
    return this;
  }

  unregister(name) { return this.#handlers.delete(nonEmpty(name, 'name')); }
  get active_count() { return this.#active.size; }
  get capacity() { return this.#maxConcurrency - this.#active.size; }

  snapshot() {
    return Object.freeze({
      worker_id: this.#workerId,
      environment: PREPROD,
      active_count: this.#active.size,
      max_concurrency: this.#maxConcurrency,
      max_per_company: this.#maxPerCompany,
      active_jobs: Object.freeze([...this.#active.keys()].sort())
    });
  }

  #begin(context) {
    if (this.#active.size >= this.#maxConcurrency) return { started: false, outcome: { status: 'SATURATED', reason: 'GLOBAL_CONCURRENCY_LIMIT' } };
    const companyCount = this.#companyActive.get(context.company_id) ?? 0;
    if (companyCount >= this.#maxPerCompany) {
      return { started: false, outcome: { status: 'SATURATED', reason: 'COMPANY_CONCURRENCY_LIMIT', company_id: context.company_id } };
    }

    const claimed = this.#runtime.claim({ context, worker_id: this.#workerId, now_ms: Date.now(), lease_ms: this.#leaseMs });
    if (!claimed) return { started: false, outcome: { status: 'IDLE', context } };

    const handler = this.#handlers.get(claimed.name);
    if (!handler) {
      const failed = this.#runtime.fail({ job_id: claimed.job_id, worker_id: this.#workerId, error: `HANDLER_NOT_REGISTERED:${claimed.name}`, now_ms: Date.now() });
      return { started: false, outcome: { status: 'DISPATCH_FAILED', reason: 'HANDLER_NOT_REGISTERED', job: failed } };
    }

    const controller = new AbortController();
    this.#active.set(claimed.job_id, { controller, context, started_at_ms: Date.now() });
    this.#companyActive.set(context.company_id, companyCount + 1);
    const promise = this.#execute({ job: claimed, handler, controller }).finally(() => {
      this.#active.delete(claimed.job_id);
      const remaining = (this.#companyActive.get(context.company_id) ?? 1) - 1;
      if (remaining <= 0) this.#companyActive.delete(context.company_id);
      else this.#companyActive.set(context.company_id, remaining);
    });
    return { started: true, job_id: claimed.job_id, promise };
  }

  async runOne({ context: rawContext }) {
    const context = safeContext(rawContext);
    const begun = this.#begin(context);
    return begun.started ? begun.promise : begun.outcome;
  }

  async #execute({ job, handler, controller }) {
    let heartbeatTimer = null;
    let timeoutTimer = null;
    let timedOut = false;
    let heartbeatFailure = null;

    const heartbeat = () => {
      if (controller.signal.aborted) return null;
      const current = activeLease(this.#runtime, job.job_id, this.#workerId);
      if (!current) throw new Error('WORKER_LEASE_LOST');
      return this.#runtime.heartbeat({ job_id: job.job_id, worker_id: this.#workerId, now_ms: Date.now(), lease_ms: this.#leaseMs });
    };

    const checkpoint = value => {
      if (controller.signal.aborted) throw abortError(controller.signal.reason ?? 'ABORTED');
      const current = activeLease(this.#runtime, job.job_id, this.#workerId);
      if (!current) throw new Error('WORKER_LEASE_LOST');
      return this.#runtime.checkpoint({ job_id: job.job_id, worker_id: this.#workerId, checkpoint: value, now_ms: Date.now() });
    };

    heartbeatTimer = setInterval(() => {
      try { heartbeat(); }
      catch (error) {
        heartbeatFailure = error;
        if (!controller.signal.aborted) controller.abort('HEARTBEAT_OR_LEASE_FAILURE');
      }
    }, this.#heartbeatMs);

    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        if (!controller.signal.aborted) controller.abort('JOB_TIMEOUT');
        reject(new Error('JOB_TIMEOUT'));
      }, job.timeout_ms);
    });

    const abortPromise = new Promise((_, reject) => {
      if (controller.signal.aborted) return reject(abortError(controller.signal.reason));
      controller.signal.addEventListener('abort', () => reject(abortError(controller.signal.reason)), { once: true });
    });

    const handlerPromise = Promise.resolve().then(() => handler({
      job,
      context: job.context,
      payload: job.payload,
      resume_from: job.checkpoint,
      signal: controller.signal,
      heartbeat,
      checkpoint
    }));
    handlerPromise.catch(() => {});

    try {
      const result = await Promise.race([handlerPromise, timeoutPromise, abortPromise]);
      const current = activeLease(this.#runtime, job.job_id, this.#workerId);
      if (!current) {
        const latest = this.#runtime.get(job.job_id);
        return { status: latest?.status === 'CANCELLED' ? 'CANCELLED' : 'LEASE_LOST', job: latest };
      }
      if (result?.status === 'HUMAN_REQUIRED') {
        if (!HUMAN_REQUIRED_REASONS.has(result.reason)) throw new Error(`INVALID_HUMAN_REQUIRED_REASON:${result.reason}`);
        const completed = this.#runtime.complete({ job_id: job.job_id, worker_id: this.#workerId, result, now_ms: Date.now() });
        return { status: 'HUMAN_REQUIRED', reason: result.reason, job: completed };
      }
      const completed = this.#runtime.complete({ job_id: job.job_id, worker_id: this.#workerId, result, now_ms: Date.now() });
      return { status: 'SUCCEEDED', job: completed };
    } catch (error) {
      const current = activeLease(this.#runtime, job.job_id, this.#workerId);
      if (!current) {
        const latest = this.#runtime.get(job.job_id);
        return { status: latest?.status === 'CANCELLED' ? 'CANCELLED' : 'LEASE_LOST', error: errorText(error), job: latest };
      }
      const reason = timedOut ? 'JOB_TIMEOUT' : heartbeatFailure ? `HEARTBEAT_FAILURE:${errorText(heartbeatFailure)}` : errorText(error);
      const failed = this.#runtime.fail({ job_id: job.job_id, worker_id: this.#workerId, error: reason, now_ms: Date.now() });
      return { status: failed.status === 'DEAD_LETTER' ? 'DEAD_LETTER' : 'RETRY_SCHEDULED', error: reason, job: failed };
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    }
  }

  cancel(job_id, reason = 'CANCELLED_BY_POLICY') {
    const id = nonEmpty(job_id, 'job_id');
    const active = this.#active.get(id);
    if (active && !active.controller.signal.aborted) active.controller.abort(reason);
    return this.#runtime.cancel({ job_id: id, reason, now_ms: Date.now() });
  }

  async runFairRound({ contexts }) {
    if (!Array.isArray(contexts) || contexts.length === 0) throw new TypeError('contexts must be a non-empty array');
    const normalized = contexts.map(safeContext);
    const capacity = Math.max(0, this.#maxConcurrency - this.#active.size);
    if (capacity === 0) return [];

    const rotated = normalized.map((_, index) => normalized[(this.#fairCursor + index) % normalized.length]);
    this.#fairCursor = (this.#fairCursor + 1) % normalized.length;
    const immediate = [];
    const running = [];
    for (const context of rotated) {
      if (running.length >= capacity) break;
      const begun = this.#begin(context);
      if (begun.started) running.push(begun.promise);
      else immediate.push(begun.outcome);
    }
    const completed = await Promise.all(running);
    return [...immediate, ...completed];
  }

  async runSaturatedRound({ contexts, completion_budget = null }) {
    if (!Array.isArray(contexts) || contexts.length === 0) throw new TypeError('contexts must be a non-empty array');
    const normalized = contexts.map(safeContext);
    const budget = completion_budget === null
      ? Math.max(normalized.length, normalized.length * 4)
      : integer(completion_budget, 'completion_budget', { min: 1, max: 1_000_000 });
    const running = new Set();
    const outcomes = [];
    let passiveOutcome = null;
    let scheduled = 0;
    let cursor = this.#fairCursor % normalized.length;

    const launch = context => {
      if (scheduled >= budget || this.#active.size >= this.#maxConcurrency) return 'BLOCKED';
      const begun = this.#begin(context);
      if (!begun.started) {
        if (begun.outcome?.status === 'IDLE' || begun.outcome?.status === 'SATURATED') {
          passiveOutcome ??= begun.outcome;
          return 'PASSIVE';
        }
        outcomes.push(begun.outcome);
        scheduled += 1;
        return 'CONSUMED';
      }
      scheduled += 1;
      let tracked;
      tracked = begun.promise.then(outcome => ({ outcome, tracked }));
      running.add(tracked);
      return 'STARTED';
    };

    const refill = () => {
      let started = 0;
      let consumed = 0;
      let noProgress = 0;
      while (
        scheduled < budget &&
        this.#active.size < this.#maxConcurrency &&
        noProgress < normalized.length
      ) {
        const context = normalized[cursor];
        cursor = (cursor + 1) % normalized.length;
        const state = launch(context);
        if (state === 'STARTED') {
          started += 1;
          noProgress = 0;
        } else if (state === 'CONSUMED') {
          consumed += 1;
          noProgress = 0;
        } else {
          noProgress += 1;
        }
      }
      return { started, consumed };
    };

    while (scheduled < budget) {
      const progress = refill();
      if (running.size === 0) {
        if (progress.consumed > 0) continue;
        break;
      }
      const settled = await Promise.race(running);
      running.delete(settled.tracked);
      outcomes.push(settled.outcome);
    }

    while (running.size > 0) {
      const settled = await Promise.race(running);
      running.delete(settled.tracked);
      outcomes.push(settled.outcome);
    }

    this.#fairCursor = cursor;
    if (outcomes.length === 0 && passiveOutcome) outcomes.push(passiveOutcome);
    return outcomes;
  }

  async drainFair({ contexts, max_rounds = 100, idle_delay_ms = 0 }) {
    integer(max_rounds, 'max_rounds', { min: 1, max: 100_000 });
    integer(idle_delay_ms, 'idle_delay_ms', { min: 0, max: 60_000 });
    const outcomes = [];
    for (let round = 0; round < max_rounds; round += 1) {
      const batch = await this.runFairRound({ contexts });
      outcomes.push(...batch);
      if (batch.length === 0 || batch.every(item => item.status === 'IDLE' || item.status === 'SATURATED')) break;
      if (idle_delay_ms > 0) await sleep(idle_delay_ms);
    }
    return outcomes;
  }
}

export const DURABLE_WORKER_RUNNER_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/worker-runner-v1',
  environment: PREPROD,
  executes_registered_handlers: true,
  bounded_concurrency: true,
  per_company_concurrency: true,
  fair_round_robin_contexts: true,
  scans_past_idle_contexts: true,
  continuous_slot_refill: true,
  batch_barrier_removed_in_saturated_mode: true,
  single_context_slot_fanout: true,
  immediate_dispatch_failures_surface: true,
  exact_saturated_round_budget: true,
  timeout_abort_signal: true,
  heartbeat_lease_extension: true,
  checkpoint_resume: true,
  stale_lease_fail_closed: true,
  human_required_reasons: Object.freeze([...HUMAN_REQUIRED_REASONS]),
  additional_cost_target_eur: 0,
  supabase_required: false,
  prod_writes: false,
  trading_access: false,
  distributed_execution_claim: false,
  persistence_owner: 'JOB-001 durable V1 / AtomicV8Journal single-writer reference',
  promotion: 'LAB->PREPROD->OLD_vs_NEW->tribunal->gradual_prod'
});