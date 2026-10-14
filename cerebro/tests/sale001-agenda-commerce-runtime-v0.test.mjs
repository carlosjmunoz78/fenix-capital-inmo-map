import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaleCase, applySaleEvent } from '../revenue/sale-action-v1.mjs';
import {
  AGENDA_COMMERCE_SCENARIOS,
  HUMAN_REQUIRED_REASONS,
  SALE001_AGENDA_COMMERCE_V0_CONTRACT,
  buildAgendaCommercePlan,
  buildDurableJobIntent,
  buildPostPurchaseCommunicationIntent,
  buildStripeExistingWrapperPlan,
  createAgendaCommerceLedger,
  evaluateAgendaCommerceGate,
  reuseExistingNoShowRecovery
} from '../revenue/sale001-agenda-commerce-runtime-v0.mjs';

const context = Object.freeze({ company_id: 'fenix', engine_id: 'SALE-001', environment: 'PREPROD', version: '0.1.0' });

function requestFor(scenario, overrides = {}) {
  const base = {
    context,
    request_id: `req-${scenario.toLowerCase()}`,
    scenario,
    case_ref: 'case:001',
    confidence: 0.95
  };
  if (['BOOKING','REMINDER','RESCHEDULE','NO_SHOW_RECOVERY'].includes(scenario)) base.appointment_ref = 'appointment:001';
  if (['BOOKING','RESCHEDULE'].includes(scenario)) {
    base.slot_start_ms = 1_800_000_000_000;
    base.slot_end_ms = 1_800_003_600_000;
  }
  if (scenario === 'REMINDER') base.due_at_ms = 1_799_996_400_000;
  if (['AUTO_PROPOSAL','AUTO_BUDGET','DOCUSEAL_SIGNATURE_PREP','OREKO_QUOTE_INVOICE_PAYMENT','STRIPE_PAYMENT_PLAN','INVOICE_RECEIPT_PLAN'].includes(scenario)) {
    base.commercial_ref = 'commercial:001';
    base.amount_cents = 350000;
    base.currency = 'EUR';
  }
  if (['PRODUCT_DELIVERY_PLAN','POST_PURCHASE_EMAIL_PLAN'].includes(scenario)) base.order_ref = 'order:001';
  if (scenario === 'PRODUCT_DELIVERY_PLAN') base.product_ref = 'product:001';
  if (scenario === 'POST_PURCHASE_EMAIL_PLAN') base.customer_ref = 'customer:001';
  return { ...base, ...overrides };
}

function expectBlocked(overrides, code, reason) {
  const result = evaluateAgendaCommerceGate({ ...requestFor('BOOKING'), ...overrides });
  assert.equal(result.allowed, false);
  assert.equal(result.code, code);
  assert.equal(result.human_required_reason, reason);
  assert.equal(result.external_side_effect_executed, false);
}

test('all blocks 118-131 generate PREPROD plan-only orchestration with zero side effects', () => {
  assert.equal(AGENDA_COMMERCE_SCENARIOS.length, 14);
  for (const scenario of AGENDA_COMMERCE_SCENARIOS) {
    const result = buildAgendaCommercePlan(requestFor(scenario));
    assert.equal(result.allowed, true, scenario);
    assert.equal(result.plan.engine_id, 'SALE-001', scenario);
    assert.equal(result.plan.environment, 'PREPROD', scenario);
    assert.equal(result.plan.external_side_effect_executed, false, scenario);
    assert.equal(result.plan.prod_authorized, false, scenario);
    assert.equal(result.plan.additional_cost_eur, 0, scenario);
    assert.ok(result.plan.target_engines.includes('SALE-001'), scenario);
  }
});

test('external benchmark/provider policy is explicit and never live-bound', () => {
  const calnode = buildAgendaCommercePlan(requestFor('CALNODE_BENCHMARK'));
  const solivio = buildAgendaCommercePlan(requestFor('SOLIVIO_PATTERN'));
  const docuseal = buildAgendaCommercePlan(requestFor('DOCUSEAL_SIGNATURE_PREP'));
  const oreko = buildAgendaCommercePlan(requestFor('OREKO_QUOTE_INVOICE_PAYMENT'));
  const stripe = buildAgendaCommercePlan(requestFor('STRIPE_PAYMENT_PLAN'));
  assert.equal(calnode.plan.provider_state, 'LAB_BENCHMARK');
  assert.equal(solivio.plan.provider_state, 'LAB_PATTERN_ONLY');
  assert.equal(docuseal.plan.provider_state, 'LAB_BENCHMARK');
  assert.equal(oreko.plan.provider_state, 'LAB_BENCHMARK');
  assert.equal(stripe.plan.provider_state, 'EXISTING_WRAP_ONLY');
});

