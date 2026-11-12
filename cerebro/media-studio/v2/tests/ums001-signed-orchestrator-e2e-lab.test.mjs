import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {buildScheduledPayload,signScheduledPayload,runScheduledOnce,ONCE_KEY,
 SIGNATURE_KEY_ID,ORDER_ID} from '../cloudflare/ums001-signed-orchestrator-lab-eu/core.mjs';
import orchestrator from '../cloudflare/ums001-signed-orchestrator-lab-eu/worker.mjs';
import {verifyScheduledCommand,acceptSignedCommand,SIGNED_QUEUE}
 from '../cloudflare/ums001-signed-qa-receiver-lab-eu/core.mjs';
import receiver from '../cloudflare/ums001-signed-qa-receiver-lab-eu/worker.mjs';
import {validateImageQaOrder}
 from '../cloudflare/ums001-image-qa-shadow-lab-eu/worker.mjs';
const TEST_TIME=Date.parse('2026-11-12T00:30:00.000Z');
const TEST_NONCE='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const manifest={archive_drive_file_id:'LAB_SYNTHETIC_ARCHIVE_REF_A_20261112',
 archive_zip_sha256:'11104a4e711bc4e220b6650a5bb320f84239a6f680460055216f7a300dc8ef24',
 archive_zip_bytes:100650,
 image_sha256:'5e65cfc30f9cdee5c8e9a93942d05e85a3f1e362d66fd623689525b8b7b2e170',
 image_bytes:99552,image_type:'image/webp',
 source_qa_zip_sha256:'e71ce6c5481ba8d37b74ffb745f425454a08dfa9fe53d975df5a002e1b7f848e',
 source_qa_drive_file_id:'LAB_SYNTHETIC_QA_REF_B_20261112'};
const live={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
 provider:'met',kind:'images',mode:'METADATA_ONLY',cost_eur:0,production_approved:false,
 publish_authorized:false,downloaded:false,status:'CACHED_CANDIDATES_FOR_QA',results:[]};
