import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSalesExecutionCase,
  buildAgentInboxItem,
  authorizeSalesExecutionStep,
  queueSalesExecutionStep,
  requestSalesExecutionDelivery,
  recordSalesExecutionDelivery,
  advanceSalesExecutionCadence,
  recordSalesExecutionReply,
  suppressSalesExecutionCase,
  buildCrmWritePlan,
  salesExecutionStatus,
  simulateSalesExecution,
  executeSalesCommand,
  SALES_EXECUTION_AGENT_INBOX_V1_CONTRACT
} from '../revenue/sales-execution-agent-inbox-v1.mjs';

const T0 = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function base(overrides = {}) {
  return {
    context: { company_id: 'fenix', engine_id: 'SALE-001', environment: 'PREPROD', version: 'v1' },
    lead_ref: 'lead:test-001',
    customer_ref: 'customer:test-001',
    campaign_id: 'campaign:test-001',
    contact_permission: 'ALLOWED',
    email_eligible: true,
    whatsapp_eligible: true,
    outreach_authorized: false,
    crm_write_authorized: false,
    agent_owner_ref: 'agent:carlos',
    now_ms: T0,
    ...overrides
  };
}

function approve(state, now = T0) {
  return authorizeSalesExecutionStep(state, {
    decision: 'APPROVE',
    approved_by_ref: 'agent:carlos',
    scope_fingerprint: state.current_scope_fingerprint,
    checkpoint_token: 'customer_human_request',
    now_ms: now
  });
}

function sendOne(state, now) {
  const authorized = approve(state, now);
  const queued = queueSalesExecutionStep(authorized, now);
  return requestSalesExecutionDelivery(queued, now);
}

test('defaults to PLAN_ONLY and exact human gate with no external side effects', () => {
  const state = createSalesExecutionCase(base());
  assert.equal(state.state, 'READY_FOR_HUMAN_APPROVAL');
  assert.equal(state.execution_mode, 'PLAN_ONLY');
  assert.equal(state.outreach_authorized, false);
  assert.equal(state.crm_write_authorized, false);
  assert.equal(state.blocker, 'HUMAN_REQUIRED');
  assert.equal(state.checkpoint_token, 'customer_human_request');
  assert.equal(state.external_side_effect_executed, false);
  assert.equal(state.prod_write_executed, false);
  assert.match(state.current_draft_ref, /^draft_[a-f0-9]{24}$/);
});

test('agent inbox contains approval package metadata without raw PII/message text', () => {
  const state = createSalesExecutionCase(base());
  const inbox = buildAgentInboxItem(state, T0);
  assert.equal(inbox.channel, 'EMAIL');
  assert.equal(inbox.step_id, 'D0_EMAIL');
  assert.equal(inbox.consent_state, 'ALLOWED');
  assert.equal(inbox.agent_owner_ref, 'agent:carlos');
  assert.deepEqual(inbox.actions, ['APPROVE','EDIT','REJECT','SUPPRESS']);
  assert.equal(inbox.raw_message_text_present, false);
  assert.equal(inbox.raw_pii_present, false);
  assert.match(inbox.scope_fingerprint, /^scope_[a-f0-9]{32}$/);
});

test('raw PII, message text and secrets are rejected anywhere in intake', () => {
  assert.throws(() => createSalesExecutionCase({ ...base(), email: 'person@example.com' }), /raw PII\/secret\/message field forbidden/);
  assert.throws(() => createSalesExecutionCase({ ...base(), message_text: 'hola' }), /raw PII\/secret\/message field forbidden/);
  assert.throws(() => createSalesExecutionCase({ ...base(), token: 'secret' }), /raw PII\/secret\/message field forbidden/);
});

test('PROD and pre-authorized initial outreach or CRM write are rejected fail-closed', () => {
  assert.throws(
    () => createSalesExecutionCase(base({ context: { company_id: 'fenix', engine_id: 'SALE-001', environment: 'PROD', version: 'v1' } })),
    /exact PREPROD only/
  );
  assert.throws(() => createSalesExecutionCase(base({ outreach_authorized: true })), /initial outreach_authorized must be false/);
  assert.throws(() => createSalesExecutionCase(base({ crm_write_authorized: true })), /initial crm_write_authorized must be false/);
});

test('high-value and sensitive financial cases escalate before outbound automation', () => {
  const high = createSalesExecutionCase(base({ high_value_lead: true }));
  assert.equal(high.state, 'ESCALATED_TO_HUMAN');
  assert.ok(high.escalation_reasons.includes('high_value_lead'));
  assert.equal(high.outreach_authorized, false);

  const sensitive = createSalesExecutionCase(base({ sensitive_financial_case: true }));
  assert.equal(sensitive.state, 'ESCALATED_TO_HUMAN');
  assert.ok(sensitive.escalation_reasons.includes('sensitive_financial_case'));
});

