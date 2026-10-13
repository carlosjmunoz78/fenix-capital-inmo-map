import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';

const PREPROD = 'PREPROD';
const ENGINE_ID = 'SALE-001';
const VERSION = 'sale-action-v1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const CONTACT_PERMISSIONS = new Set(['ALLOWED','DENIED','UNKNOWN','CUSTOMER_REQUESTED_CONTACT']);
const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const LEAD_ACTIONS = new Set([
  'HUMAN_REQUIRED','DO_NOT_CONTACT','VERIFY_CONTACT_PERMISSION','REQUEST_MORE_EVIDENCE',
  'VERIFY_CONTACT','CONTACT_NOW','FOLLOW_UP_FAST','NURTURE','MONITOR'
]);
const EVENTS = new Set([
  'CONTACT_SUCCEEDED','NO_REPLY','REPLIED_INTERESTED','OBJECTION_PRICE','OBJECTION_TIMING',
  'OBJECTION_COMPETITOR','NEEDS_THINKING','APPOINTMENT_BOOKED','NO_SHOW',
  'CONTACT_PERMISSION_REVOKED','CUSTOMER_HUMAN_REQUEST','WON','LOST'
]);
const FORBIDDEN_KEYS = new Set([
  'email','email_address','phone','phone_number','telephone','mobile','mobile_phone',
  'first_name','last_name','full_name','address','postal_address','dni','nif','nie','iban',
  'bank_account','account_number','password','secret','token','jwt','api_key','apikey',
  'access_token','refresh_token','private_key','credential_value','message_text','body_text'
]);
const FOLLOW_UP_DELAYS_MINUTES = Object.freeze([1440, 4320, 10080]);

function nonEmpty(value, label, max = 200) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} is too long`);
  return out;
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} must be a safe integer between ${min} and ${max}`);
  return value;
}

function clone(value) { return deserialize(serialize(value)); }

