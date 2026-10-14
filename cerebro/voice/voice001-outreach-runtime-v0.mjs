import crypto from 'node:crypto';

const ENGINE_ID = 'VOICE-001';
const ENVIRONMENT = 'PREPROD';
const VERSION = 'voice001-outreach-runtime-v0';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_REQUIRED_SET = new Set(HUMAN_REQUIRED_REASONS);

export const VOICE_SCENARIOS = Object.freeze([
  'LEAD_RESCUE',
  'INBOUND_QUALIFICATION',
  'OUTBOUND_QUALIFICATION',
  'VOICE_FOLLOW_UP',
  'VOICE_OBJECTION_HANDLING',
  'PROPERTY_VOICE_CLOSER',
  'FINANCIAL_VOICE_CLOSER'
]);
const SCENARIO_SET = new Set(VOICE_SCENARIOS);

const CONTACT_CONSENT = new Set(['EXPLICIT','CUSTOMER_REQUESTED_CONTACT','DENIED','UNKNOWN']);
const PIPELINES = new Set(['LOCAL_STT_TTS','LIVEKIT_SIMULATION','PIPECAT_SIMULATION','LIVEKIT_PIPECAT_SIMULATION']);
const PAID_PROVIDERS_HOLD = new Set(['RETELL','DAPTA']);
const DIRECTIONS = new Set(['INBOUND','OUTBOUND']);
const FORBIDDEN_LOG_KEYS = new Set([
  'email','phone','telephone','mobile','dni','nif','nie','iban','bank_account',
  'access_token','refresh_token','jwt','secret','password','api_key','apikey',
  'raw_audio','audio_bytes','recording','transcript','raw_transcript','message_body'
]);

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