test('identity conflicts escalate and verified identity is reused', () => {
  const conflict = createSalesExecutionCase(base({
    customer_ref: undefined,
    identity_candidates: [
      { customer_ref: 'customer:a', status: 'VERIFIED' },
      { customer_ref: 'customer:b', status: 'VERIFIED' }
    ]
  }));
  assert.equal(conflict.state, 'ESCALATED_TO_HUMAN');
  assert.ok(conflict.escalation_reasons.includes('identity_conflict'));

  const reused = createSalesExecutionCase(base({
    customer_ref: undefined,
    identity_candidates: [{ customer_ref: 'customer:known', status: 'VERIFIED' }]
  }));
  assert.equal(reused.customer_or_lead_id, 'customer:known');
  assert.equal(reused.identity_resolution_state, 'RESOLVED_VERIFIED');
});

test('unknown permission escalates; denied permission suppresses; whatsapp is skipped when not eligible', () => {
  const unknown = createSalesExecutionCase(base({ contact_permission: 'UNKNOWN' }));
  assert.equal(unknown.state, 'ESCALATED_TO_HUMAN');
  assert.ok(unknown.escalation_reasons.includes('permission_unknown'));

  const denied = createSalesExecutionCase(base({ contact_permission: 'DENIED' }));
  assert.equal(denied.state, 'SUPPRESSED');
  assert.equal(denied.suppression_reason, 'permission_denied');

  let state = createSalesExecutionCase(base({ whatsapp_eligible: false }));
  let sent = sendOne(state, T0);
  state = recordSalesExecutionDelivery(sent.state, { outcome: 'SENT', now_ms: T0 });
  state = advanceSalesExecutionCadence(state, T0 + 2 * DAY);
  sent = sendOne(state, T0 + 2 * DAY);
  state = recordSalesExecutionDelivery(sent.state, { outcome: 'SENT', now_ms: T0 + 2 * DAY });
  state = advanceSalesExecutionCadence(state, T0 + 9 * DAY);
  assert.equal(state.current_step_index, 3);
  assert.equal(state.cadence[state.current_step_index].step_id, 'D9_EMAIL');
});

test('exact approval scope is mandatory; approve -> queue -> delivery request never dispatches itself', () => {
  const state = createSalesExecutionCase(base());
  assert.throws(() => authorizeSalesExecutionStep(state, {
    decision: 'APPROVE',
    approved_by_ref: 'agent:carlos',
    scope_fingerprint: 'scope_wrong',
    checkpoint_token: 'customer_human_request',
    now_ms: T0
  }), /scope mismatch/);

  const authorized = approve(state);
  assert.equal(authorized.state, 'AUTHORIZED_TO_SEND');
  const queued = queueSalesExecutionStep(authorized, T0);
  const requested = requestSalesExecutionDelivery(queued, T0);
  assert.equal(requested.state.state, 'DELIVERY_REQUESTED');
  assert.equal(requested.delivery_request.target_engine, 'COM-001');
  assert.equal(requested.delivery_request.dispatch_authorized, false);
  assert.equal(requested.delivery_request.adapter_dispatch_authorized, false);
  assert.equal(requested.delivery_request.external_side_effect_executed, false);
});

test('delivery request idempotency uses canonical tenant/profile/contact/campaign/step/channel tuple', () => {
  const state = createSalesExecutionCase(base());
  const requested = sendOne(state, T0);
  const duplicate = requestSalesExecutionDelivery(requested.state, T0);
  assert.equal(duplicate.delivery_request.status, 'DEDUPLICATED');
  assert.equal(
    duplicate.delivery_request.idempotency_key,
    'fenix|sales_executive|customer:test-001|campaign:test-001|D0_EMAIL|EMAIL'
  );
});

test('successful sends persist history and hard frequency caps stop runaway loops', () => {
  let state = createSalesExecutionCase(base({
    cadence: [
      { step_id: 'S1', offset_minutes: 0, channel: 'EMAIL' },
      { step_id: 'S2', offset_minutes: 24 * 60, channel: 'EMAIL' }
    ],
    limits: { max_attempts_total: 1, max_email_attempts: 1, email_min_interval_minutes: 0 }
  }));
  let requested = sendOne(state, T0);
  state = recordSalesExecutionDelivery(requested.state, { outcome: 'SENT', now_ms: T0 });
  assert.equal(state.contact_attempts, 1);
  assert.equal(state.contact_history.at(-1).type, 'DELIVERY_SENT');
  state = advanceSalesExecutionCadence(state, T0 + DAY);
  assert.equal(state.state, 'SUPPRESSED');
  assert.equal(state.suppression_reason, 'frequency_cap');
});

