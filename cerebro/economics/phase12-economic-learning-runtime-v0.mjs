import crypto from 'node:crypto';

const ENVIRONMENT = 'PREPROD';
const VERSION = 'phase12-economic-learning-v0';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const CANONICAL_ENGINES = new Set([
  'LRN-001', 'MKT-001', 'CRM-001', 'OBSERV-001', 'FINOPS-001',
  'EXP-001', 'FREE-001', 'CAP-001'
]);

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED', 'SIGNATURE_REQUIRED', 'LOW_CONFIDENCE', 'HIGH_RISK',
  'POLICY_CONFLICT', 'SECURITY_INCIDENT', 'MONEY_LIMIT', 'CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_REASON_SET = new Set(HUMAN_REQUIRED_REASONS);

export const PHASE12_BLOCKS = Object.freeze({
  REVENUE_ATTRIBUTION: 143,
  SOURCE_LEAD_MEETING_SALE_MARGIN: 144,
  CAMPAIGN_ROI: 145,
  AGENT_ACTION_ROI: 146,
  CHANNEL_ROI: 147,
  WTP_REAL: 148,
  PRICING_EXPERIMENTS: 149,
  FREE_PARITY_GATE: 150,
  AUTOMATIC_STOP_SCALE: 151
});

const FORBIDDEN_KEYS = new Set([
  'email', 'email_address', 'phone', 'phone_number', 'telephone', 'mobile',
  'first_name', 'last_name', 'full_name', 'name', 'address', 'dni', 'nif', 'nie',
  'iban', 'bank_account', 'card_number', 'password', 'secret', 'token', 'jwt',
  'api_key', 'apikey', 'access_token', 'refresh_token', 'private_key',
  'race', 'ethnicity', 'religion', 'health', 'diagnosis', 'sexual_orientation',
  'political_affiliation', 'union_membership', 'gender', 'sex'
]);

function text(value, label, max = 200) {
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

function cents(value, label, { min = 0, max = 1_000_000_000_000 } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be integer cents`);
  return value;
}

function count(value, label, { min = 0, max = 1_000_000_000 } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} invalid`);
  return value;
}

function assertPlainData(value, label = 'input', seen = new WeakSet()) {
  if (value === null || ['string', 'boolean', 'undefined'].includes(typeof value)) return;
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
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`raw PII/secret/sensitive field forbidden: ${label}.${key}`);
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
  if (out.environment !== ENVIRONMENT) throw new Error('phase 12 runtime accepts exact PREPROD only');
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
  if (targetCompany !== context.company_id) return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company economic learning is denied.');
  const confidence = finite(raw.confidence ?? 1, 'confidence', { min: 0, max: 1 });
  if (confidence < 0.75) return blocked('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (raw.customer_human_request === true) return blocked('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (raw.high_risk === true) return blocked('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk case requires human handling.');
  if (raw.external_side_effect_requested === true) return blocked('EXTERNAL_SIDE_EFFECT_DISABLED', 'POLICY_CONFLICT', 'Phase 12 V0 is evidence/decision only.');
  if (raw.prod_write_requested === true) return blocked('PROD_WRITE_DISABLED', 'POLICY_CONFLICT', 'Phase 12 V0 cannot write PROD.');
  return Object.freeze({ allowed: true, context, confidence });
}

function ratio(numerator, denominator) {
  if (denominator === 0) return null;
  return Number((numerator / denominator).toFixed(6));
}

function percentFromRatio(value) {
  return value == null ? null : Number((value * 100).toFixed(2));
}

function marginMetrics({ revenue_cents, direct_cost_cents, acquisition_cost_cents = 0, operating_cost_cents = 0 }) {
  const grossMargin = revenue_cents - direct_cost_cents;
  const contributionMargin = grossMargin - acquisition_cost_cents - operating_cost_cents;
  return Object.freeze({
    revenue_cents,
    direct_cost_cents,
    acquisition_cost_cents,
    operating_cost_cents,
    gross_margin_cents: grossMargin,
    contribution_margin_cents: contributionMargin,
    contribution_margin_rate: revenue_cents === 0 ? null : ratio(contributionMargin, revenue_cents)
  });
}

