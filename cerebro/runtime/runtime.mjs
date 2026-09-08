import crypto from 'node:crypto';
import { serialize } from 'node:v8';

const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const MONEY_SCALE = 1_000_000;
const MONEY_MAX_TOLERATED_ULP_UNITS = 0.05;
const MONEY_NOISE_ULP_LIMIT_UNITS = 0.001;
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer')?.get;
const DATA_VIEW_BUFFER_GETTER = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')?.get;
const FLOAT64_BITS = new DataView(new ArrayBuffer(8));

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function safeContext(ctx) {
  if (!ctx || typeof ctx !== 'object') throw new TypeError('context must be an object');
  return Object.freeze({
    company_id: assertNonEmptyString(ctx.company_id, 'context.company_id'),
    engine_id: assertNonEmptyString(ctx.engine_id, 'context.engine_id'),
    environment: assertNonEmptyString(ctx.environment, 'context.environment'),
    version: assertNonEmptyString(ctx.version, 'context.version')
  });
}

function sameContext(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

function intrinsicViewBuffer(value) {
  const getter = value instanceof DataView ? DATA_VIEW_BUFFER_GETTER : TYPED_ARRAY_BUFFER_GETTER;
  if (typeof getter !== 'function') throw new TypeError('unsupported ArrayBuffer view');
  return getter.call(value);
}

function rejectUnsupported(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  if (typeof CryptoKey !== 'undefined' && value instanceof CryptoKey) throw new TypeError('CryptoKey is not supported by RUNTIME-001 V0');
  if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) throw new TypeError('SharedArrayBuffer is not supported');
  if (ArrayBuffer.isView(value)) {
    const ownBuffer = Object.getOwnPropertyDescriptor(value, 'buffer');
    if (ownBuffer?.get || ownBuffer?.set) throw new TypeError('accessor properties are not supported by RUNTIME-001 V0');
    const buffer = intrinsicViewBuffer(value);
    if (typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer) throw new TypeError('SharedArrayBuffer-backed views are not supported');
    return;
  }
  if (value instanceof ArrayBuffer) return;
  if (typeof Blob !== 'undefined' && value instanceof Blob) throw new TypeError('Blob is not supported by RUNTIME-001 V0');
  if (seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    Map.prototype.forEach.call(value, (v, k) => { rejectUnsupported(k, seen); rejectUnsupported(v, seen); });
    return;
  }
  if (value instanceof Set) {
    Set.prototype.forEach.call(value, v => rejectUnsupported(v, seen));
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if (descriptor.get || descriptor.set) throw new TypeError('accessor properties are not supported by RUNTIME-001 V0');
    rejectUnsupported(descriptor.value, seen);
  }
}

function safeClone(value) {
  rejectUnsupported(value);
  const cloned = structuredClone(value);
  rejectUnsupported(cloned);
  return cloned;
}

function stableId(prefix, value) {
  rejectUnsupported(value);
  return `${prefix}_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, 24)}`;
}

function contextKey(context, key) {
  return stableId('scope', [context.company_id, context.engine_id, context.environment, context.version, key]);
}

function normalizeIdempotencyKey(explicit, generated) {
  if (explicit === undefined) return generated();
  return assertNonEmptyString(explicit, 'idempotency_key');
}

