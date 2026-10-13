import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';

const PREPROD = 'PREPROD';
const ENGINE_ID = 'LEAD-001';
const MODEL_VERSION = 'lead-nba-deterministic-v1';

const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const CONTACT_PERMISSIONS = new Set(['ALLOWED','DENIED','UNKNOWN','CUSTOMER_REQUESTED_CONTACT']);
const SOURCES = new Set(['WEB_FORM','WHATSAPP','PHONE','EMAIL','CRM','REFERRAL','PARTNER','ORGANIC','PAID','OTHER']);
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const FORBIDDEN_KEYS = new Set([
  'email','email_address','phone','phone_number','telephone','mobile','mobile_phone',
  'first_name','last_name','full_name','address','postal_address','dni','nif','nie','iban',
  'bank_account','account_number','password','secret','token','jwt','api_key','apikey',
  'access_token','refresh_token','private_key','credential_value'
]);

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

function percent(value, label) { return integer(value, label, { min: 0, max: 100 }); }
function clamp100(value) { return Math.max(0, Math.min(100, Math.round(value))); }
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
      for (let i = 0; i < value.length; i += 1) assertPlainData(value[i], `${label}[${i}]`, seen);
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain only plain objects and arrays`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor properties are forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`raw PII/secret field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function safeContext(value) {
  assertPlainData(value, 'context');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const context = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id', 120),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id', 80),
    environment: nonEmpty(value.environment, 'context.environment', 40),
    version: nonEmpty(value.version, 'context.version', 80)
  });
  if (context.environment !== PREPROD) throw new Error('LEAD-001 deterministic V1 accepts exact PREPROD only');
  if (context.engine_id !== ENGINE_ID) throw new Error(`LEAD-001 deterministic V1 requires context.engine_id=${ENGINE_ID}`);
  return context;
}

