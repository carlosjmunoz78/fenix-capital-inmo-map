import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import { serialize, deserialize } from 'node:v8';
import { EventBus, JobQueue } from './runtime.mjs';

const SCHEMA_VERSION = 1;
const PREPROD = 'PREPROD';
const RESTART_RECOVERY_ERROR = 'PROCESS_RESTART_RECOVERY';

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

function durableSnapshot(value) {
  return deserialize(serialize(value));
}

function assertPersistedPreprod(context, label) {
  if (!context || context.environment !== PREPROD) throw new Error(`${label} must use exact PREPROD context`);
}

function fsyncDirectory(directory) {
  const fd = fs.openSync(directory, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function ensureDirectoryEntriesDurable(directory) {
  const target = path.resolve(directory);
  fs.mkdirSync(target, { recursive: true });
  const root = path.parse(target).root;
  const chain = [];
  let current = target;
  while (true) {
    chain.push(current);
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  chain.reverse();
  for (const entry of chain) fsyncDirectory(entry);
}

function encodeEnvelope(operations,kind) {
  const payload=serialize(operations);
  return serialize({schema_version:SCHEMA_VERSION,kind,payload,checksum:digest(payload)});
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
  #poisoned = false;

  constructor({ file_path, kind }) {
    this.#filePath = path.resolve(nonEmpty(file_path, 'file_path'));
    this.#kind = nonEmpty(kind, 'kind');
  }

  get file_path() { return this.#filePath; }
  get kind() { return this.#kind; }
  get poisoned() { return this.#poisoned; }

  load() {
    if (!fs.existsSync(this.#filePath)) return [];
    return decodeEnvelope(fs.readFileSync(this.#filePath), this.#kind);
  }

  commit(operations) {
    if (this.#poisoned) throw new Error('persistent runtime journal is poisoned; reopen required');
    if (!Array.isArray(operations)) throw new TypeError('operations must be an array');
    const dir = path.dirname(this.#filePath);
    ensureDirectoryEntriesDurable(dir);
    const bytes = encodeEnvelope(operations,this.#kind);
    const temp = `${this.#filePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    let fd;
    let renamed = false;
    try {
      fd = fs.openSync(temp, 'wx', 0o600);
      fs.writeFileSync(fd, bytes);
      fs.fsyncSync(fd);
      fs.closeSync(fd); fd = undefined;
      fs.renameSync(temp, this.#filePath);
      renamed = true;
      fsyncDirectory(dir);
    } catch (error) {
      if (renamed) {
        this.#poisoned = true;
        throw new Error(`persistent runtime journal durability is ambiguous after rename; reopen required: ${safeErrorText(error)}`);
      }
      throw error;
    } finally {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
      if (fs.existsSync(temp)) { try { fs.unlinkSync(temp); } catch {} }
    }
  }
}

// CP143: optional PREPROD-only SQLite storage adapter for the existing journals.
// No automatic fallback, migration, new scheduler or change to ATOMIC_V8.
const SQLITE_APP_ID = 1128616786;
const sqliteRequire = createRequire(import.meta.url);
export class SqliteV8JournalLab {
  #filePath; #kind; #revision=null; #poisoned=false;
  constructor({file_path,kind}) {
    this.#filePath=path.resolve(nonEmpty(file_path,'file_path'));
    this.#kind=nonEmpty(kind,'kind');
    if(path.extname(this.#filePath).toLowerCase()!=='.sqlite')throw Error('SQLITE_LAB_EXPLICIT_PATH_REQUIRED');
    if(!fs.statSync(path.dirname(this.#filePath)).isDirectory())throw Error('SQLITE_LAB_PREPROVISIONED_DIRECTORY_REQUIRED');
  }
  get file_path(){return this.#filePath;}
  get kind(){return this.#kind;}
  get poisoned(){return this.#poisoned;}
  #identity(db) {
    if(db.prepare('PRAGMA application_id').get().application_id!==SQLITE_APP_ID || db.prepare('PRAGMA user_version').get().user_version!==1)throw Error('SQLITE_LAB_UNKNOWN_DATABASE');
  }
  #open(allowCreate=false) {
    const {DatabaseSync}=sqliteRequire('node:sqlite');
    let fresh=false;
    if(!fs.existsSync(this.#filePath)){
      if(!allowCreate)throw Error('SQLITE_LAB_JOURNAL_MISSING');
      const fd=fs.openSync(this.#filePath,'wx',0o600);fs.closeSync(fd);fresh=true;
    }
    if(!fresh){
      const reader=new DatabaseSync(this.#filePath,{readOnly:true});
      try{this.#identity(reader);}finally{reader.close();}
    }
    const db=new DatabaseSync(this.#filePath);
    try{
      if(!fresh)this.#identity(db);
      db.exec('PRAGMA busy_timeout=5000; PRAGMA trusted_schema=OFF; PRAGMA synchronous=EXTRA;');
      if(db.prepare('PRAGMA journal_mode=DELETE').get().journal_mode!=='delete'||db.prepare('PRAGMA synchronous').get().synchronous!==3)throw Error('SQLITE_LAB_DURABILITY_UNAVAILABLE');
      if(fresh){
        db.exec('BEGIN IMMEDIATE');
        db.exec('PRAGMA application_id='+SQLITE_APP_ID+'; PRAGMA user_version=1; CREATE TABLE journal (id INTEGER PRIMARY KEY CHECK(id=1), kind TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=0), envelope BLOB NOT NULL);');
        db.prepare('INSERT INTO journal VALUES (1,?,0,?)').run(this.#kind,encodeEnvelope([],this.#kind));
        db.exec('COMMIT');
      }
      this.#identity(db);return db;
    }catch(error){try{db.close();}catch{}throw error;}
  }
  #read(db){
    const row=db.prepare('SELECT kind,revision,envelope FROM journal WHERE id=1').get();
    if(!row||row.kind!==this.#kind||!Number.isSafeInteger(row.revision)||row.revision<0)throw Error('SQLITE_LAB_JOURNAL_SCOPE_INVALID');
    return {revision:row.revision,operations:decodeEnvelope(Buffer.from(row.envelope),this.#kind)};
  }
  load(){
    if(this.#poisoned)throw Error('SQLITE_LAB_JOURNAL_POISONED_REOPEN_REQUIRED');
    const db=this.#open(true);
    try{const row=this.#read(db);this.#revision=row.revision;return row.operations;}
    finally{db.close();}
  }
  commit(operations){
    if(this.#poisoned||this.#revision===null)throw Error('SQLITE_LAB_JOURNAL_REOPEN_REQUIRED');
    if(!Array.isArray(operations))throw TypeError('operations must be an array');
    const bytes=encodeEnvelope(operations,this.#kind);
    let db;
    try{
      db=this.#open(false);db.exec('BEGIN IMMEDIATE');
      const row=this.#read(db);
      if(row.revision!==this.#revision)throw Error('SQLITE_LAB_STALE_WRITER_REOPEN_REQUIRED');
      if(this.#revision>=Number.MAX_SAFE_INTEGER)throw Error('SQLITE_LAB_REVISION_LIMIT');
      const updated=db.prepare('UPDATE journal SET revision=revision+1,envelope=? WHERE id=1 AND revision=? AND kind=?').run(bytes,this.#revision,this.#kind);
      if(updated.changes!==1)throw Error('SQLITE_LAB_CAS_FAILED');
      db.exec('COMMIT');db.close();db=null;this.#revision++;
    }catch(error){this.#poisoned=true;if(db){try{db.exec('ROLLBACK');}catch{}try{db.close();}catch{}}throw error;}
  }
}
export function createRuntimeJournal({file_path,kind,journal_backend='ATOMIC_V8'}){
  if(journal_backend==='ATOMIC_V8')return new AtomicV8Journal({file_path,kind});
  if(journal_backend==='SQLITE_V8_LAB')return new SqliteV8JournalLab({file_path,kind});
  throw Error('UNKNOWN_JOURNAL_BACKEND');
}

function replayEvents(operations) {
  const bus = new EventBus();
  let last = null;
  for (const op of operations) {
    if (!op || op.op !== 'publish') throw new Error('invalid EVT-001 journal operation');
    last = bus.publish(op.input);
    if (!last.accepted) throw new Error('EVT-001 journal contains a duplicate accepted publish');
    assertPersistedPreprod(last.event.context, 'EVT-001 event');
  }
  return { bus, last };
}

function replayJobs(operations) {
  const queue = new JobQueue();
  const states = new Map();
  let last = null;
  for (const op of operations) {
    if (!op || typeof op.op !== 'string') throw new Error('invalid JOB-001 journal operation');
    if (op.op === 'enqueue') {
      last = queue.enqueue(op.input);
      if (!last.accepted) throw new Error('JOB-001 journal contains a duplicate accepted enqueue');
      assertPersistedPreprod(last.job.context, 'JOB-001 job');
      states.set(last.job.job_id, last.job);
    } else if (op.op === 'claim') {
      last = queue.claim(op.company_id);
      if (last) states.set(last.job_id, last);
    } else if (op.op === 'claimContext') {
      assertPersistedPreprod(op.context, 'JOB-001 claimContext operation');
      last = queue.claimContext(op.context);
      if (last) states.set(last.job_id, last);
    } else if (op.op === 'complete') {
      last = queue.complete(op.job_id, op.company_id, op.result);
      states.set(last.job_id, last);
    } else if (op.op === 'completeContext') {
      assertPersistedPreprod(op.context, 'JOB-001 completeContext operation');
      last = queue.completeContext(op.job_id, op.context, op.result);
      states.set(last.job_id, last);
    } else if (op.op === 'fail') {
      last = queue.fail(op.job_id, op.company_id, op.error);
      states.set(last.job_id, last);
    } else if (op.op === 'failContext') {
      assertPersistedPreprod(op.context, 'JOB-001 failContext operation');
      last = queue.failContext(op.job_id, op.context, op.error);
      states.set(last.job_id, last);
    } else throw new Error(`unsupported JOB-001 journal operation: ${op.op}`);
  }
  return { queue, last, states };
}

function restartRecoveryOperations(operations) {
  const { states } = replayJobs(operations);
  return [...states.values()]
    .filter(job => job.status === 'RUNNING')
    .sort((a,b) => a.job_id.localeCompare(b.job_id))
    .map(job => durableSnapshot({ op:'fail', job_id:job.job_id, company_id:job.context.company_id, error:RESTART_RECOVERY_ERROR }));
}

export class PersistentEventBus {
  #journal;
  #operations;
  #bus;

  constructor({ file_path, environment = PREPROD, journal_backend = 'ATOMIC_V8' }) {
    if (environment !== PREPROD) throw new Error('EVT-001 persistent V0 accepts exact PREPROD only');
    this.#journal = createRuntimeJournal({ file_path, kind: 'EVT-001', journal_backend });
    this.#operations = this.#journal.load();
    this.#bus = replayEvents(this.#operations).bus;
  }

  publish(input) {
    const probeBus = replayEvents(this.#operations).bus;
    const probe = probeBus.publish(input);
    if (!probe.accepted) return probe;
    assertPersistedPreprod(probe.event.context, 'EVT-001 event');
    const operation = durableSnapshot({ op: 'publish', input });
    const candidate = [...this.#operations, operation];
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

  constructor({ file_path, environment = PREPROD }) {
    if (environment !== PREPROD) throw new Error('JOB-001 persistent V0 accepts exact PREPROD only');
    this.#journal = new AtomicV8Journal({ file_path, kind: 'JOB-001' });
    this.#operations = this.#journal.load();
    const recoveries = restartRecoveryOperations(this.#operations);
    if (recoveries.length) {
      const recovered = [...this.#operations, ...recoveries];
      replayJobs(recovered);
      this.#journal.commit(recovered);
      this.#operations = recovered;
    }
    this.#queue = replayJobs(this.#operations).queue;
  }

  #apply(operation) {
    replayJobs([...this.#operations, operation]);
    const snapshot = durableSnapshot(operation);
    const candidate = [...this.#operations, snapshot];
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
    assertPersistedPreprod(probe.job.context, 'JOB-001 job');
    return this.#apply({ op: 'enqueue', input });
  }

  claim(company_id) {
    const probeQueue = replayJobs(this.#operations).queue;
    const probe = probeQueue.claim(company_id);
    if (!probe) return null;
    assertPersistedPreprod(probe.context, 'JOB-001 claim');
    return this.#apply({ op: 'claim', company_id });
  }

  claimContext(context) {
    const probeQueue = replayJobs(this.#operations).queue;
    const probe = probeQueue.claimContext(context);
    if (!probe) return null;
    assertPersistedPreprod(probe.context, 'JOB-001 claim');
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

export function createPersistentRuntimeIO({ directory, environment = PREPROD }) {
  if (environment !== PREPROD) throw new Error('persistent runtime V0 accepts exact PREPROD only');
  const root = path.resolve(nonEmpty(directory, 'directory'));
  return Object.freeze({
    events: new PersistentEventBus({ file_path: path.join(root, 'evt-001.v8journal'), environment }),
    jobs: new PersistentJobQueue({ file_path: path.join(root, 'job-001.v8journal'), environment })
  });
}

export const PERSISTENT_RUNTIME_V0_CONTRACT = Object.freeze({
  environment: PREPROD,
  engines: ['EVT-001','JOB-001'],
  persistence: 'local-atomic-v8-journal-reference',
  additional_cost_target_eur: 0,
  supabase_required: false,
  autonomous_prod: false,
  prod_writes: false,
  single_writer_reference: true,
  crash_consistency: 'ancestor-chain-fsync+temp-write+fsync+atomic-rename+directory-fsync',
  restart_recovery: 'durable-running-to-retry-or-failed',
  integrity: 'sha256-envelope',
  ambiguous_durability: 'poison-until-reopen',
  rebuild: 'deterministic-operation-replay'
});
