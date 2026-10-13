import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLead } from '../revenue/lead-nba-v1.mjs';
import { createSaleCase } from '../revenue/sale-action-v1.mjs';
import { planCustomerDelivery, comPlanDeliveryJobHandler, COM_DELIVERY_ROUTER_V1_CONTRACT } from '../communication/com-delivery-router-v1.mjs';

function leadDecision(overrides = {}) {
  return evaluateLead({
    context: { company_id: 'fenix', engine_id: 'LEAD-001', environment: 'PREPROD', version: 'v1' },
    lead_ref: 'lead:test-001',
    source: 'WEB_FORM',
    signals: {
      profile_fit: 95,
      explicit_intent: 95,
      behavioral_intent: 90,
      urgency: 90,
      contactability: 90,
      source_quality: 90,
      evidence_coverage: 95,
      recency: 95,
      engagement: 90,
      negative_signal: 0
    },
    evidence_refs: ['evt:webform:001'],
    contact_permission: 'ALLOWED',
    estimated_value_eur: 3500,
    ...overrides
  });
}

function saleCase(decision = leadDecision()) {
  return createSaleCase({
    context: { company_id: 'fenix', engine_id: 'SALE-001', environment: 'PREPROD', version: 'v1' },
    lead_decision: decision,
    contact_permission: 'ALLOWED',
    now_ms: 1_800_000_000_000
  });
}

function routeInput(overrides = {}) {
  const sale = saleCase();
  assert.ok(sale.delivery_intent, 'high-priority lead must produce delivery intent');
  return {
    context: { company_id: 'fenix', engine_id: 'COM-001', environment: 'PREPROD', version: 'v1' },
    delivery_intent: sale.delivery_intent,
    contact_permission: 'ALLOWED',
    suppressed: false,
    policy: { minute_of_day: 600, quiet_start_minute: 1260, quiet_end_minute: 540, timezone: 'Europe/Madrid' },
    channel_preferences: ['WHATSAPP','PHONE','WEB_WIDGET'],
    channel_bindings: [],
    seen_delivery_intent_ids: [],
    ...overrides
  };
}

test('fails closed when there is no authorized customer adapter', () => {
  const out = planCustomerDelivery(routeInput());
  assert.equal(out.route_status, 'BLOCKED_NO_AUTHORIZED_CUSTOMER_ADAPTER');
  assert.equal(out.selected_channel, null);
  assert.equal(out.dispatch_authorized, false);
  assert.equal(out.external_side_effect_executed, false);
});

test('selects an exact-company PREPROD authorized customer binding but never dispatches', () => {
  const out = planCustomerDelivery(routeInput({
    channel_bindings: [
      {
        channel_id: 'WHATSAPP',
        company_id: 'fenix',
        environment: 'PREPROD',
        status: 'PREPROD_AUTHORIZED',
        access_profile: 'CUSTOMER_OPERATIONAL',
        adapter_ref: 'adapter:whatsapp:preprod:v1',
        customer_scope: true,
        supports_actions: ['CONTACT_NOW','FOLLOW_UP_FAST','NURTURE','FOLLOW_UP','OBJECTION_RECOVERY','RECOVER_NO_SHOW']
      }
    ]
  }));
  assert.equal(out.route_status, 'READY_FOR_ADAPTER_GATE');
  assert.equal(out.selected_channel, 'WHATSAPP');
  assert.equal(out.adapter_ref, 'adapter:whatsapp:preprod:v1');
  assert.equal(out.dispatch_authorized, false);
  assert.equal(out.adapter_dispatch_authorized, false);
  assert.equal(out.external_side_effect_executed, false);
  assert.match(out.route_plan_id, /^routeplan_[a-f0-9]{24}$/);
});

