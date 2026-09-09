import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';
import { AtomicV8Journal } from './persistent-runtime.mjs';

const PREPROD = 'PREPROD';
const MICRO_EUR = 1_000_000;
const MAX_MICRO_EUR_EXACT_EUR = Math.floor((1 / Number.EPSILON) / MICRO_EUR);
const LEVELS = new Set(['DEBUG','INFO','WARN','ERROR','CRITICAL']);
const LEDGER_STATE = new WeakMap();

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function assertLedgerValue(value, label = 'value', seen = new Set()) {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} must contain only finite numbers`);
    return;
  }
  if (type !== 'object') throw new TypeError(`${label} contains an unsupported value type: ${type}`);
  if (seen.has(value)) throw new TypeError(`${label} must not contain circular references`);
  seen.add(value);
  try {
    const isArray = Array.isArray(value);
    const proto = Object.getPrototypeOf(value);
    if (!isArray && proto !== Object.prototype && proto !== null) {
      throw new TypeError(`${label} must contain only plain objects and arrays`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[key];
      if ('get' in descriptor || 'set' in descriptor) throw new TypeError(`${label} must not contain accessor properties`);
      if (typeof key === 'symbol') {
        if (descriptor.enumerable) throw new TypeError(`${label} must not contain enumerable symbol keys`);
        continue;
      }
      if (isArray && key === 'length') continue;
      if (!descriptor.enumerable) continue;
      assertLedgerValue(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function safeClone(value, label = 'value') {
  assertLedgerValue(value, label);
  return deserialize(serialize(value));
}

function context(value, label = 'context') {
  if (!value || typeof value !== 'object') throw new TypeError(`${label} must be an object`);
  const out = {
    company_id: nonEmpty(value.company_id, `${label}.company_id`),
    engine_id: nonEmpty(value.engine_id, `${label}.engine_id`),
    environment: nonEmpty(value.environment, `${label}.environment`),
    version: nonEmpty(value.version, `${label}.version`)
  };
  if (out.environment !== PREPROD) throw new Error(`${label} must use exact PREPROD`);
  return Object.freeze(out);
}

function sameContext(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, 24)}`;
}

function ensureInteger(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new TypeError(`${label} must be a safe integer >= ${min}`);
  return value;
}

function isoInstant(value, label = 'occurred_at') {
  const text = nonEmpty(value, label);
  const millis = Date.parse(text);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== text) throw new TypeError(`${label} must be a canonical ISO-8601 UTC instant`);
  return text;
}

function nowInstant() { return new Date().toISOString(); }

function eurToMicros(value) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError('cost_eur must be a finite non-negative number');
  if (value > MAX_MICRO_EUR_EXACT_EUR) throw new RangeError(`cost_eur exceeds reliable micro-euro Number precision (${MAX_MICRO_EUR_EXACT_EUR} EUR max)`);
  const scaled = value * MICRO_EUR;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) {
    throw new TypeError('cost_eur must be representable exactly at micro-euro precision');
  }
  return rounded;
}

function microsToEur(value) {
  ensureInteger(value, 'cost_eur_micros');
  const eur = value / MICRO_EUR;
  if (eur > MAX_MICRO_EUR_EXACT_EUR || !Number.isSafeInteger(Math.round(eur * MICRO_EUR)) || Math.round(eur * MICRO_EUR) !== value) {
    throw new RangeError('aggregated cost exceeds reliable micro-euro Number precision');
  }
  return eur;
}

function loadRecords(journal, validator) {
  const records = journal.load();
  if (!Array.isArray(records)) throw new Error('ledger state must be an array');
  records.forEach((record, index) => validator(record, index, records));
  return records;
}

function canonicalAuditBody(record) {
  return {
    audit_id: record.audit_id,
    context: record.context,
    correlation_id: record.correlation_id,
    occurred_at: record.occurred_at,
    actor: record.actor,
    action: record.action,
    target: record.target,
    before: record.before,
    after: record.after,
    reason: record.reason,
    result: record.result,
    sequence: record.sequence,
    previous_hash: record.previous_hash
  };
}

