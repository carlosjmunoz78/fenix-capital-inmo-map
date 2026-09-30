import path from 'node:path';
import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';
import { AtomicV8Journal } from './persistent-runtime.mjs';

const PREPROD = 'PREPROD';
const KINDS = new Set(['OBSERV-001', 'AUD-001', 'FINOPS-001']);
const SIGNALS = new Set(['LOG', 'METRIC', 'TRACE', 'HEALTH']);
const SEVERITIES = new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']);
const RFC3339_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function safeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative safe integer`);
  return value;
}

function oneOf(value, allowed, label) {
  const normalized = nonEmpty(value, label);
  if (!allowed.has(normalized)) throw new TypeError(`${label} is unsupported`);
  return normalized;
}

function canonicalValue(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite numbers are not supported');
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') throw new TypeError('only deterministic JSON-like values are supported');
  if (seen.has(value)) throw new TypeError('cyclic values are not supported');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => canonicalValue(item, seen));
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new TypeError('only arrays and plain objects are supported');
    }
    const symbolKeys = Object.getOwnPropertySymbols(value);
    if (symbolKeys.length) throw new TypeError('symbol keys are not supported');
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || descriptor.get || descriptor.set) throw new TypeError('accessor properties are not supported');
      out[key] = canonicalValue(descriptor.value, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function durableClone(value) {
  return deserialize(serialize(value));
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(serialize(canonicalValue(value))).digest('hex').slice(0, 24)}`;
}

function canonicalContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('context must be an object');
  const normalized = Object.freeze({
    company_id: nonEmpty(context.company_id, 'context.company_id'),
    engine_id: nonEmpty(context.engine_id, 'context.engine_id'),
    environment: nonEmpty(context.environment, 'context.environment'),
    version: nonEmpty(context.version, 'context.version')
  });
  if (normalized.environment !== PREPROD) throw new Error('telemetry runtime V0 accepts exact PREPROD only');
  if (normalized.engine_id === 'LAB-TRD') throw new Error('Trading LAB is isolated from CEREBRO telemetry runtime V0');
  return normalized;
}

function sameContext(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

function occurredAt(value) {
  const text = nonEmpty(value, 'occurred_at');
  if (!RFC3339_UTC.test(text) || !Number.isFinite(Date.parse(text))) throw new TypeError('occurred_at must be an RFC3339 UTC timestamp');
  return text;
}

function commonInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('record input must be an object');
  return {
    context: canonicalContext(input.context),
    correlation_id: nonEmpty(input.correlation_id, 'correlation_id'),
    occurred_at: occurredAt(input.occurred_at)
  };
}

function observabilityFields(input) {
  return {
    signal: oneOf(input.signal, SIGNALS, 'signal'),
    severity: oneOf(input.severity ?? 'INFO', SEVERITIES, 'severity'),
    name: nonEmpty(input.name, 'name'),
    data: canonicalValue(input.data ?? {})
  };
}

function auditFields(input) {
  return {
    actor: nonEmpty(input.actor, 'actor'),
    action: nonEmpty(input.action, 'action'),
    reason: nonEmpty(input.reason, 'reason'),
    result: nonEmpty(input.result, 'result'),
    before: canonicalValue(input.before ?? null),
    after: canonicalValue(input.after ?? null),
    data: canonicalValue(input.data ?? {})
  };
}

function finopsFields(input) {
  return {
    task_id: nonEmpty(input.task_id, 'task_id'),
    provider: nonEmpty(input.provider, 'provider'),
    category: nonEmpty(input.category ?? 'GENERAL', 'category'),
    cost_micros: safeInteger(input.cost_micros ?? 0, 'cost_micros'),
    savings_micros: safeInteger(input.savings_micros ?? 0, 'savings_micros'),
    data: canonicalValue(input.data ?? {})
  };
}

function kindFields(kind, input) {
  if (kind === 'OBSERV-001') return observabilityFields(input);
  if (kind === 'AUD-001') return auditFields(input);
  if (kind === 'FINOPS-001') return finopsFields(input);
  throw new Error(`unsupported telemetry ledger kind: ${kind}`);
}

function buildRecord(kind, input) {
  oneOf(kind, KINDS, 'kind');
  const common = commonInput(input);
  const fields = kindFields(kind, input);
  const identitySeed = { kind, ...common, ...fields };
  const idempotency_key = input.idempotency_key === undefined
    ? stableId('idem', identitySeed)
    : nonEmpty(input.idempotency_key, 'idempotency_key');
  const scope = stableId('scope', [kind, common.context.company_id, common.context.engine_id, common.context.environment, common.context.version, idempotency_key]);
  const record = {
    record_id: stableId('record', [kind, scope]),
    kind,
    ...common,
    ...fields,
    idempotency_key
  };
  return durableClone(record);
}

