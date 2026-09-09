import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';
import { EventBus, JobQueue } from './runtime.mjs';

const SCHEMA_VERSION = 1;

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function safeErrorText(value) {
  try { return String(value); } catch {}
  try { return Object.prototype.toString.call(value); } catch {}
  return '[unstringifiable thrown value]';
}

function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function decodeEnvelope(bytes, kind) {
  let envelope;
  try { envelope = deserialize(bytes); }
  catch (error) { throw new Error(`persistent runtime state cannot be decoded: ${safeErrorText(error)}`); }
  if (!envelope || typeof envelope !== 'object') throw new Error('persistent runtime state envelope is invalid');
  if (envelope.schema_version !== SCHEMA_VERSION) throw new Error('persistent runtime state schema version is unsupported');
  if (envelope.kind !== kind) throw new Error(`persistent runtime state kind mismatch: expected ${kind}`);
  if (!Buffer.isBuffer(envelope.payload)) throw new Error('persistent runtime state payload is invalid');
  if (envelope.checksum !== digest(envelope.payload)) throw new Error('persistent runtime state checksum mismatch');
  let operations;
  try { operations = deserialize(envelope.payload); }
  catch (error) { throw new Error(`persistent runtime operations cannot be decoded: ${safeErrorText(error)}`); }
  if (!Array.isArray(operations)) throw new Error('persistent runtime state operations must be an array');
  return operations;
}

export class AtomicV8Journal {
  #filePath;
  #kind;

  constructor({ file_path, kind }) {
    this.#filePath = path.resolve(nonEmpty(file_path, 'file_path'));
    this.#kind = nonEmpty(kind, 'kind');
  }

