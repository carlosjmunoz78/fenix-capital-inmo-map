import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';

const PREPROD = 'PREPROD';
const ENGINE_ID = 'COM-001';
const VERSION = 'com-delivery-router-v1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const CUSTOMER_CHANNELS = new Set(['WHATSAPP','PHONE','WEB_WIDGET','MOBILE','OTHER']);
const CONTACT_PERMISSIONS = new Set(['ALLOWED','DENIED','UNKNOWN','CUSTOMER_REQUESTED_CONTACT']);
const ELIGIBLE_ACTIONS = new Set(['CONTACT_NOW','FOLLOW_UP_FAST','NURTURE','FOLLOW_UP','OBJECTION_RECOVERY','RECOVER_NO_SHOW']);
const AUTHORIZED_BINDING_STATUSES = new Set(['PREPROD_AUTHORIZED']);
const FORBIDDEN_KEYS = new Set([
  'email','email_address','phone','phone_number','telephone','mobile_phone',
  'first_name','last_name','full_name','address','postal_address','dni','nif','nie','iban',
  'bank_account','account_number','password','secret','token','jwt','api_key','apikey',
  'access_token','refresh_token','private_key','credential_value','message','message_text',
  'body','body_text','recipient','recipient_address','contact_value'
]);

function clone(value) { return deserialize(serialize(value)); }

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

