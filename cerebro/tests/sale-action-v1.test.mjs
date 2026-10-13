import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluateLead } from '../revenue/lead-nba-v1.mjs';
import { createSaleCase, applySaleEvent, salePlanJobHandler, SALE_ACTION_V1_CONTRACT } from '../revenue/sale-action-v1.mjs';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';

const LEAD_CTX = Object.freeze({ company_id: 'fenix', engine_id: 'LEAD-001', environment: 'PREPROD', version: 'v1' });
const SALE_CTX = Object.freeze({ company_id: 'fenix', engine_id: 'SALE-001', environment: 'PREPROD', version: 'v1' });
const NOW = 1_800_000_000_000;

function leadInput(overrides = {}) {
  return {
    context: LEAD_CTX,
    lead_ref: 'crm:lead:synthetic-sale-001',
    source: 'WEB_FORM',
    signals: {
      profile_fit: 90,
      explicit_intent: 95,
      behavioral_intent: 90,
      urgency: 90,
      contactability: 95,
      source_quality: 95,
      evidence_coverage: 95,
      recency: 98,
      engagement: 90,
      negative_signal: 0
    },
    evidence_refs: ['evt:web:synthetic-sale-001'],
    contact_permission: 'ALLOWED',
    estimated_value_eur: 3500,
    ...overrides
  };
}

function saleInput(overrides = {}) {
  return {
    context: SALE_CTX,
    lead_decision: evaluateLead(leadInput()),
    contact_permission: 'ALLOWED',
    now_ms: NOW,
    ...overrides
  };
}

test('high priority lead becomes side-effect-free COM-001 delivery intent with exact SLA', () => {
  const state = createSaleCase(saleInput());
  assert.equal(state.status, 'READY_FOR_DELIVERY');
  assert.equal(state.current_action, 'CONTACT_NOW');
  assert.equal(state.due_at_ms, NOW + 5 * 60_000);
  assert.equal(state.delivery_intent.target_engine, 'COM-001');
  assert.equal(state.delivery_intent.route, 'AUTO_SELECT_AUTHORIZED_CUSTOMER_CHANNEL');
  assert.equal(state.delivery_intent.channel_binding_required, true);
  assert.equal(state.delivery_intent.dispatch_authorized, false);
  assert.equal(state.delivery_intent.external_side_effect_executed, false);
  assert.equal(state.side_effects_executed, false);
});

test('permission snapshot overrides commercial priority and blocks delivery', () => {
  const denied = createSaleCase(saleInput({ contact_permission: 'DENIED' }));
  assert.equal(denied.status, 'STOPPED');
  assert.equal(denied.current_action, 'DO_NOT_CONTACT');
  assert.equal(denied.delivery_intent, null);

  const unknown = createSaleCase(saleInput({ contact_permission: 'UNKNOWN' }));
  assert.equal(unknown.status, 'VERIFYING_PERMISSION');
  assert.equal(unknown.current_action, 'VERIFY_CONTACT_PERMISSION');
  assert.equal(unknown.delivery_intent, null);
});

test('customer-requested-contact remains contactable but still cannot bypass channel adapter authority', () => {
  const lead_decision = evaluateLead(leadInput({ contact_permission: 'CUSTOMER_REQUESTED_CONTACT' }));
  const state = createSaleCase(saleInput({ lead_decision, contact_permission: 'CUSTOMER_REQUESTED_CONTACT' }));
  assert.equal(state.current_action, 'CONTACT_NOW');
  assert.ok(state.delivery_intent);
  assert.equal(state.delivery_intent.dispatch_authorized, false);
  assert.equal(state.channel_binding_status, 'REQUIRED_NOT_AUTHORIZED');
});

test('canonical HUMAN_REQUIRED is propagated without delivery intent', () => {
  const lead_decision = evaluateLead(leadInput({ human_required_reason: 'LEGAL_REQUIRED' }));
  const state = createSaleCase(saleInput({ lead_decision }));
  assert.equal(state.status, 'WAITING_HUMAN');
  assert.equal(state.human_required, 'LEGAL_REQUIRED');
  assert.equal(state.delivery_intent, null);
});

