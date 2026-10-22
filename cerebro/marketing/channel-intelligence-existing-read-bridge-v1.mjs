import crypto from 'node:crypto';

const PREPROD = 'PREPROD';
const VERSION = '1.0.0';
const CAPABILITY_ID = 'CHANNEL-INTELLIGENCE-EXISTING-READ-BRIDGE-V1';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./@-]{0,199}$/;
const FORBIDDEN_KEYS = new Set([
  'email','phone','mobile','dni','nif','nie','iban','bank_account','password','secret',
  'token','jwt','api_key','apikey','access_token','refresh_token','private_key','authorization',
  'cookie','set-cookie','client_secret','clientsecret'
]);
const SECRET_VALUE_PATTERNS = [
  /^Bearer\s+\S+/i,
  /^ya29\.[A-Za-z0-9._-]+$/,
  /^ghp_[A-Za-z0-9]+$/,
  /^github_pat_[A-Za-z0-9_]+$/,
  /^sk-[A-Za-z0-9_-]{12,}$/,
  /^[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}$/
];

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be opaque safe reference`);
  return out;
}

function assertNoSecretString(value, label) {
  if (typeof value !== 'string') return;
  if (SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value.trim()))) {
    throw new Error(`forbidden secret-shaped value: ${label}`);
  }
}

function assertPlainSafe(value, label = 'value', seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    assertNoSecretString(value, label);
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular value`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPlainSafe(item, `${label}[${index}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`forbidden secret/PII field: ${label}.${key}`);
      assertPlainSafe(descriptor.value, `${label}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function sha(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeChannel(value) {
  if (value == null) return null;
  return safeRef(value, 'channel_id');
}

export function buildExistingReadIntent({
  company_id,
  collector_id,
  watch_type,
  channel_id = null,
  scope = 'OWN_CONNECTED_READ_ONLY',
  cycle_id,
  evidence_ref
} = {}) {
  const intent = {
    company_id: text(company_id, 'company_id', 160),
    collector_id: safeRef(collector_id, 'collector_id'),
    watch_type: safeRef(watch_type, 'watch_type'),
    channel_id: normalizeChannel(channel_id),
    scope: safeRef(scope, 'scope'),
    cycle_id: safeRef(cycle_id, 'cycle_id'),
    evidence_ref: safeRef(evidence_ref, 'evidence_ref'),
    capability_id: CAPABILITY_ID,
    environment: PREPROD,
    version: VERSION,
    read_only: true,
    external_write: false,
    prod_publication: false,
    spend_eur: 0,
    token_export: false
  };
  assertPlainSafe(intent, 'intent');
  return Object.freeze(intent);
}

function validateIntent(intent, companyId) {
  assertPlainSafe(intent, 'intent');
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) throw new TypeError('intent object required');
  if (intent.company_id !== companyId) throw new Error('SECURITY_INCIDENT:BRIDGE_COMPANY_MISMATCH');
  if (intent.environment !== PREPROD || intent.capability_id !== CAPABILITY_ID || intent.version !== VERSION) {
    throw new Error('POLICY_CONFLICT:BRIDGE_CONTEXT_MISMATCH');
  }
  if (intent.read_only !== true || intent.external_write !== false || intent.prod_publication !== false || intent.token_export !== false || Number(intent.spend_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:BRIDGE_AUTHORITY_EXPANSION');
  }
  safeRef(intent.collector_id, 'intent.collector_id');
  safeRef(intent.watch_type, 'intent.watch_type');
  safeRef(intent.scope, 'intent.scope');
  safeRef(intent.cycle_id, 'intent.cycle_id');
  safeRef(intent.evidence_ref, 'intent.evidence_ref');
  if (intent.channel_id != null) safeRef(intent.channel_id, 'intent.channel_id');
}

function normalizeReadResult(result, intent) {
  assertPlainSafe(result, 'bridge.result');
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new TypeError('bridge result object required');
  if (result.company_id !== intent.company_id) throw new Error('SECURITY_INCIDENT:BRIDGE_RESULT_COMPANY_MISMATCH');
  if (result.collector_id !== intent.collector_id) throw new Error('POLICY_CONFLICT:BRIDGE_RESULT_COLLECTOR_MISMATCH');
  if (result.watch_type !== intent.watch_type) throw new Error('POLICY_CONFLICT:BRIDGE_RESULT_WATCH_MISMATCH');
  if (result.read_only !== true || result.external_write !== false || result.prod_publication !== false || result.token_export !== false || Number(result.spend_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:BRIDGE_RESULT_AUTHORITY_EXPANSION');
  }
  const observedAt = text(result.observed_at, 'bridge.result.observed_at', 80);
  if (Number.isNaN(Date.parse(observedAt))) throw new Error('bridge.result.observed_at invalid');
  const normalized = {
    company_id: intent.company_id,
    collector_id: intent.collector_id,
    watch_type: intent.watch_type,
    channel_id: result.channel_id ?? intent.channel_id,
    observed_at: new Date(observedAt).toISOString(),
    signal_count: Number.isSafeInteger(result.signal_count) && result.signal_count >= 0 ? result.signal_count : 0,
    evidence_ref: safeRef(result.evidence_ref ?? intent.evidence_ref, 'bridge.result.evidence_ref'),
    payload_ref: result.payload_ref == null ? null : safeRef(result.payload_ref, 'bridge.result.payload_ref'),
    read_only: true,
    external_side_effect_executed: false,
    write_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  };
  if (normalized.channel_id != null) normalized.channel_id = safeRef(normalized.channel_id, 'bridge.result.channel_id');
  return Object.freeze({...normalized, result_sha256: sha(normalized)});
}

export function createExistingReadBridge({company_id, invokeRead} = {}) {
  const companyId = text(company_id, 'company_id', 160);
  if (typeof invokeRead !== 'function') throw new TypeError('invokeRead function required');

  async function collect(intent) {
    validateIntent(intent, companyId);
    const boundedRequest = Object.freeze({
      company_id: companyId,
      collector_id: intent.collector_id,
      watch_type: intent.watch_type,
      channel_id: intent.channel_id,
      scope: intent.scope,
      cycle_id: intent.cycle_id,
      evidence_ref: intent.evidence_ref,
      environment: PREPROD,
      read_only: true,
      external_write: false,
      prod_publication: false,
      spend_eur: 0,
      token_export: false
    });
    const raw = await invokeRead(boundedRequest);
    return normalizeReadResult(raw, intent);
  }

  return Object.freeze({
    company_id: companyId,
    capability_id: CAPABILITY_ID,
    environment: PREPROD,
    version: VERSION,
    collect
  });
}

export function createWorkerAdapterFromExistingReadBridge({bridge, evidence_ref} = {}) {
  if (!bridge || typeof bridge.collect !== 'function') throw new TypeError('bridge with collect required');
  const evidenceRef = safeRef(evidence_ref, 'evidence_ref');
  return async function existingReadWorkerAdapter(workerInput) {
    assertPlainSafe(workerInput, 'workerInput');
    const intent = buildExistingReadIntent({
      company_id: workerInput.company_id,
      collector_id: workerInput.collector_id,
      watch_type: workerInput.watch_type,
      channel_id: workerInput.channel_id,
      scope: workerInput.scope ?? 'OWN_CONNECTED_READ_ONLY',
      cycle_id: workerInput.cycle_id,
      evidence_ref: evidenceRef
    });
    return bridge.collect(intent);
  };
}

export const EXISTING_READ_BRIDGE_V1_CONTRACT = Object.freeze({
  capability_id: CAPABILITY_ID,
  version: VERSION,
  environment: PREPROD,
  provider_neutral: true,
  hard_provider_dependency: false,
  external_credentials_exported: false,
  read_only: true,
  external_write: false,
  prod_publication: false,
  spend_eur: 0,
  trading_access: false,
  purpose: 'WRAP_ALREADY_CONNECTED_READ_ROUTES_WITHOUT_COPYING_CREDENTIALS_OR_GRANTING_PROVIDER_WRITE_AUTHORITY'
});