test('cross-company bindings do not route', () => {
  const out = planCustomerDelivery(routeInput({
    channel_bindings: [
      {
        channel_id: 'WHATSAPP',
        company_id: 'acme',
        environment: 'PREPROD',
        status: 'PREPROD_AUTHORIZED',
        access_profile: 'CUSTOMER_OPERATIONAL',
        adapter_ref: 'adapter:whatsapp:acme:v1',
        customer_scope: true,
        supports_actions: ['CONTACT_NOW']
      }
    ]
  }));
  assert.equal(out.route_status, 'BLOCKED_NO_AUTHORIZED_CUSTOMER_ADAPTER');
});

test('quiet hours defer without selecting a channel', () => {
  const out = planCustomerDelivery(routeInput({
    policy: { minute_of_day: 1320, quiet_start_minute: 1260, quiet_end_minute: 540, timezone: 'Europe/Madrid' }
  }));
  assert.equal(out.route_status, 'DEFERRED_QUIET_HOURS');
  assert.equal(out.deferred_minutes, 660);
  assert.equal(out.selected_channel, null);
});

test('opt-out and denied permission suppress delivery before channel selection', () => {
  const suppressed = planCustomerDelivery(routeInput({ suppressed: true }));
  assert.equal(suppressed.route_status, 'SUPPRESSED');
  const denied = planCustomerDelivery(routeInput({ contact_permission: 'DENIED' }));
  assert.equal(denied.route_status, 'SUPPRESSED');
});

test('unknown permission blocks fail-closed', () => {
  const out = planCustomerDelivery(routeInput({ contact_permission: 'UNKNOWN' }));
  assert.equal(out.route_status, 'BLOCKED_PERMISSION_UNKNOWN');
  assert.equal(out.dispatch_authorized, false);
});

test('delivery intent is idempotently deduplicated', () => {
  const input = routeInput();
  const out = planCustomerDelivery({ ...input, seen_delivery_intent_ids: [input.delivery_intent.delivery_intent_id] });
  assert.equal(out.route_status, 'DEDUPLICATED');
  assert.equal(out.external_side_effect_executed, false);
});

test('rejects raw PII or message content anywhere in input', () => {
  assert.throws(() => planCustomerDelivery({ ...routeInput(), phone: '+34123456789' }), /raw PII\/secret\/message field forbidden/);
  assert.throws(() => planCustomerDelivery({ ...routeInput(), message_text: 'hola' }), /raw PII\/secret\/message field forbidden/);
});

test('rejects PROD execution and ungoverned bindings', () => {
  const prod = routeInput();
  assert.throws(() => planCustomerDelivery({ ...prod, context: { ...prod.context, environment: 'PROD' } }), /exact PREPROD only/);
  const out = planCustomerDelivery(routeInput({
    channel_bindings: [
      {
        channel_id: 'WHATSAPP',
        company_id: 'fenix',
        environment: 'PREPROD',
        status: 'DISCOVERED',
        access_profile: 'CUSTOMER_OPERATIONAL',
        adapter_ref: 'adapter:whatsapp:unverified:v1',
        customer_scope: true,
        supports_actions: ['CONTACT_NOW']
      }
    ]
  }));
  assert.equal(out.route_status, 'BLOCKED_NO_AUTHORIZED_CUSTOMER_ADAPTER');
});

test('JOB handler produces same bounded route plan', async () => {
  const input = routeInput();
  const direct = planCustomerDelivery(input);
  const viaJob = await comPlanDeliveryJobHandler({ context: input.context, payload: { ...input, context: undefined } });
  assert.deepEqual(viaJob, direct);
});

test('contract preserves zero-cost PREPROD boundary', () => {
  assert.equal(COM_DELIVERY_ROUTER_V1_CONTRACT.engine_id, 'COM-001');
  assert.equal(COM_DELIVERY_ROUTER_V1_CONTRACT.environment, 'PREPROD');
  assert.equal(COM_DELIVERY_ROUTER_V1_CONTRACT.direct_dispatch_authorized, false);
  assert.equal(COM_DELIVERY_ROUTER_V1_CONTRACT.prod_writes, false);
  assert.equal(COM_DELIVERY_ROUTER_V1_CONTRACT.trading_access, false);
  assert.equal(COM_DELIVERY_ROUTER_V1_CONTRACT.additional_cost_target_eur, 0);
});