test('booking/reschedule target canonical AGD-001 and durable JOB-001 without calendar writes', () => {
  for (const scenario of ['BOOKING','RESCHEDULE']) {
    const result = buildAgendaCommercePlan(requestFor(scenario));
    assert.equal(result.plan.calendar_engine, 'AGD-001');
    assert.equal(result.plan.durable_job_target, 'JOB-001');
    assert.equal(result.plan.calendar_write_authorized, false);
  }
});

test('reminder and post-purchase email route to COM-001 as intents only', () => {
  const reminder = buildAgendaCommercePlan(requestFor('REMINDER'));
  assert.equal(reminder.plan.communication_engine, 'COM-001');
  assert.equal(reminder.plan.communication_dispatch_authorized, false);

  const post = buildPostPurchaseCommunicationIntent({ ...requestFor('POST_PURCHASE_EMAIL_PLAN'), template_ref: 'template:post-purchase:v1' });
  assert.equal(post.allowed, true);
  assert.equal(post.communication_intent.target_engine, 'COM-001');
  assert.equal(post.communication_intent.dispatch_authorized, false);
  assert.equal(post.communication_intent.raw_contact_data_present, false);
  assert.equal(post.communication_intent.raw_message_body_present, false);
});

test('no-show recovery reuses existing SALE-001 transition instead of duplicating logic', () => {
  const saleContext = { company_id: 'fenix', engine_id: 'SALE-001', environment: 'PREPROD', version: '0.1.0' };
  const leadDecision = {
    context: { company_id: 'fenix', engine_id: 'LEAD-001', environment: 'PREPROD', version: '0.1.0' },
    decision_id: 'decision:001',
    lead_ref: 'lead:001',
    next_best_action: { action: 'CONTACT_NOW', target_sla_minutes: 30, autonomous_contact_allowed: true },
    estimated_value_eur: 1000,
    heuristic_weighted_value_eur: 500
  };
  const sale = createSaleCase({ context: saleContext, lead_decision: leadDecision, contact_permission: 'ALLOWED', now_ms: 1_800_000_000_000 });
  const appointment = applySaleEvent(sale, { event_id: 'event:booked', type: 'APPOINTMENT_BOOKED', now_ms: 1_800_000_100_000 });
  const result = reuseExistingNoShowRecovery({ context, sale_state: appointment, event_id: 'event:noshow', now_ms: 1_800_000_200_000 });
  assert.equal(result.allowed, true);
  assert.equal(result.duplicated_recovery_logic, false);
  assert.equal(result.sale_state.current_action, 'RECOVER_NO_SHOW');
  assert.equal(result.sale_state.no_show_count, 1);
  assert.equal(result.sale_state.delivery_intent.target_engine, 'COM-001');
  assert.equal(result.sale_state.delivery_intent.dispatch_authorized, false);
});

test('DocuSeal preparation exposes signature gate while execution is fail-closed', () => {
  const prep = buildAgendaCommercePlan(requestFor('DOCUSEAL_SIGNATURE_PREP'));
  assert.equal(prep.plan.signature_human_gate, 'SIGNATURE_REQUIRED');
  assert.equal(prep.plan.signature_execution_authorized, false);
  expectBlocked({ signature_execution_requested: true }, 'SIGNATURE_EXECUTION_DISABLED', 'SIGNATURE_REQUIRED');
});

