import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUMAN_REQUIRED_REASONS,
  PHASE12_BLOCKS,
  PHASE12_CONTRACT,
  buildAutomaticStopScaleDecision,
  buildEconomicTelemetry,
  buildPricingExperiment,
  buildRevenueAttribution,
  buildSourceLeadMeetingSaleMargin,
  calculateAgentActionRoi,
  calculateCampaignRoi,
  calculateChannelRoi,
  createEconomicLedger,
  evaluateFreeParityGate,
  evaluateObservedWtp
} from '../economics/phase12-economic-learning-runtime-v0.mjs';

const ctx = engine_id => Object.freeze({ company_id: 'fenix', engine_id, environment: 'PREPROD', version: '0.1.0' });

const attributionBase = Object.freeze({
  context: ctx('LRN-001'),
  request_id: 'econ:req:143',
  attribution_ref: 'attr:001',
  source_ref: 'source:organic:001',
  lead_ref: 'lead:001',
  meeting_ref: 'meeting:001',
  sale_ref: 'sale:001',
  campaign_ref: 'campaign:001',
  channel_ref: 'channel:seo',
  revenue_cents: 500000,
  direct_cost_cents: 120000,
  acquisition_cost_cents: 30000,
  operating_cost_cents: 50000,
  confidence: 0.95
});

const roiBase = (engine_id, refField, refValue, request_id) => ({
  context: ctx(engine_id),
  request_id,
  [refField]: refValue,
  attributed_gross_margin_cents: 300000,
  incremental_cost_cents: 100000,
  confidence: 0.95
});

const freeParityBase = Object.freeze({
  context: ctx('FREE-001'),
  request_id: 'econ:free:001',
  capability_ref: 'capability:voice-stt',
  confidence: 0.95,
  free_candidate: Object.freeze({
    functional_coverage_pct: 98,
    quality_score: 86,
    reliability_score: 95,
    latency_ms: 2500,
    privacy_ok: true,
    monthly_cost_cents: 0
  }),
  paid_candidate: Object.freeze({
    functional_coverage_pct: 100,
    quality_score: 91,
    reliability_score: 98,
    latency_ms: 1800,
    privacy_ok: true,
    monthly_cost_cents: 9000
  }),
  build_feasible: false,
  estimated_build_cost_cents: 0,
  expected_paid_monthly_margin_lift_cents: 15000
});

test('phase 12 contract covers exact blocks 143-151 and creates no engine', () => {
  assert.deepEqual(PHASE12_CONTRACT.blocks, [143,144,145,146,147,148,149,150,151]);
  assert.equal(PHASE12_CONTRACT.new_engine_created, false);
  assert.equal(PHASE12_CONTRACT.primary_economic_metric, 'CONTRIBUTION_MARGIN');
  assert.deepEqual(PHASE12_CONTRACT.free_parity_decisions, ['HOLD','BUILD','PAY']);
  assert.equal(PHASE12_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(PHASE12_CONTRACT.prod_authorized, false);
  assert.equal(PHASE12_CONTRACT.real_ad_spend_authorized, false);
  assert.equal(PHASE12_CONTRACT.live_price_mutation_authorized, false);
});

test('143 revenue attribution closes source to sale and computes contribution margin', () => {
  const result = buildRevenueAttribution(attributionBase);
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.REVENUE_ATTRIBUTION);
  assert.equal(result.engine_id, 'LRN-001');
  assert.equal(result.source_to_margin_complete, true);
  assert.equal(result.margins.gross_margin_cents, 380000);
  assert.equal(result.margins.contribution_margin_cents, 300000);
  assert.equal(result.margins.contribution_margin_rate, 0.6);
  assert.ok(result.dependencies.includes('FINOPS-001'));
  assert.ok(result.dependencies.includes('OBSERV-001'));
});

