import crypto from 'node:crypto';

const ENVIRONMENT = 'PREPROD';
const VERSION = 'v1';
const OWNER_ENGINE = 'MKT-001';
const CAPABILITY_ID = 'CHANNEL-INTELLIGENCE-V1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const HUMAN_REASON_SET = new Set(HUMAN_REQUIRED_REASONS);
const FORBIDDEN_KEYS = new Set([
  'email','phone','name','full_name','address','dni','nif','nie','iban','bank_account',
  'password','secret','token','jwt','api_key','apikey','access_token','refresh_token','private_key'
]);

export const CHANNEL_INTELLIGENCE_RUNTIME = Object.freeze({
  owner_engine: OWNER_ENGINE,
  capability_id: CAPABILITY_ID,
  environment: ENVIRONMENT,
  version: VERSION,
  prod_enabled: false,
  publish_enabled: false,
  spend_enabled: false,
  provider_binding_enabled: false,
  new_engine_ids_allowed: false,
  additional_cost_eur: 0
});

export const WEB_PROFILE_ENGINES = Object.freeze([
  'WEB-001','WAUD-001','SEO-001','KW-001','MKT-001','COMPET-001','MKT-002',
  'FRC-001','OPP-001','INN-001','EXP-001','LAB-MKT','LRN-001','EVA-001','SUP-001'
]);

export const CHANNEL_POD_ENGINES = Object.freeze([
  'MKT-001','SOCAUD-001','SOCBOOT-001','COMPET-001','MKT-002','FRC-001',
  'OPP-001','INN-001','EXP-001','LAB-MKT','LRN-001','EVA-001','SUP-001'
]);

export const CHANNEL_POD_ROLES = Object.freeze([
  'CHANNEL_DIRECTOR','TREND_SCOUT','COMPETITOR_SCOUT','AUDIENCE_INTELLIGENCE',
  'MARKET_INTELLIGENCE','CREATIVE_DIRECTOR','FORMAT_SPECIALIST','COPY_SCRIPT',
  'MULTIMEDIA_PRODUCER','PUBLISHER_VERIFICATION','COMMUNITY','EXPERIMENTATION',
  'ANALYTICS','FORECASTING','LEARNING','BRAND_GUARDIAN','POLICY_QA'
]);

export const TREND_STAGES = Object.freeze([
  'SEED','EMERGING','BREAKOUT','MAINSTREAM','SATURATED','DECLINING'
]);

export const INITIAL_CHANNELS = Object.freeze(['instagram','facebook','linkedin']);

export const TREND_WEIGHTS = Object.freeze({
  momentum: 0.14,
  acceleration: 0.18,
  audience_fit: 0.12,
  brand_fit: 0.08,
  commercial_intent: 0.12,
  search_demand: 0.10,
  competitor_gap: 0.10,
  geographic_relevance: 0.06,
  cross_platform_diffusion: 0.10,
  saturation_penalty: 0.15,
  risk_penalty: 0.10,
  cost_penalty: 0.05
});

function text(value, label, max = 240) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}

function score(value, label) {
  const out = Number(value);
  if (!Number.isFinite(out) || out < 0 || out > 100) throw new TypeError(`${label} must be 0..100`);
  return out;
}

function stableHash(value, size = 32) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}

