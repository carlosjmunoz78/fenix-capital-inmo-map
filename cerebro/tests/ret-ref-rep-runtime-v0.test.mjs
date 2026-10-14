import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUMAN_REQUIRED_REASONS,
  PHASE11_BLOCKS,
  PHASE11_CONTRACT,
  buildCustomerRescuePlan,
  buildLowRiskReviewResponse,
  buildNegativeReviewAlert,
  buildPhase11Telemetry,
  buildUpsellCrossSellPlan,
  classifyNegativeReview,
  createPhase11Ledger,
  evaluateReferralMoment,
  evaluateReviewRequest,
  scoreChurnRisk
} from '../customer/ret-ref-rep-runtime-v0.mjs';

const retContext = Object.freeze({ company_id: 'fenix', engine_id: 'RET-001', environment: 'PREPROD', version: '0.1.0' });
const refContext = Object.freeze({ company_id: 'fenix', engine_id: 'REF-001', environment: 'PREPROD', version: '0.1.0' });
const repContext = Object.freeze({ company_id: 'fenix', engine_id: 'REP-001', environment: 'PREPROD', version: '0.1.0' });

const retBase = Object.freeze({
  context: retContext,
  request_id: 'ret:req:001',
  customer_ref: 'customer:001',
  confidence: 0.95,
  days_since_last_response: 10,
  stalled_days: 5,
  missed_followups: 2,
  no_show_count: 1,
  unresolved_issue: false,
  explicit_abandonment_signal: false,
  explicit_renunciation_signal: false,
  negative_experience_signal: false,
  engagement_drop: 0.5
});

const refBase = Object.freeze({
  context: refContext,
  request_id: 'ref:req:001',
  customer_ref: 'customer:001',
  confidence: 0.95,
  completed_successfully: true,
  satisfaction_score: 10,
  unresolved_issue: false,
  complaint_open: false,
  positive_feedback_signal: true,
  days_since_success: 7,
  referral_requested_recently: false,
  contact_allowed: true,
  opted_out: false
});

const repBase = Object.freeze({
  context: repContext,
  request_id: 'rep:req:001',
  customer_ref: 'customer:001',
  confidence: 0.95,
  completed_successfully: true,
  satisfaction_score: 9,
  unresolved_issue: false,
  complaint_open: false,
  review_requested_recently: false,
  contact_allowed: true,
  opted_out: false
});

const reviewBase = Object.freeze({
  context: repContext,
  request_id: 'rep:review:001',
  review_ref: 'review:001',
  confidence: 0.95,
  rating: 2,
  legal_allegation: false,
  fraud_or_crime_allegation: false,
  threat_or_safety_signal: false,
  privacy_or_pii_signal: false,
  discrimination_or_harassment_signal: false,
  compensation_demand: false,
  active_complaint: false
});

test('phase 11 contract covers exact blocks 132-142 with canonical engines and zero-cost PREPROD defaults', () => {
  assert.deepEqual(PHASE11_CONTRACT.blocks, [132,133,134,135,136,137,138,139,140,141,142]);
  assert.deepEqual(PHASE11_CONTRACT.engines, ['RET-001','REF-001','REP-001']);
  assert.equal(PHASE11_CONTRACT.environment, 'PREPROD');
  assert.equal(PHASE11_CONTRACT.deterministic_rules_only, true);
  assert.equal(PHASE11_CONTRACT.ml_required, false);
  assert.equal(PHASE11_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(PHASE11_CONTRACT.external_dispatch_authorized, false);
  assert.equal(PHASE11_CONTRACT.prod_authorized, false);
});

test('RET-001 deterministic churn score detects abandonment risk without ML', () => {
  const result = scoreChurnRisk(retBase);
  assert.equal(result.allowed, true);
  assert.equal(result.engine_id, 'RET-001');
  assert.equal(result.model_type, 'DETERMINISTIC_RULES_NO_ML');
  assert.ok(result.score >= 30);
  assert.equal(result.requires_rescue, true);
  assert.equal(result.external_side_effect_executed, false);
});

test('RET-001 explicit abandonment raises risk and customer rescue emits COM-001 intent only', () => {
  const result = buildCustomerRescuePlan({ ...retBase, explicit_abandonment_signal: true, contact_allowed: true, opted_out: false });
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'CUSTOMER_RESCUE_PLAN_READY');
  assert.equal(result.rescue_plan.block, PHASE11_BLOCKS.CUSTOMER_RESCUE);
  assert.equal(result.rescue_plan.target_engine, 'COM-001');
  assert.equal(result.rescue_plan.durable_job_target, 'JOB-001');
  assert.equal(result.rescue_plan.dispatch_authorized, false);
  assert.equal(result.rescue_plan.crm_write_authorized, false);
});

