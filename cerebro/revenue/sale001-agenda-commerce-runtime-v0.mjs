import crypto from 'node:crypto';
import { applySaleEvent } from './sale-action-v1.mjs';

const ENGINE_ID = 'SALE-001';
const ENVIRONMENT = 'PREPROD';
const VERSION = 'sale001-agenda-commerce-v0';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_REASON_SET = new Set(HUMAN_REQUIRED_REASONS);

export const AGENDA_COMMERCE_SCENARIOS = Object.freeze([
  'CALNODE_BENCHMARK',
  'BOOKING',
  'REMINDER',
  'RESCHEDULE',
  'NO_SHOW_RECOVERY',
  'SOLIVIO_PATTERN',
  'AUTO_PROPOSAL',
  'AUTO_BUDGET',
  'DOCUSEAL_SIGNATURE_PREP',
  'OREKO_QUOTE_INVOICE_PAYMENT',
  'STRIPE_PAYMENT_PLAN',
  'INVOICE_RECEIPT_PLAN',
  'PRODUCT_DELIVERY_PLAN',
  'POST_PURCHASE_EMAIL_PLAN'
]);
const SCENARIO_SET = new Set(AGENDA_COMMERCE_SCENARIOS);

const PROVIDER_STATE = Object.freeze({
  CALNODE: 'LAB_BENCHMARK',
  SOLIVIO: 'LAB_PATTERN_ONLY',
  DOCUSEAL: 'LAB_BENCHMARK',
  OREKO: 'LAB_BENCHMARK',
  STRIPE: 'EXISTING_WRAP_ONLY',
  INTERNAL: 'OWNED_OR_EXISTING_RUNTIME'
});

const FORBIDDEN_KEYS = new Set([
  'email','email_address','phone','phone_number','telephone','mobile','mobile_phone',
  'first_name','last_name','full_name','address','postal_address','dni','nif','nie',
  'iban','bank_account','account_number','card_number','card_cvc','card_cvv',
  'password','secret','token','jwt','api_key','apikey','access_token','refresh_token',
  'private_key','credential_value','message_text','body_text','raw_document','document_bytes'
]);