test('return-to-lead, verify-contact and monitor remain non-contact tasks', () => {
  const lowConfidence = evaluateLead(leadInput({ signals: { ...leadInput().signals, source_quality: 20, evidence_coverage: 20 } }));
  const returnToLead = createSaleCase(saleInput({ lead_decision: lowConfidence }));
  assert.equal(returnToLead.status, 'RETURN_TO_LEAD');
  assert.equal(returnToLead.delivery_intent, null);

  const lowContact = evaluateLead(leadInput({ signals: { ...leadInput().signals, contactability: 20 } }));
  const verify = createSaleCase(saleInput({ lead_decision: lowContact }));
  assert.equal(verify.status, 'VERIFYING_CONTACT');
  assert.equal(verify.delivery_intent, null);

  const monitorLead = evaluateLead(leadInput({ signals: {
    ...leadInput().signals,
    profile_fit: 20, explicit_intent: 10, behavioral_intent: 10, urgency: 10, contactability: 90, engagement: 10
  } }));
  const monitor = createSaleCase(saleInput({ lead_decision: monitorLead }));
  assert.equal(monitor.status, 'MONITORING');
  assert.equal(monitor.delivery_intent, null);
});

test('cross-company decision and raw PII/message content fail closed', () => {
  assert.throws(() => createSaleCase({ ...saleInput(), context: { ...SALE_CTX, company_id: 'acme' } }), /cross-company/);
  assert.throws(() => createSaleCase({ ...saleInput(), email: 'person@example.com' }), /raw PII\/secret\/message field forbidden/);
  assert.throws(() => createSaleCase({ ...saleInput(), phone_number: '600000000' }), /raw PII\/secret\/message field forbidden/);
  assert.throws(() => createSaleCase({ ...saleInput(), message_text: 'Hola' }), /raw PII\/secret\/message field forbidden/);
  assert.throws(() => createSaleCase({ ...saleInput(), access_token: 'secret' }), /raw PII\/secret\/message field forbidden/);
});

test('exact PREPROD SALE-001 boundary is enforced', () => {
  assert.throws(() => createSaleCase({ ...saleInput(), context: { ...SALE_CTX, environment: 'PROD' } }), /exact PREPROD/);
  assert.throws(() => createSaleCase({ ...saleInput(), context: { ...SALE_CTX, engine_id: 'LEAD-001' } }), /requires context.engine_id=SALE-001/);
});

test('duplicate sales events are idempotent', () => {
  const state = createSaleCase(saleInput());
  const first = applySaleEvent(state, { event_id: 'evt:contact:001', type: 'CONTACT_SUCCEEDED', now_ms: NOW + 10_000 });
  const duplicate = applySaleEvent(first, { event_id: 'evt:contact:001', type: 'CONTACT_SUCCEEDED', now_ms: NOW + 20_000 });
  assert.equal(first.attempt_count, 1);
  assert.equal(duplicate.attempt_count, 1);
  assert.equal(duplicate.duplicate_event, true);
  assert.deepEqual(duplicate.processed_event_ids, first.processed_event_ids);
});

test('no-reply cadence is bounded and eventually cools down instead of looping forever', () => {
  let state = createSaleCase(saleInput());
  state = applySaleEvent(state, { event_id: 'evt:sent:1', type: 'CONTACT_SUCCEEDED', now_ms: NOW + 1_000 });
  state = applySaleEvent(state, { event_id: 'evt:no:1', type: 'NO_REPLY', now_ms: NOW + 2_000 });
  assert.equal(state.status, 'READY_FOR_DELIVERY');
  assert.equal(state.current_action, 'FOLLOW_UP');
  assert.ok(state.delivery_intent);
  assert.equal(state.delivery_intent.dispatch_authorized, false);

  state = applySaleEvent(state, { event_id: 'evt:sent:2', type: 'CONTACT_SUCCEEDED', now_ms: NOW + 3_000 });
  state = applySaleEvent(state, { event_id: 'evt:no:2', type: 'NO_REPLY', now_ms: NOW + 4_000 });
  state = applySaleEvent(state, { event_id: 'evt:sent:3', type: 'CONTACT_SUCCEEDED', now_ms: NOW + 5_000 });
  state = applySaleEvent(state, { event_id: 'evt:no:3', type: 'NO_REPLY', now_ms: NOW + 6_000 });
  assert.equal(state.status, 'COOL_DOWN');
  assert.equal(state.current_action, 'MONITOR');
  assert.equal(state.delivery_intent, null);
});