function auditHash(record) {
  return crypto.createHash('sha256').update(serialize(canonicalAuditBody(record))).digest('hex');
}

function validateObs(record, index) {
  if (!record || record.kind !== 'OBSERV-001') throw new Error('invalid OBSERV-001 record');
  context(record.context, 'record.context');
  nonEmpty(record.correlation_id, 'record.correlation_id');
  if (!LEVELS.has(record.level)) throw new Error('invalid observability level');
  nonEmpty(record.message, 'record.message');
  safeClone(record.data, 'record.data');
  if (record.sequence !== index + 1) throw new Error('observability sequence mismatch');
  const expectedId = stableId('obs', [record.context, record.correlation_id, record.sequence, record.level, record.message, record.data]);
  if (record.observation_id !== expectedId) throw new Error('observability id mismatch');
}

function validateAudit(record, index, records) {
  if (!record || record.kind !== 'AUD-001') throw new Error('invalid AUD-001 record');
  context(record.context, 'record.context');
  nonEmpty(record.correlation_id, 'record.correlation_id');
  isoInstant(record.occurred_at, 'record.occurred_at');
  nonEmpty(record.actor, 'record.actor');
  nonEmpty(record.action, 'record.action');
  nonEmpty(record.result, 'record.result');
  safeClone(record.target, 'record.target');
  safeClone(record.before, 'record.before');
  safeClone(record.after, 'record.after');
  if (record.reason !== null && typeof record.reason !== 'string') throw new Error('record.reason must be null or string');
  if (record.sequence !== index + 1) throw new Error('audit sequence mismatch');
  const expectedPrev = index === 0 ? null : records[index - 1].record_hash;
  if (record.previous_hash !== expectedPrev) throw new Error('audit previous_hash mismatch');
  const expectedId = stableId('audit', [record.context, record.correlation_id, record.occurred_at, record.actor, record.action, record.sequence, record.previous_hash]);
  if (record.audit_id !== expectedId) throw new Error('audit id mismatch');
  if (record.record_hash !== auditHash(record)) throw new Error('audit record_hash mismatch');
}

function validateCost(record, index) {
  if (!record || record.kind !== 'FINOPS-001') throw new Error('invalid FINOPS-001 record');
  context(record.context, 'record.context');
  nonEmpty(record.correlation_id, 'record.correlation_id');
  nonEmpty(record.task_id, 'record.task_id');
  nonEmpty(record.provider, 'record.provider');
  ensureInteger(record.cost_eur_micros, 'record.cost_eur_micros');
  safeClone(record.metadata, 'record.metadata');
  if (record.sequence !== index + 1) throw new Error('cost sequence mismatch');
  const expectedId = stableId('cost', [record.context, record.correlation_id, record.task_id, record.provider, record.cost_eur_micros, record.sequence]);
  if (record.cost_event_id !== expectedId) throw new Error('cost event id mismatch');
}

function ledgerState(ledger) {
  const state = LEDGER_STATE.get(ledger);
  if (!state) throw new Error('invalid operational ledger instance');
  return state;
}

function ledgerCommit(ledger, record) {
  const state = ledgerState(ledger);
  const snapshot = safeClone(record, 'record');
  const candidate = [...state.records, snapshot];
  candidate.forEach((item, index) => state.validator(item, index, candidate));
  state.journal.commit(candidate);
  state.records = candidate;
  return safeClone(snapshot, 'record');
}

function ledgerRecordsSnapshot(ledger) { return safeClone(ledgerState(ledger).records, 'records'); }
function ledgerRecordCount(ledger) { return ledgerState(ledger).records.length; }
function ledgerLastRecord(ledger) {
  const records = ledgerState(ledger).records;
  return records.length ? safeClone(records[records.length - 1], 'record') : null;
}

