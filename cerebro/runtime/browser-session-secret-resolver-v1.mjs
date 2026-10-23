import crypto from 'node:crypto';

const ENVELOPE_VERSION = '1.0.0';
const ALGORITHM = 'AES-256-GCM';
const ENV_REF = /^env:\/\/([A-Z][A-Z0-9_]{2,127})$/;

function decodeB64(value, name) {
  if (!value || typeof value !== 'string') throw new Error(`MISSING_${name}`);
  const out = Buffer.from(value, 'base64');
  if (!out.length) throw new Error(`INVALID_${name}`);
  return out;
}

function parseEnvelope(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('SESSION_SECRET_NOT_AVAILABLE');
  const text = raw.trim().startsWith('{') ? raw.trim() : Buffer.from(raw.trim(), 'base64').toString('utf8');
  let envelope;
  try { envelope = JSON.parse(text); }
  catch { throw new Error('SESSION_SECRET_ENVELOPE_INVALID'); }
  if (envelope.schema_version !== ENVELOPE_VERSION) throw new Error('SESSION_SECRET_ENVELOPE_VERSION_MISMATCH');
  if (envelope.algorithm !== ALGORITHM) throw new Error('SESSION_SECRET_ALGORITHM_DENIED');
  return envelope;
}

function validateStorageState(storageState) {
  if (!storageState || typeof storageState !== 'object' || Array.isArray(storageState)) throw new Error('SESSION_STORAGE_STATE_INVALID');
  if (storageState.cookies !== undefined && !Array.isArray(storageState.cookies)) throw new Error('SESSION_STORAGE_COOKIES_INVALID');
  if (storageState.origins !== undefined && !Array.isArray(storageState.origins)) throw new Error('SESSION_STORAGE_ORIGINS_INVALID');
  return storageState;
}

export function decryptBrowserSessionEnvelope({ envelope, key_b64 } = {}) {
  const parsed = typeof envelope === 'string' ? parseEnvelope(envelope) : envelope;
  if (!parsed || parsed.schema_version !== ENVELOPE_VERSION || parsed.algorithm !== ALGORITHM) {
    throw new Error('SESSION_SECRET_ENVELOPE_INVALID');
  }
  const key = decodeB64(key_b64, 'SESSION_KEY');
  if (key.length !== 32) throw new Error('SESSION_KEY_MUST_BE_32_BYTES');
  const iv = decodeB64(parsed.iv_b64, 'SESSION_IV');
  const tag = decodeB64(parsed.tag_b64, 'SESSION_TAG');
  const ciphertext = decodeB64(parsed.ciphertext_b64, 'SESSION_CIPHERTEXT');
  if (iv.length !== 12) throw new Error('SESSION_IV_MUST_BE_12_BYTES');
  if (tag.length !== 16) throw new Error('SESSION_TAG_MUST_BE_16_BYTES');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    if (parsed.aad_b64) decipher.setAAD(decodeB64(parsed.aad_b64, 'SESSION_AAD'));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const storageState = validateStorageState(JSON.parse(plaintext.toString('utf8')));
    plaintext.fill(0);
    return Object.freeze({ storage_state: storageState, algorithm: ALGORITHM });
  } catch (cause) {
    const error = new Error('SESSION_SECRET_DECRYPTION_FAILED');
    error.cause = cause;
    throw error;
  }
}

export function createEnvAesGcmBrowserSessionResolver({
  env = process.env,
  key_b64 = process.env.CEREBRO_BROWSER_SESSION_KEY_B64
} = {}) {
  return async function resolve(secretRef) {
    const match = ENV_REF.exec(String(secretRef || ''));
    if (!match) throw new Error('SESSION_SECRET_REFERENCE_SCHEME_DENIED');
    const variable = match[1];
    const rawEnvelope = env[variable];
    if (!rawEnvelope) throw new Error('SESSION_SECRET_NOT_AVAILABLE');
    const result = decryptBrowserSessionEnvelope({ envelope: rawEnvelope, key_b64 });
    return Object.freeze({
      ...result,
      secret_ref: `env://${variable}`,
      secret_material_logged: false
    });
  };
}

export function getBrowserSessionSecretResolverContract() {
  return Object.freeze({
    schema_version: ENVELOPE_VERSION,
    algorithm: ALGORITHM,
    secret_ref_scheme: 'env://',
    key_env: 'CEREBRO_BROWSER_SESSION_KEY_B64',
    plaintext_secret_in_repository_allowed: false,
    decrypted_secret_logging_allowed: false,
    incremental_cost_eur: 0
  });
}