test('objections and no-show create bounded recovery intents without sending anything', () => {
  const initial = createSaleCase(saleInput());
  const objection = applySaleEvent(initial, { event_id: 'evt:objection:1', type: 'OBJECTION_PRICE', now_ms: NOW + 1_000 });
  assert.equal(objection.current_action, 'OBJECTION_RECOVERY');
  assert.equal(objection.objection_count, 1);
  assert.equal(objection.delivery_intent.target_engine, 'COM-001');
  assert.equal(objection.delivery_intent.dispatch_authorized, false);

  const noShow = applySaleEvent(objection, { event_id: 'evt:noshow:1', type: 'NO_SHOW', now_ms: NOW + 2_000 });
  assert.equal(noShow.current_action, 'RECOVER_NO_SHOW');
  assert.equal(noShow.no_show_count, 1);
  assert.equal(noShow.delivery_intent.dispatch_authorized, false);
});

test('permission revocation and customer human request stop automatic commercial delivery immediately', () => {
  const initial = createSaleCase(saleInput());
  const revoked = applySaleEvent(initial, { event_id: 'evt:revoke:1', type: 'CONTACT_PERMISSION_REVOKED', now_ms: NOW + 1_000 });
  assert.equal(revoked.status, 'STOPPED');
  assert.equal(revoked.current_action, 'DO_NOT_CONTACT');
  assert.equal(revoked.delivery_intent, null);
  assert.throws(() => applySaleEvent(revoked, { event_id: 'evt:later:1', type: 'NO_REPLY', now_ms: NOW + 2_000 }), /terminal/);

  const requested = applySaleEvent(initial, { event_id: 'evt:human:1', type: 'CUSTOMER_HUMAN_REQUEST', now_ms: NOW + 3_000 });
  assert.equal(requested.status, 'WAITING_HUMAN');
  assert.equal(requested.human_required, 'CUSTOMER_HUMAN_REQUEST');
  assert.equal(requested.delivery_intent, null);
});

test('won/lost are terminal and cannot be mutated by later cadence events', () => {
  const initial = createSaleCase(saleInput());
  const won = applySaleEvent(initial, { event_id: 'evt:won:1', type: 'WON', now_ms: NOW + 1_000 });
  assert.equal(won.status, 'WON');
  assert.equal(won.delivery_intent, null);
  assert.throws(() => applySaleEvent(won, { event_id: 'evt:no:after-win', type: 'NO_REPLY', now_ms: NOW + 2_000 }), /terminal/);
});

test('SALE-001 plan executes through durable JOB-001 worker and survives journal reopen', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-sale-v1-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queue = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  const { context, ...payload } = saleInput();
  const enqueued = queue.enqueue({
    name: SALE_ACTION_V1_CONTRACT.job_name,
    context,
    payload,
    timeout_ms: 1000,
    idempotency_key: 'sale-plan:synthetic-001'
  });
  assert.equal(enqueued.accepted, true);
  const worker = new DurableWorkerRunnerV1({
    job_runtime: queue,
    worker_id: 'sale-worker-test',
    lease_ms: 1000,
    heartbeat_ms: 20,
    max_concurrency: 2,
    max_per_company: 1
  }).register({ name: SALE_ACTION_V1_CONTRACT.job_name, handler: salePlanJobHandler });
  const outcome = await worker.runOne({ context });
  assert.equal(outcome.status, 'SUCCEEDED');
  assert.equal(outcome.job.result.current_action, 'CONTACT_NOW');
  assert.equal(outcome.job.result.delivery_intent.dispatch_authorized, false);
  const reopened = new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') });
  assert.equal(reopened.get(outcome.job.job_id).result.sale_case_id, outcome.job.result.sale_case_id);
});

test('SALE contract preserves zero-cost and authority boundaries', () => {
  assert.equal(SALE_ACTION_V1_CONTRACT.engine_id, 'SALE-001');
  assert.equal(SALE_ACTION_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(SALE_ACTION_V1_CONTRACT.downstream_intent_target, 'COM-001');
  assert.equal(SALE_ACTION_V1_CONTRACT.external_dispatch_authorized, false);
  assert.equal(SALE_ACTION_V1_CONTRACT.channel_binding_required, true);
  assert.equal(SALE_ACTION_V1_CONTRACT.direct_whatsapp_authorized, false);
  assert.equal(SALE_ACTION_V1_CONTRACT.direct_phone_authorized, false);
  assert.equal(SALE_ACTION_V1_CONTRACT.prod_writes, false);
  assert.equal(SALE_ACTION_V1_CONTRACT.trading_access, false);
  assert.equal(SALE_ACTION_V1_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(SALE_ACTION_V1_CONTRACT.max_automatic_follow_up_attempts_before_cooldown, 3);
});