test('blocked delivery uses bounded exponential backoff plus deterministic jitter, then returns to human gate', () => {
  let state = createSalesExecutionCase(base({
    limits: { max_retry_attempts_per_step: 3, retry_base_minutes: 10, retry_max_minutes: 60 }
  }));
  let requested = sendOne(state, T0);
  state = recordSalesExecutionDelivery(requested.state, { outcome: 'BLOCKED', now_ms: T0 });
  assert.equal(state.state, 'DELIVERY_BLOCKED');
  assert.equal(state.blocker, 'RETRY_BACKOFF');
  assert.ok(state.next_allowed_contact_at_ms >= T0 + 10 * 60_000);
  assert.ok(state.next_allowed_contact_at_ms < T0 + 12 * 60_000);
  assert.throws(() => advanceSalesExecutionCadence(state, T0 + 5 * 60_000), /backoff not elapsed/);
  state = advanceSalesExecutionCadence(state, state.next_allowed_contact_at_ms);
  assert.equal(state.state, 'READY_FOR_HUMAN_APPROVAL');
  assert.equal(state.outreach_authorized, false);
});

test('reply stops cadence and escalates to human; explicit opt-out suppresses permanently', () => {
  const state = createSalesExecutionCase(base());
  const replied = recordSalesExecutionReply(state, { intent: 'POSITIVE', now_ms: T0 + 1000 });
  assert.equal(replied.state, 'ESCALATED_TO_HUMAN');
  assert.equal(replied.suppression_reason, 'reply_stop');
  assert.ok(replied.escalation_reasons.includes('reply_received'));
  assert.ok(replied.escalation_reasons.includes('positive_intent'));
  assert.equal(replied.next_allowed_contact_at_ms, null);

  const opted = suppressSalesExecutionCase(state, { reason: 'user_opt_out', actor_ref: 'customer:self', now_ms: T0 + 2000 });
  assert.equal(opted.state, 'OPTED_OUT');
  assert.equal(opted.suppression_reason, 'user_opt_out');
  assert.equal(opted.outreach_authorized, false);
});

test('CRM stays plan-only by default and performs no writes', () => {
  const state = createSalesExecutionCase(base());
  const plan = buildCrmWritePlan(state);
  assert.equal(plan.target_engine, 'CRM-001');
  assert.equal(plan.status, 'PLAN_ONLY_HUMAN_REQUIRED');
  assert.equal(plan.crm_write_authorized, false);
  assert.equal(plan.prod_write_executed, false);
  assert.equal(plan.external_side_effect_executed, false);
});

test('status, simulation and command router expose technical closure without enabling delivery', () => {
  const sim = simulateSalesExecution(base());
  assert.equal(sim.mode, 'SIMULATION');
  assert.equal(sim.status.plan_valid, true);
  assert.equal(sim.status.delivery_enabled, false);
  assert.equal(sim.status.blocker, 'HUMAN_REQUIRED');
  assert.equal(sim.status.checkpoint_token, 'customer_human_request');
  assert.equal(sim.external_side_effect_executed, false);

  const ingested = executeSalesCommand({ command: 'ingest', payload: base() });
  const status = executeSalesCommand({ state: ingested, command: 'status' });
  assert.equal(status.profile_id, 'sales_executive');
  const inbox = executeSalesCommand({ state: ingested, command: 'inbox', payload: { now_ms: T0 } });
  assert.equal(inbox.case_id, ingested.case_id);
});

test('contract captures 93-104 safety invariants and required persisted fields', () => {
  const c = SALES_EXECUTION_AGENT_INBOX_V1_CONTRACT;
  assert.equal(c.engine_id, 'SALE-001');
  assert.equal(c.profile_id, 'sales_executive');
  assert.equal(c.environment, 'PREPROD');
  assert.equal(c.outbound_default_authorized, false);
  assert.equal(c.crm_write_default_authorized, false);
  assert.equal(c.direct_transport_dispatch_authorized, false);
  assert.equal(c.prod_writes, false);
  assert.equal(c.raw_pii_allowed, false);
  assert.equal(c.raw_message_text_allowed, false);
  assert.equal(c.stop_on_reply, true);
  assert.equal(c.stop_on_optout, true);
  for (const field of ['contact_history','contact_attempts','contact_outcome','next_allowed_contact_at_ms','suppression_reason','agent_owner_ref']) {
    assert.ok(c.persisted_fields.includes(field));
  }
  assert.equal(c.idempotency_template, 'tenant_id|profile_id|customer_or_lead_id|campaign_id|step_id|channel');
  for (const reason of ['user_opt_out','hard_bounce','manual_suppression','complaint','reply_stop','legal_hold','frequency_cap']) {
    assert.ok(c.suppression_reasons.includes(reason));
  }
});
