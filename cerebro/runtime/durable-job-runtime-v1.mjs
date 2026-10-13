import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';
import { AtomicV8Journal } from './persistent-runtime.mjs';

const PREPROD = 'PREPROD';
const KIND = 'JOB-001-DURABLE-V1';
const TERMINAL = new Set(['SUCCEEDED', 'DEAD_LETTER', 'CANCELLED']);

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be a safe integer between ${min} and ${max}`);
  return value;
}

function context(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id'),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id'),
    environment: nonEmpty(value.environment, 'context.environment'),
    version: nonEmpty(value.version, 'context.version')
  });
  if (out.environment !== PREPROD) throw new Error('durable JOB-001 V1 accepts exact PREPROD only');
  return out;
}

function sameContext(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

function clone(value) {
  return deserialize(serialize(value));
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, 24)}`;
}

function safeError(value) {
  try { return String(value); } catch {}
  return '[unstringifiable thrown value]';
}

function deterministicUnitInterval(seed) {
  const bytes = crypto.createHash('sha256').update(seed).digest();
  const n = bytes.readUInt32BE(0);
  return n / 0x1_0000_0000;
}

export function retryDelayMs({ job_id, attempt, base_delay_ms = 1000, max_delay_ms = 300000, jitter_ratio = 0.2 }) {
  nonEmpty(job_id, 'job_id');
  integer(attempt, 'attempt', { min: 1, max: 1000 });
  integer(base_delay_ms, 'base_delay_ms', { min: 1, max: 86_400_000 });
  integer(max_delay_ms, 'max_delay_ms', { min: base_delay_ms, max: 604_800_000 });
  if (!Number.isFinite(jitter_ratio) || jitter_ratio < 0 || jitter_ratio > 1) throw new TypeError('jitter_ratio must be between 0 and 1');
  const exponential = Math.min(max_delay_ms, base_delay_ms * (2 ** Math.min(attempt - 1, 30)));
  const unit = deterministicUnitInterval(`${job_id}:${attempt}`);
  const factor = 1 + ((unit * 2) - 1) * jitter_ratio;
  return Math.max(1, Math.min(max_delay_ms, Math.round(exponential * factor)));
}

function replay(operations) {
  const jobs = new Map();
  const keys = new Map();
  for (const op of operations) {
    if (!op || typeof op !== 'object' || typeof op.op !== 'string') throw new Error('invalid durable JOB-001 V1 journal operation');
    if (op.op === 'enqueue') {
      if (jobs.has(op.job.job_id)) throw new Error('duplicate durable job id in journal');
      const scoped = `${op.job.context.company_id}|${op.job.context.engine_id}|${op.job.context.environment}|${op.job.context.version}|${op.job.idempotency_key}`;
      if (keys.has(scoped)) throw new Error('duplicate durable idempotency key in journal');
      jobs.set(op.job.job_id, clone(op.job));
      keys.set(scoped, op.job.job_id);
      continue;
    }
    const job = jobs.get(op.job_id);
    if (!job) throw new Error(`durable journal references unknown job: ${op.job_id}`);
    if (op.op === 'claim') {
      job.status = 'RUNNING';
      job.attempts = op.attempts;
      job.worker_id = op.worker_id;
      job.claimed_at_ms = op.now_ms;
      job.heartbeat_at_ms = op.now_ms;
      job.lease_expires_at_ms = op.lease_expires_at_ms;
      job.next_attempt_at_ms = null;
    } else if (op.op === 'heartbeat') {
      job.heartbeat_at_ms = op.now_ms;
      job.lease_expires_at_ms = op.lease_expires_at_ms;
    } else if (op.op === 'checkpoint') {
      job.checkpoint = clone(op.checkpoint);
      job.checkpoint_at_ms = op.now_ms;
    } else if (op.op === 'complete') {
      job.status = 'SUCCEEDED';
      job.result = clone(op.result);
      job.error = null;
      job.completed_at_ms = op.now_ms;
      job.worker_id = null;
      job.lease_expires_at_ms = null;
      job.heartbeat_at_ms = null;
    } else if (op.op === 'retry') {
      job.status = 'RETRY_WAIT';
      job.error = op.error;
      job.next_attempt_at_ms = op.next_attempt_at_ms;
      job.worker_id = null;
      job.lease_expires_at_ms = null;
      job.heartbeat_at_ms = null;
    } else if (op.op === 'dead_letter') {
      job.status = 'DEAD_LETTER';
      job.error = op.error;
      job.failed_at_ms = op.now_ms;
      job.next_attempt_at_ms = null;
      job.worker_id = null;
      job.lease_expires_at_ms = null;
      job.heartbeat_at_ms = null;
    } else if (op.op === 'cancel') {
      job.status = 'CANCELLED';
      job.cancel_reason = op.reason;
      job.cancelled_at_ms = op.now_ms;
      job.next_attempt_at_ms = null;
      job.worker_id = null;
      job.lease_expires_at_ms = null;
      job.heartbeat_at_ms = null;
    } else {
      throw new Error(`unsupported durable JOB-001 V1 operation: ${op.op}`);
    }
  }
  return { jobs, keys };
}

