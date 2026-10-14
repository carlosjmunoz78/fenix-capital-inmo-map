import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';

const PREPROD = 'PREPROD';
const ENGINE_ID = 'SALE-001';
const PROFILE_ID = 'sales_executive';
const VERSION = 'sales-execution-agent-inbox-v1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

const STATES = new Set([
  'NEW','ELIGIBILITY_CHECK','DRAFT_READY','READY_FOR_HUMAN_APPROVAL',
  'AUTHORIZED_TO_SEND','QUEUED','DELIVERY_REQUESTED','SENT','DELIVERY_BLOCKED',
  'WAITING_RESPONSE','REPLIED','OPTED_OUT','SUPPRESSED','ESCALATED_TO_HUMAN',
  'CADENCE_COMPLETE'
]);
const CONTACT_PERMISSIONS = new Set(['ALLOWED','DENIED','UNKNOWN','CUSTOMER_REQUESTED_CONTACT']);
const CHANNELS = new Set(['EMAIL','WHATSAPP']);
const SUPPRESSION_REASONS = new Set([
  'user_opt_out','hard_bounce','manual_suppression','complaint','reply_stop',
  'legal_hold','frequency_cap','permission_denied'
]);
const ESCALATION_REASONS = new Set([
  'reply_received','positive_intent','uncertain_intent','high_value_lead',
  'sensitive_financial_case','complaint_or_optout','agent_requested',
  'identity_conflict','permission_unknown'
]);
const COMMANDS = new Set([
  'status','ingest','plan','queue','approve','reject','send','reply','suppress',
  'inbox','simulate'
]);
const FORBIDDEN_KEYS = new Set([
  'email','email_address','phone','phone_number','telephone','mobile','mobile_phone',
  'first_name','last_name','full_name','address','postal_address','dni','nif','nie',
  'iban','bank_account','account_number','password','secret','token','jwt','api_key',
  'apikey','access_token','refresh_token','private_key','credential_value','message',
  'message_text','body','body_text','recipient','recipient_address','contact_value',
  'draft_text','subject_text'
]);

const DEFAULT_CADENCE = Object.freeze([
  Object.freeze({ step_id: 'D0_EMAIL', offset_minutes: 0, channel: 'EMAIL' }),
  Object.freeze({ step_id: 'D2_EMAIL', offset_minutes: 2 * 24 * 60, channel: 'EMAIL' }),
  Object.freeze({ step_id: 'D5_WHATSAPP', offset_minutes: 5 * 24 * 60, channel: 'WHATSAPP' }),
  Object.freeze({ step_id: 'D9_EMAIL', offset_minutes: 9 * 24 * 60, channel: 'EMAIL' })
]);

const DEFAULT_LIMITS = Object.freeze({
  max_attempts_total: 4,
  max_email_attempts: 3,
  max_whatsapp_attempts: 1,
  email_min_interval_minutes: 24 * 60,
  whatsapp_min_interval_minutes: 72 * 60,
  max_retry_attempts_per_step: 3,
  retry_base_minutes: 15,
  retry_max_minutes: 12 * 60
});

function clone(value) { return deserialize(serialize(value)); }