class BaseLedger {
  constructor({ file_path, kind, validator, environment = PREPROD }) {
    if (environment !== PREPROD) throw new Error(`${kind} persistent V0 accepts exact PREPROD only`);
    const journal = new AtomicV8Journal({ file_path, kind });
    LEDGER_STATE.set(this, { journal, validator, records: loadRecords(journal, validator) });
  }

  list() { return ledgerRecordsSnapshot(this); }
  get operation_count() { return ledgerRecordCount(this); }
  get journal_path() { return ledgerState(this).journal.file_path; }
}

export class ObservabilityLedgerV0 extends BaseLedger {
  constructor(options) { super({ ...options, kind: 'OBSERV-001', validator: validateObs }); }

  record({ context: ctx, correlation_id, level = 'INFO', message, data = {} }) {
    const safeCtx = context(ctx);
    const safeLevel = nonEmpty(level, 'level');
    if (!LEVELS.has(safeLevel)) throw new Error('invalid observability level');
    const safeCorrelation = nonEmpty(correlation_id, 'correlation_id');
    const safeMessage = nonEmpty(message, 'message');
    const safeData = safeClone(data, 'data');
    const sequence = ledgerRecordCount(this) + 1;
    const record = {
      kind: 'OBSERV-001',
      observation_id: stableId('obs', [safeCtx, safeCorrelation, sequence, safeLevel, safeMessage, safeData]),
      context: safeCtx,
      correlation_id: safeCorrelation,
      level: safeLevel,
      message: safeMessage,
      data: safeData,
      sequence
    };
    return ledgerCommit(this, record);
  }

  listForContext(ctx) {
    const safeCtx = context(ctx);
    return ledgerRecordsSnapshot(this).filter(r => sameContext(r.context, safeCtx));
  }

  listForCorrelation(company_id, correlation_id) {
    const company = nonEmpty(company_id, 'company_id');
    const correlation = nonEmpty(correlation_id, 'correlation_id');
    return ledgerRecordsSnapshot(this).filter(r => r.context.company_id === company && r.correlation_id === correlation);
  }
}

export class AuditLedgerV0 extends BaseLedger {
  constructor(options) { super({ ...options, kind: 'AUD-001', validator: validateAudit }); }

  append({ context: ctx, correlation_id, occurred_at = nowInstant(), actor, action, target = null, before = null, after = null, reason = null, result }) {
    const safeCtx = context(ctx);
    const safeOccurredAt = isoInstant(occurred_at);
    const safeCorrelation = nonEmpty(correlation_id, 'correlation_id');
    const safeActor = nonEmpty(actor, 'actor');
    const safeAction = nonEmpty(action, 'action');
    const sequence = ledgerRecordCount(this) + 1;
    const previous = ledgerLastRecord(this);
    const previous_hash = previous?.record_hash ?? null;
    const record = {
      kind: 'AUD-001',
      audit_id: stableId('audit', [safeCtx, safeCorrelation, safeOccurredAt, safeActor, safeAction, sequence, previous_hash]),
      context: safeCtx,
      correlation_id: safeCorrelation,
      occurred_at: safeOccurredAt,
      actor: safeActor,
      action: safeAction,
      target: safeClone(target, 'target'),
      before: safeClone(before, 'before'),
      after: safeClone(after, 'after'),
      reason: reason === null ? null : String(reason),
      result: nonEmpty(result, 'result'),
      sequence,
      previous_hash
    };
    record.record_hash = auditHash(record);
    return ledgerCommit(this, record);
  }

  verify() {
    const records = ledgerRecordsSnapshot(this);
    records.forEach((record, index) => validateAudit(record, index, records));
    return { valid: true, records: records.length, last_hash: records.at(-1)?.record_hash ?? null };
  }

