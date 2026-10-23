import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createEnvAesGcmBrowserSessionResolver,decryptBrowserSessionEnvelope,getBrowserSessionSecretResolverContract} from '../runtime/browser-session-secret-resolver-v1.mjs';

function envelopeFor(storageState,key) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const plaintext=Buffer.from(JSON.stringify(storageState),'utf8');
  const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  const tag=cipher.getAuthTag();
  plaintext.fill(0);
  return JSON.stringify({
    schema_version:'1.0.0',algorithm:'AES-256-GCM',
    iv_b64:iv.toString('base64'),tag_b64:tag.toString('base64'),ciphertext_b64:ciphertext.toString('base64')
  });
}

test('AES-GCM resolver decrypts synthetic storage state without exposing plaintext contractually',async()=>{
  const key=crypto.randomBytes(32);
  const storageState={cookies:[{name:'synthetic',value:'secret'}],origins:[]};
  const env={CEREBRO_TEST_SESSION:envelopeFor(storageState,key)};
  const resolver=createEnvAesGcmBrowserSessionResolver({env,key_b64:key.toString('base64')});
  const r=await resolver('env://CEREBRO_TEST_SESSION');
  assert.deepEqual(r.storage_state,storageState);
  assert.equal(r.secret_ref,'env://CEREBRO_TEST_SESSION');
  assert.equal(r.secret_material_logged,false);
});

test('wrong AES-GCM key fails closed as decryption failure',()=>{
  const key=crypto.randomBytes(32);
  const wrong=crypto.randomBytes(32);
  const envelope=envelopeFor({cookies:[],origins:[]},key);
  assert.throws(()=>decryptBrowserSessionEnvelope({envelope,key_b64:wrong.toString('base64')}),/SESSION_SECRET_DECRYPTION_FAILED/);
});

test('resolver only permits explicit env references and refuses missing material',async()=>{
  const key=crypto.randomBytes(32).toString('base64');
  const resolver=createEnvAesGcmBrowserSessionResolver({env:{},key_b64:key});
  await assert.rejects(()=>resolver('file:///tmp/secret.json'),/SESSION_SECRET_REFERENCE_SCHEME_DENIED/);
  await assert.rejects(()=>resolver('env://MISSING_SECRET'),/SESSION_SECRET_NOT_AVAILABLE/);
});

test('resolver contract is zero-cost and forbids repository plaintext',()=>{
  const c=getBrowserSessionSecretResolverContract();
  assert.equal(c.algorithm,'AES-256-GCM');
  assert.equal(c.incremental_cost_eur,0);
  assert.equal(c.plaintext_secret_in_repository_allowed,false);
  assert.equal(c.decrypted_secret_logging_allowed,false);
});