test('RET-001 rescue suppresses contact when opted out or contact is not allowed', () => {
  for (const override of [{ contact_allowed: false, opted_out: false }, { contact_allowed: true, opted_out: true }]) {
    const result = buildCustomerRescuePlan({ ...retBase, explicit_abandonment_signal: true, ...override });
    assert.equal(result.allowed, false);
    assert.equal(result.code, 'RESCUE_CONTACT_NOT_ALLOWED');
    assert.equal(result.human_required_reason, 'POLICY_CONFLICT');
  }
});

test('upsell/cross-sell requires successful satisfied customer with no unresolved risk', () => {
  const eligible = buildUpsellCrossSellPlan({
    context: retContext,
    request_id: 'ret:upsell:001',
    customer_ref: 'customer:001',
    completed_successfully: true,
    satisfaction_score: 9,
    unresolved_issue: false,
    complaint_open: false,
    retention_risk_score: 10,
    confidence: 0.95
  });
  assert.equal(eligible.allowed, true);
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.target_engine, 'SALE-001');
  assert.equal(eligible.crm_write_authorized, false);

  const suppressed = buildUpsellCrossSellPlan({
    context: retContext,
    request_id: 'ret:upsell:002',
    customer_ref: 'customer:001',
    completed_successfully: true,
    satisfaction_score: 9,
    unresolved_issue: true,
    complaint_open: false,
    retention_risk_score: 80,
    confidence: 0.95
  });
  assert.equal(suppressed.eligible, false);
  assert.equal(suppressed.target_engine, null);
});

test('REF-001 chooses a referral moment using satisfaction/result rules and does not dispatch', () => {
  const result = evaluateReferralMoment(refBase);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'BEST_REFERRAL_MOMENT_READY');
  assert.equal(result.eligible, true);
  assert.equal(result.referral_as_a_service_pattern, 'LAB_PATTERN_ONLY');
  assert.equal(result.communication_intent.target_engine, 'COM-001');
  assert.equal(result.communication_intent.dispatch_authorized, false);
  assert.equal(result.additional_cost_eur, 0);
});

test('REF-001 suppresses referral request for an unresolved issue, recent request, opt-out or low satisfaction', () => {
  const variants = [
    { unresolved_issue: true },
    { referral_requested_recently: true },
    { opted_out: true },
    { satisfaction_score: 3, positive_feedback_signal: false }
  ];
  for (const variant of variants) {
    const result = evaluateReferralMoment({ ...refBase, ...variant });
    assert.equal(result.allowed, true);
    assert.equal(result.eligible, false);
    assert.equal(result.communication_intent, null);
  }
});

test('REP-001 review request requires successful high-satisfaction case and remains intent-only', () => {
  const result = evaluateReviewRequest(repBase);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'REVIEW_REQUEST_PLAN_READY');
  assert.equal(result.eligible, true);
  assert.equal(result.provider_adapter, 'GOOGLE_BUSINESS_FUTURE_ADAPTER_POR_AUDITAR');
  assert.equal(result.communication_intent.target_engine, 'COM-001');
  assert.equal(result.communication_intent.dispatch_authorized, false);
  assert.equal(result.public_post_authorized, false);
});

test('REP-001 negative review classifier stores structured risk only, never raw review', () => {
  const result = classifyNegativeReview(reviewBase);
  assert.equal(result.allowed, true);
  assert.equal(result.negative, true);
  assert.equal(result.alert_required, true);
  assert.equal(result.high_risk, false);
  assert.equal(result.raw_review_stored, false);
  assert.equal(result.pii_stored, false);
});

test('negative review alert routes low-risk alert to NOTIF-001 without dispatch', () => {
  const result = buildNegativeReviewAlert(reviewBase);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'NEGATIVE_REVIEW_ALERT_READY');
  assert.equal(result.alert.target_engine, 'NOTIF-001');
  assert.equal(result.alert.dispatch_authorized, false);
  assert.equal(result.alert.human_required_reason, null);
});