test('payment preparation wraps canonical PAY-001 but actual money movement is fail-closed', () => {
  const stripe = buildStripeExistingWrapperPlan(requestFor('STRIPE_PAYMENT_PLAN'));
  assert.equal(stripe.allowed, true);
  assert.equal(stripe.plan.payment_engine, 'PAY-001');
  assert.equal(stripe.stripe.integration_policy, 'WRAP_EXISTING_ONLY');
  assert.equal(stripe.stripe.create_new_payment_system, false);
  assert.equal(stripe.stripe.charge_authorized, false);
  assert.equal(stripe.stripe.credential_access_authorized, false);
  expectBlocked({ payment_execution_requested: true }, 'PAYMENT_EXECUTION_DISABLED', 'MONEY_LIMIT');
});

test('invoice issuance, calendar writes, message dispatch and product dispatch are fail-closed', () => {
  expectBlocked({ invoice_issue_requested: true }, 'INVOICE_ISSUE_DISABLED', 'LEGAL_REQUIRED');
  expectBlocked({ calendar_write_requested: true }, 'CALENDAR_WRITE_DISABLED', 'POLICY_CONFLICT');
  expectBlocked({ message_dispatch_requested: true }, 'MESSAGE_DISPATCH_DISABLED', 'POLICY_CONFLICT');
  expectBlocked({ product_delivery_requested: true }, 'PRODUCT_DELIVERY_DISABLED', 'POLICY_CONFLICT');
});

test('Product Factory is reused through an adapter seam; a second factory is not created', () => {
  const result = buildAgendaCommercePlan(requestFor('PRODUCT_DELIVERY_PLAN'));
  assert.equal(result.plan.product_factory_reuse_required, true);
  assert.equal(result.plan.product_factory_adapter_state, 'EXISTING_AION_CAPABILITY_ADAPTER_SEAM_REQUIRES_LIVE_AUDIT');
  assert.equal(result.plan.product_delivery_authorized, false);
  assert.equal(SALE001_AGENDA_COMMERCE_V0_CONTRACT.product_factory_policy, 'REUSE_EXISTING_AION_CAPABILITY_DO_NOT_CREATE_SECOND_FACTORY');
});

test('durable scheduling emits JOB-001 intent but does not enqueue', () => {
  const result = buildDurableJobIntent(requestFor('REMINDER'));
  assert.equal(result.allowed, true);
  assert.equal(result.job.target_engine, 'JOB-001');
  assert.equal(result.job.enqueue_authorized, false);
  assert.match(result.job.idempotency_key, /^sale001:fenix:/);
});

test('tenant isolation is fail-closed', () => {
  expectBlocked({ target_company_id: 'other-company' }, 'COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT');
});

test('PROD is rejected exactly', () => {
  assert.throws(() => buildAgendaCommercePlan(requestFor('BOOKING', { context: { ...context, environment: 'PROD' } })), /exact PREPROD only/);
});

test('raw PII, secrets and raw content cannot enter state', () => {
  assert.throws(() => buildAgendaCommercePlan({ ...requestFor('BOOKING'), email: 'x@example.com' }), /raw PII\/secret\/content field forbidden/);
  assert.throws(() => buildAgendaCommercePlan({ ...requestFor('BOOKING'), access_token: 'secret' }), /raw PII\/secret\/content field forbidden/);
  assert.throws(() => buildPostPurchaseCommunicationIntent({ ...requestFor('POST_PURCHASE_EMAIL_PLAN'), template_ref: 'template:v1', body_text: 'hello' }), /raw PII\/secret\/content field forbidden/);
});

test('idempotency returns exact duplicate and blocks conflicting key reuse', () => {
  const ledger = createAgendaCommerceLedger();
  const first = ledger.execute(requestFor('AUTO_BUDGET'));
  const duplicate = ledger.execute(requestFor('AUTO_BUDGET'));
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(ledger.size(), 1);

  const conflict = ledger.execute(requestFor('AUTO_BUDGET', { amount_cents: 450000 }));
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(conflict.human_required_reason, 'POLICY_CONFLICT');
  assert.equal(ledger.size(), 1);
});

test('only canonical HUMAN_REQUIRED reasons are configured and risk/confidence gates use them', () => {
  assert.deepEqual(HUMAN_REQUIRED_REASONS, [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
  expectBlocked({ confidence: 0.5 }, 'LOW_CONFIDENCE', 'LOW_CONFIDENCE');
  expectBlocked({ high_risk: true }, 'HIGH_RISK_CASE', 'HIGH_RISK');
  expectBlocked({ customer_human_request: true }, 'CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST');
});
