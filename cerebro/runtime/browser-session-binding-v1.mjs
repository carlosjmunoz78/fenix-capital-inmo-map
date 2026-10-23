const SESSION_SCHEMA_VERSION = '1.0.0';
const DEFAULT_MAX_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_${name}`);
  return value;
}

function asTime(value) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : NaN;
}

function normalizedOrigin(value) {
  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

function base(bundle = {}) {
  return {
    schema_version: SESSION_SCHEMA_VERSION,
    bundle_id: bundle.bundle_id ?? null,
    company_id: bundle.company_id ?? null,
    identity_id: bundle.identity_id ?? null,
    environment: bundle.environment ?? null,
    version: bundle.version ?? null,
    session_binding_authorized: false,
    secret_material_exposed: false,
    authority_created_by_session_binding: false,
    status: 'HOLD_INVALID_SESSION_BINDING'
  };
}

export function evaluateBrowserSessionBinding({
  bundle = {},
  request = {},
  now = Date.now(),
  max_ttl_ms = DEFAULT_MAX_TTL_MS
} = {}) {
  const result = base(bundle);

  required(request.company_id, 'COMPANY_ID');
  required(request.identity_id, 'IDENTITY_ID');
  required(request.environment, 'ENVIRONMENT');
  required(request.browser_profile_id, 'BROWSER_PROFILE_ID');
  required(request.target_url, 'TARGET_URL');

  if (bundle.schema_version !== SESSION_SCHEMA_VERSION) return Object.freeze({...result, status:'HOLD_SESSION_SCHEMA_MISMATCH'});
  if (bundle.company_id !== request.company_id) return Object.freeze({...result, status:'HOLD_SESSION_COMPANY_MISMATCH'});
  if (bundle.identity_id !== request.identity_id) return Object.freeze({...result, status:'HOLD_SESSION_IDENTITY_MISMATCH'});
  if (bundle.environment !== request.environment) return Object.freeze({...result, status:'HOLD_SESSION_ENVIRONMENT_MISMATCH'});
  if (bundle.revoked === true) return Object.freeze({...result, status:'HOLD_SESSION_REVOKED'});

  const issuedAt = asTime(bundle.issued_at);
  const expiresAt = asTime(bundle.expires_at);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    return Object.freeze({...result, status:'HOLD_SESSION_TTL_INVALID'});
  }
  if (issuedAt > now + 60_000) return Object.freeze({...result, status:'HOLD_SESSION_NOT_YET_VALID'});
  if (expiresAt <= now) return Object.freeze({...result, status:'HOLD_SESSION_EXPIRED'});
  if (Number.isFinite(max_ttl_ms) && max_ttl_ms > 0 && expiresAt - issuedAt > max_ttl_ms) {
    return Object.freeze({...result, status:'HOLD_SESSION_TTL_EXCEEDS_POLICY'});
  }

  if (bundle.transport?.encrypted !== true || bundle.transport?.plaintext_secret_material === true) {
    return Object.freeze({...result, status:'HOLD_SESSION_TRANSPORT_NOT_ENCRYPTED'});
  }
  if (!bundle.transport?.secret_ref || typeof bundle.transport.secret_ref !== 'string') {
    return Object.freeze({...result, status:'HOLD_SESSION_SECRET_REFERENCE_MISSING'});
  }

  if (bundle.attestation?.fresh !== true || !bundle.attestation?.fingerprint) {
    return Object.freeze({...result, status:'HOLD_SESSION_ATTESTATION_NOT_FRESH'});
  }
  if (bundle.attestation?.bound_profile_id !== request.browser_profile_id) {
    return Object.freeze({...result, status:'HOLD_SESSION_PROFILE_MISMATCH'});
  }

  const requestOrigin = normalizedOrigin(request.target_url);
  const allowedOrigins = Array.isArray(bundle.allowed_origins)
    ? bundle.allowed_origins.map(normalizedOrigin).filter(Boolean)
    : [];
  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    return Object.freeze({...result, status:'HOLD_SESSION_ORIGIN_DENIED'});
  }

  return Object.freeze({
    ...result,
    status:'AUTHORIZED',
    session_binding_authorized:true,
    secret_material_exposed:false,
    authority_created_by_session_binding:false,
    target_origin:requestOrigin,
    expires_at:new Date(expiresAt).toISOString(),
    attestation_fingerprint:String(bundle.attestation.fingerprint)
  });
}

export function getBrowserSessionBindingDefaults() {
  return Object.freeze({
    schema_version: SESSION_SCHEMA_VERSION,
    max_ttl_ms: DEFAULT_MAX_TTL_MS,
    plaintext_secrets_allowed: false,
    cross_company_allowed: false,
    cross_identity_allowed: false,
    cross_environment_allowed: false,
    exact_origin_allowlist_required: true,
    fresh_attestation_required: true,
    external_or_encrypted_secret_reference_required: true
  });
}
