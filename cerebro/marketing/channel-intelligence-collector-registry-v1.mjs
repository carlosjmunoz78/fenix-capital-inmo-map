import crypto from 'node:crypto';

const PREPROD = 'PREPROD';
const VERSION = '1.0.0';
const CAPABILITY_ID = 'CHANNEL-INTELLIGENCE-V1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const COLLECTOR_STATES = Object.freeze([
  'VERIFIED_READY',
  'CONNECTED_READ_BLOCKED',
  'NOT_CONNECTED',
  'POR_AUDITAR',
  'DISABLED_POLICY'
]);

export const BLOCK_REASONS = Object.freeze([
  'NONE',
  'ZERO_COST_PLAN_LIMIT',
  'NO_AUTHORIZED_ACCOUNT',
  'NO_VERIFIED_READ_ADAPTER',
  'POLICY_DISABLED',
  'LOW_CONFIDENCE'
]);

export const WATCH_REQUIREMENTS = Object.freeze({
  TREND_RADAR: Object.freeze(['SOCIAL_PUBLIC_TRENDS','SEARCH_PUBLIC_TRENDS','SOCIAL_OWN_PERFORMANCE']),
  COMPETITOR_RADAR: Object.freeze(['SOCIAL_PUBLIC_COMPETITOR','PUBLIC_COMPETITOR_OBSERVATION','SEARCH_COMPETITOR']),
  MARKET_RADAR: Object.freeze(['SEARCH_PUBLIC_TRENDS','SEARCH_DEMAND','WEB_ANALYTICS']),
  SEARCH_RADAR: Object.freeze(['SEARCH_DEMAND']),
  CHANNEL_HEALTH: Object.freeze(['SOCIAL_OWN_PERFORMANCE']),
  PLATFORM_CAPABILITY_RADAR: Object.freeze(['PLATFORM_PUBLIC_DOCS']),
  WEB_VISUAL_RADAR: Object.freeze(['WEB_VISUAL_CAPTURE'])
});

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}

function bool(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

function integer(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new TypeError(`${label} must be safe integer >= ${min}`);
  return value;
}

function enumValue(value, allowed, label) {
  const out = text(value, label, 80).toUpperCase();
  if (!allowed.includes(out)) throw new Error(`${label} unsupported: ${out}`);
  return out;
}

function normalizePurposes(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 20) throw new TypeError('purposes must be non-empty array <= 20');
  return Object.freeze([...new Set(values.map((value, index) => text(value, `purposes[${index}]`, 80).toUpperCase()))].sort());
}