function bool(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

function safeRef(value, label) {
  const out = nonEmpty(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}

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
      for (let i = 0; i < value.length; i += 1) assertPlainData(value[i], `${label}[${i}]`, seen);
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

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, 24)}`;
}

function routeContext(value) {
  assertPlainData(value, 'context');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id', 120),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id', 80),
    environment: nonEmpty(value.environment, 'context.environment', 40),
    version: nonEmpty(value.version, 'context.version', 80)
  });
  if (out.environment !== PREPROD) throw new Error('COM-001 delivery router V1 accepts exact PREPROD only');
  if (out.engine_id !== ENGINE_ID) throw new Error(`COM-001 delivery router V1 requires context.engine_id=${ENGINE_ID}`);
  return out;
}

function normalizeIntent(value, context) {
  assertPlainData(value, 'delivery_intent');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('delivery_intent must be an object');
  const delivery_intent_id = safeRef(value.delivery_intent_id, 'delivery_intent.delivery_intent_id');
  const lead_ref = safeRef(value.lead_ref, 'delivery_intent.lead_ref');
  const target_engine = nonEmpty(value.target_engine, 'delivery_intent.target_engine', 80).toUpperCase();
  if (target_engine !== ENGINE_ID) throw new Error('delivery_intent must target COM-001');
  const commercial_action = nonEmpty(value.commercial_action, 'delivery_intent.commercial_action', 80).toUpperCase();
  if (!ELIGIBLE_ACTIONS.has(commercial_action)) throw new Error(`unsupported commercial action: ${commercial_action}`);
  const due_at_ms = integer(value.due_at_ms, 'delivery_intent.due_at_ms');
  if (value.dispatch_authorized !== false) throw new Error('SALE delivery intent must arrive with dispatch_authorized=false');
  if (value.external_side_effect_executed !== false) throw new Error('delivery_intent claims an external side effect');
  if (value.raw_contact_data_present !== false) throw new Error('raw contact data is forbidden in delivery intent');
  return Object.freeze({ delivery_intent_id, lead_ref, target_engine, commercial_action, due_at_ms, company_id: context.company_id });
}

function normalizeBinding(raw, context, index) {
  assertPlainData(raw, `channel_bindings[${index}]`);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(`channel_bindings[${index}] must be object`);
  const channel_id = nonEmpty(raw.channel_id, `channel_bindings[${index}].channel_id`, 80).toUpperCase();
  if (!CUSTOMER_CHANNELS.has(channel_id)) throw new Error(`unsupported customer channel: ${channel_id}`);
  const company_id = nonEmpty(raw.company_id, `channel_bindings[${index}].company_id`, 120);
  const environment = nonEmpty(raw.environment, `channel_bindings[${index}].environment`, 40).toUpperCase();
  const status = nonEmpty(raw.status, `channel_bindings[${index}].status`, 80).toUpperCase();
  const access_profile = nonEmpty(raw.access_profile, `channel_bindings[${index}].access_profile`, 80).toUpperCase();
  const adapter_ref = safeRef(raw.adapter_ref, `channel_bindings[${index}].adapter_ref`);
  const customer_scope = bool(raw.customer_scope, `channel_bindings[${index}].customer_scope`);
  const supports = raw.supports_actions;
  if (!Array.isArray(supports) || supports.length < 1 || supports.length > 30) throw new Error(`channel_bindings[${index}].supports_actions must contain 1..30 actions`);
  const supports_actions = Object.freeze([...new Set(supports.map((v, i) => nonEmpty(v, `channel_bindings[${index}].supports_actions[${i}]`, 80).toUpperCase()))].sort());
  return Object.freeze({ channel_id, company_id, environment, status, access_profile, adapter_ref, customer_scope, supports_actions, exact_company: company_id === context.company_id });
}

function normalizePolicy(value) {
  assertPlainData(value, 'policy');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('policy must be object');
  const minute_of_day = integer(value.minute_of_day, 'policy.minute_of_day', { min: 0, max: 1439 });
  const quiet_start_minute = integer(value.quiet_start_minute ?? 1260, 'policy.quiet_start_minute', { min: 0, max: 1439 });
  const quiet_end_minute = integer(value.quiet_end_minute ?? 540, 'policy.quiet_end_minute', { min: 0, max: 1439 });
  const timezone = nonEmpty(value.timezone ?? 'Europe/Madrid', 'policy.timezone', 80);
  return Object.freeze({ minute_of_day, quiet_start_minute, quiet_end_minute, timezone });
}

function inQuietHours(policy) {
  const { minute_of_day: now, quiet_start_minute: start, quiet_end_minute: end } = policy;
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function nextAllowedDelayMinutes(policy) {
  if (!inQuietHours(policy)) return 0;
  const now = policy.minute_of_day;
  const end = policy.quiet_end_minute;
  return end > now ? end - now : (1440 - now) + end;
}

function normalizePreferences(value) {
  if (value === undefined) return Object.freeze(['WHATSAPP','PHONE','WEB_WIDGET','MOBILE','OTHER']);
  if (!Array.isArray(value) || value.length < 1 || value.length > CUSTOMER_CHANNELS.size) throw new Error('channel_preferences must contain 1..5 channels');
  const out = [];
  for (let i = 0; i < value.length; i += 1) {
    const channel = nonEmpty(value[i], `channel_preferences[${i}]`, 80).toUpperCase();
    if (!CUSTOMER_CHANNELS.has(channel)) throw new Error(`unsupported channel preference: ${channel}`);
    if (!out.includes(channel)) out.push(channel);
  }
  return Object.freeze(out);
}

function chooseBinding(bindings, context, action, preferences) {
  const eligible = bindings.filter((binding) =>
    binding.exact_company &&
    binding.environment === PREPROD &&
    AUTHORIZED_BINDING_STATUSES.has(binding.status) &&
    binding.access_profile === 'CUSTOMER_OPERATIONAL' &&
    binding.customer_scope === true &&
    binding.supports_actions.includes(action)
  );
  for (const preferred of preferences) {
    const found = eligible.find((binding) => binding.channel_id === preferred);
    if (found) return found;
  }
  return null;
}

export function planCustomerDelivery(input) {
  assertPlainData(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be object');
  const context = routeContext(input.context);
  const intent = normalizeIntent(input.delivery_intent, context);
  const contact_permission = nonEmpty(input.contact_permission, 'contact_permission', 60).toUpperCase();
  if (!CONTACT_PERMISSIONS.has(contact_permission)) throw new Error(`unsupported contact_permission: ${contact_permission}`);
  const suppressed = input.suppressed === undefined ? false : bool(input.suppressed, 'suppressed');
  const policy = normalizePolicy(input.policy ?? {});
  const preferences = normalizePreferences(input.channel_preferences);
  const rawBindings = input.channel_bindings ?? [];
  if (!Array.isArray(rawBindings) || rawBindings.length > 50) throw new Error('channel_bindings must be an array with at most 50 entries');
  const bindings = rawBindings.map((binding, index) => normalizeBinding(binding, context, index));
  const seen = input.seen_delivery_intent_ids ?? [];
  if (!Array.isArray(seen) || seen.length > 1000) throw new Error('seen_delivery_intent_ids must be an array with at most 1000 entries');
  const safeSeen = new Set(seen.map((value, index) => safeRef(value, `seen_delivery_intent_ids[${index}]`)));

  const base = {
    schema_version: '1.0.0',
    model_version: VERSION,
    context: Object.freeze({ ...context }),
    delivery_intent_id: intent.delivery_intent_id,
    lead_ref: intent.lead_ref,
    commercial_action: intent.commercial_action,
    original_due_at_ms: intent.due_at_ms,
    dispatch_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0,
    raw_contact_data_present: false
  };

  if (safeSeen.has(intent.delivery_intent_id)) return Object.freeze({ ...base, route_status: 'DEDUPLICATED', selected_channel: null, adapter_ref: null, deferred_minutes: 0, reason: 'DELIVERY_INTENT_ALREADY_SEEN' });
  if (suppressed || contact_permission === 'DENIED') return Object.freeze({ ...base, route_status: 'SUPPRESSED', selected_channel: null, adapter_ref: null, deferred_minutes: 0, reason: suppressed ? 'GLOBAL_OR_CASE_SUPPRESSION' : 'CONTACT_PERMISSION_DENIED' });
  if (contact_permission === 'UNKNOWN') return Object.freeze({ ...base, route_status: 'BLOCKED_PERMISSION_UNKNOWN', selected_channel: null, adapter_ref: null, deferred_minutes: 0, reason: 'CONTACT_PERMISSION_UNKNOWN' });
  if (inQuietHours(policy)) return Object.freeze({ ...base, route_status: 'DEFERRED_QUIET_HOURS', selected_channel: null, adapter_ref: null, deferred_minutes: nextAllowedDelayMinutes(policy), reason: `QUIET_HOURS_${policy.timezone}` });

  const binding = chooseBinding(bindings, context, intent.commercial_action, preferences);
  if (!binding) return Object.freeze({ ...base, route_status: 'BLOCKED_NO_AUTHORIZED_CUSTOMER_ADAPTER', selected_channel: null, adapter_ref: null, deferred_minutes: 0, reason: 'NO_PREPROD_AUTHORIZED_CUSTOMER_BINDING' });

  const route_plan_id = stableId('routeplan', [context.company_id, intent.delivery_intent_id, binding.channel_id, binding.adapter_ref, VERSION]);
  return Object.freeze({
    ...base,
    route_status: 'READY_FOR_ADAPTER_GATE',
    route_plan_id,
    selected_channel: binding.channel_id,
    adapter_ref: binding.adapter_ref,
    access_profile: binding.access_profile,
    deferred_minutes: 0,
    reason: 'AUTHORIZED_PREPROD_BINDING_SELECTED',
    adapter_gate_required: true,
    adapter_dispatch_authorized: false
  });
}

export async function comPlanDeliveryJobHandler({ context, payload }) {
  assertPlainData(payload, 'payload');
  return clone(planCustomerDelivery({ ...payload, context }));
}

export const COM_DELIVERY_ROUTER_V1_CONTRACT = Object.freeze({
  engine_id: ENGINE_ID,
  notification_owner: 'NOTIF-001',
  environment: PREPROD,
  model_version: VERSION,
  job_name: 'com.plan-delivery',
  upstream: Object.freeze(['SALE-001']),
  supported_customer_channels: Object.freeze([...CUSTOMER_CHANNELS]),
  registry_future_contract_source: 'cerebro/multichannel/channel-registry.v1.json',
  exact_customer_access_profile: 'CUSTOMER_OPERATIONAL',
  exact_authorized_binding_status: 'PREPROD_AUTHORIZED',
  direct_dispatch_authorized: false,
  prod_authority_expansion: false,
  raw_pii_allowed: false,
  raw_secrets_allowed: false,
  raw_message_text_allowed: false,
  opt_out_fail_closed: true,
  quiet_hours_supported: true,
  dedupe_supported: true,
  cross_company_binding_allowed: false,
  deterministic_first: true,
  ai_required: false,
  prod_writes: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  supabase_required: false,
  promotion: 'LAB->PREPROD->OLD_vs_NEW->tribunal->real_customer_adapter_gate->gradual_prod'
});