test('144 source→lead→meeting→sale→margin preserves CRM as source of truth without CRM write', () => {
  const result = buildSourceLeadMeetingSaleMargin({ ...attributionBase, request_id: 'econ:req:144' });
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.SOURCE_LEAD_MEETING_SALE_MARGIN);
  assert.equal(result.closed_loop.source_ref, 'source:organic:001');
  assert.equal(result.closed_loop.lead_ref, 'lead:001');
  assert.equal(result.closed_loop.meeting_ref, 'meeting:001');
  assert.equal(result.closed_loop.sale_ref, 'sale:001');
  assert.equal(result.closed_loop.contribution_margin_cents, 300000);
  assert.equal(result.crm_source_of_truth, 'CRM-001');
  assert.equal(result.crm_write_authorized, false);
});

test('145 campaign ROI is based on attributed margin after incremental cost, not clicks', () => {
  const result = calculateCampaignRoi(roiBase('MKT-001', 'campaign_ref', 'campaign:001', 'econ:req:145'));
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.CAMPAIGN_ROI);
  assert.equal(result.net_contribution_cents, 200000);
  assert.equal(result.roi_ratio, 2);
  assert.equal(result.roi_percent, 200);
  assert.equal(result.metric_priority, 'MARGIN_BEFORE_VANITY_METRICS');
});

test('146 agent/action ROI uses opaque references and no worker sensitive attributes', () => {
  const result = calculateAgentActionRoi({
    ...roiBase('LRN-001', 'action_ref', 'action:follow-up', 'econ:req:146'),
    agent_ref: 'agent:sales:001'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.AGENT_ACTION_ROI);
  assert.equal(result.agent_ref, 'agent:sales:001');
  assert.equal(result.sensitive_worker_attributes_used, false);
  assert.equal(result.roi_ratio, 2);
});

test('147 channel ROI uses the same margin-first economic contract', () => {
  const result = calculateChannelRoi(roiBase('LRN-001', 'channel_ref', 'channel:seo', 'econ:req:147'));
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.CHANNEL_ROI);
  assert.equal(result.channel_ref, 'channel:seo');
  assert.equal(result.net_contribution_cents, 200000);
});

test('ROI handles zero incremental cost without Infinity or divide-by-zero fiction', () => {
  const result = calculateChannelRoi({
    ...roiBase('LRN-001', 'channel_ref', 'channel:owned', 'econ:req:147:zero'),
    incremental_cost_cents: 0
  });
  assert.equal(result.allowed, true);
  assert.equal(result.roi_ratio, null);
  assert.equal(result.roi_percent, null);
  assert.equal(result.roi_state, 'ZERO_COST_POSITIVE_MARGIN');
});

test('148 WTP uses aggregate observed evidence and selects price by realized margin among qualified points', () => {
  const result = evaluateObservedWtp({
    context: ctx('EXP-001'),
    request_id: 'econ:req:148',
    product_ref: 'product:advisory:001',
    confidence: 0.95,
    min_sample_size: 10,
    min_acceptance_rate: 0.2,
    observations: [
      { price_cents: 250000, offered_count: 20, accepted_count: 10, realized_margin_cents: 1200000 },
      { price_cents: 350000, offered_count: 20, accepted_count: 7, realized_margin_cents: 1600000 },
      { price_cents: 450000, offered_count: 20, accepted_count: 2, realized_margin_cents: 700000 }
    ]
  });
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.WTP_REAL);
  assert.equal(result.status, 'WTP_EVIDENCE_READY');
  assert.equal(result.observed_wtp_candidate_cents, 350000);
  assert.equal(result.best_observed_margin_cents, 1600000);
  assert.equal(result.price_mutation_authorized, false);
  assert.equal(result.individualized_pricing, false);
});

test('148 WTP refuses to invent willingness-to-pay when evidence is insufficient', () => {
  const result = evaluateObservedWtp({
    context: ctx('EXP-001'),
    request_id: 'econ:req:148:insufficient',
    product_ref: 'product:001',
    observations: [
      { price_cents: 10000, offered_count: 3, accepted_count: 2, realized_margin_cents: 10000 },
      { price_cents: 20000, offered_count: 2, accepted_count: 1, realized_margin_cents: 10000 }
    ]
  });
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'WTP_INSUFFICIENT_EVIDENCE');
  assert.equal(result.observed_wtp_candidate_cents, null);
});