function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} invalid`);
  return n;
}

function stableHash(value, size = 32) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}

function assertNoForbiddenFields(value, label = 'input', seen = new WeakSet()) {
  if (value === null || ['string','number','boolean','undefined'].includes(typeof value)) return;
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular data`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertNoForbiddenFields(item, `${label}[${index}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must be plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_LOG_KEYS.has(key.toLowerCase())) throw new Error(`PII/secret/raw-media field forbidden: ${label}.${key}`);
      assertNoForbiddenFields(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function normalizeContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('context object required');
  assertNoForbiddenFields(raw, 'context');
  const out = Object.freeze({
    company_id: text(raw.company_id, 'context.company_id', 120),
    engine_id: text(raw.engine_id, 'context.engine_id', 80),
    environment: text(raw.environment, 'context.environment', 40).toUpperCase(),
    version: text(raw.version, 'context.version', 80)
  });
  if (out.engine_id !== ENGINE_ID) throw new Error(`context.engine_id must be ${ENGINE_ID}`);
  if (out.environment !== ENVIRONMENT) throw new Error('VOICE-001 outreach runtime accepts exact PREPROD only');
  return out;
}

function canonicalHumanReason(value) {
  const reason = text(value, 'human_required_reason', 80).toUpperCase();
  if (!HUMAN_REQUIRED_SET.has(reason)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return reason;
}

function normalizeScenario(value) {
  const scenario = text(value, 'scenario', 80).toUpperCase();
  if (!SCENARIO_SET.has(scenario)) throw new Error(`unsupported voice scenario: ${scenario}`);
  return scenario;
}

function normalizeDirection(value) {
  const direction = text(value, 'direction', 20).toUpperCase();
  if (!DIRECTIONS.has(direction)) throw new Error(`unsupported direction: ${direction}`);
  return direction;
}

function normalizeConsent(value) {
  const consent = text(value ?? 'UNKNOWN', 'contact_consent', 40).toUpperCase();
  if (!CONTACT_CONSENT.has(consent)) throw new Error(`unsupported contact_consent: ${consent}`);
  return consent;
}

function normalizePipeline(value) {
  const pipeline = text(value ?? 'LOCAL_STT_TTS', 'pipeline', 60).toUpperCase();
  if (!PIPELINES.has(pipeline)) throw new Error(`unsupported pipeline: ${pipeline}`);
  return pipeline;
}

function makeBlock(code, humanReason, detail, extra = {}) {
  return Object.freeze({
    allowed: false,
    status: 'BLOCKED',
    code,
    blocker: 'HUMAN_REQUIRED',
    human_required_reason: canonicalHumanReason(humanReason),
    detail,
    external_side_effect_executed: false,
    ...extra
  });
}

export function evaluateVoiceGate(raw = {}) {
  assertNoForbiddenFields(raw, 'voice_request');
  const context = normalizeContext(raw.context);
  const companyScope = raw.target_company_id == null ? context.company_id : text(raw.target_company_id, 'target_company_id', 120);
  if (companyScope !== context.company_id) {
    return makeBlock('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company voice execution is denied.');
  }

  const scenario = normalizeScenario(raw.scenario);
  const direction = normalizeDirection(raw.direction ?? (scenario === 'INBOUND_QUALIFICATION' ? 'INBOUND' : 'OUTBOUND'));
  const pipeline = normalizePipeline(raw.pipeline);
  const provider = text(raw.provider ?? 'LOCAL', 'provider', 40).toUpperCase();
  const transportMode = text(raw.transport_mode ?? 'SIMULATION', 'transport_mode', 40).toUpperCase();
  const contactConsent = normalizeConsent(raw.contact_consent);
  const optedOut = bool(raw.opted_out ?? false, 'opted_out');
  const recordingRequested = bool(raw.recording_requested ?? false, 'recording_requested');
  const crmWriteRequested = bool(raw.crm_write_requested ?? false, 'crm_write_requested');
  const confidence = finite(raw.confidence ?? 1, 'confidence', { min: 0, max: 1 });
  const highRisk = bool(raw.high_risk ?? false, 'high_risk');
  const legalReviewRequired = bool(raw.legal_review_required ?? false, 'legal_review_required');
  const signatureRequired = bool(raw.signature_required ?? false, 'signature_required');
  const moneyLimitExceeded = bool(raw.money_limit_exceeded ?? false, 'money_limit_exceeded');
  const customerHumanRequest = bool(raw.customer_human_request ?? false, 'customer_human_request');

  if (PAID_PROVIDERS_HOLD.has(provider)) {
    return makeBlock(`${provider}_COMMERCIAL_HOLD`, 'POLICY_CONFLICT', `${provider} remains disabled until FREE_PARITY/ROI and compliance gates pass.`, { provider_status: 'HOLD_COMMERCIAL' });
  }
  if (transportMode !== 'SIMULATION') {
    return makeBlock('REAL_CALL_DISABLED', 'HIGH_RISK', 'Real telephony is disabled in VOICE-001 V0.');
  }
  if (recordingRequested) {
    return makeBlock('RECORDING_DISABLED', 'LEGAL_REQUIRED', 'Recording is disabled until explicit legal/consent policy is approved.');
  }
  if (crmWriteRequested) {
    return makeBlock('CRM_WRITE_DISABLED', 'POLICY_CONFLICT', 'VOICE-001 V0 may emit a write plan but cannot write CRM.');
  }
  if (optedOut || contactConsent === 'DENIED') {
    return makeBlock('CONTACT_SUPPRESSED', 'POLICY_CONFLICT', 'Opt-out/denied consent suppresses voice contact.');
  }
  if (direction === 'OUTBOUND' && !['EXPLICIT','CUSTOMER_REQUESTED_CONTACT'].includes(contactConsent)) {
    return makeBlock('OUTBOUND_CONSENT_REQUIRED', 'LEGAL_REQUIRED', 'Outbound voice simulation requires explicit or customer-requested contact consent.');
  }
  if (direction === 'INBOUND' && contactConsent === 'UNKNOWN') {
    return makeBlock('INBOUND_CONSENT_CONTEXT_REQUIRED', 'LEGAL_REQUIRED', 'Inbound qualification requires a resolved consent context before any follow-up action.');
  }
  if (legalReviewRequired) return makeBlock('LEGAL_REVIEW_REQUIRED', 'LEGAL_REQUIRED', 'Legal review requested by policy.');
  if (signatureRequired) return makeBlock('SIGNATURE_REQUIRED', 'SIGNATURE_REQUIRED', 'A human signature is required.');
  if (moneyLimitExceeded) return makeBlock('MONEY_LIMIT_EXCEEDED', 'MONEY_LIMIT', 'Configured money limit exceeded.');
  if (highRisk) return makeBlock('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk case requires human handling.');
  if (confidence < 0.75) return makeBlock('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (customerHumanRequest) return makeBlock('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');

  return Object.freeze({
    allowed: true,
    status: 'SIMULATION_ALLOWED',
    context,
    scenario,
    direction,
    pipeline,
    provider,
    transport_mode: 'SIMULATION',
    contact_consent: contactConsent,
    recording_enabled: false,
    crm_write_authorized: false,
    real_call_authorized: false,
    external_side_effect_authorized: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function routeVoiceScenario(raw = {}) {
  const gate = evaluateVoiceGate(raw);
  if (!gate.allowed) return gate;
  const dependencyMap = {
    LEAD_RESCUE: ['LEAD-001','NBA-001','SALE-001','COM-001'],
    INBOUND_QUALIFICATION: ['C360-001','SALE-001','COM-001'],
    OUTBOUND_QUALIFICATION: ['LEAD-001','SALE-001','COM-001'],
    VOICE_FOLLOW_UP: ['SALE-001','COM-001'],
    VOICE_OBJECTION_HANDLING: ['SALE-001','KNW-001','COM-001'],
    PROPERTY_VOICE_CLOSER: ['PROP-001','SALE-001','COM-001'],
    FINANCIAL_VOICE_CLOSER: ['SALE-001','BNK-001','COM-001']
  };
  const plan = Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_VOICE001_SIMULATION_PLAN',
    company_id: gate.context.company_id,
    engine_id: ENGINE_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    request_id: safeRef(raw.request_id, 'request_id'),
    scenario: gate.scenario,
    direction: gate.direction,
    pipeline: gate.pipeline,
    dependencies: Object.freeze([...dependencyMap[gate.scenario]]),
    capabilities: Object.freeze(['STT_LOCAL','DIALOGUE_ORCHESTRATION','TTS_LOCAL','BARGE_IN_SEAM','COM001_HANDOFF_SEAM']),
    stt_adapter: gate.pipeline === 'LOCAL_STT_TTS' ? 'FASTER_WHISPER_LOCAL' : 'PIPELINE_STT_SEAM',
    tts_adapter: gate.pipeline === 'LOCAL_STT_TTS' ? 'PIPER_LOCAL' : 'PIPELINE_TTS_SEAM',
    transcript_persistence: false,
    recording_enabled: false,
    crm_write_authorized: false,
    delivery_dispatch_authorized: false,
    real_call_authorized: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
  return Object.freeze({ ...gate, plan });
}

export function buildLocalAudioPipeline(raw = {}) {
  const gate = evaluateVoiceGate({ ...raw, pipeline: 'LOCAL_STT_TTS' });
  if (!gate.allowed) return gate;
  return Object.freeze({
    allowed: true,
    status: 'LOCAL_SIMULATION_PIPELINE_READY',
    company_id: gate.context.company_id,
    engine_id: ENGINE_ID,
    environment: ENVIRONMENT,
    stt: Object.freeze({ adapter: 'faster-whisper', execution: 'LOCAL', network_required: false, additional_cost_eur: 0 }),
    tts: Object.freeze({ adapter: 'piper', execution: 'LOCAL', network_required: false, additional_cost_eur: 0 }),
    realtime_seams: Object.freeze({ livekit: 'OPTIONAL_ADAPTER_NOT_LIVE_BOUND', pipecat: 'OPTIONAL_ADAPTER_NOT_LIVE_BOUND' }),
    paid_providers: Object.freeze({ RETELL: 'HOLD_COMMERCIAL', DAPTA: 'HOLD_COMMERCIAL' }),
    executes_external_process: false,
    executes_network_call: false,
    recording_enabled: false,
    external_side_effect_executed: false
  });
}

export function createVoiceExecutionLedger() {
  const records = new Map();
  return Object.freeze({
    execute(raw) {
      const routed = routeVoiceScenario(raw);
      if (!routed.allowed) return routed;
      const key = `${routed.plan.company_id}|${ENGINE_ID}|${routed.plan.request_id}|${routed.plan.scenario}|${routed.plan.direction}`;
      const fingerprint = stableHash(routed.plan);
      if (records.has(key)) {
        const existing = records.get(key);
        if (existing.fingerprint !== fingerprint) {
          return makeBlock('IDEMPOTENCY_CONFLICT', 'POLICY_CONFLICT', 'The idempotency key was reused with a different request fingerprint.');
        }
        return Object.freeze({ ...existing.result, duplicate: true, idempotency_key: key });
      }
      const result = Object.freeze({ ...routed, duplicate: false, idempotency_key: key, request_fingerprint: fingerprint });
      records.set(key, Object.freeze({ fingerprint, result }));
      return result;
    },
    size() { return records.size; }
  });
}

export function redactVoiceText(value) {
  let out = String(value ?? '');
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
  out = out.replace(/\b(?:ES\d{2}[ ]?)(?:\d{4}[ ]?){5}\d{4}\b/gi, '[REDACTED_IBAN]');
  out = out.replace(/\b(?:\+?34[\s.-]?)?(?:[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})\b/g, '[REDACTED_PHONE]');
  out = out.replace(/\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/gi, '[REDACTED_ID]');
  return out;
}

export function buildVoiceTelemetry(raw = {}) {
  const routed = routeVoiceScenario(raw);
  if (!routed.allowed) {
    return Object.freeze({
      engine_id: ENGINE_ID,
      environment: ENVIRONMENT,
      status: routed.status,
      code: routed.code,
      human_required_reason: routed.human_required_reason,
      raw_transcript_persisted: false,
      raw_audio_persisted: false,
      pii_persisted: false,
      external_side_effect_executed: false
    });
  }
  return Object.freeze({
    engine_id: ENGINE_ID,
    environment: ENVIRONMENT,
    company_id: routed.plan.company_id,
    request_id_hash: stableHash(routed.plan.request_id),
    scenario: routed.plan.scenario,
    direction: routed.plan.direction,
    pipeline: routed.plan.pipeline,
    raw_transcript_persisted: false,
    raw_audio_persisted: false,
    pii_persisted: false,
    recording_enabled: false,
    crm_write_authorized: false,
    real_call_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}
