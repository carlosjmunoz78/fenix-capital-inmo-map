import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_STORAGE_STATE_BYTES = 5 * 1024 * 1024;
let chromiumRuntime = null;

async function chromium() {
  if (chromiumRuntime) return chromiumRuntime;
  const playwright = await import('@playwright/test');
  if (!playwright.chromium) throw new Error('CHROMIUM_EXPORT_MISSING');
  chromiumRuntime = playwright.chromium;
  return chromiumRuntime;
}

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_${name}`);
  return value;
}

function safeSegment(value) {
  return String(value ?? '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function profileDirFor(browserProfileId, profilesRoot = process.env.CEREBRO_BROWSER_PROFILES_ROOT || '.cerebro/browser-profiles') {
  return path.resolve(profilesRoot, safeSegment(required(browserProfileId, 'BROWSER_PROFILE_ID')));
}

function validateState(storageState) {
  if (!storageState || typeof storageState !== 'object' || Array.isArray(storageState)) throw new Error('INVALID_STORAGE_STATE');
  if (!Array.isArray(storageState.cookies)) throw new Error('INVALID_STORAGE_STATE_COOKIES');
  if (!Array.isArray(storageState.origins)) throw new Error('INVALID_STORAGE_STATE_ORIGINS');
  const serialized = JSON.stringify(storageState);
  const bytes = Buffer.byteLength(serialized, 'utf8');
  if (bytes > MAX_STORAGE_STATE_BYTES) throw new Error('STORAGE_STATE_TOO_LARGE');
  return {serialized, bytes, cookie_count:storageState.cookies.length, origin_count:storageState.origins.length};
}

function launchOptions(channel = process.env.CEREBRO_BROWSER_CHANNEL || '') {
  const value = String(channel || '').trim();
  return value ? {channel:value} : {};
}

export async function exportProfileStorageState({browser_profile_id, profiles_root, channel} = {}) {
  const profileDir = profileDirFor(browser_profile_id, profiles_root);
  await fs.mkdir(profileDir, {recursive:true});
  const engine = await chromium();
  const context = await engine.launchPersistentContext(profileDir, {
    headless:true,
    acceptDownloads:false,
    locale:'es-ES',
    timezoneId:'Europe/Madrid',
    viewport:{width:1440,height:1000},
    ...launchOptions(channel)
  });
  try {
    const storage_state = await context.storageState({indexedDB:true, credentials:false});
    const checked = validateState(storage_state);
    return Object.freeze({
      storage_state,
      byte_length:checked.bytes,
      cookie_count:checked.cookie_count,
      origin_count:checked.origin_count,
      sha256:crypto.createHash('sha256').update(checked.serialized).digest('hex')
    });
  } finally {
    await context.close().catch(()=>{});
  }
}

export async function restoreProfileStorageState({browser_profile_id, storage_state, profiles_root, channel} = {}) {
  const checked = validateState(storage_state);
  const profileDir = profileDirFor(browser_profile_id, profiles_root);
  await fs.mkdir(profileDir, {recursive:true});
  const engine = await chromium();
  const context = await engine.launchPersistentContext(profileDir, {
    headless:true,
    acceptDownloads:false,
    locale:'es-ES',
    timezoneId:'Europe/Madrid',
    viewport:{width:1440,height:1000},
    ...launchOptions(channel)
  });
  try {
    if (typeof context.setStorageState !== 'function') throw new Error('PLAYWRIGHT_SET_STORAGE_STATE_UNAVAILABLE');
    await context.setStorageState(storage_state);
    return Object.freeze({
      restored:true,
      byte_length:checked.bytes,
      cookie_count:checked.cookie_count,
      origin_count:checked.origin_count,
      sha256:crypto.createHash('sha256').update(checked.serialized).digest('hex')
    });
  } finally {
    await context.close().catch(()=>{});
  }
}

export function encryptSessionBundle(storageState, keyBuffer) {
  const checked = validateState(storageState);
  if (!Buffer.isBuffer(keyBuffer) || keyBuffer.length !== 32) throw new Error('SESSION_BUNDLE_KEY_INVALID');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const body = Buffer.concat([cipher.update(Buffer.from(checked.serialized,'utf8')), cipher.final()]);
  const packed = Buffer.concat([body, cipher.getAuthTag()]);
  return Object.freeze({
    ciphertext:packed.toString('base64'),
    iv:iv.toString('base64'),
    sha256:crypto.createHash('sha256').update(checked.serialized).digest('hex'),
    cookie_count:checked.cookie_count,
    origin_count:checked.origin_count,
    byte_length:checked.bytes
  });
}

export function decryptSessionBundle(ciphertextB64, ivB64, keyBuffer, expectedSha256 = '') {
  if (!Buffer.isBuffer(keyBuffer) || keyBuffer.length !== 32) throw new Error('SESSION_BUNDLE_KEY_INVALID');
  const packed = Buffer.from(String(ciphertextB64 || ''),'base64');
  if (packed.length < 17) throw new Error('SESSION_BUNDLE_CIPHERTEXT_INVALID');
  const body = packed.subarray(0,-16);
  const tag = packed.subarray(-16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(String(ivB64 || ''),'base64'));
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  const sha256 = crypto.createHash('sha256').update(plain).digest('hex');
  if (expectedSha256 && sha256 !== expectedSha256) throw new Error('SESSION_BUNDLE_SHA256_MISMATCH');
  let storage_state;
  try { storage_state = JSON.parse(plain); } catch { throw new Error('SESSION_BUNDLE_JSON_INVALID'); }
  validateState(storage_state);
  return Object.freeze({storage_state, sha256});
}

export const BROWSER_SESSION_BUNDLE_V1_CONTRACT = Object.freeze({
  schema_version:'1.0.0',
  encryption:'AES-256-GCM',
  max_plaintext_bytes:MAX_STORAGE_STATE_BYTES,
  indexed_db:true,
  virtual_webauthn_credentials:false,
  raw_secret_logging:false,
  profile_scope:['company_id','environment','identity_id','account_id','browser_profile_id'],
  incremental_cost_eur:0
});
