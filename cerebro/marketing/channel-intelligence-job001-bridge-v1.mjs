import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';

const PREPROD = 'PREPROD';
const VERSION = '1.0.0';
const ENGINE_ID = 'MKT-001';
const CAPABILITY_ID = 'CHANNEL-INTELLIGENCE-V1';
const JOB_NAME = 'CHANNEL_INTELLIGENCE_WATCH_V1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const WATCH_CADENCE_V1 = Object.freeze({
  TREND_RADAR: Object.freeze({interval_ms: 3 * 60 * 60 * 1000, priority: 10}),
  COMPETITOR_RADAR: Object.freeze({interval_ms: 12 * 60 * 60 * 1000, priority: 20}),
  MARKET_RADAR: Object.freeze({interval_ms: 12 * 60 * 60 * 1000, priority: 20}),
  SEARCH_RADAR: Object.freeze({interval_ms: 24 * 60 * 60 * 1000, priority: 30}),
  CHANNEL_HEALTH: Object.freeze({interval_ms: 6 * 60 * 60 * 1000, priority: 10}),
  PLATFORM_CAPABILITY_RADAR: Object.freeze({interval_ms: 24 * 60 * 60 * 1000, priority: 30}),
  WEB_VISUAL_RADAR: Object.freeze({interval_ms: 24 * 60 * 60 * 1000, priority: 30})
});

const CHANNEL_SCOPED = Object.freeze([
  'TREND_RADAR','COMPETITOR_RADAR','CHANNEL_HEALTH','PLATFORM_CAPABILITY_RADAR'
]);
const GLOBAL_SCOPED = Object.freeze(['MARKET_RADAR','SEARCH_RADAR']);

function required(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = required(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}

function normalizeChannel(value) {
  return required(value, 'channel_id', 80).toLowerCase().replaceAll(' ', '-').replaceAll('_', '-');
}

function uniqueChannels(values) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('channels must be a non-empty array');
  if (values.length > 40) throw new TypeError('channels maximum is 40');
  return Object.freeze([...new Set(values.map(normalizeChannel))].sort());
}

