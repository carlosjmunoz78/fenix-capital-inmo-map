import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {decryptSessionBundle,encryptSessionBundle,BROWSER_SESSION_BUNDLE_V1_CONTRACT} from './browser-session-bundle-v1.mjs';

const sample={
  cookies:[{name:'sid',value:'secret-cookie-value',domain:'.example.test',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'}],
  origins:[{origin:'https://example.test',localStorage:[{name:'workspace',value:'fenix'}]}]
};

test('session bundle encrypt/decrypt roundtrip',()=>{
  const key=crypto.randomBytes(32);
  const encrypted=encryptSessionBundle(sample,key);
  assert.notEqual(encrypted.ciphertext,JSON.stringify(sample));
  assert.equal(encrypted.cookie_count,1);
  assert.equal(encrypted.origin_count,1);
  const restored=decryptSessionBundle(encrypted.ciphertext,encrypted.iv,key,encrypted.sha256);
  assert.deepEqual(restored.storage_state,sample);
  assert.equal(restored.sha256,encrypted.sha256);
});

test('tampered ciphertext is rejected',()=>{
  const key=crypto.randomBytes(32);
  const encrypted=encryptSessionBundle(sample,key);
  const bytes=Buffer.from(encrypted.ciphertext,'base64');
  bytes[0]^=1;
  assert.throws(()=>decryptSessionBundle(bytes.toString('base64'),encrypted.iv,key,encrypted.sha256));
});

test('wrong encryption key is rejected',()=>{
  const encrypted=encryptSessionBundle(sample,crypto.randomBytes(32));
  assert.throws(()=>decryptSessionBundle(encrypted.ciphertext,encrypted.iv,crypto.randomBytes(32),encrypted.sha256));
});

test('invalid key length is rejected',()=>{
  assert.throws(()=>encryptSessionBundle(sample,Buffer.alloc(31)),/SESSION_BUNDLE_KEY_INVALID/);
});

test('oversized plaintext is rejected',()=>{
  const huge={cookies:[],origins:[{origin:'https://example.test',localStorage:[{name:'x',value:'x'.repeat(BROWSER_SESSION_BUNDLE_V1_CONTRACT.max_plaintext_bytes+1024)}]}]};
  assert.throws(()=>encryptSessionBundle(huge,crypto.randomBytes(32)),/STORAGE_STATE_TOO_LARGE/);
});

test('contract excludes virtual WebAuthn private credentials',()=>{
  assert.equal(BROWSER_SESSION_BUNDLE_V1_CONTRACT.virtual_webauthn_credentials,false);
  assert.equal(BROWSER_SESSION_BUNDLE_V1_CONTRACT.raw_secret_logging,false);
  assert.equal(BROWSER_SESSION_BUNDLE_V1_CONTRACT.incremental_cost_eur,0);
});