  get file_path() { return this.#filePath; }
  get kind() { return this.#kind; }

  load() {
    if (!fs.existsSync(this.#filePath)) return [];
    return decodeEnvelope(fs.readFileSync(this.#filePath), this.#kind);
  }

  commit(operations) {
    if (!Array.isArray(operations)) throw new TypeError('operations must be an array');
    const dir = path.dirname(this.#filePath);
    fs.mkdirSync(dir, { recursive: true });
    const payload = serialize(operations);
    const bytes = serialize({ schema_version: SCHEMA_VERSION, kind: this.#kind, payload, checksum: digest(payload) });
    const temp = `${this.#filePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    let fd;
    try {
      fd = fs.openSync(temp, 'wx', 0o600);
      fs.writeFileSync(fd, bytes);
      fs.fsyncSync(fd);
      fs.closeSync(fd); fd = undefined;
      fs.renameSync(temp, this.#filePath);
      const dirFd = fs.openSync(dir, 'r');
      try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
    } finally {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
      if (fs.existsSync(temp)) { try { fs.unlinkSync(temp); } catch {} }
    }
  }
}

function replayEvents(operations) {
  const bus = new EventBus();
  let last = null;
  for (const op of operations) {
    if (!op || op.op !== 'publish') throw new Error('invalid EVT-001 journal operation');
    last = bus.publish(op.input);
    if (!last.accepted) throw new Error('EVT-001 journal contains a duplicate accepted publish');
  }
  return { bus, last };
}

function replayJobs(operations) {
  const queue = new JobQueue();
  let last = null;
  for (const op of operations) {
    if (!op || typeof op.op !== 'string') throw new Error('invalid JOB-001 journal operation');
    if (op.op === 'enqueue') {
      last = queue.enqueue(op.input);
      if (!last.accepted) throw new Error('JOB-001 journal contains a duplicate accepted enqueue');
    } else if (op.op === 'claim') last = queue.claim(op.company_id);
    else if (op.op === 'claimContext') last = queue.claimContext(op.context);
    else if (op.op === 'complete') last = queue.complete(op.job_id, op.company_id, op.result);
    else if (op.op === 'completeContext') last = queue.completeContext(op.job_id, op.context, op.result);
    else if (op.op === 'fail') last = queue.fail(op.job_id, op.company_id, op.error);
    else if (op.op === 'failContext') last = queue.failContext(op.job_id, op.context, op.error);
    else throw new Error(`unsupported JOB-001 journal operation: ${op.op}`);
  }
  return { queue, last };
}

export class PersistentEventBus {
  #journal;
  #operations;
  #bus;

  constructor({ file_path, environment = 'PREPROD' }) {
    if (environment !== 'PREPROD') throw new Error('EVT-001 persistent V0 accepts exact PREPROD only');
    this.#journal = new AtomicV8Journal({ file_path, kind: 'EVT-001' });
    this.#operations = this.#journal.load();
    this.#bus = replayEvents(this.#operations).bus;
  }

  publish(input) {
    const probeBus = replayEvents(this.#operations).bus;
    const probe = probeBus.publish(input);
    if (!probe.accepted) return probe;
    const candidate = [...this.#operations, { op: 'publish', input }];
    const replayed = replayEvents(candidate);
    this.#journal.commit(candidate);
    this.#operations = candidate;
    this.#bus = replayed.bus;
    return replayed.last;
  }

  listForCompany(company_id) { return this.#bus.listForCompany(company_id); }
  listForContext(context) { return this.#bus.listForContext(context); }
  get journal_path() { return this.#journal.file_path; }
  get operation_count() { return this.#operations.length; }
}

export class PersistentJobQueue {
  #journal;
  #operations;
  #queue;

  constructor({ file_path, environment = 'PREPROD' }) {
    if (environment !== 'PREPROD') throw new Error('JOB-001 persistent V0 accepts exact PREPROD only');
    this.#journal = new AtomicV8Journal({ file_path, kind: 'JOB-001' });
    this.#operations = this.#journal.load();
    this.#queue = replayJobs(this.#operations).queue;
  }

  #apply(operation) {
    const candidate = [...this.#operations, operation];
    const replayed = replayJobs(candidate);
    this.#journal.commit(candidate);
    this.#operations = candidate;
    this.#queue = replayed.queue;
    return replayed.last;
  }

  enqueue(input) {
    const probeQueue = replayJobs(this.#operations).queue;
    const probe = probeQueue.enqueue(input);
    if (!probe.accepted) return probe;
    return this.#apply({ op: 'enqueue', input });
  }

  claim(company_id) {
    const probeQueue = replayJobs(this.#operations).queue;
    const probe = probeQueue.claim(company_id);
    if (!probe) return null;
    return this.#apply({ op: 'claim', company_id });
  }

  claimContext(context) {
    const probeQueue = replayJobs(this.#operations).queue;
    const probe = probeQueue.claimContext(context);
    if (!probe) return null;
    return this.#apply({ op: 'claimContext', context });
  }

  complete(job_id, company_id, result) {
    return this.#apply({ op: 'complete', job_id, company_id, result });
  }

  completeContext(job_id, context, result) {
    return this.#apply({ op: 'completeContext', job_id, context, result });
  }

  fail(job_id, company_id, error) {
    return this.#apply({ op: 'fail', job_id, company_id, error: safeErrorText(error) });
  }

  failContext(job_id, context, error) {
    return this.#apply({ op: 'failContext', job_id, context, error: safeErrorText(error) });
  }

  get journal_path() { return this.#journal.file_path; }
  get operation_count() { return this.#operations.length; }
}

export function createPersistentRuntimeIO({ directory, environment = 'PREPROD' }) {
  if (environment !== 'PREPROD') throw new Error('persistent runtime V0 accepts exact PREPROD only');
  const root = path.resolve(nonEmpty(directory, 'directory'));
  return Object.freeze({
    events: new PersistentEventBus({ file_path: path.join(root, 'evt-001.v8journal'), environment }),
    jobs: new PersistentJobQueue({ file_path: path.join(root, 'job-001.v8journal'), environment })
  });
}

export const PERSISTENT_RUNTIME_V0_CONTRACT = Object.freeze({
  environment: 'PREPROD',
  engines: ['EVT-001','JOB-001'],
  persistence: 'local-atomic-v8-journal-reference',
  additional_cost_target_eur: 0,
  supabase_required: false,
  autonomous_prod: false,
  prod_writes: false,
  single_writer_reference: true,
  crash_consistency: 'temp-write+fsync+atomic-rename+directory-fsync',
  integrity: 'sha256-envelope',
  rebuild: 'deterministic-operation-replay'
});