function nonEmpty(value, label, max = 200) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} is too long`);
  return out;
}

function safeRef(value, label) {
  const out = nonEmpty(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
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

function stableId(prefix, value, size = 24) {
  return `${prefix}_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, size)}`;
}

function scopeFingerprint(state, step, draftRef) {
  return stableId('scope', [
    state.context.company_id, PROFILE_ID, state.customer_or_lead_id,
    state.campaign_id, step.step_id, step.channel, draftRef
  ], 32);
}

function executionContext(value) {
  assertPlainData(value, 'context');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id', 120),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id', 80),
    environment: nonEmpty(value.environment, 'context.environment', 40).toUpperCase(),
    version: nonEmpty(value.version, 'context.version', 80)
  });
  if (out.environment !== PREPROD) throw new Error('sales execution profile accepts exact PREPROD only');
  if (out.engine_id !== ENGINE_ID) throw new Error(`sales execution profile requires context.engine_id=${ENGINE_ID}`);
  return out;
}

function normalizeCadence(value) {
  if (value === undefined) return DEFAULT_CADENCE;
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) throw new Error('cadence must contain 1..12 steps');
  const seen = new Set();
  const out = value.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(`cadence[${index}] must be object`);
    const step_id = safeRef(raw.step_id, `cadence[${index}].step_id`);
    if (seen.has(step_id)) throw new Error(`duplicate cadence step_id: ${step_id}`);
    seen.add(step_id);
    const channel = nonEmpty(raw.channel, `cadence[${index}].channel`, 40).toUpperCase();
    if (!CHANNELS.has(channel)) throw new Error(`unsupported cadence channel: ${channel}`);
    const offset_minutes = integer(raw.offset_minutes, `cadence[${index}].offset_minutes`, { min: 0, max: 90 * 24 * 60 });
    return Object.freeze({ step_id, channel, offset_minutes });
  });
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].offset_minutes <= out[i - 1].offset_minutes) throw new Error('cadence offsets must be strictly increasing');
  }
  return Object.freeze(out);
}

function normalizeLimits(value = {}) {
  assertPlainData(value, 'limits');
  return Object.freeze({
    max_attempts_total: integer(value.max_attempts_total ?? DEFAULT_LIMITS.max_attempts_total, 'limits.max_attempts_total', { min: 1, max: 20 }),
    max_email_attempts: integer(value.max_email_attempts ?? DEFAULT_LIMITS.max_email_attempts, 'limits.max_email_attempts', { min: 0, max: 20 }),
    max_whatsapp_attempts: integer(value.max_whatsapp_attempts ?? DEFAULT_LIMITS.max_whatsapp_attempts, 'limits.max_whatsapp_attempts', { min: 0, max: 20 }),
    email_min_interval_minutes: integer(value.email_min_interval_minutes ?? DEFAULT_LIMITS.email_min_interval_minutes, 'limits.email_min_interval_minutes', { min: 0, max: 30 * 24 * 60 }),
    whatsapp_min_interval_minutes: integer(value.whatsapp_min_interval_minutes ?? DEFAULT_LIMITS.whatsapp_min_interval_minutes, 'limits.whatsapp_min_interval_minutes', { min: 0, max: 30 * 24 * 60 }),
    max_retry_attempts_per_step: integer(value.max_retry_attempts_per_step ?? DEFAULT_LIMITS.max_retry_attempts_per_step, 'limits.max_retry_attempts_per_step', { min: 1, max: 10 }),
    retry_base_minutes: integer(value.retry_base_minutes ?? DEFAULT_LIMITS.retry_base_minutes, 'limits.retry_base_minutes', { min: 1, max: 24 * 60 }),
    retry_max_minutes: integer(value.retry_max_minutes ?? DEFAULT_LIMITS.retry_max_minutes, 'limits.retry_max_minutes', { min: 1, max: 7 * 24 * 60 })
  });
}

function normalizeIdentity(input, companyId) {
  const lead_ref = safeRef(input.lead_ref, 'lead_ref');
  const explicit = input.customer_ref === undefined || input.customer_ref === null ? null : safeRef(input.customer_ref, 'customer_ref');
  const candidates = input.identity_candidates ?? [];
  if (!Array.isArray(candidates) || candidates.length > 20) throw new Error('identity_candidates must contain at most 20 entries');
  const verified = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError(`identity_candidates[${index}] must be object`);
    const ref = safeRef(row.customer_ref, `identity_candidates[${index}].customer_ref`);
    const status = nonEmpty(row.status, `identity_candidates[${index}].status`, 40).toUpperCase();
    if (status === 'VERIFIED' && !verified.includes(ref)) verified.push(ref);
  }
  if (explicit) return Object.freeze({ lead_ref, customer_or_lead_id: explicit, resolution_state: 'RESOLVED_EXPLICIT', conflict: false });
  if (verified.length === 1) return Object.freeze({ lead_ref, customer_or_lead_id: verified[0], resolution_state: 'RESOLVED_VERIFIED', conflict: false });
  if (verified.length > 1) return Object.freeze({ lead_ref, customer_or_lead_id: stableId('identityconflict', [companyId, lead_ref]), resolution_state: 'CONFLICT', conflict: true });
  return Object.freeze({ lead_ref, customer_or_lead_id: lead_ref, resolution_state: 'LEAD_ONLY', conflict: false });
}

function initialEscalations({ identity, highValue, sensitive, permission, agentRequested }) {
  const reasons = [];
  if (identity.conflict) reasons.push('identity_conflict');
  if (highValue) reasons.push('high_value_lead');
  if (sensitive) reasons.push('sensitive_financial_case');
  if (permission === 'UNKNOWN') reasons.push('permission_unknown');
  if (agentRequested) reasons.push('agent_requested');
  return reasons;
}

function channelEligible(state, channel) {
  if (state.contact_permission !== 'ALLOWED' && state.contact_permission !== 'CUSTOMER_REQUESTED_CONTACT') return false;
  if (channel === 'EMAIL') return state.channel_eligibility.email_channel === true;
  if (channel === 'WHATSAPP') return state.channel_eligibility.whatsapp_channel === true;
  return false;
}

function channelAttemptCount(state, channel) {
  return state.contact_history.filter((row) => row.type === 'DELIVERY_SENT' && row.channel === channel).length;
}

function lastSentAt(state, channel) {
  const rows = state.contact_history.filter((row) => row.type === 'DELIVERY_SENT' && row.channel === channel);
  return rows.length ? Math.max(...rows.map((row) => row.at_ms)) : null;
}

function frequencyCheck(state, channel, nowMs) {
  if (state.contact_attempts >= state.limits.max_attempts_total) return Object.freeze({ allowed: false, reason: 'TOTAL_FREQUENCY_CAP' });
  const count = channelAttemptCount(state, channel);
  const max = channel === 'EMAIL' ? state.limits.max_email_attempts : state.limits.max_whatsapp_attempts;
  if (count >= max) return Object.freeze({ allowed: false, reason: `${channel}_FREQUENCY_CAP` });
  const last = lastSentAt(state, channel);
  const minMinutes = channel === 'EMAIL' ? state.limits.email_min_interval_minutes : state.limits.whatsapp_min_interval_minutes;
  if (last !== null && nowMs < last + minMinutes * 60_000) {
    return Object.freeze({ allowed: false, reason: `${channel}_MIN_INTERVAL`, next_allowed_at_ms: last + minMinutes * 60_000 });
  }
  return Object.freeze({ allowed: true, reason: 'WITHIN_FREQUENCY_LIMITS' });
}

function cadenceDueAt(state, step) {
  return state.cadence_started_at_ms + step.offset_minutes * 60_000;
}

function appendHistory(state, row) {
  const history = [...state.contact_history, Object.freeze(row)];
  if (history.length > 200) history.splice(0, history.length - 200);
  return history;
}

function baseFreeze(state) {
  return Object.freeze({
    ...state,
    context: Object.freeze({ ...state.context }),
    cadence: Object.freeze(state.cadence.map((row) => Object.freeze({ ...row }))),
    limits: Object.freeze({ ...state.limits }),
    channel_eligibility: Object.freeze({ ...state.channel_eligibility }),
    contact_history: Object.freeze(state.contact_history.map((row) => Object.freeze({ ...row }))),
    escalation_reasons: Object.freeze([...state.escalation_reasons]),
    processed_delivery_keys: Object.freeze([...state.processed_delivery_keys]),
    retry_attempts: Object.freeze({ ...state.retry_attempts })
  });
}

function withEscalation(state, reasons, nowMs) {
  const unique = [...new Set([...state.escalation_reasons, ...reasons])];
  return baseFreeze({
    ...state,
    state: 'ESCALATED_TO_HUMAN',
    execution_mode: 'PLAN_ONLY',
    outreach_authorized: false,
    blocker: 'HUMAN_REQUIRED',
    checkpoint_token: 'customer_human_request',
    escalation_reasons: unique,
    next_allowed_contact_at_ms: null,
    contact_history: appendHistory(state, {
      type: 'HUMAN_ESCALATION',
      at_ms: nowMs,
      reasons: unique
    })
  });
}

function currentStep(state) {
  if (state.current_step_index < 0 || state.current_step_index >= state.cadence.length) return null;
  return state.cadence[state.current_step_index];
}

function nextEligibleIndex(state, startIndex) {
  for (let index = startIndex; index < state.cadence.length; index += 1) {
    if (channelEligible(state, state.cadence[index].channel)) return index;
  }
  return -1;
}

function prepareStep(rawState, index, nowMs) {
  const state = clone(rawState);
  if (index < 0 || index >= state.cadence.length) {
    return baseFreeze({
      ...state,
      state: 'CADENCE_COMPLETE',
      current_step_index: state.cadence.length,
      current_draft_ref: null,
      current_scope_fingerprint: null,
      next_allowed_contact_at_ms: null,
      blocker: null,
      checkpoint_token: null,
      contact_outcome: state.contact_outcome ?? 'cadence_complete'
    });
  }
  const step = state.cadence[index];
  const due = cadenceDueAt(state, step);
  const draftRef = stableId('draft', [state.case_id, step.step_id, step.channel, state.campaign_id, VERSION]);
  const scope = scopeFingerprint(state, step, draftRef);
  return baseFreeze({
    ...state,
    state: 'READY_FOR_HUMAN_APPROVAL',
    execution_mode: state.outreach_authorized ? 'CONTROLLED_DELIVERY' : 'PLAN_ONLY',
    current_step_index: index,
    current_draft_ref: draftRef,
    current_scope_fingerprint: scope,
    current_retry_attempt: 0,
    next_allowed_contact_at_ms: due,
    blocker: state.outreach_authorized ? null : 'HUMAN_REQUIRED',
    checkpoint_token: state.outreach_authorized ? null : 'customer_human_request',
    contact_history: appendHistory(state, {
      type: 'DRAFT_READY',
      at_ms: nowMs,
      step_id: step.step_id,
      channel: step.channel,
      draft_ref: draftRef,
      due_at_ms: due
    })
  });
}

export function createSalesExecutionCase(input) {
  assertPlainData(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be object');
  const context = executionContext(input.context);
  const identity = normalizeIdentity(input, context.company_id);
  const campaign_id = safeRef(input.campaign_id, 'campaign_id');
  const contact_permission = nonEmpty(input.contact_permission, 'contact_permission', 60).toUpperCase();
  if (!CONTACT_PERMISSIONS.has(contact_permission)) throw new Error(`unsupported contact_permission: ${contact_permission}`);
  const now_ms = integer(input.now_ms, 'now_ms');
  const high_value_lead = input.high_value_lead === undefined ? false : bool(input.high_value_lead, 'high_value_lead');
  const sensitive_financial_case = input.sensitive_financial_case === undefined ? false : bool(input.sensitive_financial_case, 'sensitive_financial_case');
  const agent_requested = input.agent_requested === undefined ? false : bool(input.agent_requested, 'agent_requested');
  const agent_owner_ref = input.agent_owner_ref === undefined || input.agent_owner_ref === null ? null : safeRef(input.agent_owner_ref, 'agent_owner_ref');
  const cadence = normalizeCadence(input.cadence);
  const limits = normalizeLimits(input.limits);
  const emailEligible = input.email_eligible === undefined ? true : bool(input.email_eligible, 'email_eligible');
  const whatsappEligible = input.whatsapp_eligible === undefined ? false : bool(input.whatsapp_eligible, 'whatsapp_eligible');
  const outreachAuthorized = input.outreach_authorized === undefined ? false : bool(input.outreach_authorized, 'outreach_authorized');
  const crmWriteAuthorized = input.crm_write_authorized === undefined ? false : bool(input.crm_write_authorized, 'crm_write_authorized');
  if (outreachAuthorized) throw new Error('initial outreach_authorized must be false; use exact human approval transition');
  if (crmWriteAuthorized) throw new Error('initial crm_write_authorized must be false; use separate explicit CRM authorization gate');

  const case_id = stableId('salesexec', [context.company_id, PROFILE_ID, identity.customer_or_lead_id, campaign_id, VERSION]);
  let state = baseFreeze({
    schema_version: '1.0.0',
    model_version: VERSION,
    profile_id: PROFILE_ID,
    case_id,
    context,
    lead_ref: identity.lead_ref,
    customer_or_lead_id: identity.customer_or_lead_id,
    identity_resolution_state: identity.resolution_state,
    campaign_id,
    state: 'ELIGIBILITY_CHECK',
    execution_mode: 'PLAN_ONLY',
    contact_permission,
    channel_eligibility: { email_channel: emailEligible, whatsapp_channel: whatsappEligible },
    cadence,
    cadence_started_at_ms: now_ms,
    current_step_index: -1,
    current_draft_ref: null,
    current_scope_fingerprint: null,
    current_retry_attempt: 0,
    outreach_authorized: false,
    crm_write_authorized: false,
    external_side_effect_executed: false,
    prod_write_executed: false,
    contact_history: [],
    contact_attempts: 0,
    contact_outcome: null,
    next_allowed_contact_at_ms: now_ms,
    suppression_reason: null,
    agent_owner_ref,
    escalation_reasons: [],
    processed_delivery_keys: [],
    retry_attempts: {},
    limits,
    blocker: 'HUMAN_REQUIRED',
    checkpoint_token: 'customer_human_request',
    additional_cost_eur: 0
  });

  if (contact_permission === 'DENIED') {
    return baseFreeze({
      ...state,
      state: 'SUPPRESSED',
      contact_outcome: 'permission_denied',
      suppression_reason: 'permission_denied',
      next_allowed_contact_at_ms: null,
      contact_history: appendHistory(state, { type: 'SUPPRESSED', at_ms: now_ms, reason: 'permission_denied' })
    });
  }

  const escalationReasons = initialEscalations({
    identity,
    highValue: high_value_lead,
    sensitive: sensitive_financial_case,
    permission: contact_permission,
    agentRequested: agent_requested
  });
  if (escalationReasons.length) return withEscalation(state, escalationReasons, now_ms);

  const index = nextEligibleIndex(state, 0);
  if (index < 0) return withEscalation(state, ['agent_requested'], now_ms);
  return prepareStep(state, index, now_ms);
}

export function buildAgentInboxItem(rawState, now_ms) {
  assertPlainData(rawState, 'state');
  const state = clone(rawState);
  integer(now_ms, 'now_ms');
  if (!STATES.has(state.state)) throw new Error('unknown sales execution state');
  const step = currentStep(state);
  const actions = state.state === 'READY_FOR_HUMAN_APPROVAL'
    ? ['APPROVE','EDIT','REJECT','SUPPRESS']
    : state.state === 'ESCALATED_TO_HUMAN'
      ? ['REVIEW','SUPPRESS']
      : ['REVIEW'];
  return Object.freeze({
    inbox_item_id: stableId('inbox', [state.case_id, state.state, state.current_scope_fingerprint ?? 'none']),
    profile_id: PROFILE_ID,
    case_id: state.case_id,
    state: state.state,
    reason: state.escalation_reasons.length ? state.escalation_reasons.join(',') : 'cadence_step_requires_governed_review',
    draft_ref: state.current_draft_ref,
    channel: step?.channel ?? null,
    step_id: step?.step_id ?? null,
    due_at_ms: state.next_allowed_contact_at_ms,
    recent_history: Object.freeze(state.contact_history.slice(-5).map((row) => Object.freeze({ ...row }))),
    consent_state: state.contact_permission,
    frequency_cap: Object.freeze({
      attempts: state.contact_attempts,
      max_attempts: state.limits.max_attempts_total
    }),
    agent_owner_ref: state.agent_owner_ref,
    scope_fingerprint: state.current_scope_fingerprint,
    execution_mode: state.execution_mode,
    blocker: state.blocker,
    checkpoint_token: state.checkpoint_token,
    actions: Object.freeze(actions),
    raw_message_text_present: false,
    raw_pii_present: false,
    generated_at_ms: now_ms
  });
}

export function authorizeSalesExecutionStep(rawState, authorization) {
  assertPlainData(rawState, 'state');
  assertPlainData(authorization, 'authorization');
  const state = clone(rawState);
  if (state.state !== 'READY_FOR_HUMAN_APPROVAL') throw new Error('case is not waiting for human approval');
  const decision = nonEmpty(authorization.decision, 'authorization.decision', 20).toUpperCase();
  const now_ms = integer(authorization.now_ms, 'authorization.now_ms');
  const approved_by_ref = safeRef(authorization.approved_by_ref, 'authorization.approved_by_ref');
  const exactScope = safeRef(authorization.scope_fingerprint, 'authorization.scope_fingerprint');
  if (exactScope !== state.current_scope_fingerprint) throw new Error('authorization scope mismatch');
  if (authorization.checkpoint_token !== 'customer_human_request') throw new Error('exact customer_human_request checkpoint required');

  if (decision === 'REJECT') {
    return baseFreeze({
      ...state,
      state: 'CADENCE_COMPLETE',
      contact_outcome: 'rejected_by_agent',
      current_draft_ref: null,
      current_scope_fingerprint: null,
      next_allowed_contact_at_ms: null,
      blocker: null,
      checkpoint_token: null,
      contact_history: appendHistory(state, { type: 'HUMAN_REJECTED', at_ms: now_ms, approved_by_ref })
    });
  }
  if (decision === 'SUPPRESS') {
    return suppressSalesExecutionCase(state, {
      reason: authorization.suppression_reason ?? 'manual_suppression',
      actor_ref: approved_by_ref,
      now_ms
    });
  }
  if (decision === 'EDIT') {
    const replacement = safeRef(authorization.replacement_draft_ref, 'authorization.replacement_draft_ref');
    const step = currentStep(state);
    const scope = scopeFingerprint(state, step, replacement);
    return baseFreeze({
      ...state,
      current_draft_ref: replacement,
      current_scope_fingerprint: scope,
      blocker: 'HUMAN_REQUIRED',
      checkpoint_token: 'customer_human_request',
      contact_history: appendHistory(state, { type: 'HUMAN_EDITED_DRAFT_REF', at_ms: now_ms, approved_by_ref, draft_ref: replacement })
    });
  }
  if (decision !== 'APPROVE') throw new Error(`unsupported human decision: ${decision}`);

  return baseFreeze({
    ...state,
    state: 'AUTHORIZED_TO_SEND',
    execution_mode: 'CONTROLLED_DELIVERY',
    outreach_authorized: true,
    blocker: null,
    checkpoint_token: null,
    contact_history: appendHistory(state, { type: 'HUMAN_APPROVED', at_ms: now_ms, approved_by_ref, scope_fingerprint: exactScope })
  });
}

export function queueSalesExecutionStep(rawState, now_ms) {
  assertPlainData(rawState, 'state');
  const state = clone(rawState);
  integer(now_ms, 'now_ms');
  if (state.state !== 'AUTHORIZED_TO_SEND' || state.outreach_authorized !== true) throw new Error('exact human authorization required before queue');
  return baseFreeze({
    ...state,
    state: 'QUEUED',
    contact_history: appendHistory(state, { type: 'QUEUED', at_ms: now_ms, step_id: currentStep(state)?.step_id ?? null })
  });
}

function idempotencyKey(state, step) {
  return [
    state.context.company_id,
    PROFILE_ID,
    state.customer_or_lead_id,
    state.campaign_id,
    step.step_id,
    step.channel
  ].join('|');
}

export function requestSalesExecutionDelivery(rawState, now_ms) {
  assertPlainData(rawState, 'state');
  const state = clone(rawState);
  integer(now_ms, 'now_ms');
  const step = currentStep(state);
  if (!step) throw new Error('no current cadence step');
  const key = idempotencyKey(state, step);

  if (state.state === 'DELIVERY_REQUESTED' && state.processed_delivery_keys.includes(key)) {
    return Object.freeze({
      state: baseFreeze(state),
      delivery_request: Object.freeze({
        status: 'DEDUPLICATED',
        idempotency_key: key,
        external_side_effect_executed: false
      })
    });
  }
  if (state.state !== 'QUEUED' || state.outreach_authorized !== true) throw new Error('queued exact human authorization required before delivery request');
  if (now_ms < state.next_allowed_contact_at_ms) throw new Error('cadence step is not due yet');

  const frequency = frequencyCheck(state, step.channel, now_ms);
  if (!frequency.allowed) {
    if (frequency.reason.endsWith('MIN_INTERVAL')) {
      const blocked = baseFreeze({
        ...state,
        state: 'DELIVERY_BLOCKED',
        outreach_authorized: false,
        execution_mode: 'PLAN_ONLY',
        blocker: 'RATE_LIMIT',
        next_allowed_contact_at_ms: frequency.next_allowed_at_ms,
        contact_history: appendHistory(state, { type: 'DELIVERY_BLOCKED', at_ms: now_ms, step_id: step.step_id, channel: step.channel, reason: frequency.reason })
      });
      return Object.freeze({ state: blocked, delivery_request: null });
    }
    const capped = suppressSalesExecutionCase(state, { reason: 'frequency_cap', actor_ref: 'system:frequency-cap', now_ms });
    return Object.freeze({ state: capped, delivery_request: null });
  }

  const nextState = baseFreeze({
    ...state,
    state: 'DELIVERY_REQUESTED',
    processed_delivery_keys: [...state.processed_delivery_keys, key],
    contact_history: appendHistory(state, { type: 'DELIVERY_REQUESTED', at_ms: now_ms, step_id: step.step_id, channel: step.channel, idempotency_key: key })
  });

  return Object.freeze({
    state: nextState,
    delivery_request: Object.freeze({
      schema_version: '1.0.0',
      target_engine: 'COM-001',
      source_engine: ENGINE_ID,
      profile_id: PROFILE_ID,
      case_id: state.case_id,
      lead_ref: state.lead_ref,
      customer_or_lead_id: state.customer_or_lead_id,
      campaign_id: state.campaign_id,
      step_id: step.step_id,
      channel: step.channel,
      draft_ref: state.current_draft_ref,
      scope_fingerprint: state.current_scope_fingerprint,
      idempotency_key: key,
      dispatch_authorized: false,
      adapter_dispatch_authorized: false,
      external_side_effect_executed: false,
      raw_message_text_present: false,
      raw_pii_present: false
    })
  });
}

function deterministicJitterMinutes(state, attempt, baseDelay) {
  const digest = crypto.createHash('sha256').update(`${state.case_id}|${state.current_step_index}|${attempt}`).digest();
  const fraction = digest[0] / 255;
  return Math.floor(baseDelay * 0.2 * fraction);
}

export function recordSalesExecutionDelivery(rawState, result) {
  assertPlainData(rawState, 'state');
  assertPlainData(result, 'result');
  const state = clone(rawState);
  if (state.state !== 'DELIVERY_REQUESTED') throw new Error('delivery result requires DELIVERY_REQUESTED state');
  const now_ms = integer(result.now_ms, 'result.now_ms');
  const outcome = nonEmpty(result.outcome, 'result.outcome', 40).toUpperCase();
  const step = currentStep(state);
  if (!step) throw new Error('no current cadence step');

  if (outcome === 'SENT') {
    const attempts = state.contact_attempts + 1;
    return baseFreeze({
      ...state,
      state: 'WAITING_RESPONSE',
      outreach_authorized: false,
      execution_mode: 'PLAN_ONLY',
      contact_attempts: attempts,
      contact_outcome: 'sent_waiting_response',
      current_retry_attempt: 0,
      blocker: null,
      checkpoint_token: null,
      contact_history: appendHistory(state, { type: 'DELIVERY_SENT', at_ms: now_ms, step_id: step.step_id, channel: step.channel }),
      next_allowed_contact_at_ms: state.current_step_index + 1 < state.cadence.length
        ? cadenceDueAt(state, state.cadence[state.current_step_index + 1])
        : null
    });
  }

  if (outcome !== 'BLOCKED') throw new Error(`unsupported delivery outcome: ${outcome}`);
  const attempt = (state.retry_attempts[step.step_id] ?? 0) + 1;
  if (attempt >= state.limits.max_retry_attempts_per_step) {
    return withEscalation(
      baseFreeze({
        ...state,
        retry_attempts: { ...state.retry_attempts, [step.step_id]: attempt },
        contact_history: appendHistory(state, { type: 'DELIVERY_BLOCKED', at_ms: now_ms, step_id: step.step_id, channel: step.channel, reason: 'RETRY_BUDGET_EXHAUSTED' })
      }),
      ['agent_requested'],
      now_ms
    );
  }
  const exponential = Math.min(
    state.limits.retry_base_minutes * (2 ** (attempt - 1)),
    state.limits.retry_max_minutes
  );
  const delay = exponential + deterministicJitterMinutes(state, attempt, exponential);
  return baseFreeze({
    ...state,
    state: 'DELIVERY_BLOCKED',
    outreach_authorized: false,
    execution_mode: 'PLAN_ONLY',
    current_retry_attempt: attempt,
    retry_attempts: { ...state.retry_attempts, [step.step_id]: attempt },
    blocker: 'RETRY_BACKOFF',
    checkpoint_token: 'customer_human_request',
    next_allowed_contact_at_ms: now_ms + delay * 60_000,
    contact_history: appendHistory(state, { type: 'DELIVERY_BLOCKED', at_ms: now_ms, step_id: step.step_id, channel: step.channel, reason: 'ADAPTER_OR_TRANSPORT_BLOCKED', retry_attempt: attempt, retry_delay_minutes: delay })
  });
}

export function advanceSalesExecutionCadence(rawState, now_ms) {
  assertPlainData(rawState, 'state');
  const state = clone(rawState);
  integer(now_ms, 'now_ms');
  if (!['WAITING_RESPONSE','DELIVERY_BLOCKED'].includes(state.state)) throw new Error('cadence can advance only from WAITING_RESPONSE or DELIVERY_BLOCKED');
  if (state.suppression_reason) return baseFreeze(state);
  if (state.contact_attempts >= state.limits.max_attempts_total) {
    return suppressSalesExecutionCase(state, { reason: 'frequency_cap', actor_ref: 'system:frequency-cap', now_ms });
  }
  if (state.state === 'DELIVERY_BLOCKED') {
    if (now_ms < state.next_allowed_contact_at_ms) throw new Error('retry backoff not elapsed');
    const draftRef = state.current_draft_ref;
    const scope = state.current_scope_fingerprint;
    return baseFreeze({
      ...state,
      state: 'READY_FOR_HUMAN_APPROVAL',
      outreach_authorized: false,
      execution_mode: 'PLAN_ONLY',
      blocker: 'HUMAN_REQUIRED',
      checkpoint_token: 'customer_human_request',
      current_draft_ref: draftRef,
      current_scope_fingerprint: scope,
      contact_history: appendHistory(state, { type: 'RETRY_READY_FOR_HUMAN_APPROVAL', at_ms: now_ms, step_id: currentStep(state)?.step_id ?? null })
    });
  }

  const next = nextEligibleIndex(state, state.current_step_index + 1);
  if (next < 0) return prepareStep(state, -1, now_ms);
  const due = cadenceDueAt(state, state.cadence[next]);
  if (now_ms < due) throw new Error('next cadence step is not due yet');
  return prepareStep(state, next, now_ms);
}

export function recordSalesExecutionReply(rawState, reply) {
  assertPlainData(rawState, 'state');
  assertPlainData(reply, 'reply');
  const state = clone(rawState);
  const now_ms = integer(reply.now_ms, 'reply.now_ms');
  const intent = nonEmpty(reply.intent ?? 'UNCERTAIN', 'reply.intent', 40).toUpperCase();
  const reasons = ['reply_received'];
  if (intent === 'POSITIVE') reasons.push('positive_intent');
  else if (intent !== 'NEGATIVE') reasons.push('uncertain_intent');
  const withReply = baseFreeze({
    ...state,
    state: 'REPLIED',
    contact_outcome: 'replied',
    suppression_reason: 'reply_stop',
    outreach_authorized: false,
    execution_mode: 'PLAN_ONLY',
    next_allowed_contact_at_ms: null,
    contact_history: appendHistory(state, { type: 'REPLY_RECEIVED', at_ms: now_ms, intent })
  });
  return withEscalation(withReply, reasons, now_ms);
}

export function suppressSalesExecutionCase(rawState, input) {
  assertPlainData(rawState, 'state');
  assertPlainData(input, 'suppression');
  const state = clone(rawState);
  const reason = nonEmpty(input.reason, 'suppression.reason', 80);
  if (!SUPPRESSION_REASONS.has(reason)) throw new Error(`unsupported suppression reason: ${reason}`);
  const actor_ref = safeRef(input.actor_ref, 'suppression.actor_ref');
  const now_ms = integer(input.now_ms, 'suppression.now_ms');
  const optedOut = reason === 'user_opt_out';
  return baseFreeze({
    ...state,
    state: optedOut ? 'OPTED_OUT' : 'SUPPRESSED',
    execution_mode: 'PLAN_ONLY',
    outreach_authorized: false,
    suppression_reason: reason,
    contact_outcome: optedOut ? 'opted_out' : 'suppressed',
    next_allowed_contact_at_ms: null,
    blocker: null,
    checkpoint_token: null,
    escalation_reasons: reason === 'complaint' || optedOut
      ? [...new Set([...state.escalation_reasons, 'complaint_or_optout'])]
      : state.escalation_reasons,
    contact_history: appendHistory(state, { type: optedOut ? 'OPTED_OUT' : 'SUPPRESSED', at_ms: now_ms, reason, actor_ref })
  });
}

export function buildCrmWritePlan(rawState, input = {}) {
  assertPlainData(rawState, 'state');
  assertPlainData(input, 'crm');
  const state = clone(rawState);
  const operation = nonEmpty(input.operation ?? 'UPDATE_CONTACT_HISTORY', 'crm.operation', 80).toUpperCase();
  return Object.freeze({
    target_engine: 'CRM-001',
    case_id: state.case_id,
    operation,
    status: state.crm_write_authorized === true ? 'AUTHORIZED_BUT_NOT_EXECUTED' : 'PLAN_ONLY_HUMAN_REQUIRED',
    crm_write_authorized: state.crm_write_authorized === true,
    prod_write_executed: false,
    external_side_effect_executed: false,
    checkpoint_token: state.crm_write_authorized === true ? null : 'customer_human_request'
  });
}

export function salesExecutionStatus(rawState) {
  assertPlainData(rawState, 'state');
  const state = clone(rawState);
  return Object.freeze({
    profile_id: PROFILE_ID,
    case_id: state.case_id,
    state: state.state,
    execution_mode: state.execution_mode,
    plan_valid: true,
    delivery_enabled: false,
    blocker: state.outreach_authorized ? null : (state.blocker ?? (['CADENCE_COMPLETE','SUPPRESSED','OPTED_OUT'].includes(state.state) ? null : 'HUMAN_REQUIRED')),
    checkpoint_token: state.checkpoint_token,
    outreach_authorized: state.outreach_authorized === true,
    crm_write_authorized: state.crm_write_authorized === true,
    external_side_effect_executed: state.external_side_effect_executed === true,
    prod_write_executed: state.prod_write_executed === true,
    contact_attempts: state.contact_attempts,
    contact_outcome: state.contact_outcome,
    next_allowed_contact_at_ms: state.next_allowed_contact_at_ms,
    suppression_reason: state.suppression_reason,
    agent_owner_ref: state.agent_owner_ref,
    current_step_index: state.current_step_index,
    current_step_id: currentStep(state)?.step_id ?? null,
    escalation_reasons: Object.freeze([...state.escalation_reasons])
  });
}

export function simulateSalesExecution(input) {
  const state = createSalesExecutionCase(input);
  return Object.freeze({
    mode: 'SIMULATION',
    state,
    status: salesExecutionStatus(state),
    inbox: buildAgentInboxItem(state, input.now_ms),
    external_side_effect_executed: false,
    prod_write_executed: false
  });
}

export function executeSalesCommand({ state = null, command, payload = {} } = {}) {
  const normalized = nonEmpty(command, 'command', 40).toLowerCase();
  if (!COMMANDS.has(normalized)) throw new Error(`unsupported sales command: ${normalized}`);
  if (normalized === 'ingest' || normalized === 'simulate') {
    return normalized === 'ingest' ? createSalesExecutionCase(payload) : simulateSalesExecution(payload);
  }
  if (!state) throw new Error(`state required for command ${normalized}`);
  if (normalized === 'status') return salesExecutionStatus(state);
  if (normalized === 'inbox') return buildAgentInboxItem(state, payload.now_ms);
  if (normalized === 'plan') return salesExecutionStatus(state);
  if (normalized === 'approve') return authorizeSalesExecutionStep(state, { ...payload, decision: payload.decision ?? 'APPROVE' });
  if (normalized === 'reject') return authorizeSalesExecutionStep(state, { ...payload, decision: 'REJECT' });
  if (normalized === 'queue') return queueSalesExecutionStep(state, payload.now_ms);
  if (normalized === 'send') return requestSalesExecutionDelivery(state, payload.now_ms);
  if (normalized === 'reply') return recordSalesExecutionReply(state, payload);
  if (normalized === 'suppress') return suppressSalesExecutionCase(state, payload);
  throw new Error(`command ${normalized} requires a higher-level cadence scheduler transition`);
}

export const SALES_EXECUTION_AGENT_INBOX_V1_CONTRACT = Object.freeze({
  engine_id: ENGINE_ID,
  profile_id: PROFILE_ID,
  environment: PREPROD,
  model_version: VERSION,
  upstream_engines: Object.freeze(['LEAD-001','NBA-001','SALE-001']),
  downstream_engines: Object.freeze(['COM-001','CRM-001']),
  operator_commands: Object.freeze([...COMMANDS]),
  state_machine: Object.freeze([...STATES]),
  default_cadence: DEFAULT_CADENCE,
  suppression_reasons: Object.freeze([...SUPPRESSION_REASONS]),
  escalation_reasons: Object.freeze([...ESCALATION_REASONS]),
  persisted_fields: Object.freeze([
    'contact_history','contact_attempts','contact_outcome','next_allowed_contact_at_ms',
    'suppression_reason','agent_owner_ref'
  ]),
  idempotency_template: 'tenant_id|profile_id|customer_or_lead_id|campaign_id|step_id|channel',
  outbound_default_authorized: false,
  crm_write_default_authorized: false,
  direct_transport_dispatch_authorized: false,
  raw_pii_allowed: false,
  raw_message_text_allowed: false,
  prod_writes: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  stop_on_reply: true,
  stop_on_optout: true,
  hard_frequency_cap: true,
  bounded_retry_with_jitter: true,
  high_value_requires_human: true,
  sensitive_financial_case_requires_human: true,
  checkpoint_token: 'customer_human_request',
  technical_closeout_allowed_with_human_gate: true
});