function safeRef(value, label) {
  const out = nonEmpty(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference, not raw contact data`);
  return out;
}

function normalizeSignals(value) {
  assertPlainData(value, 'signals');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('signals must be an object');
  return Object.freeze({
    profile_fit: percent(value.profile_fit, 'signals.profile_fit'),
    explicit_intent: percent(value.explicit_intent, 'signals.explicit_intent'),
    behavioral_intent: percent(value.behavioral_intent, 'signals.behavioral_intent'),
    urgency: percent(value.urgency, 'signals.urgency'),
    contactability: percent(value.contactability, 'signals.contactability'),
    source_quality: percent(value.source_quality, 'signals.source_quality'),
    evidence_coverage: percent(value.evidence_coverage, 'signals.evidence_coverage'),
    recency: percent(value.recency, 'signals.recency'),
    engagement: percent(value.engagement, 'signals.engagement'),
    negative_signal: percent(value.negative_signal ?? 0, 'signals.negative_signal')
  });
}

function weighted(parts) {
  return clamp100(parts.reduce((sum, [value, weight]) => sum + (value * weight), 0) / 100);
}

function scoreSignals(signals) {
  const fit_score = signals.profile_fit;
  const positiveIntent = weighted([
    [signals.explicit_intent, 40],
    [signals.behavioral_intent, 25],
    [signals.engagement, 15],
    [signals.recency, 20]
  ]);
  const intent_score = clamp100(positiveIntent - (signals.negative_signal * 0.35));
  const urgency_score = signals.urgency;
  const contactability_score = signals.contactability;
  const confidence = weighted([
    [signals.evidence_coverage, 60],
    [signals.source_quality, 40]
  ]);
  const priority_score = weighted([
    [fit_score, 30],
    [intent_score, 35],
    [urgency_score, 20],
    [contactability_score, 15]
  ]);
  const conversion_propensity_score = weighted([
    [fit_score, 25],
    [intent_score, 35],
    [urgency_score, 15],
    [contactability_score, 10],
    [confidence, 15]
  ]);
  return Object.freeze({ fit_score, intent_score, urgency_score, contactability_score, confidence, priority_score, conversion_propensity_score });
}

function decideNextBestAction({ scores, contact_permission, human_required_reason }) {
  if (human_required_reason) {
    return Object.freeze({ action: 'HUMAN_REQUIRED', reason: human_required_reason, target_engine: null, target_sla_minutes: null, autonomous_contact_allowed: false });
  }
  if (contact_permission === 'DENIED') {
    return Object.freeze({ action: 'DO_NOT_CONTACT', reason: 'CONTACT_PERMISSION_DENIED', target_engine: 'SALE-001', target_sla_minutes: null, autonomous_contact_allowed: false });
  }
  if (contact_permission === 'UNKNOWN') {
    return Object.freeze({ action: 'VERIFY_CONTACT_PERMISSION', reason: 'CONTACT_PERMISSION_UNKNOWN', target_engine: 'SALE-001', target_sla_minutes: 240, autonomous_contact_allowed: false });
  }
  if (scores.confidence < 50) {
    return Object.freeze({ action: 'REQUEST_MORE_EVIDENCE', reason: 'INSUFFICIENT_EVIDENCE_CONFIDENCE', target_engine: 'LEAD-001', target_sla_minutes: 240, autonomous_contact_allowed: false });
  }
  if (scores.contactability_score < 40) {
    return Object.freeze({ action: 'VERIFY_CONTACT', reason: 'LOW_CONTACTABILITY', target_engine: 'SALE-001', target_sla_minutes: 240, autonomous_contact_allowed: false });
  }
  if (contact_permission === 'CUSTOMER_REQUESTED_CONTACT') {
    return Object.freeze({ action: 'CONTACT_NOW', reason: 'CUSTOMER_REQUESTED_CONTACT', target_engine: 'SALE-001', target_sla_minutes: 5, autonomous_contact_allowed: true });
  }
  if (scores.priority_score >= 80 || (scores.intent_score >= 85 && scores.urgency_score >= 70)) {
    return Object.freeze({ action: 'CONTACT_NOW', reason: 'HIGH_COMMERCIAL_PRIORITY', target_engine: 'SALE-001', target_sla_minutes: 5, autonomous_contact_allowed: true });
  }
  if (scores.priority_score >= 65) {
    return Object.freeze({ action: 'FOLLOW_UP_FAST', reason: 'MEDIUM_HIGH_COMMERCIAL_PRIORITY', target_engine: 'SALE-001', target_sla_minutes: 60, autonomous_contact_allowed: true });
  }
  if (scores.priority_score >= 45) {
    return Object.freeze({ action: 'NURTURE', reason: 'MEDIUM_COMMERCIAL_PRIORITY', target_engine: 'SALE-001', target_sla_minutes: 1440, autonomous_contact_allowed: true });
  }
  return Object.freeze({ action: 'MONITOR', reason: 'LOW_CURRENT_COMMERCIAL_PRIORITY', target_engine: 'LEAD-001', target_sla_minutes: 4320, autonomous_contact_allowed: false });
}

function stableDecisionId(value) {
  return `leaddec_${crypto.createHash('sha256').update(serialize(value)).digest('hex').slice(0, 24)}`;
}

export function evaluateLead(input) {
  assertPlainData(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const context = safeContext(input.context);
  const lead_ref = safeRef(input.lead_ref, 'lead_ref');
  const source = nonEmpty(input.source, 'source', 40).toUpperCase();
  if (!SOURCES.has(source)) throw new Error(`unsupported lead source: ${source}`);
  const signals = normalizeSignals(input.signals);
  const evidence_refs = input.evidence_refs;
  if (!Array.isArray(evidence_refs) || evidence_refs.length < 1 || evidence_refs.length > 20) throw new Error('evidence_refs must contain 1..20 safe references');
  const safeEvidence = Object.freeze([...new Set(evidence_refs.map((value, index) => safeRef(value, `evidence_refs[${index}]`)))].sort());
  const contact_permission = nonEmpty(input.contact_permission, 'contact_permission', 60).toUpperCase();
  if (!CONTACT_PERMISSIONS.has(contact_permission)) throw new Error(`unsupported contact_permission: ${contact_permission}`);
  const human_required_reason = input.human_required_reason ?? null;
  if (human_required_reason !== null && !HUMAN_REQUIRED_REASONS.has(human_required_reason)) throw new Error(`invalid HUMAN_REQUIRED reason: ${human_required_reason}`);
  const estimated_value_eur = integer(input.estimated_value_eur ?? 0, 'estimated_value_eur', { min: 0, max: 100_000_000 });

  const scores = scoreSignals(signals);
  const next_best_action = decideNextBestAction({ scores, contact_permission, human_required_reason });
  const heuristic_weighted_value_eur = Math.floor((estimated_value_eur * scores.conversion_propensity_score) / 100);
  const decisionBase = {
    model_version: MODEL_VERSION,
    context,
    lead_ref,
    source,
    signals,
    evidence_refs: safeEvidence,
    contact_permission,
    human_required_reason,
    estimated_value_eur,
    scores,
    next_best_action
  };

  return Object.freeze({
    status: human_required_reason ? 'HUMAN_REQUIRED' : 'OK',
    human_required: human_required_reason,
    decision_id: stableDecisionId(decisionBase),
    model_version: MODEL_VERSION,
    context: Object.freeze({ ...context }),
    lead_ref,
    source,
    evidence_refs: safeEvidence,
    scores,
    estimated_value_eur,
    heuristic_weighted_value_eur,
    calibration_state: 'UNCALIBRATED_HEURISTIC_DO_NOT_TREAT_AS_PROBABILITY',
    next_best_action,
    side_effects_executed: false,
    additional_cost_eur: 0
  });
}

export async function leadScoreAndNbaJobHandler({ context, payload }) {
  assertPlainData(payload, 'payload');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('payload must be an object');
  return clone(evaluateLead({ ...payload, context }));
}

export const LEAD_NBA_V1_CONTRACT = Object.freeze({
  engines: Object.freeze(['LEAD-001','NBA-001']),
  job_name: 'lead.score-and-route',
  environment: PREPROD,
  deterministic_first: true,
  ai_required: false,
  raw_pii_allowed: false,
  raw_secrets_allowed: false,
  scoring_dimensions: Object.freeze(['fit_score','intent_score','urgency_score','contactability_score','confidence','priority_score','conversion_propensity_score']),
  probability_claim: false,
  calibration_state: 'UNCALIBRATED_HEURISTIC_DO_NOT_TREAT_AS_PROBABILITY',
  target_handoff_engines: Object.freeze(['LEAD-001','SALE-001']),
  contact_side_effects: false,
  prod_writes: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  supabase_required: false,
  durable_execution: 'JOB-001 durable V1 + worker-runner-v1 compatible',
  promotion: 'LAB->PREPROD->OLD_vs_NEW->tribunal->gradual_prod'
});