test('149 pricing experiment is EXP-001 plan-only, margin-primary and non-personalized', () => {
  const result = buildPricingExperiment({
    context: ctx('EXP-001'),
    request_id: 'econ:req:149',
    product_ref: 'product:001',
    experiment_ref: 'experiment:pricing:001',
    hypothesis_ref: 'hypothesis:margin:001',
    control_price_cents: 350000,
    variant_prices_cents: [325000, 375000, 400000],
    confidence: 0.95
  });
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.PRICING_EXPERIMENTS);
  assert.equal(result.primary_metric, 'CONTRIBUTION_MARGIN_CENTS');
  assert.equal(result.experiment_contract, 'HYPOTHESIS_CONTROL_EXPERIMENT_METRIC_DECISION');
  assert.equal(result.individualized_pricing, false);
  assert.equal(result.sensitive_segmentation_allowed, false);
  assert.equal(result.live_price_mutation_authorized, false);
});

test('150 FREE_PARITY_GATE returns HOLD when zero-cost path meets parity', () => {
  const result = evaluateFreeParityGate(freeParityBase);
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE12_BLOCKS.FREE_PARITY_GATE);
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.free_pass, true);
  assert.equal(result.purchase_authorized, false);
  assert.equal(result.additional_cost_eur, 0);
});

test('150 FREE_PARITY_GATE returns BUILD when free gap is cheaply buildable', () => {
  const result = evaluateFreeParityGate({
    ...freeParityBase,
    request_id: 'econ:free:build',
    free_candidate: { ...freeParityBase.free_candidate, quality_score: 60, functional_coverage_pct: 75 },
    build_feasible: true,
    estimated_build_cost_cents: 12000,
    paid_candidate: { ...freeParityBase.paid_candidate, monthly_cost_cents: 10000 },
    expected_paid_monthly_margin_lift_cents: 30000
  });
  assert.equal(result.allowed, true);
  assert.equal(result.decision, 'BUILD');
  assert.equal(result.purchase_authorized, false);
});

test('150 FREE_PARITY_GATE can recommend PAY only with a defendable positive margin case, never execute it', () => {
  const result = evaluateFreeParityGate({
    ...freeParityBase,
    request_id: 'econ:free:pay',
    free_candidate: {
      functional_coverage_pct: 60,
      quality_score: 55,
      reliability_score: 70,
      latency_ms: 20000,
      privacy_ok: true,
      monthly_cost_cents: 0
    },
    paid_candidate: {
      functional_coverage_pct: 100,
      quality_score: 95,
      reliability_score: 98,
      latency_ms: 1000,
      privacy_ok: true,
      monthly_cost_cents: 10000
    },
    build_feasible: false,
    estimated_build_cost_cents: 100000,
    expected_paid_monthly_margin_lift_cents: 30000
  });
  assert.equal(result.allowed, true);
  assert.equal(result.decision, 'PAY');
  assert.equal(result.paid_net_monthly_margin_lift_cents, 20000);
  assert.equal(result.paid_roi_ratio, 2);
  assert.equal(result.paid_execution_authorized, false);
  assert.equal(result.subscription_authorized, false);
});

test('paid purchase request is fail-closed with canonical MONEY_LIMIT', () => {
  const result = evaluateFreeParityGate({ ...freeParityBase, purchase_requested: true });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'PAID_PURCHASE_DISABLED');
  assert.equal(result.human_required_reason, 'MONEY_LIMIT');
  assert.equal(result.external_side_effect_executed, false);
});