function assertWorker(job, worker_id) {
  const safeWorker = nonEmpty(worker_id, 'worker_id');
  if (job.status !== 'RUNNING') throw new Error('job is not RUNNING');
  if (job.worker_id !== safeWorker) throw new Error('worker does not own job lease');
  return safeWorker;
}

function scopedKey(ctx, key) {
  return `${ctx.company_id}|${ctx.engine_id}|${ctx.environment}|${ctx.version}|${key}`;
}

export class DurableJobRuntimeV1 {
  #journal;
  #operations;
  #jobs;
  #keys;

  constructor({ file_path, environment = PREPROD }) {
    if (environment !== PREPROD) throw new Error('durable JOB-001 V1 accepts exact PREPROD only');
    this.#journal = new AtomicV8Journal({ file_path: nonEmpty(file_path, 'file_path'), kind: KIND });
    this.#operations = this.#journal.load();
    const state = replay(this.#operations);
    this.#jobs = state.jobs;
    this.#keys = state.keys;
  }

  #commit(operation) {
    const candidate = [...this.#operations, clone(operation)];
    const state = replay(candidate);
    this.#journal.commit(candidate);
    this.#operations = candidate;
    this.#jobs = state.jobs;
    this.#keys = state.keys;
  }

  enqueue({ name, context: rawContext, payload = {}, priority = 100, max_attempts = 5, timeout_ms = 30000, idempotency_key, correlation_id, now_ms = Date.now(), retry = {} }) {
    const ctx = context(rawContext);
    const safeName = nonEmpty(name, 'name');
    const safePriority = integer(priority, 'priority', { min: 0, max: 1_000_000 });
    const safeMaxAttempts = integer(max_attempts, 'max_attempts', { min: 1, max: 1000 });
    const safeTimeout = integer(timeout_ms, 'timeout_ms', { min: 1, max: 86_400_000 });
    const safeNow = integer(now_ms, 'now_ms');
    const safePayload = clone(payload);
    const key = idempotency_key === undefined ? stableId('idem', [safeName, ctx, safePayload]) : nonEmpty(idempotency_key, 'idempotency_key');
    const scoped = scopedKey(ctx, key);
    const duplicateId = this.#keys.get(scoped);
    if (duplicateId) return { accepted: false, duplicate: true, job: clone(this.#jobs.get(duplicateId)) };
    const retryPolicy = Object.freeze({
      base_delay_ms: integer(retry.base_delay_ms ?? 1000, 'retry.base_delay_ms', { min: 1, max: 86_400_000 }),
      max_delay_ms: integer(retry.max_delay_ms ?? 300000, 'retry.max_delay_ms', { min: 1, max: 604_800_000 }),
      jitter_ratio: retry.jitter_ratio ?? 0.2
    });
    if (retryPolicy.max_delay_ms < retryPolicy.base_delay_ms) throw new Error('retry.max_delay_ms must be >= retry.base_delay_ms');
    if (!Number.isFinite(retryPolicy.jitter_ratio) || retryPolicy.jitter_ratio < 0 || retryPolicy.jitter_ratio > 1) throw new TypeError('retry.jitter_ratio must be between 0 and 1');
    const job = {
      job_id: stableId('job', [scoped, safeName]),
      name: safeName,
      context: { ...ctx },
      payload: safePayload,
      priority: safePriority,
      max_attempts: safeMaxAttempts,
      timeout_ms: safeTimeout,
      retry: { ...retryPolicy },
      attempts: 0,
      status: 'QUEUED',
      idempotency_key: key,
      correlation_id: correlation_id === undefined ? stableId('corr', [scoped, safeName]) : nonEmpty(correlation_id, 'correlation_id'),
      created_at_ms: safeNow,
      next_attempt_at_ms: safeNow,
      claimed_at_ms: null,
      heartbeat_at_ms: null,
      lease_expires_at_ms: null,
      checkpoint: null,
      checkpoint_at_ms: null,
      worker_id: null,
      result: null,
      error: null,
      cancel_reason: null,
      completed_at_ms: null,
      failed_at_ms: null,
      cancelled_at_ms: null
    };
    this.#commit({ op: 'enqueue', job });
    return { accepted: true, duplicate: false, job: clone(job) };
  }

  claim({ context: rawContext, worker_id, now_ms = Date.now(), lease_ms = 60000 }) {
    const ctx = context(rawContext);
    const safeWorker = nonEmpty(worker_id, 'worker_id');
    const safeNow = integer(now_ms, 'now_ms');
    const safeLease = integer(lease_ms, 'lease_ms', { min: 1000, max: 86_400_000 });
    const candidates = [...this.#jobs.values()]
      .filter(job => sameContext(job.context, ctx) && (job.status === 'QUEUED' || job.status === 'RETRY_WAIT') && (job.next_attempt_at_ms ?? 0) <= safeNow)
      .sort((a, b) => a.priority - b.priority || a.created_at_ms - b.created_at_ms || a.job_id.localeCompare(b.job_id));
    const job = candidates[0];
    if (!job) return null;
    const attempts = job.attempts + 1;
    this.#commit({ op: 'claim', job_id: job.job_id, worker_id: safeWorker, attempts, now_ms: safeNow, lease_expires_at_ms: safeNow + safeLease });
    return clone(this.#jobs.get(job.job_id));
  }

  heartbeat({ job_id, worker_id, now_ms = Date.now(), lease_ms = 60000 }) {
    const id = nonEmpty(job_id, 'job_id');
    const safeNow = integer(now_ms, 'now_ms');
    const safeLease = integer(lease_ms, 'lease_ms', { min: 1000, max: 86_400_000 });
    const job = this.#jobs.get(id);
    if (!job) throw new Error('job not found');
    assertWorker(job, worker_id);
    if (job.lease_expires_at_ms < safeNow) throw new Error('job lease already expired');
    this.#commit({ op: 'heartbeat', job_id: id, now_ms: safeNow, lease_expires_at_ms: safeNow + safeLease });
    return clone(this.#jobs.get(id));
  }

  checkpoint({ job_id, worker_id, checkpoint, now_ms = Date.now() }) {
    const id = nonEmpty(job_id, 'job_id');
    const safeNow = integer(now_ms, 'now_ms');
    const job = this.#jobs.get(id);
    if (!job) throw new Error('job not found');
    assertWorker(job, worker_id);
    if (job.lease_expires_at_ms < safeNow) throw new Error('job lease already expired');
    this.#commit({ op: 'checkpoint', job_id: id, checkpoint: clone(checkpoint), now_ms: safeNow });
    return clone(this.#jobs.get(id));
  }

  complete({ job_id, worker_id, result, now_ms = Date.now() }) {
    const id = nonEmpty(job_id, 'job_id');
    const safeNow = integer(now_ms, 'now_ms');
    const job = this.#jobs.get(id);
    if (!job) throw new Error('job not found');
    assertWorker(job, worker_id);
    if (job.lease_expires_at_ms < safeNow) throw new Error('job lease already expired');
    this.#commit({ op: 'complete', job_id: id, result: clone(result), now_ms: safeNow });
    return clone(this.#jobs.get(id));
  }

  fail({ job_id, worker_id, error, now_ms = Date.now() }) {
    const id = nonEmpty(job_id, 'job_id');
    const safeNow = integer(now_ms, 'now_ms');
    const job = this.#jobs.get(id);
    if (!job) throw new Error('job not found');
    assertWorker(job, worker_id);
    const text = safeError(error);
    if (job.attempts >= job.max_attempts) {
      this.#commit({ op: 'dead_letter', job_id: id, error: text, now_ms: safeNow });
    } else {
      const delay = retryDelayMs({ job_id: id, attempt: job.attempts, ...job.retry });
      this.#commit({ op: 'retry', job_id: id, error: text, now_ms: safeNow, next_attempt_at_ms: safeNow + delay });
    }
    return clone(this.#jobs.get(id));
  }

  watchdog({ now_ms = Date.now() } = {}) {
    const safeNow = integer(now_ms, 'now_ms');
    const expired = [...this.#jobs.values()]
      .filter(job => job.status === 'RUNNING' && job.lease_expires_at_ms !== null && job.lease_expires_at_ms <= safeNow)
      .sort((a, b) => a.job_id.localeCompare(b.job_id));
    const repaired = [];
    for (const job of expired) {
      const text = 'LEASE_EXPIRED_WATCHDOG';
      if (job.attempts >= job.max_attempts) {
        this.#commit({ op: 'dead_letter', job_id: job.job_id, error: text, now_ms: safeNow });
      } else {
        const delay = retryDelayMs({ job_id: job.job_id, attempt: job.attempts, ...job.retry });
        this.#commit({ op: 'retry', job_id: job.job_id, error: text, now_ms: safeNow, next_attempt_at_ms: safeNow + delay });
      }
      repaired.push(clone(this.#jobs.get(job.job_id)));
    }
    return repaired;
  }

  cancel({ job_id, reason = 'CANCELLED_BY_POLICY', now_ms = Date.now() }) {
    const id = nonEmpty(job_id, 'job_id');
    const safeNow = integer(now_ms, 'now_ms');
    const job = this.#jobs.get(id);
    if (!job) throw new Error('job not found');
    if (TERMINAL.has(job.status)) return clone(job);
    this.#commit({ op: 'cancel', job_id: id, reason: nonEmpty(reason, 'reason'), now_ms: safeNow });
    return clone(this.#jobs.get(id));
  }

  get(job_id) {
    const job = this.#jobs.get(nonEmpty(job_id, 'job_id'));
    return job ? clone(job) : null;
  }

  listForContext(rawContext) {
    const ctx = context(rawContext);
    return [...this.#jobs.values()].filter(job => sameContext(job.context, ctx)).map(clone);
  }

  get operation_count() { return this.#operations.length; }
  get journal_path() { return this.#journal.file_path; }
}

export const DURABLE_JOB_RUNTIME_V1_CONTRACT = Object.freeze({
  engine_id: 'JOB-001',
  capability_version: 'durable-v1',
  environment: PREPROD,
  multi_company_fields: ['company_id', 'engine_id', 'environment', 'version'],
  states: ['QUEUED', 'RUNNING', 'RETRY_WAIT', 'SUCCEEDED', 'DEAD_LETTER', 'CANCELLED'],
  leases: true,
  heartbeat: true,
  watchdog: true,
  checkpoint_resume: true,
  retry: 'exponential-backoff+deterministic-stochastic-jitter',
  idempotency: 'context-scoped',
  persistence: 'AtomicV8Journal',
  additional_cost_target_eur: 0,
  supabase_required: false,
  prod_writes: false,
  trading_access: false,
  promotion: 'LAB->PREPROD->OLD_vs_NEW->tribunal->gradual_prod'
});
