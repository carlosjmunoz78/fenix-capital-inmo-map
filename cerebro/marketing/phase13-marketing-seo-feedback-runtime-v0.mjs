import crypto from 'node:crypto';

const ENVIRONMENT = 'PREPROD';
const VERSION = 'phase13-marketing-seo-feedback-v0';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const CANONICAL_ENGINES = new Set([
  'MKT-001','COMPET-001','EVA-001','CAP-001','SEO-001','LOCALP-001',
  'SOCAUD-001','WEB-001','LRN-001','OBSERV-001'
]);

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_REASON_SET = new Set(HUMAN_REQUIRED_REASONS);

export const PHASE13_BLOCKS = Object.freeze({
  CLAUDE_ADS_PATTERNS: 152,
  ADS_AUDIT: 153,
  COMPETITOR_ADS_SCAN: 154,
  CREATIVE_TESTING: 155,
  LANDING_EXPERIMENTATION: 156,
  SEO_EXISTING_WRAP: 157,
  LOCAL_SEO: 158,
  SOCIAL_AUDIT: 159,
  CONSENT_TOOLS_BENCHMARK: 160,
  OFFLINE_CONVERSION_FEEDBACK: 161
});

const FORBIDDEN_KEYS = new Set([
  'email','email_address','phone','phone_number','telephone','mobile','first_name','last_name',
  'full_name','name','address','dni','nif','nie','iban','bank_account','card_number','password',
  'secret','token','jwt','api_key','apikey','access_token','refresh_token','private_key',
  'race','ethnicity','religion','health','diagnosis','sexual_orientation','political_affiliation',
  'union_membership','raw_ad','raw_page','raw_profile','raw_review','raw_message','cookie_value'
]);

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
function bool(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}
function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const out = Number(value);
  if (!Number.isFinite(out) || out < min || out > max) throw new TypeError(`${label} invalid`);
  return out;
}
function count(value, label, { min = 0, max = 1_000_000 } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} invalid`);
  return value;
}
function cents(value, label, { min = 0, max = 1_000_000_000_000 } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be integer cents`);
  return value;
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
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`raw PII/secret/sensitive/content field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}
function normalizeContext(raw, expectedEngine) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('context object required');
  assertPlainData(raw, 'context');
  const out = Object.freeze({
    company_id: text(raw.company_id, 'context.company_id', 120),
    engine_id: text(raw.engine_id, 'context.engine_id', 80),
    environment: text(raw.environment, 'context.environment', 40).toUpperCase(),
    version: text(raw.version, 'context.version', 80)
  });
  if (!CANONICAL_ENGINES.has(out.engine_id)) throw new Error(`unsupported canonical engine: ${out.engine_id}`);
  if (expectedEngine && out.engine_id !== expectedEngine) throw new Error(`context.engine_id must be ${expectedEngine}`);
  if (out.environment !== ENVIRONMENT) throw new Error('phase 13 runtime accepts exact PREPROD only');
  return out;
}
function canonicalHumanReason(value) {
  const out = text(value, 'human_required_reason', 80).toUpperCase();
  if (!HUMAN_REASON_SET.has(out)) throw new Error(`noncanonical HUMAN_REQUIRED reason: ${out}`);
  return out;
}
function blocked(code, reason, detail, extra = {}) {
  return Object.freeze({
    allowed: false,
    status: 'BLOCKED',
    code,
    blocker: 'HUMAN_REQUIRED',
    human_required_reason: canonicalHumanReason(reason),
    detail,
    external_side_effect_executed: false,
    prod_authorized: false,
    ...extra
  });
}
function commonGate(raw, expectedEngine) {
  assertPlainData(raw, 'request');
  const context = normalizeContext(raw.context, expectedEngine);
  const targetCompany = raw.target_company_id == null ? context.company_id : text(raw.target_company_id, 'target_company_id', 120);
  if (targetCompany !== context.company_id) return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company marketing execution is denied.');
  const confidence = finite(raw.confidence ?? 1, 'confidence', { min: 0, max: 1 });
  if (confidence < 0.75) return blocked('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (raw.customer_human_request === true) return blocked('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (raw.high_risk === true) return blocked('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk case requires human handling.');
  if (raw.prod_write_requested === true) return blocked('PROD_WRITE_DISABLED', 'POLICY_CONFLICT', 'Phase 13 V0 cannot write PROD.');
  return Object.freeze({ allowed: true, context, confidence });
}
function sideEffectGate(raw = {}) {
  const spend = bool(raw.ad_spend_requested ?? false, 'ad_spend_requested');
  const budgetIncrease = bool(raw.budget_increase_requested ?? false, 'budget_increase_requested');
  const platformPublish = bool(raw.platform_publish_requested ?? false, 'platform_publish_requested');
  const websiteWrite = bool(raw.website_write_requested ?? false, 'website_write_requested');
  const seoWrite = bool(raw.seo_write_requested ?? false, 'seo_write_requested');
  const gbpWrite = bool(raw.gbp_write_requested ?? false, 'gbp_write_requested');
  const socialWrite = bool(raw.social_write_requested ?? false, 'social_write_requested');
  const offlineUpload = bool(raw.offline_conversion_upload_requested ?? false, 'offline_conversion_upload_requested');
  const consentInstall = bool(raw.consent_tool_install_requested ?? false, 'consent_tool_install_requested');
  if (spend || budgetIncrease) return blocked('MONEY_MUTATION_DISABLED', 'MONEY_LIMIT', 'Ad spend and budget increases are disabled in V0.');
  if (platformPublish || websiteWrite || seoWrite || gbpWrite || socialWrite || offlineUpload || consentInstall) {
    return blocked('EXTERNAL_MUTATION_DISABLED', 'POLICY_CONFLICT', 'External publish/write/upload/install is disabled in V0.');
  }
  return Object.freeze({ allowed: true });
}
function sourceMode(value) {
  const mode = text(value ?? 'PUBLIC_OR_AUTHORIZED', 'source_mode', 40).toUpperCase();
  if (!['PUBLIC_OR_AUTHORIZED','AUTHORIZED_CONNECTOR','PUBLIC_WEB'].includes(mode)) throw new Error('source_mode must be public or authorized');
  return mode;
}

export function buildNeutralAdsPatternPlan(raw = {}) {
  const gate = commonGate(raw, 'MKT-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  return Object.freeze({
    allowed: true,
    status: 'NEUTRAL_ADS_PATTERN_PLAN_READY',
    block: PHASE13_BLOCKS.CLAUDE_ADS_PATTERNS,
    company_id: gate.context.company_id,
    engine_id: 'MKT-001',
    environment: ENVIRONMENT,
    version: VERSION,
    campaign_ref: safeRef(raw.campaign_ref, 'campaign_ref'),
    pattern_ref: safeRef(raw.pattern_ref, 'pattern_ref'),
    provider_dependency: 'NONE',
    claude_required: false,
    portable_skill_components: Object.freeze([
      'AUDIENCE_HYPOTHESIS','ANGLE_VARIANT','CREATIVE_VARIANT','LANDING_MATCH',
      'MEASUREMENT_PLAN','ECONOMIC_STOP_SCALE_SEAM'
    ]),
    publishing_authorized: false,
    budget_mutation_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function auditAdsReadiness(raw = {}) {
  const gate = commonGate(raw, 'MKT-001');
  if (!gate.allowed) return gate;
  const checks = Object.freeze({
    tracking_present: bool(raw.tracking_present ?? false, 'tracking_present'),
    offline_conversion_path_defined: bool(raw.offline_conversion_path_defined ?? false, 'offline_conversion_path_defined'),
    budget_cap_defined: bool(raw.budget_cap_defined ?? false, 'budget_cap_defined'),
    consent_ready: bool(raw.consent_ready ?? false, 'consent_ready'),
    attribution_ready: bool(raw.attribution_ready ?? false, 'attribution_ready'),
    landing_alignment_ready: bool(raw.landing_alignment_ready ?? false, 'landing_alignment_ready'),
    creative_count: count(raw.creative_count ?? 0, 'creative_count', { max: 10000 })
  });
  const gaps = [];
  if (!checks.tracking_present) gaps.push('TRACKING_MISSING');
  if (!checks.offline_conversion_path_defined) gaps.push('OFFLINE_CONVERSION_PATH_MISSING');
  if (!checks.budget_cap_defined) gaps.push('BUDGET_CAP_MISSING');
  if (!checks.consent_ready) gaps.push('CONSENT_NOT_READY_FOR_LIVE_EXECUTION');
  if (!checks.attribution_ready) gaps.push('ATTRIBUTION_MISSING');
  if (!checks.landing_alignment_ready) gaps.push('LANDING_ALIGNMENT_MISSING');
  if (checks.creative_count < 2) gaps.push('INSUFFICIENT_CREATIVE_VARIANTS');
  return Object.freeze({
    allowed: true,
    status: gaps.length ? 'ADS_AUDIT_GAPS_FOUND' : 'ADS_AUDIT_READY_FOR_NEXT_GATE',
    block: PHASE13_BLOCKS.ADS_AUDIT,
    company_id: gate.context.company_id,
    engine_id: 'MKT-001',
    audit_ref: safeRef(raw.audit_ref, 'audit_ref'),
    checks,
    gaps: Object.freeze(gaps),
    live_execution_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildCompetitorAdsScanPlan(raw = {}) {
  const gate = commonGate(raw, 'COMPET-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  const mode = sourceMode(raw.source_mode);
  if (raw.prohibited_scraping_requested === true) return blocked('PROHIBITED_SCRAPING_DENIED', 'POLICY_CONFLICT', 'Competitor ads scan may use public web or authorized connectors only.');
  if (!Array.isArray(raw.competitor_refs) || raw.competitor_refs.length < 1) throw new TypeError('competitor_refs required');
  const refs = Object.freeze(raw.competitor_refs.map((value, index) => safeRef(value, `competitor_refs[${index}]`)));
  return Object.freeze({
    allowed: true,
    status: 'COMPETITOR_ADS_SCAN_PLAN_READY',
    block: PHASE13_BLOCKS.COMPETITOR_ADS_SCAN,
    company_id: gate.context.company_id,
    engine_id: 'COMPET-001',
    scan_ref: safeRef(raw.scan_ref, 'scan_ref'),
    competitor_refs: refs,
    source_mode: mode,
    scan_dimensions: Object.freeze(['OFFER','ANGLE','FORMAT','CTA','LANDING_MATCH','VISIBLE_POSITIONING']),
    continuous_scraping: false,
    remote_execution_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildCreativeTestPlan(raw = {}) {
  const gate = commonGate(raw, 'MKT-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  if (!Array.isArray(raw.variant_refs) || raw.variant_refs.length < 1 || raw.variant_refs.length > 10) throw new TypeError('variant_refs must contain 1-10 variants');
  return Object.freeze({
    allowed: true,
    status: 'CREATIVE_TEST_PLAN_READY',
    block: PHASE13_BLOCKS.CREATIVE_TESTING,
    company_id: gate.context.company_id,
    engine_id: 'MKT-001',
    evaluation_engine: 'EVA-001',
    experiment_ref: safeRef(raw.experiment_ref, 'experiment_ref'),
    hypothesis_ref: safeRef(raw.hypothesis_ref, 'hypothesis_ref'),
    control_ref: safeRef(raw.control_ref, 'control_ref'),
    variant_refs: Object.freeze(raw.variant_refs.map((value, index) => safeRef(value, `variant_refs[${index}]`))),
    primary_metric: 'CONTRIBUTION_MARGIN_CENTS',
    secondary_metrics: Object.freeze(['QUALIFIED_LEAD_RATE','CONVERSION_RATE']),
    publish_authorized: false,
    spend_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildLandingExperimentPlan(raw = {}) {
  const gate = commonGate(raw, 'MKT-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  return Object.freeze({
    allowed: true,
    status: 'LANDING_EXPERIMENT_PLAN_READY',
    block: PHASE13_BLOCKS.LANDING_EXPERIMENTATION,
    company_id: gate.context.company_id,
    engine_id: 'MKT-001',
    acquisition_engine: 'CAP-001',
    evaluation_engine: 'EVA-001',
    experiment_ref: safeRef(raw.experiment_ref, 'experiment_ref'),
    hypothesis_ref: safeRef(raw.hypothesis_ref, 'hypothesis_ref'),
    control_landing_ref: safeRef(raw.control_landing_ref, 'control_landing_ref'),
    variant_landing_ref: safeRef(raw.variant_landing_ref, 'variant_landing_ref'),
    primary_metric: 'CONTRIBUTION_MARGIN_CENTS',
    website_write_authorized: false,
    deploy_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function wrapExistingSeo001(raw = {}) {
  const gate = commonGate(raw, 'SEO-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  return Object.freeze({
    allowed: true,
    status: 'SEO001_EXISTING_WRAP_PLAN_READY',
    block: PHASE13_BLOCKS.SEO_EXISTING_WRAP,
    company_id: gate.context.company_id,
    engine_id: 'SEO-001',
    existing_seo_state: 'OPERATIVO_SOURCE_DOCUMENT',
    replace_existing: false,
    preserve_existing_runtime: true,
    source_of_truth_ref: safeRef(raw.source_of_truth_ref, 'source_of_truth_ref'),
    improvement_seams: Object.freeze(['RESEARCH','CONTENT','TECHNICAL','INTERNAL_LINKING','GSC_FEEDBACK','REFRESH']),
    wordpress_write_authorized: false,
    gsc_write_authorized: false,
    seo_mutation_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildLocalSeoPlan(raw = {}) {
  const gate = commonGate(raw, 'SEO-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  const napConsistent = bool(raw.nap_consistent ?? false, 'nap_consistent');
  const gbpPresent = bool(raw.gbp_present ?? false, 'gbp_present');
  const categoriesReviewed = bool(raw.categories_reviewed ?? false, 'categories_reviewed');
  const serviceCoverageReviewed = bool(raw.service_coverage_reviewed ?? false, 'service_coverage_reviewed');
  const reviewFlowDefined = bool(raw.review_flow_defined ?? false, 'review_flow_defined');
  const citationsReviewed = bool(raw.citations_reviewed ?? false, 'citations_reviewed');
  const gaps = [];
  if (!napConsistent) gaps.push('NAP_INCONSISTENT_OR_UNVERIFIED');
  if (!gbpPresent) gaps.push('GBP_MISSING_OR_UNVERIFIED');
  if (!categoriesReviewed) gaps.push('GBP_CATEGORIES_NOT_REVIEWED');
  if (!serviceCoverageReviewed) gaps.push('SERVICE_COVERAGE_NOT_REVIEWED');
  if (!reviewFlowDefined) gaps.push('REVIEW_FLOW_NOT_DEFINED');
  if (!citationsReviewed) gaps.push('CITATIONS_NOT_REVIEWED');
  return Object.freeze({
    allowed: true,
    status: gaps.length ? 'LOCAL_SEO_GAPS_FOUND' : 'LOCAL_SEO_PLAN_READY',
    block: PHASE13_BLOCKS.LOCAL_SEO,
    company_id: gate.context.company_id,
    engine_id: 'SEO-001',
    local_presence_engine: 'LOCALP-001',
    location_ref: safeRef(raw.location_ref, 'location_ref'),
    gaps: Object.freeze(gaps),
    gbp_write_authorized: false,
    citation_write_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildSocialAuditPlan(raw = {}) {
  const gate = commonGate(raw, 'SOCAUD-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  const mode = sourceMode(raw.source_mode);
  if (raw.prohibited_scraping_requested === true) return blocked('PROHIBITED_SCRAPING_DENIED', 'POLICY_CONFLICT', 'Social audit may use public sources or authorized connectors only.');
  if (!Array.isArray(raw.profile_refs) || raw.profile_refs.length < 1) throw new TypeError('profile_refs required');
  return Object.freeze({
    allowed: true,
    status: 'SOCIAL_AUDIT_PLAN_READY',
    block: PHASE13_BLOCKS.SOCIAL_AUDIT,
    company_id: gate.context.company_id,
    engine_id: 'SOCAUD-001',
    marketing_engine: 'MKT-001',
    audit_ref: safeRef(raw.audit_ref, 'audit_ref'),
    profile_refs: Object.freeze(raw.profile_refs.map((value, index) => safeRef(value, `profile_refs[${index}]`))),
    source_mode: mode,
    dimensions: Object.freeze(['PROFILE_COMPLETENESS','FREQUENCY','FORMATS','ENGAGEMENT','BRAND','GAPS','COMPETITION','CALENDAR']),
    social_write_authorized: false,
    prohibited_scraping_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function benchmarkConsentTools(raw = {}) {
  const gate = commonGate(raw, 'WEB-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  const tools = ['C15T','LIBRECONSENT'];
  const requested = text(raw.tool ?? 'C15T', 'tool', 40).toUpperCase();
  if (!tools.includes(requested)) throw new Error('tool must be C15T or LIBRECONSENT');
  const score = Object.freeze({
    privacy_score: finite(raw.privacy_score, 'privacy_score', { min: 0, max: 100 }),
    self_host_score: finite(raw.self_host_score, 'self_host_score', { min: 0, max: 100 }),
    integration_score: finite(raw.integration_score, 'integration_score', { min: 0, max: 100 }),
    maintenance_score: finite(raw.maintenance_score, 'maintenance_score', { min: 0, max: 100 })
  });
  const average = Number(((score.privacy_score + score.self_host_score + score.integration_score + score.maintenance_score) / 4).toFixed(2));
  return Object.freeze({
    allowed: true,
    status: average >= 75 ? 'CONSENT_TOOL_LAB_TEST_CANDIDATE' : 'CONSENT_TOOL_HOLD',
    block: PHASE13_BLOCKS.CONSENT_TOOLS_BENCHMARK,
    company_id: gate.context.company_id,
    engine_id: 'WEB-001',
    tool: requested,
    benchmark_mode: 'LAB_ONLY',
    benchmark_score: score,
    average_score: average,
    consent_engine_claimed: false,
    install_authorized: false,
    config_mutation_authorized: false,
    subscription_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildOfflineConversionFeedbackPlan(raw = {}) {
  const gate = commonGate(raw, 'CAP-001');
  if (!gate.allowed) return gate;
  const effects = sideEffectGate(raw);
  if (!effects.allowed) return effects;
  const platform = text(raw.platform, 'platform', 40).toUpperCase();
  if (!['GOOGLE_ADS','META'].includes(platform)) throw new Error('platform must be GOOGLE_ADS or META');
  const consentState = text(raw.consent_state ?? 'UNKNOWN', 'consent_state', 40).toUpperCase();
  if (!['VALID','UNKNOWN','DENIED'].includes(consentState)) throw new Error('unsupported consent_state');
  if (raw.execution_requested === true && consentState !== 'VALID') return blocked('CONSENT_REQUIRED_FOR_OFFLINE_UPLOAD', 'LEGAL_REQUIRED', 'Offline conversion upload requires validated consent/legal basis before execution.');
  const margin = cents(raw.contribution_margin_cents ?? 0, 'contribution_margin_cents');
  return Object.freeze({
    allowed: true,
    status: 'OFFLINE_CONVERSION_FEEDBACK_PLAN_READY',
    block: PHASE13_BLOCKS.OFFLINE_CONVERSION_FEEDBACK,
    company_id: gate.context.company_id,
    engine_id: 'CAP-001',
    learning_engine: 'LRN-001',
    observability_engine: 'OBSERV-001',
    platform,
    conversion_ref: safeRef(raw.conversion_ref, 'conversion_ref'),
    platform_identifier_ref: raw.platform_identifier_ref == null ? null : safeRef(raw.platform_identifier_ref, 'platform_identifier_ref'),
    economic_evidence_ref: safeRef(raw.economic_evidence_ref, 'economic_evidence_ref'),
    contribution_margin_cents: margin,
    consent_state: consentState,
    upload_authorized: false,
    platform_write_authorized: false,
    raw_contact_data_present: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildPhase13Telemetry(raw = {}) {
  assertPlainData(raw, 'telemetry_request');
  const context = normalizeContext(raw.context);
  return Object.freeze({
    company_id: context.company_id,
    engine_id: context.engine_id,
    environment: ENVIRONMENT,
    version: VERSION,
    event_ref_hash: stableHash(safeRef(raw.event_ref, 'event_ref')),
    event_type: text(raw.event_type, 'event_type', 80).toUpperCase(),
    observability_target: 'OBSERV-001',
    raw_pii_persisted: false,
    raw_platform_payload_persisted: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function createPhase13Ledger() {
  const entries = new Map();
  const runners = Object.freeze({
    ADS_PATTERNS: buildNeutralAdsPatternPlan,
    ADS_AUDIT: auditAdsReadiness,
    COMPETITOR_ADS_SCAN: buildCompetitorAdsScanPlan,
    CREATIVE_TEST: buildCreativeTestPlan,
    LANDING_EXPERIMENT: buildLandingExperimentPlan,
    SEO_WRAP: wrapExistingSeo001,
    LOCAL_SEO: buildLocalSeoPlan,
    SOCIAL_AUDIT: buildSocialAuditPlan,
    CONSENT_BENCHMARK: benchmarkConsentTools,
    OFFLINE_CONVERSION_FEEDBACK: buildOfflineConversionFeedbackPlan
  });
  return Object.freeze({
    execute({ operation, request }) {
      const op = text(operation, 'operation', 80).toUpperCase();
      if (!runners[op]) throw new Error(`unsupported phase 13 operation: ${op}`);
      assertPlainData(request, 'request');
      const result = runners[op](request);
      if (!result.allowed) return result;
      const requestId = safeRef(request.request_id, 'request_id');
      const key = `${result.company_id}|${result.engine_id}|${requestId}|${op}`;
      const fingerprint = stableHash({ op, request });
      if (entries.has(key)) {
        const previous = entries.get(key);
        if (previous.fingerprint !== fingerprint) return blocked('IDEMPOTENCY_CONFLICT', 'POLICY_CONFLICT', 'Idempotency key reused with a different phase-13 request fingerprint.');
        return Object.freeze({ ...previous.result, duplicate: true, idempotency_key: key });
      }
      const stored = Object.freeze({ ...result, duplicate: false, idempotency_key: key, request_fingerprint: fingerprint });
      entries.set(key, Object.freeze({ fingerprint, result: stored }));
      return stored;
    },
    size() { return entries.size; }
  });
}

export const PHASE13_CONTRACT = Object.freeze({
  environment: ENVIRONMENT,
  version: VERSION,
  blocks: Object.freeze([152,153,154,155,156,157,158,159,160,161]),
  new_engine_created: false,
  canonical_engines_reused: Object.freeze(['MKT-001','COMPET-001','EVA-001','CAP-001','SEO-001','LOCALP-001','SOCAUD-001','WEB-001','LRN-001','OBSERV-001']),
  seo_policy: 'WRAP_EXISTING_SEO001_DO_NOT_REPLACE',
  ads_pattern_policy: 'PROVIDER_NEUTRAL_NO_CLAUDE_DEPENDENCY',
  competitor_scan_policy: 'PUBLIC_OR_AUTHORIZED_NO_PROHIBITED_SCRAPING',
  consent_tools_policy: 'LAB_BENCHMARK_ONLY',
  offline_feedback_policy: 'CAP001_LRN001_PLAN_ONLY_NO_PLATFORM_UPLOAD',
  additional_cost_target_eur: 0,
  real_ad_spend_authorized: false,
  platform_publish_authorized: false,
  website_write_authorized: false,
  seo_write_authorized: false,
  gbp_write_authorized: false,
  social_write_authorized: false,
  offline_conversion_upload_authorized: false,
  consent_tool_install_authorized: false,
  prod_authorized: false,
  trading_access: false,
  supabase_required_for_v0_runtime: false
});