function assertPlainData(value, label = 'input', seen = new WeakSet()) {
  if (value === null || ['string','boolean','undefined'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular data`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPlainData(item, `${label}[${index}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`PII/secret field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function humanReason(value) {
  const out = text(value, 'human_required_reason', 80).toUpperCase();
  if (!HUMAN_REASON_SET.has(out)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return out;
}

function blocked(code, reason, detail, extra = {}) {
  return Object.freeze({
    allowed: false,
    status: 'BLOCKED',
    code,
    blocker: 'HUMAN_REQUIRED',
    human_required_reason: humanReason(reason),
    detail,
    external_side_effect_executed: false,
    prod_authorized: false,
    ...extra
  });
}

function normalizeContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('context object required');
  assertPlainData(raw, 'context');
  const out = Object.freeze({
    company_id: text(raw.company_id, 'context.company_id', 120),
    engine_id: text(raw.engine_id, 'context.engine_id', 80),
    capability_id: text(raw.capability_id, 'context.capability_id', 120),
    environment: text(raw.environment, 'context.environment', 40).toUpperCase(),
    version: text(raw.version, 'context.version', 40)
  });
  if (out.engine_id !== OWNER_ENGINE) throw new Error(`context.engine_id must be ${OWNER_ENGINE}`);
  if (out.capability_id !== CAPABILITY_ID) throw new Error(`context.capability_id must be ${CAPABILITY_ID}`);
  if (out.environment !== ENVIRONMENT) throw new Error('channel intelligence V1 accepts exact PREPROD only');
  if (out.version !== VERSION) throw new Error('channel intelligence V1 accepts exact v1 only');
  return out;
}

function mutationGate(raw, context) {
  const targetCompany = raw.target_company_id == null ? context.company_id : text(raw.target_company_id, 'target_company_id', 120);
  if (targetCompany !== context.company_id) return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company channel intelligence denied.');
  const confidence = raw.confidence == null ? 1 : Number(raw.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('confidence must be 0..1');
  if (confidence < 0.75) return blocked('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (raw.high_risk === true) return blocked('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk case requires human handling.');
  if (raw.customer_human_request === true) return blocked('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (raw.prod_write_requested === true || raw.publish_requested === true || raw.deploy_requested === true) {
    return blocked('PROD_OR_PUBLIC_WRITE_DISABLED', 'POLICY_CONFLICT', 'V1 analysis/planning cannot write or publish to PROD.');
  }
  if (raw.spend_cents != null && Number(raw.spend_cents) > 0) {
    return blocked('SPEND_DISABLED', 'MONEY_LIMIT', 'Paid execution is not authorized in V1.');
  }
  if (raw.purchase_requested === true || raw.subscription_requested === true || raw.paid_api_requested === true) {
    return blocked('PAID_EXECUTION_DISABLED', 'MONEY_LIMIT', 'New paid services are not authorized in V1.');
  }
  if (raw.install_requested === true || raw.provider_call_requested === true || raw.network_write_requested === true) {
    return blocked('EXTERNAL_EXECUTION_DISABLED', 'POLICY_CONFLICT', 'V1 does not install tools or execute provider writes.');
  }
  return Object.freeze({ allowed: true, confidence });
}

function commonGate(raw) {
  assertPlainData(raw, 'request');
  const context = normalizeContext(raw.context);
  const mutation = mutationGate(raw, context);
  if (!mutation.allowed) return mutation;
  return Object.freeze({ allowed: true, context, confidence: mutation.confidence });
}

function normalizeChannel(value) {
  return text(value, 'channel_id', 80).toLowerCase().replaceAll(' ', '-').replaceAll('_', '-');
}

function uniqueStrings(values, label, maxItems = 40) {
  if (!Array.isArray(values) || values.length === 0 || values.length > maxItems) throw new TypeError(`${label} must be a non-empty array <= ${maxItems}`);
  const out = values.map((item, index) => text(item, `${label}[${index}]`, 100));
  return Object.freeze([...new Set(out)]);
}

export function buildWebOperatingProfile(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const siteRef = safeRef(raw.site_ref, 'site_ref');
  return Object.freeze({
    allowed: true,
    status: 'WEB_OPERATING_PROFILE_READY',
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    site_ref: siteRef,
    composed_engines: WEB_PROFILE_ENGINES,
    responsibilities: Object.freeze([
      'VISUAL_AUDIT','UX_UI','CRO','SEO_ARCHITECTURE','TREND_SCAN','COMPETITOR_SCAN',
      'CREATIVE_OPTIONS','OLD_VS_NEW','VISUAL_BASELINE','REGRESSION','LEARNING'
    ]),
    wordpress_prod_write_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0,
    profile_id: `web:${stableHash([gate.context.company_id, siteRef])}`,
    external_side_effect_executed: false
  });
}

export function buildChannelPodProfile(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const channelId = normalizeChannel(raw.channel_id);
  const accountRef = safeRef(raw.account_ref, 'account_ref');
  return Object.freeze({
    allowed: true,
    status: 'CHANNEL_POD_PROFILE_READY',
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    channel_id: channelId,
    account_ref: accountRef,
    composed_engines: CHANNEL_POD_ENGINES,
    roles: CHANNEL_POD_ROLES,
    organic_enabled_for_planning: true,
    paid_enabled_for_planning: true,
    paid_execution_authorized: false,
    publishing_authorized: false,
    provider_binding: false,
    prod_authorized: false,
    additional_cost_eur: 0,
    pod_id: `channel:${stableHash([gate.context.company_id, channelId, accountRef])}`,
    external_side_effect_executed: false
  });
}

function classifyTrend(metrics, declineSignal = false) {
  if (declineSignal) return 'DECLINING';
  if (metrics.saturation >= 80) return 'SATURATED';
  if (metrics.acceleration >= 75 && metrics.momentum >= 65) return 'BREAKOUT';
  if (metrics.momentum >= 78 && metrics.acceleration < 45) return 'MAINSTREAM';
  if (metrics.acceleration >= 45 || metrics.momentum >= 40) return 'EMERGING';
  return 'SEED';
}

export function scoreTrendOpportunity(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const channelId = normalizeChannel(raw.channel_id);
  const signalRef = safeRef(raw.signal_ref, 'signal_ref');
  const metrics = Object.freeze({
    momentum: score(raw.momentum, 'momentum'),
    acceleration: score(raw.acceleration, 'acceleration'),
    audience_fit: score(raw.audience_fit, 'audience_fit'),
    brand_fit: score(raw.brand_fit, 'brand_fit'),
    commercial_intent: score(raw.commercial_intent, 'commercial_intent'),
    search_demand: score(raw.search_demand, 'search_demand'),
    competitor_gap: score(raw.competitor_gap, 'competitor_gap'),
    geographic_relevance: score(raw.geographic_relevance, 'geographic_relevance'),
    cross_platform_diffusion: score(raw.cross_platform_diffusion, 'cross_platform_diffusion'),
    saturation: score(raw.saturation, 'saturation'),
    risk: score(raw.risk, 'risk'),
    cost: score(raw.cost, 'cost')
  });
  const positive =
    metrics.momentum * TREND_WEIGHTS.momentum +
    metrics.acceleration * TREND_WEIGHTS.acceleration +
    metrics.audience_fit * TREND_WEIGHTS.audience_fit +
    metrics.brand_fit * TREND_WEIGHTS.brand_fit +
    metrics.commercial_intent * TREND_WEIGHTS.commercial_intent +
    metrics.search_demand * TREND_WEIGHTS.search_demand +
    metrics.competitor_gap * TREND_WEIGHTS.competitor_gap +
    metrics.geographic_relevance * TREND_WEIGHTS.geographic_relevance +
    metrics.cross_platform_diffusion * TREND_WEIGHTS.cross_platform_diffusion;
  const penalties =
    metrics.saturation * TREND_WEIGHTS.saturation_penalty +
    metrics.risk * TREND_WEIGHTS.risk_penalty +
    metrics.cost * TREND_WEIGHTS.cost_penalty;
  const opportunityScore = Number(Math.max(0, Math.min(100, positive - penalties)).toFixed(2));
  const stage = classifyTrend(metrics, raw.decline_signal === true);
  const recommendation = opportunityScore >= 70 && ['EMERGING','BREAKOUT'].includes(stage)
    ? 'PRIORITIZE_LAB_EXPERIMENT'
    : opportunityScore >= 50 && stage !== 'SATURATED'
      ? 'WATCH_AND_PREPARE'
      : 'HOLD_OR_DISCARD';
  return Object.freeze({
    allowed: true,
    status: 'TREND_OPPORTUNITY_SCORED',
    company_id: gate.context.company_id,
    channel_id: channelId,
    signal_ref: signalRef,
    stage,
    metrics,
    opportunity_score: opportunityScore,
    recommendation,
    experiment_engine: 'EXP-001',
    lab_engine: 'LAB-MKT',
    learning_engine: 'LRN-001',
    prod_authorized: false,
    additional_cost_eur: 0,
    score_version: 'trend-opportunity-v1',
    score_hash: stableHash([channelId, signalRef, metrics, TREND_WEIGHTS]),
    external_side_effect_executed: false
  });
}

export function buildVisualTasteProfile(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const preferred = uniqueStrings(raw.preferred_tags, 'preferred_tags');
  const rejected = raw.rejected_tags == null ? Object.freeze([]) : uniqueStrings(raw.rejected_tags, 'rejected_tags');
  const evidenceRefs = raw.evidence_refs == null ? Object.freeze([]) : Object.freeze(raw.evidence_refs.map((ref, index) => safeRef(ref, `evidence_refs[${index}]`)));
  const payload = Object.freeze({ preferred_tags: preferred, rejected_tags: rejected, evidence_refs: evidenceRefs });
  return Object.freeze({
    allowed: true,
    status: 'VISUAL_TASTE_PROFILE_READY',
    company_id: gate.context.company_id,
    profile: payload,
    profile_hash: stableHash(payload),
    owner_preference_is_one_signal_not_absolute_rule: true,
    learning_engine: 'LRN-001',
    prod_authorized: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  });
}

export function buildCrossChannelInsight(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  if (raw.copy_asset_requested === true || raw.copy_post_requested === true) {
    return blocked('CROSS_CHANNEL_BLIND_COPY_DENIED', 'POLICY_CONFLICT', 'Transfer insight, not a blind copy of the original creative.');
  }
  const fromChannel = normalizeChannel(raw.from_channel_id);
  const toChannel = normalizeChannel(raw.to_channel_id);
  if (fromChannel === toChannel) throw new Error('cross-channel insight requires different channels');
  const insightRef = safeRef(raw.insight_ref, 'insight_ref');
  const transferable = uniqueStrings(raw.transferable_signals, 'transferable_signals');
  return Object.freeze({
    allowed: true,
    status: 'CROSS_CHANNEL_INSIGHT_READY',
    company_id: gate.context.company_id,
    from_channel_id: fromChannel,
    to_channel_id: toChannel,
    insight_ref: insightRef,
    transferable_signals: transferable,
    original_asset_copy_authorized: false,
    target_channel_reinterpretation_required: true,
    route_to: Object.freeze(['MKT-001','SOCBOOT-001','EXP-001','LRN-001']),
    prod_authorized: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  });
}

export function planNewChannelBootstrap(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const channelId = normalizeChannel(raw.channel_id);
  const manifestRef = safeRef(raw.channel_manifest_ref, 'channel_manifest_ref');
  const evidenceRef = safeRef(raw.research_evidence_ref, 'research_evidence_ref');
  return Object.freeze({
    allowed: true,
    status: 'NEW_CHANNEL_BOOTSTRAP_PLAN_READY',
    company_id: gate.context.company_id,
    channel_id: channelId,
    channel_manifest_ref: manifestRef,
    research_evidence_ref: evidenceRef,
    pipeline: Object.freeze([
      'RESEARCH','TERMS_API_POLICY','FORMATS','METRICS','AUDIENCE','COMPETITION','TRENDS',
      'CHANNEL_MANIFEST','FACTORY_SCAFFOLD','ADAPTERS','TEMPLATES','LAB','PREPROD','E2E','GOVERNED_PROMOTION'
    ]),
    composed_engines: Object.freeze([
      'SOCAUD-001','SOCBOOT-001','MKT-001','COMPET-001','MKT-002','FRC-001','OPP-001',
      'INN-001','EXP-001','LAB-MKT','LRN-001','FACT-001','EVA-001','SUP-001'
    ]),
    creates_new_engine_id: false,
    creates_channel_pod_profile: true,
    provider_binding: false,
    installation_authorized: false,
    publishing_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  });
}

export function buildChannelIntelligencePlan(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const channels = raw.channels == null ? INITIAL_CHANNELS : Object.freeze([...new Set(raw.channels.map(normalizeChannel))]);
  if (channels.length === 0) throw new TypeError('channels must not be empty');
  const siteRef = safeRef(raw.site_ref, 'site_ref');
  const accountRefs = raw.account_refs && typeof raw.account_refs === 'object' ? raw.account_refs : {};
  const web = buildWebOperatingProfile({ ...raw, site_ref: siteRef });
  if (!web.allowed) return web;
  const pods = channels.map((channelId) => buildChannelPodProfile({
    ...raw,
    channel_id: channelId,
    account_ref: safeRef(accountRefs[channelId] ?? `account:${channelId}:pending`, `account_refs.${channelId}`)
  }));
  const blockedPod = pods.find((pod) => !pod.allowed);
  if (blockedPod) return blockedPod;
  return Object.freeze({
    allowed: true,
    status: 'CHANNEL_INTELLIGENCE_PLAN_READY',
    company_id: gate.context.company_id,
    environment: ENVIRONMENT,
    version: VERSION,
    web,
    channel_pods: Object.freeze(pods),
    continuous_loops: Object.freeze([
      'MARKET_RADAR','COMPETITOR_RADAR','TREND_RADAR','SEARCH_RADAR','WEB_VISUAL_RADAR',
      'EXPERIMENTATION','RESULT_MEASUREMENT','LEARNING','CROSS_CHANNEL_INSIGHT'
    ]),
    event_job_engines: Object.freeze(['EVT-001','JOB-001']),
    policy_engines: Object.freeze(['POL-001','HEX-001']),
    evaluation_engines: Object.freeze(['EVA-001','SUP-001']),
    prod_authorized: false,
    autonomous_prod: false,
    additional_cost_eur: 0,
    idempotency_key: stableHash([gate.context.company_id, siteRef, channels, accountRefs]),
    external_side_effect_executed: false
  });
}