async function keys(){
 const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const priv=Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64');
 const pub=Buffer.from(await crypto.subtle.exportKey('spki',pair.publicKey)).toString('base64');
 return {priv,pub};
}
function createStore(){
 const data=new Map();let writes=0;
 return {data,async get(key){const t=data.get(key);return t?JSON.parse(t):null},
 async put(key,value){writes++;data.set(key,value)},
 get writes(){return writes}};
}
function environment(pair){
 const sent=[],out=[],called=[],replay=createStore(),once=createStore();
 return {SCHEDULE_ENABLED:'true',SCHEDULE_MODE:'QA_ONE_SHOT_ONLY',
 ORCH_SIGNER_PRIVATE_PKCS8_BASE64:pair.priv,ONCE_KV:once,
 SIGNED_COMMAND_QUEUE:{async send(v){sent.push(v)}},
 SIGNED_SENDER_ENABLED:'true',ORCH_PUBLIC_SPKI_BASE64:pair.pub,
 SIGNED_REPLAY_KV:replay,
 SENDER_ENABLED:'true',PRIVATE_ARCHIVE_MANIFEST:JSON.stringify(manifest),
 CEREBRO_PRODUCER:{async latest(x){called.push(x);return live}},
 QA_QUEUE:{async send(x){out.push(x)}},
 _sent:sent,_out:out,_called:called,_once:once,_replay:replay};
}
function eSource(env,time=TEST_TIME,nonce=TEST_NONCE){
 return signScheduledPayload(buildScheduledPayload(time,nonce),env.ORCH_SIGNER_PRIVATE_PKCS8_BASE64);
}
test('can sign true Ed25519 and verify independently pinned SPKI',async()=>{
 const p=await keys(),env=environment(p),e=await eSource(env);
 assert.equal(e.schema_version,2);assert.equal(e.key_id,SIGNATURE_KEY_ID);
 const check=await verifyScheduledCommand(e,env,TEST_TIME);
 assert.equal(check.issuer,'cerebro-ums001-signed-orchestrator-lab-eu');
 assert.equal(check.command.order_id,ORDER_ID);
 assert.equal(Object.keys(check.command).length,9);
 assert.equal(Object.keys(e.payload).length,13);
});
test('real signed origin passes only QA-only CEREBRO private gateway and queue',async()=>{
 const p=await keys(),env=environment(p);
 const r=await acceptSignedCommand(await eSource(env),env,TEST_TIME);
 assert.equal(r.status,'ED25519_CEREBRO_ORIGIN_VERIFIED_TO_QA_QUEUE');
 assert.equal(r.queued,1);assert.equal(env._out.length,1);
 assert.equal(env._called.length,1);
 assert.equal(env._called[0].environment,'LAB');
 validateImageQaOrder(env._out[0]);
 for(const flag of ['rights_approved','editorial_approved','publish_enabled',
 'video_enabled','paid_execution_enabled','production_enabled','delivery_allowed'])
  assert.equal(env._out[0][flag],false);
 assert.equal(r.image_bytes_verified,false);assert.equal(r.signed_destination_receipt,false);
});
test('duplicate signed nonce cannot send another event or make a paid call',async()=>{
 const p=await keys(),env=environment(p),signed=await eSource(env);
 await acceptSignedCommand(signed,env,TEST_TIME);
 const r=await acceptSignedCommand(signed,env,TEST_TIME);
 assert.equal(r.status,'SIGNED_REPLAY_BLOCKED_NO_SEND');
 assert.equal(env._out.length,1);assert.equal(env._called.length,1);
 assert.equal(env._replay.data.size,1);
});
test('unsigned old V1 command cannot enter signed path',async()=>{
 const p=await keys(),env=environment(p);
 await assert.rejects(acceptSignedCommand(buildScheduledPayload(TEST_TIME,TEST_NONCE),env,TEST_TIME),/SIGNED_ENVELOPE_SCHEMA/);
 assert.equal(env._out.length,0);assert.equal(env._replay.data.size,0);
});
test('spoofing actor_id despite retaining signature is rejected',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 s.payload.actor_id='attacker';
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME),/SIGNED_SCOPE/);
 assert.equal(env._replay.data.size,0);
});
test('tampered signed order id cannot swap target',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 s.payload.order_id='UMS001-LAB-LI-FEED-01-ARCHIVE-20261117';
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME),/SIGNED_SIGNATURE_INVALID/);
 assert.equal(env._out.length,0);
});
test('original signature cannot be reused for a modified paid/PROD request',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 for(const addition of [{production_enabled:true},{paid_execution_enabled:true},{publish_enabled:true},{video_enabled:true}]){
  const t=structuredClone(s);Object.assign(t.payload,addition);
  await assert.rejects(acceptSignedCommand(t,env,TEST_TIME),/SIGNED_PAYLOAD_SCHEMA/);
 }
 assert.equal(env._out.length,0);
});
test('completely different asymmetric key fails pinned identity',async()=>{
 const trusted=await keys(),attacker=await keys(),env=environment(trusted);
 const s=await signScheduledPayload(buildScheduledPayload(TEST_TIME,TEST_NONCE),attacker.priv);
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME),/SIGNED_SIGNATURE_INVALID/);
});
test('revoked or missing trust anchor fails closed before sending',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 env.ORCH_PUBLIC_SPKI_BASE64='';
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME),/TRUST_NOT_CONFIGURED/);
 assert.equal(env._out.length,0);
});
test('wrong key-id is rejected before cryptographic processing',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);s.key_id='STOLEN_KEY_ID';
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME),/SIGNED_ENVELOPE_SCHEMA_OR_KID/);
});
test('expired 3-minute signature is not forwarded',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME+190000),/SIGNED_TIME_EXPIRED_OR_INVALID/);
 assert.equal(env._out.length,0);
});
test('future timestamp beyond drift denied',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 await assert.rejects(acceptSignedCommand(s,env,TEST_TIME-31000),/SIGNED_TIME_EXPIRED_OR_INVALID/);
});
test('no public URL, query or arbitrary image variant accepted',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 for(const extra of [{url:'https://evil.invalid'},{image_sha256:'f'.repeat(64)},{consumer_engine_id:'SOC-001'}]){
  const t=structuredClone(s);Object.assign(t.payload,extra);
  await assert.rejects(acceptSignedCommand(t,env,TEST_TIME),/SIGNED_PAYLOAD_SCHEMA/);
 }
});
test('forged signature base64 and empty nonce denied',async()=>{
 const p=await keys(),env=environment(p),s=await eSource(env);
 const t=structuredClone(s);t.signature='abc';
 await assert.rejects(acceptSignedCommand(t,env,TEST_TIME),/SIGNED_SIGNATURE_ENCODING/);
 const t2=structuredClone(s);t2.payload.nonce='';
 await assert.rejects(acceptSignedCommand(t2,env,TEST_TIME),/SIGNED_IDENTITY/);
});
test('only scoped CEREBRO LAB company and engine can issue signed payload',async()=>{
 const p=await keys(),env=environment(p);
 for(const x of ['PROD','STAGING']){
  const s=await eSource(env);s.payload.environment=x;
  await assert.rejects(acceptSignedCommand(s,env,TEST_TIME),/SIGNED_SCOPE_environment/);
 }
});
test('native scheduled trigger builds and pushes exactly one signed envelope',async()=>{
 const p=await keys(),env=environment(p);
 const event={cron:'* * * * *',scheduledTime:TEST_TIME};
 const r=await runScheduledOnce(event,env);
 assert.equal(r.status,'SCHEDULED_SIGNED_QA_COMMAND_SENT');
 assert.equal(env._sent.length,1);
 assert.equal(env._once.data.size,1);
 assert.equal(JSON.parse(env._once.data.get(ONCE_KEY)).status,'SIGNED_COMMAND_SENT');
 await verifyScheduledCommand(env._sent[0],env,TEST_TIME);
});
test('one-shot scheduled job cannot send same image command twice',async()=>{
 const p=await keys(),env=environment(p),event={cron:'* * * * *',scheduledTime:TEST_TIME};
 await runScheduledOnce(event,env);
 const again=await runScheduledOnce(event,env);
 assert.equal(again.sent,0);assert.equal(env._sent.length,1);
});
test('scheduler called from unknown cron cannot originate signature',async()=>{
 const p=await keys(),env=environment(p);
 await assert.rejects(runScheduledOnce({cron:'0 * * * *',scheduledTime:TEST_TIME},env),/UNEXPECTED_CRON/);
 assert.equal(env._sent.length,0);
});
test('schedule disabled prevents all sends',async()=>{
 const p=await keys(),env=environment(p);env.SCHEDULE_ENABLED='false';
 await assert.rejects(runScheduledOnce({cron:'* * * * *',scheduledTime:TEST_TIME},env),/DISABLED/);
 assert.equal(env._sent.length,0);
});
test('schedule outside authorized one-shot date is inert',async()=>{
 const p=await keys(),env=environment(p);
 const r=await runScheduledOnce({cron:'* * * * *',scheduledTime:Date.parse('2026-11-14T00:00:00Z')},env);
 assert.equal(r.sent,0);assert.equal(env._once.data.size,0);
});
test('missing signer cannot create message and leaves claimed fail-closed audit',async()=>{
 const p=await keys(),env=environment(p);delete env.ORCH_SIGNER_PRIVATE_PKCS8_BASE64;
 await assert.rejects(runScheduledOnce({cron:'* * * * *',scheduledTime:TEST_TIME},env),/PRIVATE_SIGNING_KEY_MISSING/);
 assert.equal(env._sent.length,0);assert.equal(env._once.data.size,1);
 const again=await runScheduledOnce({cron:'* * * * *',scheduledTime:TEST_TIME},env);
 assert.equal(again.sent,0);
});
test('queue outage leaves one claimed state, never retries automatically into duplicate',async()=>{
 const p=await keys(),env=environment(p);
 env.SIGNED_COMMAND_QUEUE.send=async()=>{throw Error('QUEUE_DOWN')};
 await assert.rejects(runScheduledOnce({cron:'* * * * *',scheduledTime:TEST_TIME},env),/QUEUE_DOWN/);
 const once=JSON.parse(env._once.data.get(ONCE_KEY));assert.equal(once.status,'CLAIMED');
 const r=await runScheduledOnce({cron:'* * * * *',scheduledTime:TEST_TIME},env);
 assert.equal(r.sent,0);
});
test('receiver must have a replay database to release any QA metadata',async()=>{
 const p=await keys(),env=environment(p);delete env.SIGNED_REPLAY_KV;
 await assert.rejects(acceptSignedCommand(await eSource(env),env,TEST_TIME),/REPLAY_STORE_MISSING/);
 assert.equal(env._out.length,0);
});
test('receiver fail-closed if gateway denied, with claimed replay record',async()=>{
 const p=await keys(),env=environment(p);
 env.CEREBRO_PRODUCER.latest=async()=>{throw Error('GATEWAY_DOWN')};
 const signed=await eSource(env);
 await assert.rejects(acceptSignedCommand(signed,env,TEST_TIME),/GATEWAY_DOWN/);
 assert.equal(env._replay.data.size,1);
 const r=await acceptSignedCommand(signed,env,TEST_TIME);
 assert.equal(r.status,'SIGNED_REPLAY_BLOCKED_NO_SEND');
 assert.equal(env._out.length,0);
});
test('receive queue rejects wrong name without attempting message processing',async()=>{
 const p=await keys(),env=environment(p);
 await assert.rejects(receiver.queue({queue:'cerebro-ums001-image-sender-command-lab-eu',messages:[]},env),/WRONG_QUEUE_OR_BATCH/);
});
test('orchestrator and receiver fetch are both 404 without open endpoints',async()=>{
 assert.equal((await orchestrator.fetch()).status,404);
 assert.equal((await receiver.fetch()).status,404);
});
test('real queue handler accepts signed command, then acknowledges',async()=>{
 const p=await keys(),env=environment(p),now=Date.now();
 const draft=buildScheduledPayload(TEST_TIME,TEST_NONCE);
 draft.issued_at=new Date(now).toISOString();draft.expires_at=new Date(now+180000).toISOString();
 const signed=await signScheduledPayload(draft,p.priv);
 let ack=0,retry=0;
 await receiver.queue({queue:SIGNED_QUEUE,messages:[{body:signed,ack(){ack++},retry(){retry++}}]},env);
 assert.equal(ack,1);assert.equal(retry,0);assert.equal(env._out.length,1);
});
test('real queue handler dismisses tampered signature without requeue loop',async()=>{
 const p=await keys(),env=environment(p),now=Date.now();
 const draft=buildScheduledPayload(TEST_TIME,TEST_NONCE);
 draft.issued_at=new Date(now).toISOString();draft.expires_at=new Date(now+180000).toISOString();
 const signed=await signScheduledPayload(draft,p.priv);signed.payload.engine_id='UMS-002';
 let ack=0,retry=0;const log=console.error;console.error=()=>{};
 try{await receiver.queue({queue:SIGNED_QUEUE,messages:[{body:signed,ack(){ack++},retry(){retry++}}]},env)}
 finally{console.error=log}
 assert.equal(ack,1);assert.equal(retry,0);assert.equal(env._out.length,0);
});
