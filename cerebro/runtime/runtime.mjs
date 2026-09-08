import crypto from 'node:crypto';
import { serialize } from 'node:v8';

const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const MONEY_SCALE = 1_000_000;

function assertContext(ctx) {
  for (const key of ['company_id','engine_id','environment','version']) {
    if (!ctx?.[key]) throw new Error(`missing context.${key}`);
  }
}

function sameContext(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

function rejectUnsupported(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) throw new TypeError('SharedArrayBuffer is not supported');
  if (ArrayBuffer.isView(value) && typeof SharedArrayBuffer !== 'undefined' && value.buffer instanceof SharedArrayBuffer) throw new TypeError('SharedArrayBuffer-backed views are not supported');
  if (typeof Blob !== 'undefined' && value instanceof Blob) throw new TypeError('Blob is not supported by RUNTIME-001 V0');
  if (seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    for (const [k, v] of value) { rejectUnsupported(k, seen); rejectUnsupported(v, seen); }
    return;
  }
  if (value instanceof Set) {
    for (const v of value) rejectUnsupported(v, seen);
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

function moneyToUnits(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
  const raw = value * MONEY_SCALE;
  const scaled = label === 'cost' && value > 0 ? Math.ceil(raw) : Math.floor(raw);
  if (!Number.isSafeInteger(scaled)) throw new Error(`${label} exceeds safe monetary range`);
  return BigInt(scaled);
}

function unitsToMoney(value) {
  return Number(value) / MONEY_SCALE;
}

export class EventBus {
  constructor() { this.outbox = []; this.inbox = new Set(); }

  publish({ type, payload = {}, context, idempotency_key }) {
    assertContext(context);
    if (!type) throw new Error('event type required');
    const safePayload = safeClone(payload);
    const key = idempotency_key ?? stableId('evt', { type, payload: safePayload, context });
    const scoped = contextKey(context, key);
    if (this.inbox.has(scoped)) return { accepted: false, duplicate: true, idempotency_key: key };
    const event = {
      event_id: stableId('event', { scoped, type, context }), type, payload: safePayload,
      context: { ...context }, idempotency_key: key, status: 'PENDING'
    };
    const exposed = safeClone(event);
    this.inbox.add(scoped);
    this.outbox.push(event);
    return { accepted: true, duplicate: false, event: exposed };
  }

  listForCompany(company_id) { return this.outbox.filter(e => e.context.company_id === company_id).map(e => safeClone(e)); }
  listForContext(context) { assertContext(context); return this.outbox.filter(e => sameContext(e.context, context)).map(e => safeClone(e)); }
}

export class JobQueue {
  constructor() { this.jobs = []; this.keys = new Set(); }

  enqueue({ name, context, payload = {}, priority = 100, max_attempts = 3, timeout_ms = 30000, idempotency_key }) {
    assertContext(context);
    if (!name) throw new Error('job name required');
    const safePayload = safeClone(payload);
    const key = idempotency_key ?? stableId('job', { name, payload: safePayload, context });
    const scoped = contextKey(context, key);
    if (this.keys.has(scoped)) return { accepted: false, duplicate: true, idempotency_key: key };
    const job = {
      job_id: stableId('jobid', { scoped, name, context }), name, context: { ...context }, payload: safePayload,
      priority, max_attempts, timeout_ms, attempts: 0, status: 'QUEUED', idempotency_key: key, result: null, error: null
    };
    const exposed = safeClone(job);
    this.keys.add(scoped);
    this.jobs.push(job);
    return { accepted: true, duplicate: false, job: exposed };
  }

  claim(company_id) {
    const candidates = this.jobs.filter(j => j.context.company_id === company_id && j.status === 'QUEUED').sort((a,b) => a.priority - b.priority || a.job_id.localeCompare(b.job_id));
    const job = candidates[0]; if (!job) return null; job.status = 'RUNNING'; job.attempts += 1; return safeClone(job);
  }

  claimContext(context) {
    assertContext(context);
    const candidates = this.jobs.filter(j => sameContext(j.context, context) && j.status === 'QUEUED').sort((a,b) => a.priority - b.priority || a.job_id.localeCompare(b.job_id));
    const job = candidates[0]; if (!job) return null; job.status = 'RUNNING'; job.attempts += 1; return safeClone(job);
  }

  complete(job_id, company_id, result) {
    const job = this.jobs.find(j => j.job_id === job_id && j.context.company_id === company_id);
    if (!job) throw new Error('job not found for company');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    const safeResult = safeClone(result);
    job.result = safeResult; job.error = null; job.status = 'SUCCEEDED'; return safeClone(job);
  }

  completeContext(job_id, context, result) {
    assertContext(context);
    const job = this.jobs.find(j => j.job_id === job_id && sameContext(j.context, context));
    if (!job) throw new Error('job not found for context');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    const safeResult = safeClone(result);
    job.result = safeResult; job.error = null; job.status = 'SUCCEEDED'; return safeClone(job);
  }

  fail(job_id, company_id, error) {
    const job = this.jobs.find(j => j.job_id === job_id && j.context.company_id === company_id);
    if (!job) throw new Error('job not found for company');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    job.error = String(error); job.status = job.attempts < job.max_attempts ? 'QUEUED' : 'FAILED'; return safeClone(job);
  }

  failContext(job_id, context, error) {
    assertContext(context);
    const job = this.jobs.find(j => j.job_id === job_id && sameContext(j.context, context));
    if (!job) throw new Error('job not found for context');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    job.error = String(error); job.status = job.attempts < job.max_attempts ? 'QUEUED' : 'FAILED'; return safeClone(job);
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

  constructor({ environment = 'PREPROD', additional_cost_budget_eur = 0 } = {}) {
    if (environment === 'PROD') throw new Error('RUNTIME-001 V0 cannot run with PROD context');
    this.#environment = environment;
    this.events = new EventBus(); this.jobs = new JobQueue(); this.finops = new FinOpsGate({ additional_cost_budget_eur }); this.handlers = new Map(); this.audit = [];
  }

  get environment() { return this.#environment; }

  registerEngine({ engine_id, version, handler, prod_writes = false }) {
    if (!engine_id || !version || typeof handler !== 'function') throw new Error('invalid engine registration');
    if (prod_writes) throw new Error('RUNTIME-001 V0 forbids PROD writes');
    this.handlers.set(engine_id, { version, handler, prod_writes: false });
  }

  async execute({ company_id, engine_id, version, command, payload = {}, cost_eur = 0 }) {
    if (this.#environment === 'PROD') throw new Error('RUNTIME-001 V0 cannot execute with PROD context');
    const context = { company_id, engine_id, environment: this.#environment, version }; assertContext(context);
    const reg = this.handlers.get(engine_id); if (!reg || reg.version !== version) throw new Error('engine not registered for requested version');
    const safePayload = safeClone(payload);
    const auditBase = { context: { ...context }, command, cost_eur }; const cost = this.finops.authorize(cost_eur);
    if (!cost.allowed) { this.audit.push({ ...auditBase, outcome: 'HUMAN_REQUIRED', reason: cost.human_required }); return { status: 'HUMAN_REQUIRED', reason: cost.human_required, context }; }
    try {
      const rawResult = await reg.handler({ context: Object.freeze({ ...context }), command, payload: safePayload, events: bindEvents(this.events, context), jobs: bindJobs(this.jobs, context) });
      const result = safeClone(rawResult);
      if (result?.status === 'HUMAN_REQUIRED') {
        if (!HUMAN_REQUIRED_REASONS.has(result.reason)) throw new Error(`invalid HUMAN_REQUIRED reason: ${result.reason}`);
        this.audit.push({ ...auditBase, outcome: 'HUMAN_REQUIRED', reason: result.reason }); return { status: 'HUMAN_REQUIRED', reason: result.reason, context, result };
      }
      this.audit.push({ ...auditBase, outcome: 'SUCCESS' }); return { status: 'OK', context, result };
    } catch (error) { this.audit.push({ ...auditBase, outcome: 'ERROR', error: String(error) }); throw error; }
  }
}

export const RUNTIME_V0_CONTRACT = Object.freeze({ engine_id: 'RUNTIME-001', environment: 'PREPROD', shared_workers: true, deterministic_first: true, prod_writes: false, cross_company_access: 'deny', event_bus: 'EVT-001/in-memory-reference-with-postgres-contract', job_queue: 'JOB-001/in-memory-reference-with-postgres-contract', additional_cost_target_eur: 0 });