function economicRoi({ attributed_gross_margin_cents, incremental_cost_cents }) {
  const net = attributed_gross_margin_cents - incremental_cost_cents;
  if (incremental_cost_cents === 0) {
    return Object.freeze({
      net_contribution_cents: net,
      roi_ratio: null,
      roi_percent: null,
      roi_state: net > 0 ? 'ZERO_COST_POSITIVE_MARGIN' : net < 0 ? 'ZERO_COST_NEGATIVE_MARGIN' : 'ZERO_COST_NO_MARGIN'
    });
  }
  const roiRatio = ratio(net, incremental_cost_cents);
  return Object.freeze({
    net_contribution_cents: net,
    roi_ratio: roiRatio,
    roi_percent: percentFromRatio(roiRatio),
    roi_state: roiRatio > 0 ? 'POSITIVE' : roiRatio < 0 ? 'NEGATIVE' : 'BREAKEVEN'
  });
}

function stableHash(value, size = 32) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}

export function buildRevenueAttribution(raw = {}) {
  const gate = commonGate(raw, 'LRN-001');
  if (!gate.allowed) return gate;
  const refs = Object.freeze({
    source_ref: safeRef(raw.source_ref, 'source_ref'),
    lead_ref: safeRef(raw.lead_ref, 'lead_ref'),
    meeting_ref: safeRef(raw.meeting_ref, 'meeting_ref'),
    sale_ref: safeRef(raw.sale_ref, 'sale_ref'),
    campaign_ref: raw.campaign_ref == null ? null : safeRef(raw.campaign_ref, 'campaign_ref'),
    channel_ref: raw.channel_ref == null ? null : safeRef(raw.channel_ref, 'channel_ref')
  });
  const revenue = cents(raw.revenue_cents, 'revenue_cents');
  const directCost = cents(raw.direct_cost_cents ?? 0, 'direct_cost_cents');
  const acquisitionCost = cents(raw.acquisition_cost_cents ?? 0, 'acquisition_cost_cents');
  const operatingCost = cents(raw.operating_cost_cents ?? 0, 'operating_cost_cents');
  const margins = marginMetrics({
    revenue_cents: revenue,
    direct_cost_cents: directCost,
    acquisition_cost_cents: acquisitionCost,
    operating_cost_cents: operatingCost
  });
  return Object.freeze({
    allowed: true,
    status: 'REVENUE_ATTRIBUTION_READY',
    block: PHASE12_BLOCKS.REVENUE_ATTRIBUTION,
    company_id: gate.context.company_id,
    engine_id: 'LRN-001',
    environment: ENVIRONMENT,
    version: VERSION,
    attribution_ref: safeRef(raw.attribution_ref, 'attribution_ref'),
    refs,
    margins,
    attribution_model: 'DETERMINISTIC_CLOSED_LOOP_LAST_VALIDATED_SOURCE_V0',
    source_to_margin_complete: true,
    dependencies: Object.freeze(['CRM-001', 'MKT-001', 'OBSERV-001', 'FINOPS-001', 'LRN-001']),
    raw_pii_present: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildSourceLeadMeetingSaleMargin(raw = {}) {
  const result = buildRevenueAttribution(raw);
  if (!result.allowed) return result;
  return Object.freeze({
    ...result,
    status: 'SOURCE_LEAD_MEETING_SALE_MARGIN_READY',
    block: PHASE12_BLOCKS.SOURCE_LEAD_MEETING_SALE_MARGIN,
    closed_loop: Object.freeze({
      source_ref: result.refs.source_ref,
      lead_ref: result.refs.lead_ref,
      meeting_ref: result.refs.meeting_ref,
      sale_ref: result.refs.sale_ref,
      contribution_margin_cents: result.margins.contribution_margin_cents
    }),
    learning_target: 'LRN-001',
    crm_source_of_truth: 'CRM-001',
    crm_write_authorized: false
  });
}

function calculateScopedRoi(raw, { expectedEngine, block, refField, refLabel, status, dependencies }) {
  const gate = commonGate(raw, expectedEngine);
  if (!gate.allowed) return gate;
  const targetRef = safeRef(raw[refField], refLabel);
  const grossMargin = cents(raw.attributed_gross_margin_cents, 'attributed_gross_margin_cents');
  const incrementalCost = cents(raw.incremental_cost_cents ?? 0, 'incremental_cost_cents');
  const roi = economicRoi({ attributed_gross_margin_cents: grossMargin, incremental_cost_cents: incrementalCost });
  return Object.freeze({
    allowed: true,
    status,
    block,
    company_id: gate.context.company_id,
    engine_id: expectedEngine,
    environment: ENVIRONMENT,
    version: VERSION,
    [refField]: targetRef,
    attributed_gross_margin_cents: grossMargin,
    incremental_cost_cents: incrementalCost,
    ...roi,
    metric_priority: 'MARGIN_BEFORE_VANITY_METRICS',
    dependencies: Object.freeze([...dependencies]),
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function calculateCampaignRoi(raw = {}) {
  return calculateScopedRoi(raw, {
    expectedEngine: 'MKT-001',
    block: PHASE12_BLOCKS.CAMPAIGN_ROI,
    refField: 'campaign_ref',
    refLabel: 'campaign_ref',
    status: 'CAMPAIGN_ROI_READY',
    dependencies: ['MKT-001', 'LRN-001', 'FINOPS-001', 'OBSERV-001']
  });
}

export function calculateAgentActionRoi(raw = {}) {
  const result = calculateScopedRoi(raw, {
    expectedEngine: 'LRN-001',
    block: PHASE12_BLOCKS.AGENT_ACTION_ROI,
    refField: 'action_ref',
    refLabel: 'action_ref',
    status: 'AGENT_ACTION_ROI_READY',
    dependencies: ['LRN-001', 'FINOPS-001', 'OBSERV-001']
  });
  if (!result.allowed) return result;
  return Object.freeze({ ...result, agent_ref: safeRef(raw.agent_ref, 'agent_ref'), sensitive_worker_attributes_used: false });
}

export function calculateChannelRoi(raw = {}) {
  return calculateScopedRoi(raw, {
    expectedEngine: 'LRN-001',
    block: PHASE12_BLOCKS.CHANNEL_ROI,
    refField: 'channel_ref',
    refLabel: 'channel_ref',
    status: 'CHANNEL_ROI_READY',
    dependencies: ['MKT-001', 'LRN-001', 'FINOPS-001', 'OBSERV-001']
  });
}

export function evaluateObservedWtp(raw = {}) {
  const gate = commonGate(raw, 'EXP-001');
  if (!gate.allowed) return gate;
  const product_ref = safeRef(raw.product_ref, 'product_ref');
  if (!Array.isArray(raw.observations) || raw.observations.length < 2) throw new TypeError('observations must contain at least two aggregate price points');
  const minSample = count(raw.min_sample_size ?? 10, 'min_sample_size', { min: 1, max: 1_000_000 });
  const minAcceptance = finite(raw.min_acceptance_rate ?? 0.2, 'min_acceptance_rate', { min: 0, max: 1 });
  const normalized = raw.observations.map((item, index) => {
    assertPlainData(item, `observations[${index}]`);
    const price = cents(item.price_cents, `observations[${index}].price_cents`, { min: 1 });
    const offered = count(item.offered_count, `observations[${index}].offered_count`);
    const accepted = count(item.accepted_count, `observations[${index}].accepted_count`);
    if (accepted > offered) throw new Error(`observations[${index}].accepted_count cannot exceed offered_count`);
    const realizedMargin = cents(item.realized_margin_cents ?? 0, `observations[${index}].realized_margin_cents`);
    const acceptanceRate = offered === 0 ? 0 : ratio(accepted, offered);
    return Object.freeze({ price_cents: price, offered_count: offered, accepted_count: accepted, acceptance_rate: acceptanceRate, realized_margin_cents: realizedMargin });
  }).sort((a, b) => a.price_cents - b.price_cents);
  const eligible = normalized.filter(item => item.offered_count >= minSample && item.acceptance_rate >= minAcceptance);
  const best = [...eligible].sort((a, b) => b.realized_margin_cents - a.realized_margin_cents || b.price_cents - a.price_cents)[0] ?? null;
  return Object.freeze({
    allowed: true,
    status: best ? 'WTP_EVIDENCE_READY' : 'WTP_INSUFFICIENT_EVIDENCE',
    block: PHASE12_BLOCKS.WTP_REAL,
    company_id: gate.context.company_id,
    engine_id: 'EXP-001',
    environment: ENVIRONMENT,
    version: VERSION,
    product_ref,
    observations: Object.freeze(normalized),
    min_sample_size: minSample,
    min_acceptance_rate: minAcceptance,
    observed_wtp_candidate_cents: best?.price_cents ?? null,
    best_observed_margin_cents: best?.realized_margin_cents ?? null,
    product_factory_capability: 'AION_PRODUCT_FACTORY_EXISTING_CAPABILITY_SEAM',
    price_mutation_authorized: false,
    individualized_pricing: false,
    sensitive_segmentation_used: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildPricingExperiment(raw = {}) {
  const gate = commonGate(raw, 'EXP-001');
  if (!gate.allowed) return gate;
  const product_ref = safeRef(raw.product_ref, 'product_ref');
  const experiment_ref = safeRef(raw.experiment_ref, 'experiment_ref');
  const controlPrice = cents(raw.control_price_cents, 'control_price_cents', { min: 1 });
  if (!Array.isArray(raw.variant_prices_cents) || raw.variant_prices_cents.length < 1 || raw.variant_prices_cents.length > 5) throw new TypeError('variant_prices_cents must contain 1-5 prices');
  const variants = [...new Set(raw.variant_prices_cents.map((value, index) => cents(value, `variant_prices_cents[${index}]`, { min: 1 })))]
    .filter(value => value !== controlPrice)
    .sort((a, b) => a - b);
  if (variants.length < 1) throw new Error('pricing experiment requires at least one price different from control');
  return Object.freeze({
    allowed: true,
    status: 'PRICING_EXPERIMENT_PLAN_READY',
    block: PHASE12_BLOCKS.PRICING_EXPERIMENTS,
    company_id: gate.context.company_id,
    engine_id: 'EXP-001',
    environment: ENVIRONMENT,
    version: VERSION,
    product_ref,
    experiment_ref,
    hypothesis_ref: safeRef(raw.hypothesis_ref, 'hypothesis_ref'),
    control_price_cents: controlPrice,
    variant_prices_cents: Object.freeze(variants),
    primary_metric: 'CONTRIBUTION_MARGIN_CENTS',
    secondary_metrics: Object.freeze(['ACCEPTANCE_RATE', 'CONVERSION_RATE']),
    experiment_contract: 'HYPOTHESIS_CONTROL_EXPERIMENT_METRIC_DECISION',
    learning_target: 'LRN-001',
    product_factory_capability: 'AION_PRODUCT_FACTORY_EXISTING_CAPABILITY_SEAM',
    individualized_pricing: false,
    sensitive_segmentation_allowed: false,
    live_price_mutation_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

function normalizeParityCandidate(raw, label, { paid = false } = {}) {
  assertPlainData(raw, label);
  const out = {
    functional_coverage_pct: finite(raw.functional_coverage_pct, `${label}.functional_coverage_pct`, { min: 0, max: 100 }),
    quality_score: finite(raw.quality_score, `${label}.quality_score`, { min: 0, max: 100 }),
    reliability_score: finite(raw.reliability_score, `${label}.reliability_score`, { min: 0, max: 100 }),
    latency_ms: finite(raw.latency_ms, `${label}.latency_ms`, { min: 0, max: 86_400_000 }),
    privacy_ok: bool(raw.privacy_ok, `${label}.privacy_ok`),
    monthly_cost_cents: cents(raw.monthly_cost_cents ?? 0, `${label}.monthly_cost_cents`)
  };
  if (!paid && out.monthly_cost_cents !== 0) throw new Error('free_candidate.monthly_cost_cents must be 0');
  return Object.freeze(out);
}

function meetsParity(candidate, thresholds) {
  return candidate.privacy_ok &&
    candidate.functional_coverage_pct >= thresholds.min_functional_coverage_pct &&
    candidate.quality_score >= thresholds.min_quality_score &&
    candidate.reliability_score >= thresholds.min_reliability_score &&
    candidate.latency_ms <= thresholds.max_latency_ms;
}

export function evaluateFreeParityGate(raw = {}) {
  const gate = commonGate(raw, 'FREE-001');
  if (!gate.allowed) return gate;
  if (raw.purchase_requested === true) return blocked('PAID_PURCHASE_DISABLED', 'MONEY_LIMIT', 'FREE_PARITY_GATE may recommend PAY but cannot purchase or subscribe.');
  const capability_ref = safeRef(raw.capability_ref, 'capability_ref');
  const freeCandidate = normalizeParityCandidate(raw.free_candidate, 'free_candidate');
  const paidCandidate = normalizeParityCandidate(raw.paid_candidate, 'paid_candidate', { paid: true });
  const thresholds = Object.freeze({
    min_functional_coverage_pct: finite(raw.min_functional_coverage_pct ?? 95, 'min_functional_coverage_pct', { min: 0, max: 100 }),
    min_quality_score: finite(raw.min_quality_score ?? 80, 'min_quality_score', { min: 0, max: 100 }),
    min_reliability_score: finite(raw.min_reliability_score ?? 90, 'min_reliability_score', { min: 0, max: 100 }),
    max_latency_ms: finite(raw.max_latency_ms ?? 10_000, 'max_latency_ms', { min: 1, max: 86_400_000 })
  });
  const freePass = meetsParity(freeCandidate, thresholds);
  const paidPass = meetsParity(paidCandidate, thresholds);
  const buildFeasible = bool(raw.build_feasible ?? false, 'build_feasible');
  const buildCost = cents(raw.estimated_build_cost_cents ?? 0, 'estimated_build_cost_cents');
  const expectedMonthlyMarginLift = cents(raw.expected_paid_monthly_margin_lift_cents ?? 0, 'expected_paid_monthly_margin_lift_cents');
  const paidNetLift = expectedMonthlyMarginLift - paidCandidate.monthly_cost_cents;
  const paidRoi = economicRoi({ attributed_gross_margin_cents: expectedMonthlyMarginLift, incremental_cost_cents: paidCandidate.monthly_cost_cents });
  const materialPaidAdvantage = (paidCandidate.quality_score - freeCandidate.quality_score >= 10) ||
    (paidCandidate.reliability_score - freeCandidate.reliability_score >= 10) ||
    (paidCandidate.functional_coverage_pct - freeCandidate.functional_coverage_pct >= 10);

  let decision = 'HOLD';
  let reason = freePass ? 'FREE_PARITY_MEETS_REQUIRED_THRESHOLD' : 'NO_ECONOMIC_CASE_FOR_PAID_OR_BUILD';
  if (!freePass && buildFeasible && (paidCandidate.monthly_cost_cents === 0 || buildCost <= paidCandidate.monthly_cost_cents * 3)) {
    decision = 'BUILD';
    reason = 'FREE_GAP_IS_BUILDABLE_WITH_LOWER_OR_COMPARABLE_SHORT_HORIZON_COST';
  } else if (!freePass && paidPass && materialPaidAdvantage && paidCandidate.monthly_cost_cents > 0 && paidNetLift > 0 && (paidRoi.roi_ratio ?? -1) >= 0.5) {
    decision = 'PAY';
    reason = 'PAID_OPTION_HAS_DEFENDABLE_PARITY_ADVANTAGE_AND_POSITIVE_MARGIN_CASE';
  }

  return Object.freeze({
    allowed: true,
    status: 'FREE_PARITY_GATE_DECIDED',
    block: PHASE12_BLOCKS.FREE_PARITY_GATE,
    company_id: gate.context.company_id,
    engine_id: 'FREE-001',
    environment: ENVIRONMENT,
    version: VERSION,
    capability_ref,
    decision,
    reason,
    thresholds,
    free_candidate: freeCandidate,
    paid_candidate: paidCandidate,
    free_pass: freePass,
    paid_pass: paidPass,
    build_feasible: buildFeasible,
    estimated_build_cost_cents: buildCost,
    expected_paid_monthly_margin_lift_cents: expectedMonthlyMarginLift,
    paid_net_monthly_margin_lift_cents: paidNetLift,
    paid_roi_ratio: paidRoi.roi_ratio,
    paid_execution_authorized: false,
    purchase_authorized: false,
    subscription_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0,
    dependencies: Object.freeze(['FREE-001', 'FINOPS-001', 'OBSERV-001'])
  });
}

export function buildAutomaticStopScaleDecision(raw = {}) {
  const gate = commonGate(raw, 'CAP-001');
  if (!gate.allowed) return gate;
  const target_ref = safeRef(raw.target_ref, 'target_ref');
  const sampleSize = count(raw.sample_size, 'sample_size');
  const minimumSample = count(raw.minimum_sample_size ?? 20, 'minimum_sample_size', { min: 1 });
  const grossMargin = cents(raw.attributed_gross_margin_cents, 'attributed_gross_margin_cents');
  const spend = cents(raw.incremental_cost_cents, 'incremental_cost_cents');
  const roi = economicRoi({ attributed_gross_margin_cents: grossMargin, incremental_cost_cents: spend });
  const stopRoi = finite(raw.stop_below_roi_ratio ?? 0, 'stop_below_roi_ratio', { min: -1000, max: 1000 });
  const scaleRoi = finite(raw.scale_at_or_above_roi_ratio ?? 1, 'scale_at_or_above_roi_ratio', { min: -1000, max: 1000 });
  if (scaleRoi <= stopRoi) throw new Error('scale_at_or_above_roi_ratio must be greater than stop_below_roi_ratio');

  let decision = 'HOLD';
  let reason = 'MINIMUM_SAMPLE_NOT_REACHED';
  if (sampleSize >= minimumSample) {
    if (roi.roi_ratio == null) {
      if (roi.net_contribution_cents > 0) {
        decision = 'SCALE';
        reason = 'ZERO_COST_POSITIVE_MARGIN';
      } else if (roi.net_contribution_cents < 0) {
        decision = 'STOP';
        reason = 'ZERO_COST_NEGATIVE_MARGIN';
      } else {
        decision = 'HOLD';
        reason = 'ZERO_COST_NO_MARGIN';
      }
    } else if (roi.roi_ratio < stopRoi) {
      decision = 'STOP';
      reason = 'ROI_BELOW_STOP_THRESHOLD';
    } else if (roi.roi_ratio >= scaleRoi) {
      decision = 'SCALE';
      reason = 'ROI_ABOVE_SCALE_THRESHOLD';
    } else {
      decision = 'HOLD';
      reason = 'ROI_INSIDE_HOLD_BAND';
    }
  }

  if (raw.execute_requested === true) {
    return blocked(
      'STOP_SCALE_EXECUTION_DISABLED',
      decision === 'SCALE' ? 'MONEY_LIMIT' : 'POLICY_CONFLICT',
      'V0 computes stop/hold/scale decisions but cannot mutate campaigns, budgets or production systems.',
      { recommended_decision: decision }
    );
  }

  return Object.freeze({
    allowed: true,
    status: 'AUTOMATIC_STOP_SCALE_DECISION_READY',
    block: PHASE12_BLOCKS.AUTOMATIC_STOP_SCALE,
    company_id: gate.context.company_id,
    engine_id: 'CAP-001',
    environment: ENVIRONMENT,
    version: VERSION,
    target_ref,
    sample_size: sampleSize,
    minimum_sample_size: minimumSample,
    decision,
    reason,
    stop_below_roi_ratio: stopRoi,
    scale_at_or_above_roi_ratio: scaleRoi,
    roi,
    decision_basis: 'CONTRIBUTION_MARGIN_AND_ROI_NOT_CLICKS',
    learning_target: 'LRN-001',
    campaign_or_budget_mutation_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildEconomicTelemetry(raw = {}) {
  assertPlainData(raw, 'telemetry_request');
  const context = normalizeContext(raw.context);
  const event_ref = safeRef(raw.event_ref, 'event_ref');
  return Object.freeze({
    company_id: context.company_id,
    engine_id: context.engine_id,
    environment: ENVIRONMENT,
    version: VERSION,
    event_ref_hash: stableHash(event_ref),
    event_type: text(raw.event_type, 'event_type', 80).toUpperCase(),
    observability_target: 'OBSERV-001',
    finops_target: 'FINOPS-001',
    raw_pii_persisted: false,
    raw_sensitive_attributes_persisted: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function createEconomicLedger() {
  const entries = new Map();
  const operations = Object.freeze({
    REVENUE_ATTRIBUTION: buildRevenueAttribution,
    FUNNEL_MARGIN: buildSourceLeadMeetingSaleMargin,
    CAMPAIGN_ROI: calculateCampaignRoi,
    AGENT_ACTION_ROI: calculateAgentActionRoi,
    CHANNEL_ROI: calculateChannelRoi,
    WTP: evaluateObservedWtp,
    PRICING_EXPERIMENT: buildPricingExperiment,
    FREE_PARITY_GATE: evaluateFreeParityGate,
    STOP_SCALE: buildAutomaticStopScaleDecision
  });
  return Object.freeze({
    execute({ operation, request }) {
      const op = text(operation, 'operation', 80).toUpperCase();
      if (!operations[op]) throw new Error(`unsupported phase 12 operation: ${op}`);
      assertPlainData(request, 'request');
      const result = operations[op](request);
      if (!result.allowed) return result;
      const requestId = safeRef(request.request_id, 'request_id');
      const key = `${result.company_id}|${result.engine_id}|${requestId}|${op}`;
      const fingerprint = stableHash({ op, request });
      if (entries.has(key)) {
        const previous = entries.get(key);
        if (previous.fingerprint !== fingerprint) return blocked('IDEMPOTENCY_CONFLICT', 'POLICY_CONFLICT', 'Idempotency key reused with a different economic request fingerprint.');
        return Object.freeze({ ...previous.result, duplicate: true, idempotency_key: key });
      }
      const stored = Object.freeze({ ...result, duplicate: false, idempotency_key: key, request_fingerprint: fingerprint });
      entries.set(key, Object.freeze({ fingerprint, result: stored }));
      return stored;
    },
    size() { return entries.size; }
  });
}

export const PHASE12_CONTRACT = Object.freeze({
  environment: ENVIRONMENT,
  version: VERSION,
  blocks: Object.freeze([143, 144, 145, 146, 147, 148, 149, 150, 151]),
  new_engine_created: false,
  canonical_engines_reused: Object.freeze(['LRN-001', 'MKT-001', 'CRM-001', 'OBSERV-001', 'FINOPS-001', 'EXP-001', 'FREE-001', 'CAP-001']),
  attribution_goal: 'SOURCE_TO_LEAD_TO_MEETING_TO_SALE_TO_MARGIN',
  primary_economic_metric: 'CONTRIBUTION_MARGIN',
  free_parity_decisions: Object.freeze(['HOLD', 'BUILD', 'PAY']),
  deterministic_before_ai: true,
  additional_cost_target_eur: 0,
  real_ad_spend_authorized: false,
  live_price_mutation_authorized: false,
  paid_purchase_authorized: false,
  external_side_effect_authorized: false,
  prod_authorized: false,
  trading_access: false,
  supabase_required_for_v0_runtime: false
});
