import test from 'node:test';
import assert from 'node:assert/strict';
import {signNotionLabService,verifyNotionLabService} from '../notion-service-signature.mjs';
const secret=new Uint8Array(32).fill(127);
const wrong=new Uint8Array(32).fill(126);
const nonce='CEREBROOSFACT001NONCE20261110ABCD';
const orderRef='FACT001-OWNER-20261110-TEST-LAB';
const data=()=>({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',
 version:'1.0.0',client_id:'cerebro',source:'owner_order',owner_order_ref:orderRef,
 operation:'notion.lab.child.rename',page_id:'41481b1a-756d-8119-b1fa-c38a9d013a35'});
const mk=async(overrides={})=>{
 const timestamp=1794337000000;
 return signNotionLabService({secret,body:JSON.stringify(data()),timestamp,nonce,orderRef,...overrides});
};
const checker=()=>{const claimed=new Set();return {now:1794337000000,
 claimNonce:async ({nonce,orderRef})=>{const k=nonce+orderRef;if(claimed.has(k))return false;claimed.add(k);return true;},
 verifyOwnerOrder:async x=>x.operation==='notion.lab.child.rename'};};
test('valid 32 byte secret signs canonical scoped body and independently attested order',async()=>{
 const env=await mk(),services=checker();
 const verified=await verifyNotionLabService({secret,envelope:env,...services});
 assert.equal(verified.verified,true);
 assert.equal(verified.authority,'owner_signed_command');
 assert.equal(verified.provider_mutation_authorized,false);
 assert.equal(verified.credentials_exposed,false);
 assert.ok(!JSON.stringify(verified).includes(env.signature));
});
test('replay is rejected by durable nonce claim callback',async()=>{
 const env=await mk(),ctx=checker();
 assert.equal((await verifyNotionLabService({secret,envelope:env,...ctx})).verified,true);
 const retry=await verifyNotionLabService({secret,envelope:env,...ctx});
 assert.equal(retry.reason,'NONCE_REPLAY_OR_STORE_FAILURE');
});
test('wrong key or tampered body cannot proceed to nonce or owner check',async()=>{
 const env=await mk();let calls=0;
 const ctx={now:1794337000000,claimNonce:async()=>{calls++;return true;},verifyOwnerOrder:async()=>{calls++;return true;}};
 assert.equal((await verifyNotionLabService({secret:wrong,envelope:env,...ctx})).reason,'SIGNATURE_INVALID');
 assert.equal((await verifyNotionLabService({secret,envelope:{...env,body:env.body+'X'},...ctx})).reason,'SIGNATURE_INVALID');
 assert.equal(calls,0);
});
test('signature expiry rejects old and future envelopes before callbacks',async()=>{
 const env=await mk();const ctx=checker();
 assert.equal((await verifyNotionLabService({secret,envelope:env,...ctx,now:1794337060001})).reason,'SERVICE_SIGNATURE_EXPIRED');
 assert.equal((await verifyNotionLabService({secret,envelope:env,...ctx,now:1794336939999})).reason,'SERVICE_SIGNATURE_EXPIRED');
});
test('a signed service request is still rejected without external owner attestation',async()=>{
 const env=await mk(),ctx=checker();
 assert.equal((await verifyNotionLabService({secret,envelope:env,...ctx,verifyOwnerOrder:async()=>false})).reason,'OWNER_ORDER_NOT_ATTESTED');
});
test('a signed PROD or foreign-company command fails despite valid HMAC',async()=>{
 for(const changes of [{environment:'PROD'},{company_id:'other'}]){
  const env=await mk({body:JSON.stringify({...data(),...changes})});
  assert.equal((await verifyNotionLabService({secret,envelope:env,...checker()})).reason,'ORDER_SCOPE_DENIED');
 }
});
test('missing durable replay protection or owner verifier fails closed',async()=>{
 const env=await mk();
 const r=await verifyNotionLabService({secret,envelope:env});
 assert.equal(r.reason,'SERVICE_VERIFIER_NOT_READY');
});
test('malformed input and weak keys fail closed before signing',async()=>{
 await assert.rejects(()=>mk({secret:new Uint8Array(12)}),/KEY_INVALID/);
 await assert.rejects(()=>mk({nonce:'short'}),/SIGNING_INPUT_DENIED/);
 const env=await mk();
 assert.equal((await verifyNotionLabService({secret,envelope:{...env,evil:'x'},...checker()})).reason,'ENVELOPE_DENIED');
});
