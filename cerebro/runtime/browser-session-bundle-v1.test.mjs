import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {decryptSessionBundle,decryptWorkspaceSnapshot,encryptSessionBundle,encryptWorkspaceSnapshot,BROWSER_SESSION_BUNDLE_V1_CONTRACT} from './browser-session-bundle-v1.mjs';

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

test('workspace snapshot keeps full tab context encrypted',()=>{
  const key=crypto.randomBytes(32);
  const snapshot={storage_state:sample,tabs:[{index:0,url:'https://example.test/path?private=1#section',title:'Workspace',active:true},{index:1,url:'https://example.test/second?token=abc',title:'Second',active:false}],active_tab_index:0};
  const encrypted=encryptWorkspaceSnapshot(snapshot,key);
  assert.equal(encrypted.tab_count,2);
  assert.equal(encrypted.ciphertext.includes('private=1'),false);
  assert.equal(encrypted.ciphertext.includes('token=abc'),false);
  const restored=decryptWorkspaceSnapshot(encrypted.ciphertext,encrypted.iv,key,encrypted.sha256);
  assert.equal(restored.snapshot.tabs[0].url,'https://example.test/path?private=1#section');
  assert.equal(restored.snapshot.tabs[1].url,'https://example.test/second?token=abc');
  assert.equal(restored.snapshot.active_tab_index,0);
  assert.deepEqual(restored.snapshot.storage_state,sample);
});

test('workspace snapshot rejects unsafe tab protocols',()=>{
  const key=crypto.randomBytes(32);
  assert.throws(()=>encryptWorkspaceSnapshot({storage_state:sample,tabs:[{url:'javascript:alert(1)'}],active_tab_index:0},key),/WORKSPACE_TAB_PROTOCOL_DENIED/);
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
  assert.equal(BROWSER_SESSION_BUNDLE_V1_CONTRACT.encrypted_tabs,true);
  assert.equal(BROWSER_SESSION_BUNDLE_V1_CONTRACT.incremental_cost_eur,0);
});