function normalizeChannels(values = []) {
  if (!Array.isArray(values) || values.length > 40) throw new TypeError('channels must be array <= 40');
  return Object.freeze([...new Set(values.map((value, index) => text(value, `channels[${index}]`, 80).toLowerCase().replaceAll(' ', '-').replaceAll('_', '-')))].sort());
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function normalizeCollectorDescriptor(raw = {}) {
  const state = enumValue(raw.state, COLLECTOR_STATES, 'state');
  const blockReason = enumValue(raw.block_reason ?? 'NONE', BLOCK_REASONS, 'block_reason');
  const readOnly = bool(raw.read_only ?? true, 'read_only');
  const writeAuthorized = bool(raw.write_authorized ?? false, 'write_authorized');
  const additionalCost = Number(raw.additional_cost_eur ?? 0);
  if (!Number.isFinite(additionalCost) || additionalCost < 0) throw new TypeError('additional_cost_eur invalid');
  if (writeAuthorized) throw new Error('collector registry V1 forbids write authority');
  if (!readOnly) throw new Error('collector registry V1 requires read-only collectors');
  if (state === 'VERIFIED_READY' && blockReason !== 'NONE') throw new Error('VERIFIED_READY collector cannot have block reason');
  if (state !== 'VERIFIED_READY' && blockReason === 'NONE' && state !== 'POR_AUDITAR' && state !== 'NOT_CONNECTED') {
    throw new Error('blocked/disabled collector requires block reason');
  }
  if (additionalCost > 0) throw new Error('collector registry V1 accepts zero-additional-cost paths only');
  const descriptor = Object.freeze({
    collector_id: safeRef(raw.collector_id, 'collector_id'),
    provider: text(raw.provider, 'provider', 100),
    connector_id: text(raw.connector_id, 'connector_id', 120),
    state,
    block_reason: blockReason,
    purposes: normalizePurposes(raw.purposes),
    channels: normalizeChannels(raw.channels),
    account_scope_ref: raw.account_scope_ref == null ? null : safeRef(raw.account_scope_ref, 'account_scope_ref'),
    evidence_ref: safeRef(raw.evidence_ref, 'evidence_ref'),
    evidence_at: text(raw.evidence_at, 'evidence_at', 80),
    read_only: readOnly,
    write_authorized: false,
    publish_authorized: false,
    spend_authorized: false,
    prod_write_authorized: false,
    prod_authorized: false,
    trading_access: false,
    additional_cost_eur: 0,
    priority: integer(raw.priority ?? 100, 'priority')
  });
  if (Number.isNaN(Date.parse(descriptor.evidence_at))) throw new Error('evidence_at invalid');
  return descriptor;
}

function purposeMatches(descriptor, purpose) {
  return descriptor.purposes.includes(purpose);
}

function channelMatches(descriptor, channelId) {
  if (!channelId) return true;
  return descriptor.channels.length === 0 || descriptor.channels.includes(channelId);
}

export function buildCollectorRegistry({company_id, collectors, evidence_at} = {}) {
  const companyId = text(company_id, 'company_id', 160);
  const evidenceAt = text(evidence_at, 'evidence_at', 80);
  if (Number.isNaN(Date.parse(evidenceAt))) throw new Error('evidence_at invalid');
  if (!Array.isArray(collectors) || collectors.length === 0 || collectors.length > 100) throw new TypeError('collectors must be non-empty array <= 100');
  const normalized = collectors.map(normalizeCollectorDescriptor);
  const ids = new Set();
  for (const collector of normalized) {
    if (ids.has(collector.collector_id)) throw new Error(`duplicate collector_id: ${collector.collector_id}`);
    ids.add(collector.collector_id);
  }
  const sorted = Object.freeze([...normalized].sort((a, b) => a.priority - b.priority || a.collector_id.localeCompare(b.collector_id)));
  const result = {
    schema_version: '1.0.0',
    state_type: 'CHANNEL_INTELLIGENCE_COLLECTOR_REGISTRY_V1',
    company_id: companyId,
    engine_id: 'MKT-001',
    capability_id: CAPABILITY_ID,
    environment: PREPROD,
    version: VERSION,
    evidence_at: new Date(evidenceAt).toISOString(),
    collectors: sorted,
    verified_ready_total: sorted.filter((item) => item.state === 'VERIFIED_READY').length,
    blocked_total: sorted.filter((item) => item.state === 'CONNECTED_READ_BLOCKED').length,
    not_connected_total: sorted.filter((item) => item.state === 'NOT_CONNECTED').length,
    por_auditar_total: sorted.filter((item) => item.state === 'POR_AUDITAR').length,
    write_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  };
  result.registry_sha256 = hash(result);
  return Object.freeze(result);
}

export function selectCollectorForWatch({registry, watch_type, channel_id = null} = {}) {
  if (!registry || registry.state_type !== 'CHANNEL_INTELLIGENCE_COLLECTOR_REGISTRY_V1') throw new Error('collector registry required');
  if (registry.environment !== PREPROD || registry.prod_authorized !== false || Number(registry.additional_cost_eur) !== 0) throw new Error('invalid collector registry authority');
  const watchType = text(watch_type, 'watch_type', 80).toUpperCase();
  const requiredPurposes = WATCH_REQUIREMENTS[watchType];
  if (!requiredPurposes) throw new Error(`unsupported watch_type: ${watchType}`);
  const channelId = channel_id == null ? null : text(channel_id, 'channel_id', 80).toLowerCase().replaceAll(' ', '-').replaceAll('_', '-');

  for (const purpose of requiredPurposes) {
    const candidates = registry.collectors.filter((collector) => purposeMatches(collector, purpose) && channelMatches(collector, channelId));
    const ready = candidates.find((collector) => collector.state === 'VERIFIED_READY' && collector.read_only === true && collector.write_authorized === false && collector.additional_cost_eur === 0);
    if (ready) return Object.freeze({
      status: 'COLLECTOR_SELECTED',
      watch_type: watchType,
      purpose,
      channel_id: channelId,
      collector: ready,
      fallback_used: false,
      prod_authorized: false,
      additional_cost_eur: 0
    });
  }

  const relevant = registry.collectors.filter((collector) => requiredPurposes.some((purpose) => purposeMatches(collector, purpose)) && channelMatches(collector, channelId));
  const blocker = relevant.find((collector) => collector.state === 'CONNECTED_READ_BLOCKED') ?? relevant.find((collector) => collector.state === 'POR_AUDITAR') ?? relevant.find((collector) => collector.state === 'NOT_CONNECTED') ?? null;
  return Object.freeze({
    status: 'NO_VERIFIED_COLLECTOR',
    watch_type: watchType,
    channel_id: channelId,
    required_purposes: requiredPurposes,
    blocker: blocker == null ? null : Object.freeze({collector_id: blocker.collector_id, state: blocker.state, block_reason: blocker.block_reason}),
    retry_immediately: false,
    human_required: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function collectorCoverageMatrix(registry) {
  if (!registry || registry.state_type !== 'CHANNEL_INTELLIGENCE_COLLECTOR_REGISTRY_V1') throw new Error('collector registry required');
  const rows = [];
  for (const [watchType, purposes] of Object.entries(WATCH_REQUIREMENTS)) {
    const covered = purposes.some((purpose) => registry.collectors.some((collector) => collector.state === 'VERIFIED_READY' && collector.purposes.includes(purpose)));
    rows.push(Object.freeze({watch_type: watchType, required_purposes: purposes, verified_ready: covered}));
  }
  return Object.freeze(rows);
}