  listForCompany(company_id) {
    const company = nonEmpty(company_id, 'company_id');
    return ledgerRecordsSnapshot(this).filter(r => r.context.company_id === company);
  }
}

export class CostLedgerV0 extends BaseLedger {
  constructor(options) { super({ ...options, kind: 'FINOPS-001', validator: validateCost }); }

  record({ context: ctx, correlation_id, task_id, provider = 'LOCAL', cost_eur = 0, metadata = {} }) {
    const safeCtx = context(ctx);
    const safeCorrelation = nonEmpty(correlation_id, 'correlation_id');
    const safeTaskId = nonEmpty(task_id, 'task_id');
    const safeProvider = nonEmpty(provider, 'provider');
    const micros = eurToMicros(cost_eur);
    const sequence = ledgerRecordCount(this) + 1;
    const record = {
      kind: 'FINOPS-001',
      cost_event_id: stableId('cost', [safeCtx, safeCorrelation, safeTaskId, safeProvider, micros, sequence]),
      context: safeCtx,
      correlation_id: safeCorrelation,
      task_id: safeTaskId,
      provider: safeProvider,
      cost_eur_micros: micros,
      metadata: safeClone(metadata, 'metadata'),
      sequence
    };
    return ledgerCommit(this, record);
  }

  aggregate({ company_id, engine_id = null, provider = null } = {}) {
    const company = nonEmpty(company_id, 'company_id');
    const safeEngine = engine_id === null ? null : nonEmpty(engine_id, 'engine_id');
    const safeProvider = provider === null ? null : nonEmpty(provider, 'provider');
    let records = ledgerRecordsSnapshot(this).filter(r => r.context.company_id === company);
    if (safeEngine !== null) records = records.filter(r => r.context.engine_id === safeEngine);
    if (safeProvider !== null) records = records.filter(r => r.provider === safeProvider);
    const micros = records.reduce((sum, r) => sum + r.cost_eur_micros, 0);
    if (!Number.isSafeInteger(micros)) throw new Error('aggregated cost exceeds safe integer range');
    return { company_id: company, engine_id: safeEngine, provider: safeProvider, events: records.length, cost_eur: microsToEur(micros), cost_eur_micros: micros };
  }
}

export function createOperationalLedgersV0({ root_dir, environment = PREPROD }) {
  const root = nonEmpty(root_dir, 'root_dir').replace(/\/$/, '');
  return Object.freeze({
    observability: new ObservabilityLedgerV0({ file_path: `${root}/observability.v8`, environment }),
    audit: new AuditLedgerV0({ file_path: `${root}/audit.v8`, environment }),
    finops: new CostLedgerV0({ file_path: `${root}/finops.v8`, environment })
  });
}

export const OPERATIONAL_LEDGERS_V0_CONTRACT = Object.freeze({
  environment: PREPROD,
  engines: Object.freeze(['OBSERV-001','AUD-001','FINOPS-001']),
  persistence: 'local-atomic-v8-journal-reference',
  append_only_logical_records: true,
  internal_mutable_state: 'module-private-weakmap-with-non-exported-commit-path',
  accepted_payload_grammar: 'finite-json-like-primitives+arrays+plain-data-objects-no-accessors-no-cycles',
  audit_integrity: 'sha256-hash-chain-not-authenticated-tamper-proofing',
  audit_when: 'canonical-iso8601-utc-instant-hash-covered',
  correlation_id_required: true,
  cost_precision: 'micro-eur-safe-integer-with-number-resolution-bound',
  aggregate_cost_precision: 'reject-number-aggregate-if-micro-eur-roundtrip-is-not-exact',
  max_reliable_cost_eur: MAX_MICRO_EUR_EXACT_EUR,
  supabase_required: false,
  additional_cost_target_eur: 0,
  shared_runtime_replaced: false,
  app_or_web_writes: false,
  trading_access: false,
  prod_writes: false,
  autonomous_prod: false,
  single_writer_reference: true
});