function assertInteger(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be a safe integer between ${min} and ${max}`);
  return value;
}

function ulp(value) {
  if (!Number.isFinite(value)) return Infinity;
  if (Object.is(value, -0)) value = 0;
  FLOAT64_BITS.setFloat64(0, value, false);
  let bits = FLOAT64_BITS.getBigUint64(0, false);
  bits = value >= 0 ? bits + 1n : bits - 1n;
  FLOAT64_BITS.setBigUint64(0, bits, false);
  return Math.abs(FLOAT64_BITS.getFloat64(0, false) - value);
}

function moneyToUnits(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
  const raw = value * MONEY_SCALE;
  const rawUlp = ulp(raw);
  if (rawUlp > MONEY_MAX_TOLERATED_ULP_UNITS) throw new Error(`${label} exceeds reliable monetary precision range`);
  const nearest = Math.round(raw);
  const delta = Math.abs(raw - nearest);
  let scaled;
  if (delta === 0) {
    scaled = nearest;
  } else if (rawUlp <= MONEY_NOISE_ULP_LIMIT_UNITS && delta <= rawUlp) {
    scaled = nearest;
  } else {
    scaled = label === 'cost' && value > 0 ? Math.ceil(raw) : Math.floor(raw);
  }
  if (!Number.isSafeInteger(scaled)) throw new Error(`${label} exceeds safe monetary range`);
  return BigInt(scaled);
}

function unitsToMoney(value) {
  return Number(value) / MONEY_SCALE;
}

export class EventBus {
  #outbox = [];
  #inbox = new Set();

  publish({ type, payload = {}, context, idempotency_key }) {
    const safeCtx = safeContext(context);
    const safeType = assertNonEmptyString(type, 'event type');
    const safePayload = safeClone(payload);
    const key = normalizeIdempotencyKey(idempotency_key, () => stableId('evt', { type: safeType, payload: safePayload, context: safeCtx }));
    const scoped = contextKey(safeCtx, key);
    if (this.#inbox.has(scoped)) return { accepted: false, duplicate: true, idempotency_key: key };
    const event = {
      event_id: stableId('event', { scoped, type: safeType, context: safeCtx }), type: safeType, payload: safePayload,
      context: { ...safeCtx }, idempotency_key: key, status: 'PENDING'
    };
    const exposed = safeClone(event);
    this.#inbox.add(scoped);
    this.#outbox.push(event);
    return { accepted: true, duplicate: false, event: exposed };
  }

  listForCompany(company_id) {
    const safeCompany = assertNonEmptyString(company_id, 'company_id');
    return this.#outbox.filter(e => e.context.company_id === safeCompany).map(e => safeClone(e));
  }

  listForContext(context) {
    const safeCtx = safeContext(context);
    return this.#outbox.filter(e => sameContext(e.context, safeCtx)).map(e => safeClone(e));
  }
}

export class JobQueue {
  #jobs = [];
  #keys = new Set();

  enqueue({ name, context, payload = {}, priority = 100, max_attempts = 3, timeout_ms = 30000, idempotency_key }) {
    const safeCtx = safeContext(context);
    const safeName = assertNonEmptyString(name, 'job name');
    const safePriority = assertInteger(priority, 'priority');
    const safeMaxAttempts = assertInteger(max_attempts, 'max_attempts', { min: 1, max: 1000 });
    const safeTimeout = assertInteger(timeout_ms, 'timeout_ms', { min: 1, max: 86_400_000 });
    const safePayload = safeClone(payload);
    const key = normalizeIdempotencyKey(idempotency_key, () => stableId('job', { name: safeName, payload: safePayload, context: safeCtx }));
    const scoped = contextKey(safeCtx, key);
    if (this.#keys.has(scoped)) return { accepted: false, duplicate: true, idempotency_key: key };
    const job = {
      job_id: stableId('jobid', { scoped, name: safeName, context: safeCtx }), name: safeName, context: { ...safeCtx }, payload: safePayload,
      priority: safePriority, max_attempts: safeMaxAttempts, timeout_ms: safeTimeout, attempts: 0, status: 'QUEUED', idempotency_key: key, result: null, error: null
    };
    const exposed = safeClone(job);
    this.#keys.add(scoped);
    this.#jobs.push(job);
    return { accepted: true, duplicate: false, job: exposed };
  }

  claim(company_id) {
    const safeCompany = assertNonEmptyString(company_id, 'company_id');
    const candidates = this.#jobs.filter(j => j.context.company_id === safeCompany && j.status === 'QUEUED').sort((a,b) => a.priority - b.priority || a.job_id.localeCompare(b.job_id));
    const job = candidates[0];
    if (!job) return null;
    const exposed = safeClone({ ...job, status: 'RUNNING', attempts: job.attempts + 1 });
    job.status = 'RUNNING';
    job.attempts += 1;
    return exposed;
  }

  claimContext(context) {
    const safeCtx = safeContext(context);
    const candidates = this.#jobs.filter(j => sameContext(j.context, safeCtx) && j.status === 'QUEUED').sort((a,b) => a.priority - b.priority || a.job_id.localeCompare(b.job_id));
    const job = candidates[0];
    if (!job) return null;
    const exposed = safeClone({ ...job, status: 'RUNNING', attempts: job.attempts + 1 });
    job.status = 'RUNNING';
    job.attempts += 1;
    return exposed;
  }

  complete(job_id, company_id, result) {
    const safeJobId = assertNonEmptyString(job_id, 'job_id');
    const safeCompany = assertNonEmptyString(company_id, 'company_id');
    const job = this.#jobs.find(j => j.job_id === safeJobId && j.context.company_id === safeCompany);
    if (!job) throw new Error('job not found for company');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    const safeResult = safeClone(result);
    const exposed = safeClone({ ...job, result: safeResult, error: null, status: 'SUCCEEDED' });
    job.result = safeResult; job.error = null; job.status = 'SUCCEEDED';
    return exposed;
  }

  completeContext(job_id, context, result) {
    const safeJobId = assertNonEmptyString(job_id, 'job_id');
    const safeCtx = safeContext(context);
    const job = this.#jobs.find(j => j.job_id === safeJobId && sameContext(j.context, safeCtx));
    if (!job) throw new Error('job not found for context');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    const safeResult = safeClone(result);
    const exposed = safeClone({ ...job, result: safeResult, error: null, status: 'SUCCEEDED' });
    job.result = safeResult; job.error = null; job.status = 'SUCCEEDED';
    return exposed;
  }

  fail(job_id, company_id, error) {
    const safeJobId = assertNonEmptyString(job_id, 'job_id');
    const safeCompany = assertNonEmptyString(company_id, 'company_id');
    const job = this.#jobs.find(j => j.job_id === safeJobId && j.context.company_id === safeCompany);
    if (!job) throw new Error('job not found for company');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    const safeError = String(error);
    const nextStatus = job.attempts < job.max_attempts ? 'QUEUED' : 'FAILED';
    const exposed = safeClone({ ...job, error: safeError, status: nextStatus });
    job.error = safeError; job.status = nextStatus;
    return exposed;
  }

  failContext(job_id, context, error) {
    const safeJobId = assertNonEmptyString(job_id, 'job_id');
    const safeCtx = safeContext(context);
    const job = this.#jobs.find(j => j.job_id === safeJobId && sameContext(j.context, safeCtx));
    if (!job) throw new Error('job not found for context');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    const safeError = String(error);
    const nextStatus = job.attempts < job.max_attempts ? 'QUEUED' : 'FAILED';
    const exposed = safeClone({ ...job, error: safeError, status: nextStatus });
    job.error = safeError; job.status = nextStatus;
    return exposed;
  }
}

function bindEvents(bus, context) {
  return Object.freeze({ publish: ({ type, payload = {}, idempotency_key }) => bus.publish({ type, payload, context, idempotency_key }), list: () => bus.listForContext(context) });
}

function bindJobs(queue, context) {
  return Object.freeze({
    enqueue: ({ name, payload = {}, priority = 100, max_attempts = 3, timeout_ms = 30000, idempotency_key }) => queue.enqueue({ name, context, payload, priority, max_attempts, timeout_ms, idempotency_key }),
    claim: () => queue.claimContext(context),
    complete: (job_id, result) => queue.completeContext(job_id, context, result),
    fail: (job_id, error) => queue.failContext(job_id, context, error)
  });
}

export class FinOpsGate {
  #budgetUnits;
  #spentUnits = 0n;

  constructor({ additional_cost_budget_eur = 0 } = {}) {
    this.#budgetUnits = moneyToUnits(additional_cost_budget_eur, 'budget');
  }

  get budget() { return unitsToMoney(this.#budgetUnits); }
  get spent() { return unitsToMoney(this.#spentUnits); }

  authorize(additional_cost_eur) {
    const costUnits = moneyToUnits(additional_cost_eur, 'cost');
    if (this.#spentUnits + costUnits > this.#budgetUnits) {
      return { allowed: false, human_required: 'MONEY_LIMIT', remaining_eur: unitsToMoney(this.#budgetUnits - this.#spentUnits) };
    }
    this.#spentUnits += costUnits;
    return { allowed: true, remaining_eur: unitsToMoney(this.#budgetUnits - this.#spentUnits) };
  }
}

export class SharedRuntime {
  #environment;
  #events = new EventBus();
  #jobs = new JobQueue();
  #finops;
  #handlers = new Map();
  #audit = [];

  constructor({ environment = 'PREPROD', additional_cost_budget_eur = 0 } = {}) {
    const safeEnvironment = assertNonEmptyString(environment, 'environment');
    if (safeEnvironment === 'PROD') throw new Error('RUNTIME-001 V0 cannot run with PROD context');
    this.#environment = safeEnvironment;
    this.#finops = new FinOpsGate({ additional_cost_budget_eur });
  }

  get environment() { return this.#environment; }
  get finops() { return Object.freeze({ budget: this.#finops.budget, spent: this.#finops.spent }); }
  get audit() { return this.#audit.map(entry => safeClone(entry)); }

  inspectContext(context) {
    const safeCtx = safeContext(context);
    return Object.freeze({ events: this.#events.listForContext(safeCtx), next_job: this.#jobs.claimContext(safeCtx) });
  }

  inspectEvents(context) {
    return this.#events.listForContext(safeContext(context));
  }

  claimJob(context) {
    return this.#jobs.claimContext(safeContext(context));
  }

  completeJob(job_id, context, result) {
    return this.#jobs.completeContext(job_id, safeContext(context), result);
  }

  failJob(job_id, context, error) {
    return this.#jobs.failContext(job_id, safeContext(context), error);
  }

  registerEngine({ engine_id, version, handler, prod_writes = false }) {
    const safeEngineId = assertNonEmptyString(engine_id, 'engine_id');
    const safeVersion = assertNonEmptyString(version, 'version');
    if (typeof handler !== 'function') throw new Error('invalid engine registration');
    if (prod_writes) throw new Error('RUNTIME-001 V0 forbids PROD writes');
    this.#handlers.set(safeEngineId, { version: safeVersion, handler, prod_writes: false });
  }

  async execute({ company_id, engine_id, version, command, payload = {}, cost_eur = 0 }) {
    if (this.#environment === 'PROD') throw new Error('RUNTIME-001 V0 cannot execute with PROD context');
    const context = safeContext({ company_id, engine_id, environment: this.#environment, version });
    const safeCommand = assertNonEmptyString(command, 'command');
    const reg = this.#handlers.get(context.engine_id);
    if (!reg || reg.version !== context.version) throw new Error('engine not registered for requested version');
    const safePayload = safeClone(payload);
    const auditBase = { context: { ...context }, command: safeCommand, cost_eur };
    const cost = this.#finops.authorize(cost_eur);
    if (!cost.allowed) {
      this.#audit.push({ ...auditBase, outcome: 'HUMAN_REQUIRED', reason: cost.human_required });
      return { status: 'HUMAN_REQUIRED', reason: cost.human_required, context: { ...context } };
    }
    try {
      const rawResult = await reg.handler({ context, command: safeCommand, payload: safePayload, events: bindEvents(this.#events, context), jobs: bindJobs(this.#jobs, context) });
      const result = safeClone(rawResult);
      if (result?.status === 'HUMAN_REQUIRED') {
        if (!HUMAN_REQUIRED_REASONS.has(result.reason)) throw new Error(`invalid HUMAN_REQUIRED reason: ${result.reason}`);
        this.#audit.push({ ...auditBase, outcome: 'HUMAN_REQUIRED', reason: result.reason });
        return { status: 'HUMAN_REQUIRED', reason: result.reason, context: { ...context }, result };
      }
      this.#audit.push({ ...auditBase, outcome: 'SUCCESS' });
      return { status: 'OK', context: { ...context }, result };
    } catch (error) {
      this.#audit.push({ ...auditBase, outcome: 'ERROR', error: String(error) });
      throw error;
    }
  }
}

export const RUNTIME_V0_CONTRACT = Object.freeze({ engine_id: 'RUNTIME-001', environment: 'PREPROD', shared_workers: true, deterministic_first: true, prod_writes: false, cross_company_access: 'deny', event_bus: 'EVT-001/in-memory-reference-with-postgres-contract', job_queue: 'JOB-001/in-memory-reference-with-postgres-contract', additional_cost_target_eur: 0 });
