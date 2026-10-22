import {createHash} from 'node:crypto';
import {auditWebsite, auditSocial} from '../multicompany/post-scan-parallel-v1.mjs';
import {bootstrapSocial} from '../multicompany/bootstrap-tier-v1.mjs';
import {
  buildChannelIntelligencePlan,
  scoreTrendOpportunity,
  INITIAL_CHANNELS
} from './channel-intelligence-runtime-v1.mjs';

export const CHANNEL_INTELLIGENCE_ADAPTER_VERSION = '1.0.0';
export const CHANNEL_INTELLIGENCE_ADAPTER_ENVIRONMENT = 'PREPROD';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const FORBIDDEN_KEY = /(?:token|secret|password|api_key|apikey|authorization|credential|private_key|email|phone|mobile|dni|nif|iban)/i;

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value), 'utf8').digest('hex');
}

function req(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new Error(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = req(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe ref`);
  return out;
}

function rejectForbidden(value, path = 'root', seen = new WeakSet()) {
  if (value == null || ['string','number','boolean'].includes(typeof value)) return;
  if (typeof value !== 'object') throw new Error(`${path} unsupported value`);
  if (seen.has(value)) throw new Error(`${path} circular value`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => rejectForbidden(item, `${path}[${index}]`, seen));
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) throw new Error(`SECURITY_INCIDENT:${path}.${key}`);
      rejectForbidden(item, `${path}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function assertUpstream(result, companyId, engineId) {
  if (!result || result.company_id !== companyId || result.engine_id !== engineId) {
    throw new Error(`POLICY_CONFLICT:UPSTREAM_${engineId}_SCOPE`);
  }
  if (result.environment !== 'PREPROD') throw new Error(`POLICY_CONFLICT:UPSTREAM_${engineId}_ENV`);
  if (result.human_required_code) throw new Error(`LOW_CONFIDENCE:UPSTREAM_${engineId}`);
  if (result.prod_authorized === true || result.prod_write_authorized === true || result.trading_access === true) {
    throw new Error(`POLICY_CONFLICT:UPSTREAM_${engineId}_AUTHORITY`);
  }
  if (Number(result.additional_cost_eur || 0) !== 0) throw new Error(`MONEY_LIMIT:UPSTREAM_${engineId}`);
}

function normalizeChannel(value) {
  return req(value, 'channel_id', 80).toLowerCase().replaceAll(' ', '-').replaceAll('_', '-');
}

function channelsFromSocialAudit(socialAudit, requestedChannels = []) {
  const observed = (socialAudit?.payload?.profiles || []).map((profile) => normalizeChannel(profile.platform)).filter(Boolean);
  const requested = (requestedChannels || []).map(normalizeChannel);
  const channels = [...new Set([...requested, ...observed])];
  return channels.length ? channels : [...INITIAL_CHANNELS];
}

function opaqueAccountRefs(companyId, socialAudit, channels) {
  const profiles = socialAudit?.payload?.profiles || [];
  const refs = {};
  for (const channel of channels) {
    const matching = profiles.filter((profile) => normalizeChannel(profile.platform) === channel);
    const material = matching.map((profile) => ({source: profile.source, url_hash: sha256(String(profile.url || '')).slice(0, 16)}));
    refs[channel] = `account:${channel}:${sha256([companyId, channel, material]).slice(0, 20)}`;
  }
  return Object.freeze(refs);
}

function capabilityContext(companyId) {
  return Object.freeze({
    company_id: companyId,
    engine_id: 'MKT-001',
    capability_id: 'CHANNEL-INTELLIGENCE-V1',
    environment: 'PREPROD',
    version: 'v1'
  });
}

function scoreTrendSignals(companyId, trendSignals = []) {
  if (!Array.isArray(trendSignals)) throw new Error('trend_signals must be array');
  if (trendSignals.length > 100) throw new Error('trend_signals maximum is 100');
  return Object.freeze(trendSignals.map((signal, index) => {
    rejectForbidden(signal, `trend_signals[${index}]`);
    return scoreTrendOpportunity({
      context: capabilityContext(companyId),
      confidence: signal.confidence ?? 1,
      channel_id: signal.channel_id,
      signal_ref: safeRef(signal.signal_ref, `trend_signals[${index}].signal_ref`),
      momentum: signal.momentum,
      acceleration: signal.acceleration,
      audience_fit: signal.audience_fit,
      brand_fit: signal.brand_fit,
      commercial_intent: signal.commercial_intent,
      search_demand: signal.search_demand,
      competitor_gap: signal.competitor_gap,
      geographic_relevance: signal.geographic_relevance,
      cross_platform_diffusion: signal.cross_platform_diffusion,
      saturation: signal.saturation,
      risk: signal.risk,
      cost: signal.cost,
      decline_signal: signal.decline_signal === true
    });
  }));
}

export function adaptExistingSocialWebBootstrap({
  company_id,
  evidence_at,
  website_audit,
  social_audit,
  social_bootstrap,
  site_ref,
  requested_channels = [],
  trend_signals = []
} = {}) {
  const companyId = req(company_id, 'company_id', 160);
  const evidenceAt = req(evidence_at, 'evidence_at', 80);
  if (Number.isNaN(Date.parse(evidenceAt))) throw new Error('evidence_at invalid');
  rejectForbidden({website_audit, social_audit, social_bootstrap, requested_channels, trend_signals}, 'input');
  assertUpstream(website_audit, companyId, 'WAUD-001');
  assertUpstream(social_audit, companyId, 'SOCAUD-001');
  assertUpstream(social_bootstrap, companyId, 'SOCBOOT-001');

  const channels = channelsFromSocialAudit(social_audit, requested_channels);
  const accountRefs = opaqueAccountRefs(companyId, social_audit, channels);
  const siteRef = safeRef(site_ref, 'site_ref');
  const plan = buildChannelIntelligencePlan({
    context: capabilityContext(companyId),
    confidence: 1,
    site_ref: siteRef,
    channels,
    account_refs: accountRefs
  });
  if (!plan.allowed) throw new Error(`POLICY_CONFLICT:CHANNEL_PLAN_${plan.code || 'BLOCKED'}`);

  const trends = scoreTrendSignals(companyId, trend_signals);
  const prioritized = trends
    .filter((trend) => trend.allowed && trend.recommendation === 'PRIORITIZE_LAB_EXPERIMENT')
    .map((trend) => ({channel_id: trend.channel_id, signal_ref: trend.signal_ref, score: trend.opportunity_score, stage: trend.stage}))
    .sort((a, b) => b.score - a.score || a.signal_ref.localeCompare(b.signal_ref));

  const evidenceRefs = Object.freeze({
    website_audit: website_audit.evidence_sha256,
    social_audit: social_audit.evidence_sha256,
    social_bootstrap: social_bootstrap.evidence_sha256
  });
  const result = {
    company_id: companyId,
    engine_id: 'MKT-001',
    capability_id: 'CHANNEL-INTELLIGENCE-V1',
    environment: CHANNEL_INTELLIGENCE_ADAPTER_ENVIRONMENT,
    version: CHANNEL_INTELLIGENCE_ADAPTER_VERSION,
    evidence_at: new Date(evidenceAt).toISOString(),
    source_engine_ids: Object.freeze(['WAUD-001','SOCAUD-001','SOCBOOT-001']),
    evidence_refs: evidenceRefs,
    web_profile_id: plan.web.profile_id,
    channel_pods: Object.freeze(plan.channel_pods.map((pod) => Object.freeze({channel_id: pod.channel_id, pod_id: pod.pod_id, account_ref: pod.account_ref}))),
    trend_results: trends,
    prioritized_lab_candidates: Object.freeze(prioritized),
    orchestration: Object.freeze({
      existing_post_scan_reused: true,
      existing_social_bootstrap_reused: true,
      new_scheduler_created: false,
      event_job_engines: Object.freeze(['EVT-001','JOB-001']),
      experiment_engine: 'EXP-001',
      lab_engine: 'LAB-MKT',
      learning_engine: 'LRN-001',
      evaluation_engine: 'EVA-001',
      supervisor_engine: 'SUP-001'
    }),
    read_only: true,
    plan_only: true,
    publish_authorized: false,
    spend_authorized: false,
    provider_binding: false,
    prod_authorized: false,
    prod_write_authorized: false,
    autonomous_prod: false,
    trading_access: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  };
  result.evidence_sha256 = sha256({company_id: companyId, evidence_at: result.evidence_at, evidence_refs: evidenceRefs, channels, trend_results: trends});
  result.result_sha256 = sha256(result);
  return Object.freeze(result);
}

export function buildChannelIntelligenceFromExistingScan({
  company_id,
  evidence_at,
  scan_result,
  pages = [],
  public_social_evidence = [],
  brand_context = {},
  business_context = {},
  content_pillars = [],
  formats = [],
  cadence = [],
  site_ref,
  requested_channels = [],
  trend_signals = []
} = {}) {
  const companyId = req(company_id, 'company_id', 160);
  rejectForbidden({scan_result, pages, public_social_evidence, brand_context, business_context, content_pillars, formats, cadence, requested_channels, trend_signals}, 'input');
  const websiteAudit = auditWebsite({company_id: companyId, evidence_at, scan_result, pages});
  const socialAudit = auditSocial({company_id: companyId, evidence_at, scan_result, public_social_evidence});
  if (websiteAudit.human_required_code) throw new Error(`LOW_CONFIDENCE:UPSTREAM_WAUD-001`);
  if (socialAudit.human_required_code) throw new Error(`LOW_CONFIDENCE:UPSTREAM_SOCAUD-001`);
  const socialBootstrap = bootstrapSocial({
    company_id: companyId,
    evidence_at,
    social_audit: socialAudit,
    brand_context,
    business_context,
    content_pillars,
    formats,
    cadence
  });
  if (socialBootstrap.human_required_code) throw new Error('LOW_CONFIDENCE:UPSTREAM_SOCBOOT-001');
  return adaptExistingSocialWebBootstrap({
    company_id: companyId,
    evidence_at,
    website_audit: websiteAudit,
    social_audit: socialAudit,
    social_bootstrap: socialBootstrap,
    site_ref,
    requested_channels,
    trend_signals
  });
}

export function channelIntelligenceAdapterPersistenceEnvelope(result, {idempotency_key, recorded_by} = {}) {
  if (!result || result.engine_id !== 'MKT-001' || result.capability_id !== 'CHANNEL-INTELLIGENCE-V1' || result.environment !== 'PREPROD') {
    throw new Error('invalid channel intelligence adapter result');
  }
  if (result.read_only !== true || result.plan_only !== true || result.prod_authorized !== false || result.prod_write_authorized !== false || result.trading_access !== false || Number(result.additional_cost_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:ADAPTER_AUTHORITY');
  }
  return Object.freeze({
    company_id: result.company_id,
    engine_id: result.engine_id,
    capability_id: result.capability_id,
    environment: result.environment,
    version: result.version,
    evidence_at: result.evidence_at,
    evidence_sha256: result.evidence_sha256,
    result_sha256: result.result_sha256,
    web_profile_id: result.web_profile_id,
    channel_pod_count: result.channel_pods.length,
    trend_result_count: result.trend_results.length,
    prioritized_lab_candidate_count: result.prioritized_lab_candidates.length,
    idempotency_key: safeRef(idempotency_key, 'idempotency_key'),
    recorded_by: safeRef(recorded_by, 'recorded_by'),
    publish_authorized: false,
    spend_authorized: false,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
}
