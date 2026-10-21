import crypto from 'node:crypto';
import {selectCollectorForWatch} from './channel-intelligence-collector-registry-v1.mjs';

const PREPROD = 'PREPROD';
const ENGINE_ID = 'MKT-001';
const CAPABILITY_ID = 'CHANNEL-INTELLIGENCE-V1';
const JOB_NAME = 'CHANNEL_INTELLIGENCE_WATCH_V1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const FORBIDDEN_KEYS = new Set([
  'email','phone','mobile','dni','nif','nie','iban','bank_account','password','secret',
  'token','jwt','api_key','apikey','access_token','refresh_token','private_key','authorization'
]);

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be opaque safe reference`);
  return out;
}

function assertPlainSafe(value, label = 'value', seen = new WeakSet()) {
  if (value === null || ['string','boolean','undefined'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular value`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPlainSafe(item, `${label}[${index}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`forbidden secret/PII field: ${label}.${key}`);
      assertPlainSafe(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function sha(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function context(companyId) {
  return Object.freeze({company_id: companyId, engine_id: ENGINE_ID, environment: PREPROD, version: '1.0.0'});
}

function validateClaimedJob(job, companyId) {
  if (!job) return null;
  if (job.name !== JOB_NAME) throw new Error(`POLICY_CONFLICT:UNEXPECTED_JOB_NAME:${job.name}`);
  if (job.context.company_id !== companyId || job.context.engine_id !== ENGINE_ID || job.context.environment !== PREPROD) {
    throw new Error('SECURITY_INCIDENT:JOB_CONTEXT_MISMATCH');
  }
  const payload = job.payload;
  assertPlainSafe(payload, 'job.payload');
  if (payload?.capability_id !== CAPABILITY_ID || payload?.state_type !== 'CHANNEL_INTELLIGENCE_WATCH_JOB_PAYLOAD_V1') {
    throw new Error('POLICY_CONFLICT:INVALID_JOB_PAYLOAD');
  }
  if (payload.prod_authorized !== false || payload.prod_write_authorized !== false || payload.publish_authorized !== false || payload.spend_authorized !== false || payload.trading_access !== false || Number(payload.additional_cost_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:JOB_AUTHORITY_EXPANSION');
  }
  return payload;
}

function validateCollectorResult(result, {companyId, collectorId, watchType}) {
  assertPlainSafe(result, 'collector.result');
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new TypeError('collector result object required');
  if (result.company_id !== companyId) throw new Error('SECURITY_INCIDENT:COLLECTOR_COMPANY_MISMATCH');
  if (result.collector_id !== collectorId) throw new Error('POLICY_CONFLICT:COLLECTOR_ID_MISMATCH');
  if (result.watch_type !== watchType) throw new Error('POLICY_CONFLICT:WATCH_TYPE_MISMATCH');
  if (result.read_only !== true || result.external_side_effect_executed !== false || result.write_authorized !== false || result.prod_authorized !== false || Number(result.additional_cost_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:COLLECTOR_RESULT_AUTHORITY');
  }
  const observedAt = text(result.observed_at, 'collector.result.observed_at', 80);
  if (Number.isNaN(Date.parse(observedAt))) throw new Error('collector.result.observed_at invalid');
  const normalized = Object.freeze({
    company_id: companyId,
    collector_id: collectorId,
    watch_type: watchType,
    channel_id: result.channel_id ?? null,
    observed_at: new Date(observedAt).toISOString(),
    signal_count: Number.isSafeInteger(result.signal_count) && result.signal_count >= 0 ? result.signal_count : 0,
    evidence_ref: safeRef(result.evidence_ref, 'collector.result.evidence_ref'),
    payload_ref: result.payload_ref == null ? null : safeRef(result.payload_ref, 'collector.result.payload_ref'),
    read_only: true,
    external_side_effect_executed: false,
    write_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
  return Object.freeze({...normalized, result_sha256: sha(normalized)});
}

export async function processOneChannelIntelligenceJob({
  job_runtime,
  collector_registry,
  collector_adapters = {},
  company_id,
  worker_id = 'channel-intelligence-worker-v1',
  now_ms = Date.now(),
  lease_ms = 120000
} = {}) {
  if (!job_runtime || typeof job_runtime.claim !== 'function' || typeof job_runtime.complete !== 'function' || typeof job_runtime.fail !== 'function') {
    throw new TypeError('job_runtime with claim/complete/fail required');
  }
  const companyId = text(company_id, 'company_id', 160);
  const workerId = safeRef(worker_id, 'worker_id');
  const job = job_runtime.claim({context: context(companyId), worker_id: workerId, now_ms, lease_ms});
  if (!job) return Object.freeze({status: 'NO_JOB', company_id: companyId, external_side_effect_executed: false});

  try {
    const payload = validateClaimedJob(job, companyId);
    const selection = selectCollectorForWatch({
      registry: collector_registry,
      watch_type: payload.watch_type,
      channel_id: payload.channel_id
    });

    if (selection.status !== 'COLLECTOR_SELECTED') {
      const result = Object.freeze({
        status: 'SKIPPED_NO_VERIFIED_COLLECTOR',
        company_id: companyId,
        watch_type: payload.watch_type,
        channel_id: payload.channel_id,
        blocker: selection.blocker,
        retry_immediately: false,
        human_required: false,
        external_side_effect_executed: false,
        prod_authorized: false,
        additional_cost_eur: 0
      });
      const completed = job_runtime.complete({job_id: job.job_id, worker_id: workerId, result, now_ms: now_ms + 1});
      return Object.freeze({status: result.status, job_id: job.job_id, completed_status: completed.status, result});
    }

    const collector = selection.collector;
    const adapter = collector_adapters[collector.collector_id];
    if (typeof adapter !== 'function') {
      const result = Object.freeze({
        status: 'SKIPPED_NO_BOUND_ADAPTER',
        company_id: companyId,
        collector_id: collector.collector_id,
        watch_type: payload.watch_type,
        channel_id: payload.channel_id,
        retry_immediately: false,
        human_required: false,
        external_side_effect_executed: false,
        prod_authorized: false,
        additional_cost_eur: 0
      });
      const completed = job_runtime.complete({job_id: job.job_id, worker_id: workerId, result, now_ms: now_ms + 1});
      return Object.freeze({status: result.status, job_id: job.job_id, completed_status: completed.status, result});
    }

    const rawResult = await adapter(Object.freeze({
      company_id: companyId,
      collector_id: collector.collector_id,
      connector_id: collector.connector_id,
      watch_type: payload.watch_type,
      channel_id: payload.channel_id,
      scope: payload.scope,
      cycle_id: payload.cycle_id,
      data_access: 'AUTHORIZED_PUBLIC_OR_CONNECTED_READ_ONLY',
      write_authorized: false,
      publish_authorized: false,
      spend_authorized: false,
      prod_authorized: false,
      additional_cost_eur: 0
    }));
    const normalized = validateCollectorResult(rawResult, {companyId, collectorId: collector.collector_id, watchType: payload.watch_type});
    const result = Object.freeze({
      status: 'READ_ONLY_COLLECTION_SUCCEEDED',
      company_id: companyId,
      watch_type: payload.watch_type,
      channel_id: payload.channel_id,
      collector_id: collector.collector_id,
      collection: normalized,
      external_side_effect_executed: false,
      prod_authorized: false,
      additional_cost_eur: 0
    });
    const completed = job_runtime.complete({job_id: job.job_id, worker_id: workerId, result, now_ms: now_ms + 1});
    return Object.freeze({status: result.status, job_id: job.job_id, completed_status: completed.status, result});
  } catch (error) {
    const failed = job_runtime.fail({job_id: job.job_id, worker_id: workerId, error, now_ms: now_ms + 1});
    return Object.freeze({
      status: failed.status === 'DEAD_LETTER' ? 'JOB_DEAD_LETTER' : 'JOB_RETRY_WAIT',
      job_id: job.job_id,
      job_status: failed.status,
      error: String(error),
      external_side_effect_executed: false
    });
  }
}

export const CHANNEL_INTELLIGENCE_WORKER_V1_CONTRACT = Object.freeze({
  engine_id: ENGINE_ID,
  capability_id: CAPABILITY_ID,
  environment: PREPROD,
  job_name: JOB_NAME,
  collector_selection: 'ZERO_COST_VERIFIED_READ_ONLY_ONLY',
  no_verified_collector_behavior: 'COMPLETE_SAFE_SKIP_NO_RETRY_STORM',
  verified_collector_without_adapter_behavior: 'COMPLETE_SAFE_SKIP_NO_RETRY_STORM',
  adapter_error_behavior: 'JOB001_RETRY_POLICY',
  prod_authorized: false,
  publish_authorized: false,
  spend_authorized: false,
  trading_access: false,
  additional_cost_eur: 0
});