function assertPlainData(value, label = 'input', seen = new WeakSet()) {
  if (value === null || ['string','number','boolean','undefined'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError(`${label} contains a non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported data`);
  if (seen.has(value)) throw new TypeError(`${label} contains a circular reference`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) assertPlainData(value[index], `${label}[${index}]`, seen);
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain only plain objects and arrays`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor properties are forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`raw PII/secret/message field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function safeRef(value, label) {
  const out = nonEmpty(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}

function saleContext(value) {
  assertPlainData(value, 'context');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id', 120),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id', 80),
    environment: nonEmpty(value.environment, 'context.environment', 40),
    version: nonEmpty(value.version, 'context.version', 80)
  });
  if (out.environment !== PREPROD) throw new Error('SALE-001 V1 accepts exact PREPROD only');
  if (out.engine_id !== ENGINE_ID) throw new Error(`SALE-001 V1 requires context.engine_id=${ENGINE_ID}`);
  return out;
}

function leadDecision(value, context) {
  assertPlainData(value, 'lead_decision');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('lead_decision must be an object');
  const sourceContext = value.context;
  if (!sourceContext || sourceContext.engine_id !== 'LEAD-001' || sourceContext.environment !== PREPROD) throw new Error('lead_decision must come from PREPROD LEAD-001');
  if (sourceContext.company_id !== context.company_id) throw new Error('cross-company lead decision denied');
  const decision_id = safeRef(value.decision_id, 'lead_decision.decision_id');
  const lead_ref = safeRef(value.lead_ref, 'lead_decision.lead_ref');
  if (!value.next_best_action || typeof value.next_best_action !== 'object') throw new Error('lead_decision.next_best_action required');
  const action = nonEmpty(value.next_best_action.action, 'lead_decision.next_best_action.action', 80).toUpperCase();
  if (!LEAD_ACTIONS.has(action)) throw new Error(`unsupported lead action: ${action}`);
  const human_required = value.human_required ?? null;
  if (human_required !== null && !HUMAN_REQUIRED_REASONS.has(human_required)) throw new Error(`invalid HUMAN_REQUIRED reason: ${human_required}`);
  if (action === 'HUMAN_REQUIRED' && !human_required) throw new Error('HUMAN_REQUIRED lead action requires canonical human_required reason');
  const target_sla_minutes = value.next_best_action.target_sla_minutes === null || value.next_best_action.target_sla_minutes === undefined
    ? null
    : integer(value.next_best_action.target_sla_minutes, 'lead_decision.next_best_action.target_sla_minutes', { min: 0, max: 525600 });
  return Object.freeze({
    decision_id,
    lead_ref,
    action,
    human_required,
    target_sla_minutes,
    autonomous_contact_allowed: value.next_best_action.autonomous_contact_allowed === true,
    estimated_value_eur: integer(value.estimated_value_eur ?? 0, 'lead_decision.estimated_value_eur', { min: 0, max: 100_000_000 }),
    heuristic_weighted_value_eur: integer(value.heuristic_weighted_value_eur ?? 0, 'lead_decision.heuristic_weighted_value_eur', { min: 0, max: 100_000_000 })
  });
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, 24)}`;
}

function dueAt(now_ms, minutes) {
  if (minutes === null) return null;
  const delta = integer(minutes, 'minutes', { min: 0, max: 525600 }) * 60_000;
  if (!Number.isSafeInteger(now_ms + delta)) throw new RangeError('due_at_ms exceeds safe range');
  return now_ms + delta;
}

function deliveryIntent({ sale_case_id, lead_ref, source_decision_id, action, due_at_ms, contact_permission }) {
  const permissionAllowsContact = contact_permission === 'ALLOWED' || contact_permission === 'CUSTOMER_REQUESTED_CONTACT';
  if (!permissionAllowsContact) return null;
  if (!['CONTACT_NOW','FOLLOW_UP_FAST','NURTURE','FOLLOW_UP','OBJECTION_RECOVERY','RECOVER_NO_SHOW'].includes(action)) return null;
  return Object.freeze({
    delivery_intent_id: stableId('delivery', [sale_case_id, source_decision_id, action, due_at_ms]),
    target_engine: 'COM-001',
    lead_ref,
    commercial_action: action,
    due_at_ms,
    route: 'AUTO_SELECT_AUTHORIZED_CUSTOMER_CHANNEL',
    channel_binding_required: true,
    dispatch_authorized: false,
    external_side_effect_executed: false,
    raw_contact_data_present: false
  });
}

function initialPlan({ decision, contact_permission, now_ms, context }) {
  const action = decision.action;
  if (action === 'HUMAN_REQUIRED') return { status: 'WAITING_HUMAN', current_action: 'HUMAN_REQUIRED', due_at_ms: null, human_required: decision.human_required };
  if (contact_permission === 'DENIED' || action === 'DO_NOT_CONTACT') return { status: 'STOPPED', current_action: 'DO_NOT_CONTACT', due_at_ms: null, human_required: null };
  if (contact_permission === 'UNKNOWN' || action === 'VERIFY_CONTACT_PERMISSION') return { status: 'VERIFYING_PERMISSION', current_action: 'VERIFY_CONTACT_PERMISSION', due_at_ms: dueAt(now_ms, decision.target_sla_minutes ?? 240), human_required: null };
  if (action === 'REQUEST_MORE_EVIDENCE') return { status: 'RETURN_TO_LEAD', current_action: 'REQUEST_MORE_EVIDENCE', due_at_ms: dueAt(now_ms, decision.target_sla_minutes ?? 240), human_required: null };
  if (action === 'VERIFY_CONTACT') return { status: 'VERIFYING_CONTACT', current_action: 'VERIFY_CONTACT', due_at_ms: dueAt(now_ms, decision.target_sla_minutes ?? 240), human_required: null };
  if (action === 'MONITOR') return { status: 'MONITORING', current_action: 'MONITOR', due_at_ms: dueAt(now_ms, decision.target_sla_minutes ?? 4320), human_required: null };
  if (['CONTACT_NOW','FOLLOW_UP_FAST','NURTURE'].includes(action)) {
    if (!decision.autonomous_contact_allowed) return { status: 'BLOCKED', current_action: 'CONTACT_NOT_AUTHORIZED_BY_NBA', due_at_ms: null, human_required: null };
    return { status: 'READY_FOR_DELIVERY', current_action: action, due_at_ms: dueAt(now_ms, decision.target_sla_minutes ?? 60), human_required: null };
  }
  throw new Error(`unhandled lead action: ${action}`);
}

export function createSaleCase(input) {
  assertPlainData(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const context = saleContext(input.context);
  const decision = leadDecision(input.lead_decision, context);
  const contact_permission = nonEmpty(input.contact_permission, 'contact_permission', 60).toUpperCase();
  if (!CONTACT_PERMISSIONS.has(contact_permission)) throw new Error(`unsupported contact_permission: ${contact_permission}`);
  const now_ms = integer(input.now_ms, 'now_ms');
  if ((contact_permission === 'DENIED' || contact_permission === 'UNKNOWN') && decision.autonomous_contact_allowed && ['CONTACT_NOW','FOLLOW_UP_FAST','NURTURE'].includes(decision.action)) {
    // Permission snapshot wins over commercial priority; do not fail, stop/verify instead.
  }
  const sale_case_id = stableId('salecase', [context.company_id, decision.decision_id, decision.lead_ref, VERSION]);
  const plan = initialPlan({ decision, contact_permission, now_ms, context });
  const delivery_intent = deliveryIntent({
    sale_case_id,
    lead_ref: decision.lead_ref,
    source_decision_id: decision.decision_id,
    action: plan.current_action,
    due_at_ms: plan.due_at_ms,
    contact_permission
  });
  return Object.freeze({
    schema_version: '1.0.0',
    model_version: VERSION,
    sale_case_id,
    context: Object.freeze({ ...context }),
    lead_ref: decision.lead_ref,
    source_decision_id: decision.decision_id,
    contact_permission,
    status: plan.status,
    current_action: plan.current_action,
    due_at_ms: plan.due_at_ms,
    human_required: plan.human_required,
    attempt_count: 0,
    objection_count: 0,
    no_show_count: 0,
    processed_event_ids: Object.freeze([]),
    last_event: null,
    estimated_value_eur: decision.estimated_value_eur,
    heuristic_weighted_value_eur: decision.heuristic_weighted_value_eur,
    delivery_intent,
    channel_binding_status: delivery_intent ? 'REQUIRED_NOT_AUTHORIZED' : 'NOT_REQUIRED',
    side_effects_executed: false,
    additional_cost_eur: 0
  });
}

function schedule(state, { status, action, minutes, now_ms, human_required = null, increment_attempt = false, increment_objection = false, increment_no_show = false }) {
  const due_at_ms = minutes === null ? null : dueAt(now_ms, minutes);
  const attempt_count = state.attempt_count + (increment_attempt ? 1 : 0);
  const objection_count = state.objection_count + (increment_objection ? 1 : 0);
  const no_show_count = state.no_show_count + (increment_no_show ? 1 : 0);
  const delivery_intent = deliveryIntent({
    sale_case_id: state.sale_case_id,
    lead_ref: state.lead_ref,
    source_decision_id: state.source_decision_id,
    action,
    due_at_ms,
    contact_permission: state.contact_permission
  });
  return { status, current_action: action, due_at_ms, human_required, attempt_count, objection_count, no_show_count, delivery_intent, channel_binding_status: delivery_intent ? 'REQUIRED_NOT_AUTHORIZED' : 'NOT_REQUIRED' };
}

export function applySaleEvent(rawState, event) {
  assertPlainData(rawState, 'state');
  assertPlainData(event, 'event');
  const state = clone(rawState);
  if (!state || state.model_version !== VERSION) throw new Error('unsupported SALE-001 state version');
  saleContext(state.context);
  const event_id = safeRef(event.event_id, 'event.event_id');
  if (state.processed_event_ids.includes(event_id)) return Object.freeze({ ...state, duplicate_event: true });
  const type = nonEmpty(event.type, 'event.type', 80).toUpperCase();
  if (!EVENTS.has(type)) throw new Error(`unsupported sale event: ${type}`);
  const now_ms = integer(event.now_ms, 'event.now_ms');
  if (['WON','LOST','STOPPED'].includes(state.status)) throw new Error(`cannot mutate terminal sale case: ${state.status}`);

  let transition;
  if (type === 'CONTACT_PERMISSION_REVOKED') {
    transition = schedule(state, { status: 'STOPPED', action: 'DO_NOT_CONTACT', minutes: null, now_ms });
  } else if (type === 'CUSTOMER_HUMAN_REQUEST') {
    transition = schedule(state, { status: 'WAITING_HUMAN', action: 'HUMAN_REQUIRED', minutes: null, now_ms, human_required: 'CUSTOMER_HUMAN_REQUEST' });
  } else if (type === 'WON') {
    transition = schedule(state, { status: 'WON', action: 'NONE', minutes: null, now_ms });
  } else if (type === 'LOST') {
    transition = schedule(state, { status: 'LOST', action: 'NONE', minutes: null, now_ms });
  } else if (type === 'APPOINTMENT_BOOKED') {
    transition = schedule(state, { status: 'APPOINTMENT_BOOKED', action: 'WAIT_APPOINTMENT', minutes: null, now_ms });
  } else if (type === 'NO_SHOW') {
    transition = schedule(state, { status: 'READY_FOR_DELIVERY', action: 'RECOVER_NO_SHOW', minutes: 15, now_ms, increment_no_show: true });
  } else if (['OBJECTION_PRICE','OBJECTION_TIMING','OBJECTION_COMPETITOR','NEEDS_THINKING'].includes(type)) {
    transition = schedule(state, { status: 'READY_FOR_DELIVERY', action: 'OBJECTION_RECOVERY', minutes: 60, now_ms, increment_objection: true });
  } else if (type === 'REPLIED_INTERESTED') {
    transition = schedule(state, { status: 'QUALIFIED_INTEREST', action: 'PREPARE_APPOINTMENT', minutes: 30, now_ms });
  } else if (type === 'CONTACT_SUCCEEDED') {
    transition = schedule(state, { status: 'WAITING_RESPONSE', action: 'WAIT_RESPONSE', minutes: 1440, now_ms, increment_attempt: true });
  } else if (type === 'NO_REPLY') {
    const nextAttempt = state.attempt_count + 1;
    if (nextAttempt > FOLLOW_UP_DELAYS_MINUTES.length) {
      transition = schedule(state, { status: 'COOL_DOWN', action: 'MONITOR', minutes: 20160, now_ms, increment_attempt: true });
    } else {
      transition = schedule(state, { status: 'READY_FOR_DELIVERY', action: 'FOLLOW_UP', minutes: FOLLOW_UP_DELAYS_MINUTES[nextAttempt - 1], now_ms, increment_attempt: true });
    }
  }

  if (!transition) throw new Error(`unhandled sale event: ${type}`);
  const processed = [...state.processed_event_ids, event_id];
  if (processed.length > 1000) processed.splice(0, processed.length - 1000);
  return Object.freeze({
    ...state,
    ...transition,
    processed_event_ids: Object.freeze(processed),
    last_event: Object.freeze({ event_id, type, now_ms }),
    duplicate_event: false,
    side_effects_executed: false,
    additional_cost_eur: 0
  });
}

export async function salePlanJobHandler({ context, payload }) {
  assertPlainData(payload, 'payload');
  return clone(createSaleCase({ ...payload, context }));
}

export const SALE_ACTION_V1_CONTRACT = Object.freeze({
  engine_id: ENGINE_ID,
  environment: PREPROD,
  model_version: VERSION,
  job_name: 'sale.plan-action',
  upstream: Object.freeze(['LEAD-001','NBA-001']),
  downstream_intent_target: 'COM-001',
  deterministic_first: true,
  ai_required: false,
  raw_pii_allowed: false,
  raw_secrets_allowed: false,
  raw_message_text_allowed: false,
  external_dispatch_authorized: false,
  channel_binding_required: true,
  direct_whatsapp_authorized: false,
  direct_phone_authorized: false,
  direct_web_widget_authorized: false,
  follow_up_delays_minutes: FOLLOW_UP_DELAYS_MINUTES,
  max_automatic_follow_up_attempts_before_cooldown: FOLLOW_UP_DELAYS_MINUTES.length,
  prod_writes: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  supabase_required: false,
  durable_execution: 'JOB-001 durable V1 + worker-runner-v1 compatible',
  promotion: 'LAB->PREPROD->OLD_vs_NEW->tribunal->channel_adapter_gate->gradual_prod'
});