test('high-risk negative review is alerted toward HEX-001 and autonomous public response is blocked', () => {
  const highRisk = { ...reviewBase, legal_allegation: true };
  const alert = buildNegativeReviewAlert(highRisk);
  assert.equal(alert.allowed, true);
  assert.equal(alert.high_risk, true);
  assert.equal(alert.alert.target_engine, 'HEX-001');
  assert.equal(alert.alert.human_required_reason, 'HIGH_RISK');

  const response = buildLowRiskReviewResponse(highRisk);
  assert.equal(response.allowed, false);
  assert.equal(response.code, 'REVIEW_RESPONSE_HIGH_RISK');
  assert.equal(response.human_required_reason, 'HIGH_RISK');
});

test('low-risk review response can be planned autonomously but never posted in V0', () => {
  const result = buildLowRiskReviewResponse(reviewBase);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'LOW_RISK_REVIEW_RESPONSE_PLAN_READY');
  assert.equal(result.tone, 'EMPATHETIC_RECOVERY');
  assert.equal(result.public_post_authorized, false);
  assert.equal(result.communication_dispatch_authorized, false);
  assert.equal(result.raw_review_used_or_stored, false);
});

test('tenant isolation, PROD and external/CRM side effects are fail-closed', () => {
  const crossTenant = scoreChurnRisk({ ...retBase, target_company_id: 'other-company' });
  assert.equal(crossTenant.allowed, false);
  assert.equal(crossTenant.human_required_reason, 'SECURITY_INCIDENT');

  assert.throws(() => scoreChurnRisk({ ...retBase, context: { ...retContext, environment: 'PROD' } }), /exact PREPROD only/);

  const dispatch = scoreChurnRisk({ ...retBase, external_dispatch_requested: true });
  assert.equal(dispatch.allowed, false);
  assert.equal(dispatch.code, 'EXTERNAL_DISPATCH_DISABLED');

  const write = scoreChurnRisk({ ...retBase, crm_write_requested: true });
  assert.equal(write.allowed, false);
  assert.equal(write.code, 'CRM_WRITE_DISABLED');
});

test('raw PII, review text and credentials cannot enter phase 11 state', () => {
  assert.throws(() => scoreChurnRisk({ ...retBase, email: 'x@example.com' }), /raw PII\/secret\/content field forbidden/);
  assert.throws(() => classifyNegativeReview({ ...reviewBase, review_text: 'private raw review' }), /raw PII\/secret\/content field forbidden/);
  assert.throws(() => evaluateReferralMoment({ ...refBase, access_token: 'secret' }), /raw PII\/secret\/content field forbidden/);
});

test('telemetry persists metadata hashes only', () => {
  const result = buildPhase11Telemetry({ context: repContext, event_ref: 'event:review:001', event_type: 'negative_review_alert' });
  assert.equal(result.engine_id, 'REP-001');
  assert.match(result.event_ref_hash, /^[a-f0-9]{32}$/);
  assert.equal(result.raw_pii_persisted, false);
  assert.equal(result.raw_review_persisted, false);
  assert.equal(result.raw_message_persisted, false);
  assert.equal(result.external_side_effect_executed, false);
});

test('phase 11 ledger is idempotent and rejects key reuse with changed fingerprint', () => {
  const ledger = createPhase11Ledger();
  const request = { ...refBase, request_id: 'idempotent:ref:001' };
  const first = ledger.execute({ operation: 'REFERRAL_MOMENT', request });
  const duplicate = ledger.execute({ operation: 'REFERRAL_MOMENT', request });
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(ledger.size(), 1);

  const conflict = ledger.execute({ operation: 'REFERRAL_MOMENT', request: { ...request, satisfaction_score: 9 } });
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
  const lowConfidence = evaluateReviewRequest({ ...repBase, confidence: 0.5 });
  assert.equal(lowConfidence.human_required_reason, 'LOW_CONFIDENCE');
  const customerHuman = evaluateReviewRequest({ ...repBase, customer_human_request: true });
  assert.equal(customerHuman.human_required_reason, 'CUSTOMER_HUMAN_REQUEST');
});