function serializedEqual(a, b) {
  return serialize(a).equals(serialize(b));
}

function replay(kind, operations) {
  const records = [];
  const byScope = new Map();
  for (const operation of operations) {
    if (!operation || operation.op !== 'append' || !operation.record) throw new Error(`invalid ${kind} journal operation`);
    const rebuilt = buildRecord(kind, operation.record);
    if (!serializedEqual(rebuilt, operation.record)) throw new Error(`${kind} journal record is non-canonical or corrupted`);
    const scope = stableId('scope', [kind, rebuilt.context.company_id, rebuilt.context.engine_id, rebuilt.context.environment, rebuilt.context.version, rebuilt.idempotency_key]);
    if (byScope.has(scope)) throw new Error(`${kind} journal contains duplicate accepted idempotency scope`);
    byScope.set(scope, rebuilt);
    records.push(rebuilt);
  }
  return { records, byScope };
}

export class PersistentAppendLedger {
  #kind;
  #journal;
  #operations;
  #records;
  #byScope;

  constructor({ kind, file_path, environment = PREPROD }) {
    this.#kind = oneOf(kind, KINDS, 'kind');
    if (environment !== PREPROD) throw new Error('telemetry runtime V0 accepts exact PREPROD only');
    this.#journal = new AtomicV8Journal({ file_path, kind: this.#kind });
    this.#operations = this.#journal.load();
    const state = replay(this.#kind, this.#operations);
    this.#records = state.records;
    this.#byScope = state.byScope;
  }

  append(input) {
    const record = buildRecord(this.#kind, input);
    const scope = stableId('scope', [this.#kind, record.context.company_id, record.context.engine_id, record.context.environment, record.context.version, record.idempotency_key]);
    const existing = this.#byScope.get(scope);
    if (existing) return { accepted: false, duplicate: true, record: durableClone(existing) };
    const operation = durableClone({ op: 'append', record });
    const candidate = [...this.#operations, operation];
    const state = replay(this.#kind, candidate);
    this.#journal.commit(candidate);
    this.#operations = candidate;
    this.#records = state.records;
    this.#byScope = state.byScope;
    return { accepted: true, duplicate: false, record: durableClone(record) };
  }

  listForCompany(company_id) {
    const company = nonEmpty(company_id, 'company_id');
    return this.#records.filter(record => record.context.company_id === company).map(durableClone);
  }

  listForContext(context) {
    const ctx = canonicalContext(context);
    return this.#records.filter(record => sameContext(record.context, ctx)).map(durableClone);
  }

  aggregateForCompany(company_id) {
    if (this.#kind !== 'FINOPS-001') throw new Error('aggregateForCompany is available only for FINOPS-001');
    const records = this.listForCompany(company_id);
    let cost = 0n;
    let savings = 0n;
    for (const record of records) {
      cost += BigInt(record.cost_micros);
      savings += BigInt(record.savings_micros);
    }
    return Object.freeze({
      company_id: nonEmpty(company_id, 'company_id'),
      event_count: records.length,
      total_cost_micros: cost.toString(),
      total_savings_micros: savings.toString()
    });
  }

  get kind() { return this.#kind; }
  get journal_path() { return this.#journal.file_path; }
  get operation_count() { return this.#operations.length; }
}

export function createTelemetryRuntime({ directory, environment = PREPROD }) {
  if (environment !== PREPROD) throw new Error('telemetry runtime V0 accepts exact PREPROD only');
  const root = path.resolve(nonEmpty(directory, 'directory'));
  return Object.freeze({
    observability: new PersistentAppendLedger({ kind: 'OBSERV-001', file_path: path.join(root, 'observ-001.v8journal'), environment }),
    audit: new PersistentAppendLedger({ kind: 'AUD-001', file_path: path.join(root, 'aud-001.v8journal'), environment }),
    finops: new PersistentAppendLedger({ kind: 'FINOPS-001', file_path: path.join(root, 'finops-001.v8journal'), environment })
  });
}

export const TELEMETRY_RUNTIME_V0_CONTRACT = Object.freeze({
  environment: PREPROD,
  engines: ['OBSERV-001', 'AUD-001', 'FINOPS-001'],
  persistence: 'local-atomic-v8-journal-reference',
  append_only_reference: true,
  correlation_id_required: true,
  canonical_context: ['company_id', 'engine_id', 'environment', 'version'],
  cost_unit: 'micro-euro-integer',
  additional_cost_target_eur: 0,
  supabase_required: false,
  shared_runtime_replaced: false,
  app_web_touched: false,
  trading_access: false,
  autonomous_prod: false,
  prod_writes: false,
  single_writer_reference: true,
  integrity: 'sha256-envelope',
  crash_consistency: 'reuse-AtomicV8Journal',
  rebuild: 'deterministic-operation-replay',
  scaling_limit: 'whole-history-replay-and-rewrite-V0'
});