function integer(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative safe integer`);
  return value;
}

function cycleId(watchType, intervalMs, nowMs) {
  const bucket = Math.floor(nowMs / intervalMs);
  return `${watchType.toLowerCase()}:${bucket}`;
}

function watchEntry({watch_type, company_id, channel_id = null, site_ref = null, now_ms}) {
  const cadence = WATCH_CADENCE_V1[watch_type];
  if (!cadence) throw new Error(`unsupported watch_type: ${watch_type}`);
  const cycle = cycleId(watch_type, cadence.interval_ms, now_ms);
  const scope = channel_id ? `channel:${channel_id}` : site_ref ? `site:${site_ref}` : 'global';
  return Object.freeze({
    watch_type,
    company_id,
    channel_id,
    site_ref,
    scope,
    cadence_interval_ms: cadence.interval_ms,
    priority: cadence.priority,
    cycle_id: cycle,
    idempotency_key: `channel-intelligence:${company_id}:${scope}:${cycle}`,
    correlation_id: `channel-intelligence:${company_id}:${watch_type.toLowerCase()}`,
    data_access: 'AUTHORIZED_PUBLIC_OR_CONNECTED_READ_ONLY',
    collector_adapter_required: true,
    collector_binding_verified: false,
    external_write_authorized: false,
    publish_authorized: false,
    spend_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function buildChannelIntelligenceWatchPlan({
  company_id,
  channels,
  site_ref,
  official_web_baseline_ready = false,
  now_ms = Date.now()
} = {}) {
  const companyId = required(company_id, 'company_id', 160);
  const channelIds = uniqueChannels(channels);
  const siteRef = safeRef(site_ref, 'site_ref');
  const nowMs = integer(now_ms, 'now_ms');
  if (typeof official_web_baseline_ready !== 'boolean') throw new TypeError('official_web_baseline_ready must be boolean');

  const jobs = [];
  for (const channelId of channelIds) {
    for (const watchType of CHANNEL_SCOPED) jobs.push(watchEntry({watch_type: watchType, company_id: companyId, channel_id: channelId, now_ms: nowMs}));
  }
  for (const watchType of GLOBAL_SCOPED) jobs.push(watchEntry({watch_type: watchType, company_id: companyId, now_ms: nowMs}));
  if (official_web_baseline_ready) jobs.push(watchEntry({watch_type: 'WEB_VISUAL_RADAR', company_id: companyId, site_ref: siteRef, now_ms: nowMs}));

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CHANNEL_INTELLIGENCE_WATCH_PLAN_V1',
    company_id: companyId,
    engine_id: ENGINE_ID,
    capability_id: CAPABILITY_ID,
    environment: PREPROD,
    version: VERSION,
    generated_at_ms: nowMs,
    channels: channelIds,
    site_ref: siteRef,
    official_web_baseline_ready,
    jobs: Object.freeze(jobs),
    web_visual_radar_status: official_web_baseline_ready ? 'READY_TO_SCHEDULE_PREPROD' : 'BLOCKED_UNTIL_OFFICIAL_PROD_BASELINE_STABLE',
    existing_job_runtime: 'JOB-001',
    new_scheduler_created: false,
    physical_collectors_bound: false,
    prod_authorized: false,
    prod_write_authorized: false,
    publish_authorized: false,
    spend_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
}

function assertPlan(plan) {
  if (!plan || plan.state_type !== 'CHANNEL_INTELLIGENCE_WATCH_PLAN_V1') throw new Error('CHANNEL_INTELLIGENCE_WATCH_PLAN_REQUIRED');
  if (plan.environment !== PREPROD || plan.engine_id !== ENGINE_ID || plan.capability_id !== CAPABILITY_ID) throw new Error('CHANNEL_INTELLIGENCE_PREPROD_PLAN_REQUIRED');
  if (plan.prod_authorized !== false || plan.prod_write_authorized !== false || plan.publish_authorized !== false || plan.spend_authorized !== false || Number(plan.additional_cost_eur) !== 0) {
    throw new Error('CHANNEL_INTELLIGENCE_AUTHORITY_EXPANSION_DENIED');
  }
  return plan;
}

export function enqueueChannelIntelligenceWatchPlan({job_runtime, plan, now_ms = Date.now()} = {}) {
  if (!job_runtime || typeof job_runtime.enqueue !== 'function') throw new TypeError('job_runtime with enqueue required');
  const safePlan = assertPlan(plan);
  const nowMs = integer(now_ms, 'now_ms');
  const context = Object.freeze({
    company_id: safePlan.company_id,
    engine_id: ENGINE_ID,
    environment: PREPROD,
    version: VERSION
  });
  const receipts = safePlan.jobs.map((job, index) => job_runtime.enqueue({
    name: JOB_NAME,
    context,
    payload: {
      schema_version: '1.0.0',
      state_type: 'CHANNEL_INTELLIGENCE_WATCH_JOB_PAYLOAD_V1',
      capability_id: CAPABILITY_ID,
      watch_type: job.watch_type,
      channel_id: job.channel_id,
      site_ref: job.site_ref,
      scope: job.scope,
      cycle_id: job.cycle_id,
      data_access: job.data_access,
      collector_adapter_required: true,
      collector_binding_verified: false,
      analysis_only_until_binding: true,
      route_engines: ['MKT-001','COMPET-001','MKT-002','SOCAUD-001','FRC-001','OPP-001','EXP-001','LAB-MKT','LRN-001'],
      prod_authorized: false,
      prod_write_authorized: false,
      publish_authorized: false,
      spend_authorized: false,
      trading_access: false,
      additional_cost_eur: 0
    },
    priority: job.priority,
    max_attempts: 3,
    timeout_ms: 120000,
    idempotency_key: job.idempotency_key,
    correlation_id: job.correlation_id,
    now_ms: nowMs + index,
    retry: {base_delay_ms: 1000, max_delay_ms: 60000, jitter_ratio: 0.1}
  }));
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CHANNEL_INTELLIGENCE_JOB001_DISPATCH_V1',
    status: 'WATCH_JOBS_DISPATCHED_PREPROD',
    context,
    total: receipts.length,
    accepted_total: receipts.filter((receipt) => receipt.accepted).length,
    duplicate_total: receipts.filter((receipt) => receipt.duplicate).length,
    receipts: Object.freeze(receipts),
    worker_handler_registered: false,
    physical_collectors_bound: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    prod_write_authorized: false,
    publish_authorized: false,
    spend_authorized: false,
    trading_access: false,
    additional_cost_eur: 0,
    next_gate: 'BIND_READ_ONLY_COLLECTOR_ADAPTERS_AND_REGISTER_WATCH_WORKER_HANDLER'
  });
}

export function runChannelIntelligenceWatchIngress({
  company_root,
  company_id,
  channels,
  site_ref,
  official_web_baseline_ready = false,
  now_ms = Date.now()
} = {}) {
  const root = required(company_root, 'company_root', 500);
  const plan = buildChannelIntelligenceWatchPlan({company_id, channels, site_ref, official_web_baseline_ready, now_ms});
  const runtime = new DurableJobRuntimeV1({
    file_path: path.join(root, 'job001-channel-intelligence.v1.journal'),
    environment: PREPROD
  });
  const dispatch = enqueueChannelIntelligenceWatchPlan({job_runtime: runtime, plan, now_ms});
  return Object.freeze({
    plan,
    dispatch,
    journal_path: runtime.journal_path,
    operation_count: runtime.operation_count
  });
}

export const CHANNEL_INTELLIGENCE_JOB001_BRIDGE_V1_CONTRACT = Object.freeze({
  environment: PREPROD,
  capability_id: CAPABILITY_ID,
  job_name: JOB_NAME,
  existing_job_runtime: 'JOB-001',
  shared_persistent_journal: true,
  new_scheduler_created: false,
  web_visual_radar_requires_official_prod_baseline_ready: true,
  physical_collectors_bound: false,
  worker_handler_registered: false,
  prod_authorized: false,
  prod_write_authorized: false,
  publish_authorized: false,
  spend_authorized: false,
  trading_access: false,
  additional_cost_eur: 0
});