test('151 stop/scale decides STOP, HOLD or SCALE from sample and economic ROI but does not mutate campaigns', () => {
  const base = {
    context: ctx('CAP-001'),
    request_id: 'econ:req:151',
    target_ref: 'campaign:001',
    minimum_sample_size: 20,
    attributed_gross_margin_cents: 300000,
    incremental_cost_cents: 100000,
    stop_below_roi_ratio: 0,
    scale_at_or_above_roi_ratio: 1,
    confidence: 0.95
  };
  const hold = buildAutomaticStopScaleDecision({ ...base, sample_size: 10 });
  const scale = buildAutomaticStopScaleDecision({ ...base, request_id: 'econ:req:151:scale', sample_size: 30 });
  const stop = buildAutomaticStopScaleDecision({ ...base, request_id: 'econ:req:151:stop', sample_size: 30, attributed_gross_margin_cents: 50000 });
  assert.equal(hold.decision, 'HOLD');
  assert.equal(scale.decision, 'SCALE');
  assert.equal(stop.decision, 'STOP');
  for (const result of [hold, scale, stop]) {
    assert.equal(result.campaign_or_budget_mutation_authorized, false);
    assert.equal(result.external_side_effect_executed, false);
  }
});

test('151 requested SCALE execution is fail-closed with MONEY_LIMIT', () => {
  const result = buildAutomaticStopScaleDecision({
    context: ctx('CAP-001'),
    request_id: 'econ:req:151:execute',
    target_ref: 'campaign:001',
    sample_size: 30,
    minimum_sample_size: 20,
    attributed_gross_margin_cents: 300000,
    incremental_cost_cents: 100000,
    execute_requested: true
  });
  assert.equal(result.allowed, false);
  assert.equal(result.recommended_decision, 'SCALE');
  assert.equal(result.human_required_reason, 'MONEY_LIMIT');
});

test('tenant isolation, exact PREPROD and raw sensitive fields are fail-closed', () => {
  const cross = buildRevenueAttribution({ ...attributionBase, target_company_id: 'other-company' });
  assert.equal(cross.allowed, false);
  assert.equal(cross.human_required_reason, 'SECURITY_INCIDENT');

  assert.throws(() => buildRevenueAttribution({ ...attributionBase, context: { ...ctx('LRN-001'), environment: 'PROD' } }), /exact PREPROD only/);
  assert.throws(() => buildRevenueAttribution({ ...attributionBase, email: 'person@example.com' }), /raw PII\/secret\/sensitive field forbidden/);
  assert.throws(() => buildPricingExperiment({
    context: ctx('EXP-001'), request_id: 'x', product_ref: 'p:1', experiment_ref: 'e:1', hypothesis_ref: 'h:1', control_price_cents: 100, variant_prices_cents: [120], race: 'forbidden'
  }), /raw PII\/secret\/sensitive field forbidden/);
});

test('economic telemetry targets OBSERV-001 and FINOPS-001 with metadata hashes only', () => {
  const result = buildEconomicTelemetry({ context: ctx('LRN-001'), event_ref: 'event:econ:001', event_type: 'margin_observed' });
  assert.equal(result.observability_target, 'OBSERV-001');
  assert.equal(result.finops_target, 'FINOPS-001');
  assert.match(result.event_ref_hash, /^[a-f0-9]{32}$/);
  assert.equal(result.raw_pii_persisted, false);
  assert.equal(result.raw_sensitive_attributes_persisted, false);
});

test('phase 12 ledger is idempotent and rejects conflicting key reuse', () => {
  const ledger = createEconomicLedger();
  const request = { ...roiBase('MKT-001', 'campaign_ref', 'campaign:001', 'idempotent:001') };
  const first = ledger.execute({ operation: 'CAMPAIGN_ROI', request });
  const duplicate = ledger.execute({ operation: 'CAMPAIGN_ROI', request });
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(ledger.size(), 1);

  const conflict = ledger.execute({ operation: 'CAMPAIGN_ROI', request: { ...request, incremental_cost_cents: 120000 } });
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(conflict.human_required_reason, 'POLICY_CONFLICT');
  assert.equal(ledger.size(), 1);
});

test('only canonical HUMAN_REQUIRED reasons are configured', () => {
  assert.deepEqual(HUMAN_REQUIRED_REASONS, [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
  const low = calculateChannelRoi({ ...roiBase('LRN-001', 'channel_ref', 'channel:001', 'low:001'), confidence: 0.5 });
  assert.equal(low.allowed, false);
  assert.equal(low.human_required_reason, 'LOW_CONFIDENCE');
});