const SCENARIO_META = Object.freeze({
  CALNODE_BENCHMARK: Object.freeze({ block: 118, provider: 'CALNODE', engines: ['SALE-001','AGD-001','JOB-001'], mode: 'LAB_BENCHMARK' }),
  BOOKING: Object.freeze({ block: 119, provider: 'INTERNAL', engines: ['SALE-001','AGD-001','JOB-001'], mode: 'PLAN_ONLY' }),
  REMINDER: Object.freeze({ block: 120, provider: 'INTERNAL', engines: ['SALE-001','JOB-001','COM-001'], mode: 'PLAN_ONLY' }),
  RESCHEDULE: Object.freeze({ block: 121, provider: 'INTERNAL', engines: ['SALE-001','AGD-001','JOB-001'], mode: 'PLAN_ONLY' }),
  NO_SHOW_RECOVERY: Object.freeze({ block: 122, provider: 'INTERNAL', engines: ['SALE-001','RET-001','JOB-001','COM-001'], mode: 'REUSE_EXISTING_SALE_TRANSITION' }),
  SOLIVIO_PATTERN: Object.freeze({ block: 123, provider: 'SOLIVIO', engines: ['SALE-001'], mode: 'LAB_PATTERN' }),
  AUTO_PROPOSAL: Object.freeze({ block: 124, provider: 'INTERNAL', engines: ['SALE-001','DOC-001'], mode: 'PLAN_ONLY' }),
  AUTO_BUDGET: Object.freeze({ block: 125, provider: 'INTERNAL', engines: ['SALE-001','DOC-001'], mode: 'PLAN_ONLY' }),
  DOCUSEAL_SIGNATURE_PREP: Object.freeze({ block: 126, provider: 'DOCUSEAL', engines: ['SALE-001','DOC-001'], mode: 'LAB_BENCHMARK' }),
  OREKO_QUOTE_INVOICE_PAYMENT: Object.freeze({ block: 127, provider: 'OREKO', engines: ['SALE-001','INV-001','PAY-001'], mode: 'LAB_BENCHMARK' }),
  STRIPE_PAYMENT_PLAN: Object.freeze({ block: 128, provider: 'STRIPE', engines: ['SALE-001','PAY-001'], mode: 'EXISTING_WRAP_ONLY' }),
  INVOICE_RECEIPT_PLAN: Object.freeze({ block: 129, provider: 'INTERNAL', engines: ['SALE-001','INV-001','ACC-001'], mode: 'PLAN_ONLY' }),
  PRODUCT_DELIVERY_PLAN: Object.freeze({ block: 130, provider: 'INTERNAL', engines: ['SALE-001','JOB-001'], mode: 'REUSE_PRODUCT_FACTORY' }),
  POST_PURCHASE_EMAIL_PLAN: Object.freeze({ block: 131, provider: 'INTERNAL', engines: ['SALE-001','COM-001','JOB-001'], mode: 'PLAN_ONLY' })
});

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

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new TypeError(`${label} invalid`);
  return value;
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
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`raw PII/secret/content field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function context(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('context object required');
  assertPlainData(raw, 'context');
  const out = Object.freeze({
    company_id: text(raw.company_id, 'context.company_id', 120),
    engine_id: text(raw.engine_id, 'context.engine_id', 80),
    environment: text(raw.environment, 'context.environment', 40).toUpperCase(),
    version: text(raw.version, 'context.version', 80)
  });
  if (out.engine_id !== ENGINE_ID) throw new Error(`context.engine_id must be ${ENGINE_ID}`);
  if (out.environment !== ENVIRONMENT) throw new Error('agenda/commerce V0 accepts exact PREPROD only');
  return out;
}

function scenario(value) {
  const out = text(value, 'scenario', 80).toUpperCase();
  if (!SCENARIO_SET.has(out)) throw new Error(`unsupported scenario: ${out}`);
  return out;
}

function stableHash(value, size = 32) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}

function humanReason(value) {
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
    human_required_reason: humanReason(reason),
    detail,
    external_side_effect_executed: false,
    prod_authorized: false,
    ...extra
  });
}

function validateTemporal(raw, selected) {
  if (['BOOKING','RESCHEDULE'].includes(selected)) {
    const start = integer(raw.slot_start_ms, 'slot_start_ms');
    const end = integer(raw.slot_end_ms, 'slot_end_ms');
    if (end <= start) throw new Error('slot_end_ms must be greater than slot_start_ms');
    return Object.freeze({ slot_start_ms: start, slot_end_ms: end });
  }
  if (selected === 'REMINDER') return Object.freeze({ due_at_ms: integer(raw.due_at_ms, 'due_at_ms') });
  return Object.freeze({});
}

function validateCommercial(raw, selected) {
  if (['AUTO_PROPOSAL','AUTO_BUDGET','OREKO_QUOTE_INVOICE_PAYMENT','STRIPE_PAYMENT_PLAN','INVOICE_RECEIPT_PLAN'].includes(selected)) {
    const amount_cents = integer(raw.amount_cents ?? 0, 'amount_cents', { min: 0, max: 10_000_000_000 });
    const currency = text(raw.currency ?? 'EUR', 'currency', 8).toUpperCase();
    if (currency !== 'EUR') throw new Error('V0 only accepts EUR');
    return Object.freeze({ amount_cents, currency });
  }
  return Object.freeze({});
}

function validateRequiredRefs(raw, selected) {
  const common = { case_ref: safeRef(raw.case_ref, 'case_ref') };
  if (['BOOKING','REMINDER','RESCHEDULE','NO_SHOW_RECOVERY'].includes(selected)) common.appointment_ref = safeRef(raw.appointment_ref, 'appointment_ref');
  if (['AUTO_PROPOSAL','AUTO_BUDGET','DOCUSEAL_SIGNATURE_PREP','OREKO_QUOTE_INVOICE_PAYMENT','STRIPE_PAYMENT_PLAN','INVOICE_RECEIPT_PLAN'].includes(selected)) common.commercial_ref = safeRef(raw.commercial_ref, 'commercial_ref');
  if (['PRODUCT_DELIVERY_PLAN','POST_PURCHASE_EMAIL_PLAN'].includes(selected)) common.order_ref = safeRef(raw.order_ref, 'order_ref');
  if (selected === 'PRODUCT_DELIVERY_PLAN') common.product_ref = safeRef(raw.product_ref, 'product_ref');
  if (selected === 'POST_PURCHASE_EMAIL_PLAN') common.customer_ref = safeRef(raw.customer_ref, 'customer_ref');
  return Object.freeze(common);
}

function sideEffectGate(raw) {
  const flags = Object.freeze({
    calendar_write_requested: bool(raw.calendar_write_requested ?? false, 'calendar_write_requested'),
    message_dispatch_requested: bool(raw.message_dispatch_requested ?? false, 'message_dispatch_requested'),
    signature_execution_requested: bool(raw.signature_execution_requested ?? false, 'signature_execution_requested'),
    payment_execution_requested: bool(raw.payment_execution_requested ?? false, 'payment_execution_requested'),
    invoice_issue_requested: bool(raw.invoice_issue_requested ?? false, 'invoice_issue_requested'),
    product_delivery_requested: bool(raw.product_delivery_requested ?? false, 'product_delivery_requested')
  });
  if (flags.signature_execution_requested) return blocked('SIGNATURE_EXECUTION_DISABLED', 'SIGNATURE_REQUIRED', 'V0 prepares signature artifacts only; a required signature remains human.');
  if (flags.payment_execution_requested) return blocked('PAYMENT_EXECUTION_DISABLED', 'MONEY_LIMIT', 'V0 may prepare a payment plan but cannot move or charge money.');
  if (flags.invoice_issue_requested) return blocked('INVOICE_ISSUE_DISABLED', 'LEGAL_REQUIRED', 'V0 may prepare invoice/receipt data but cannot issue a fiscal document.');
  if (flags.calendar_write_requested) return blocked('CALENDAR_WRITE_DISABLED', 'POLICY_CONFLICT', 'V0 may plan agenda changes but cannot write an external calendar.');
  if (flags.message_dispatch_requested) return blocked('MESSAGE_DISPATCH_DISABLED', 'POLICY_CONFLICT', 'V0 may build COM-001 intents but cannot dispatch customer messages.');
  if (flags.product_delivery_requested) return blocked('PRODUCT_DELIVERY_DISABLED', 'POLICY_CONFLICT', 'V0 may plan delivery through the existing Product Factory but cannot dispatch it.');
  return Object.freeze({ allowed: true, flags });
}

export function evaluateAgendaCommerceGate(raw = {}) {
  assertPlainData(raw, 'request');
  const ctx = context(raw.context);
  const targetCompany = raw.target_company_id == null ? ctx.company_id : text(raw.target_company_id, 'target_company_id', 120);
  if (targetCompany !== ctx.company_id) return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company agenda/commerce execution denied.');
  const selected = scenario(raw.scenario);
  const confidence = Number(raw.confidence ?? 1);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('confidence invalid');
  if (confidence < 0.75) return blocked('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence is below PREPROD threshold.');
  if (raw.customer_human_request === true) return blocked('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (raw.high_risk === true) return blocked('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk case requires human handling.');
  const effect = sideEffectGate(raw);
  if (!effect.allowed) return effect;
  return Object.freeze({
    allowed: true,
    status: 'PLAN_ONLY_ALLOWED',
    context: ctx,
    scenario: selected,
    source_block: SCENARIO_META[selected].block,
    external_side_effect_authorized: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function buildAgendaCommercePlan(raw = {}) {
  const gate = evaluateAgendaCommerceGate(raw);
  if (!gate.allowed) return gate;
  const selected = gate.scenario;
  const meta = SCENARIO_META[selected];
  const refs = validateRequiredRefs(raw, selected);
  const temporal = validateTemporal(raw, selected);
  const commercial = validateCommercial(raw, selected);
  const request_id = safeRef(raw.request_id, 'request_id');

  const providerState = PROVIDER_STATE[meta.provider];
  const signatureHumanGate = selected === 'DOCUSEAL_SIGNATURE_PREP' ? 'SIGNATURE_REQUIRED' : null;
  const paymentHumanGate = ['OREKO_QUOTE_INVOICE_PAYMENT','STRIPE_PAYMENT_PLAN'].includes(selected) ? 'MONEY_LIMIT' : null;
  const invoiceHumanGate = ['OREKO_QUOTE_INVOICE_PAYMENT','INVOICE_RECEIPT_PLAN'].includes(selected) ? 'LEGAL_REQUIRED' : null;
  const productFactoryReuse = selected === 'PRODUCT_DELIVERY_PLAN';

  const plan = Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_SALE001_AGENDA_COMMERCE_PLAN',
    company_id: gate.context.company_id,
    engine_id: ENGINE_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    request_id,
    scenario: selected,
    source_block: meta.block,
    provider: meta.provider,
    provider_state: providerState,
    mode: meta.mode,
    target_engines: Object.freeze([...meta.engines]),
    refs,
    temporal,
    commercial,
    durable_job_target: 'JOB-001',
    calendar_engine: ['BOOKING','RESCHEDULE','CALNODE_BENCHMARK'].includes(selected) ? 'AGD-001' : null,
    communication_engine: ['REMINDER','NO_SHOW_RECOVERY','POST_PURCHASE_EMAIL_PLAN'].includes(selected) ? 'COM-001' : null,
    payment_engine: ['OREKO_QUOTE_INVOICE_PAYMENT','STRIPE_PAYMENT_PLAN'].includes(selected) ? 'PAY-001' : null,
    invoice_engine: ['OREKO_QUOTE_INVOICE_PAYMENT','INVOICE_RECEIPT_PLAN'].includes(selected) ? 'INV-001' : null,
    product_factory_reuse_required: productFactoryReuse,
    product_factory_adapter_state: productFactoryReuse ? 'EXISTING_AION_CAPABILITY_ADAPTER_SEAM_REQUIRES_LIVE_AUDIT' : null,
    signature_human_gate: signatureHumanGate,
    payment_human_gate: paymentHumanGate,
    invoice_human_gate: invoiceHumanGate,
    calendar_write_authorized: false,
    communication_dispatch_authorized: false,
    signature_execution_authorized: false,
    payment_execution_authorized: false,
    invoice_issue_authorized: false,
    product_delivery_authorized: false,
    crm_write_authorized: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
  return Object.freeze({ ...gate, plan });
}

export function buildDurableJobIntent(raw = {}) {
  const result = buildAgendaCommercePlan(raw);
  if (!result.allowed) return result;
  const plan = result.plan;
  const job = Object.freeze({
    target_engine: 'JOB-001',
    job_name: `sale.agenda-commerce.${plan.scenario.toLowerCase().replaceAll('_','-')}`,
    context: Object.freeze({ company_id: plan.company_id, engine_id: ENGINE_ID, environment: ENVIRONMENT, version: VERSION }),
    payload_ref: `plan:${stableHash(plan, 24)}`,
    idempotency_key: `sale001:${plan.company_id}:${plan.request_id}:${plan.scenario}`,
    enqueue_authorized: false,
    external_side_effect_executed: false
  });
  return Object.freeze({ ...result, job });
}

export function reuseExistingNoShowRecovery({ context: rawContext, sale_state, event_id, now_ms }) {
  const ctx = context(rawContext);
  assertPlainData(sale_state, 'sale_state');
  if (!sale_state?.context || sale_state.context.company_id !== ctx.company_id) {
    return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company SALE-001 state reuse denied.');
  }
  if (sale_state.context.engine_id !== 'SALE-001' || sale_state.context.environment !== ENVIRONMENT) throw new Error('sale_state must be PREPROD SALE-001 state');
  const next = applySaleEvent(sale_state, { event_id: safeRef(event_id, 'event_id'), type: 'NO_SHOW', now_ms: integer(now_ms, 'now_ms') });
  return Object.freeze({
    allowed: true,
    status: 'EXISTING_SALE_NO_SHOW_RECOVERY_REUSED',
    company_id: ctx.company_id,
    engine_id: ENGINE_ID,
    source_block: 122,
    sale_state: next,
    duplicated_recovery_logic: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildStripeExistingWrapperPlan(raw = {}) {
  const result = buildAgendaCommercePlan({ ...raw, scenario: 'STRIPE_PAYMENT_PLAN' });
  if (!result.allowed) return result;
  return Object.freeze({
    ...result,
    stripe: Object.freeze({
      integration_policy: 'WRAP_EXISTING_ONLY',
      create_new_payment_system: false,
      charge_authorized: false,
      capture_authorized: false,
      refund_authorized: false,
      credential_access_authorized: false,
      payment_human_gate: 'MONEY_LIMIT',
      external_side_effect_executed: false
    })
  });
}

export function buildPostPurchaseCommunicationIntent(raw = {}) {
  const result = buildAgendaCommercePlan({ ...raw, scenario: 'POST_PURCHASE_EMAIL_PLAN' });
  if (!result.allowed) return result;
  const intent = Object.freeze({
    target_engine: 'COM-001',
    communication_type: 'POST_PURCHASE_EMAIL',
    company_id: result.plan.company_id,
    order_ref: result.plan.refs.order_ref,
    customer_ref: result.plan.refs.customer_ref,
    template_ref: safeRef(raw.template_ref, 'template_ref'),
    dispatch_authorized: false,
    raw_contact_data_present: false,
    raw_message_body_present: false,
    external_side_effect_executed: false
  });
  return Object.freeze({ ...result, communication_intent: intent });
}

export function createAgendaCommerceLedger() {
  const entries = new Map();
  return Object.freeze({
    execute(raw) {
      const result = buildAgendaCommercePlan(raw);
      if (!result.allowed) return result;
      const p = result.plan;
      const key = `${p.company_id}|${ENGINE_ID}|${p.request_id}|${p.scenario}`;
      const fingerprint = stableHash(p);
      if (entries.has(key)) {
        const previous = entries.get(key);
        if (previous.fingerprint !== fingerprint) return blocked('IDEMPOTENCY_CONFLICT', 'POLICY_CONFLICT', 'Idempotency key reused with different request fingerprint.');
        return Object.freeze({ ...previous.result, duplicate: true, idempotency_key: key });
      }
      const stored = Object.freeze({ ...result, duplicate: false, idempotency_key: key, request_fingerprint: fingerprint });
      entries.set(key, Object.freeze({ fingerprint, result: stored }));
      return stored;
    },
    size() { return entries.size; }
  });
}

export const SALE001_AGENDA_COMMERCE_V0_CONTRACT = Object.freeze({
  engine_id: ENGINE_ID,
  environment: ENVIRONMENT,
  version: VERSION,
  blocks: Object.freeze([118,119,120,121,122,123,124,125,126,127,128,129,130,131]),
  canonical_engines_reused: Object.freeze(['SALE-001','AGD-001','JOB-001','COM-001','RET-001','DOC-001','PAY-001','INV-001','ACC-001']),
  paid_or_external_benchmarks: Object.freeze({ CALNODE: 'LAB_BENCHMARK', SOLIVIO: 'LAB_PATTERN_ONLY', DOCUSEAL: 'LAB_BENCHMARK', OREKO: 'LAB_BENCHMARK', STRIPE: 'EXISTING_WRAP_ONLY' }),
  real_calendar_write: false,
  real_message_dispatch: false,
  real_signature: false,
  real_payment: false,
  real_invoice_issue: false,
  real_product_delivery: false,
  prod_authorized: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  supabase_required: false,
  product_factory_policy: 'REUSE_EXISTING_AION_CAPABILITY_DO_NOT_CREATE_SECOND_FACTORY',
  promotion: 'PREPROD_PLAN_ONLY->focused_tests->full_regression->live_dependency_audit->EVA-001/JDG-001->explicit_side_effect_gates'
});
