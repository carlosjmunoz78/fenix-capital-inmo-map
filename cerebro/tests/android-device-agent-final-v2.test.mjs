import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../android-worker-final-v2/',import.meta.url);
const manifest=fs.readFileSync(new URL('AndroidManifest.xml',root),'utf8');
const exec=fs.readFileSync(new URL('src/es/cerebro/worker/preprod/CommandExecutor.java',root),'utf8');
const transport=fs.readFileSync(new URL('src/es/cerebro/worker/preprod/TransportService.java',root),'utf8');
const journal=fs.readFileSync(new URL('src/es/cerebro/worker/preprod/CommandJournal.java',root),'utf8');
const boot=fs.readFileSync(new URL('src/es/cerebro/worker/preprod/BootReceiver.java',root),'utf8');
const selector=fs.readFileSync(new URL('src/es/cerebro/worker/preprod/NodeSelector.java',root),'utf8');
const policy=fs.readFileSync(new URL('src/es/cerebro/worker/preprod/PolicyGuard.java',root),'utf8');
const callReq=fs.readFileSync(new URL('CALL_AUDIO_REQUIREMENTS.md',root),'utf8');

test('Final V2 is a separate durable package and preserves rollback',()=>{
  assert.match(manifest,/package="es\.cerebro\.agent"/);
  assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);
  assert.match(boot,/DeviceState\.activated/);
  assert.equal(manifest.includes('REQUEST_INSTALL_PACKAGES'),false);
  assert.equal(manifest.includes('READ_SMS'),false);
  assert.equal(manifest.includes('READ_CONTACTS'),false);
  assert.equal(manifest.includes('READ_CALL_LOG'),false);
});

test('universal human-like gestures and semantic selectors are present',()=>{
  for(const a of ['LONG_PRESS','DOUBLE_TAP','SWIPE','DRAG','CLICK_SELECTOR','LONG_CLICK_SELECTOR','NODE_ACTION','WAIT_FOR_SELECTOR','WAIT_FOR_PACKAGE']) assert.ok(exec.includes(a),a);
  for(const key of ['view_id','text_contains','desc_contains','class','package','long_clickable','LOW_CONFIDENCE_AMBIGUOUS_SELECTOR']) assert.ok(selector.includes(key),key);
});

test('execution dispatch is not treated as semantic success',()=>{
  assert.match(exec,/semantic_verified/);
  assert.match(exec,/postcondition/);
  assert.match(transport,/executionOk/);
  assert.match(transport,/semanticVerified/);
  assert.match(transport,/GatewayClient\.storeResult\(this,id,semanticVerified,result\)/);
});

test('idempotency uses durable SQLite journal plus payload hash',()=>{
  assert.match(journal,/SQLiteOpenHelper/);
  assert.match(journal,/command_id TEXT PRIMARY KEY/);
  assert.match(transport,/payloadHash/);
  assert.match(transport,/COMMAND_ID_PAYLOAD_HASH_MISMATCH/);
});

test('PREPROD fail-closed high-risk kernel remains in force',()=>{
  assert.match(policy,/KILL_SWITCH_ACTIVE/);
  assert.match(policy,/ENVIRONMENT_DENIED/);
  assert.match(policy,/HUMAN_REQUIRED_HIGH_RISK/);
  assert.match(policy,/payment/);
  assert.match(policy,/credential/);
  assert.match(policy,/signature/);
  assert.match(policy,/security/);
});

test('call intelligence and voice-message acceptance are mandatory but adapter-based',()=>{
  assert.match(callReq,/OEM_NATIVE_CALL_RECORDER/);
  assert.match(callReq,/MANAGED_TELEPHONY_OR_VOIP/);
  assert.match(callReq,/APPROVED_THIRD_PARTY_RECORDER/);
  assert.match(callReq,/DEGRADED_MIC_ONLY/);
  assert.match(callReq,/WhatsApp/);
  assert.match(callReq,/Telegram/);
  assert.match(callReq,/transcription/i);
});
