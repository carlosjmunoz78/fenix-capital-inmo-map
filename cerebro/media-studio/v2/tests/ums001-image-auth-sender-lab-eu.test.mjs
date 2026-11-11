import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCommand,assertArchiveManifest,sendImageQaFromCerebro}
 from '../cloudflare/ums001-image-auth-sender-lab-eu/core.mjs';
import sender from '../cloudflare/ums001-image-auth-sender-lab-eu/worker.mjs';
import {validateImageQaOrder} from '../cloudflare/ums001-image-qa-shadow-lab-eu/worker.mjs';
const manifest={archive_drive_file_id:'LAB_SYNTHETIC_ARCHIVE_REF_A_20261112',
 archive_zip_sha256:'11104a4e711bc4e220b6650a5bb320f84239a6f680460055216f7a300dc8ef24',
 archive_zip_bytes:100650,
 image_sha256:'5e65cfc30f9cdee5c8e9a93942d05e85a3f1e362d66fd623689525b8b7b2e170',
 image_bytes:99552,image_type:'image/webp',
 source_qa_zip_sha256:'e71ce6c5481ba8d37b74ffb745f425454a08dfa9fe53d975df5a002e1b7f848e',
 source_qa_drive_file_id:'LAB_SYNTHETIC_QA_REF_B_20261112'};
const command={schema_version:1,actor_id:'cerebro-orchestrator-lab',
 company_id:'fenix',engine_id:'UMS-001',environment:'LAB',mode:'QA_METADATA_ONLY',
 action:'SUBMIT_ARCHIVED_LINKEDIN_QA',request_id:'UMS001-SENDER-REQ-LINKEDIN20261112',
 order_id:'UMS001-LAB-LI-FEED-01-ARCHIVE-20261113'};
const gatewayReply={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
 provider:'met',kind:'images',mode:'METADATA_ONLY',cost_eur:0,
 production_approved:false,publish_authorized:false,downloaded:false,
 status:'CACHED_CANDIDATES_FOR_QA',results:[]};
const mockEnv=()=>{const sent=[],called=[];return {
 SENDER_ENABLED:'true',PRIVATE_ARCHIVE_MANIFEST:JSON.stringify(manifest),
 CEREBRO_PRODUCER:{async latest(t){called.push(t);return {...gatewayReply}}},
 QA_QUEUE:{async send(x){sent.push(x)}},sent,called
}};
test('schema permits one scoped QA metadata command, no extras',()=>{
 assert.equal(assertCommand(command),command);
 assert.deepEqual(Object.keys(command).length,9);
});
test('archive is read from private configuration, not queue payload',async()=>{
 const e=mockEnv();
 const x=await sendImageQaFromCerebro(command,e);
 assert.equal(e.called.length,1);assert.equal(e.called[0].provider,'met');
 assert.equal(e.called[0].environment,'LAB');
 assert.equal(e.sent.length,1);
 assert.deepEqual(validateImageQaOrder(e.sent[0]),e.sent[0]);
 assert.equal(e.sent[0].image_sha256,manifest.image_sha256);
 assert.equal(e.sent[0].archive_drive_file_id,manifest.archive_drive_file_id);
 assert.equal(e.sent[0].consumer_engine_id,'UMS-QA-LAB');
 assert.equal(x.gateway_rpc_live,true);
 assert.equal(x.status,'CEREBRO_PRIVATE_RPC_VERIFIED_QA_MESSAGE_SUBMITTED');
 assert.equal(x.source_bytes_verified_here,false);
 assert.equal(x.delivered_to_qa_kv_confirmed,false);
});
test('rejects any injected public URL or own archive refs',async()=>{
 const e=mockEnv();
 await assert.rejects(sendImageQaFromCerebro({...command,image_url:'https://example.com'},e),/COMMAND_SCHEMA/);
 assert.equal(e.called.length,0);assert.equal(e.sent.length,0);
});
test('rejects client attempting to supply approval flag',async()=>{
 const e=mockEnv();
 await assert.rejects(sendImageQaFromCerebro({...command,publish_enabled:true},e),/COMMAND_SCHEMA/);
 assert.equal(e.called.length,0);assert.equal(e.sent.length,0);
});
test('rejects PROD, other tenants, other engine, different actor',async()=>{
 for(const change of [{company_id:'evil'},{environment:'PROD'},
 {engine_id:'UMS-002'},{actor_id:'third-party'},{mode:'PAID'},{action:'PUBLISH'}]){
  const e=mockEnv();
  await assert.rejects(sendImageQaFromCerebro({...command,...change},e),/COMMAND_SCOPE/);
  assert.equal(e.sent.length,0);assert.equal(e.called.length,0);
 }
});
test('rejects bad IDs or unexpected item-specific order ID',async()=>{
 for(const changes of [{request_id:'x'},{order_id:'IG-STORY-01'},
 {order_id:'UMS001-LAB-IG-FEED-01-ARCHIVE-20261113'}]){
  const e=mockEnv();
  await assert.rejects(sendImageQaFromCerebro({...command,...changes},e),/COMMAND_IDENTITY/);
  assert.equal(e.sent.length,0);
 }
});
test('rejects missing fields and list-shaped message',()=>{
 const c={...command};delete c.actor_id;
 assert.throws(()=>assertCommand(c),/COMMAND_SCHEMA/);
 assert.throws(()=>assertCommand([command]),/COMMAND_SCHEMA/);
});
test('missing or disabled private service binding fails closed',async()=>{
 for(const changes of [{SENDER_ENABLED:'false'},{CEREBRO_PRODUCER:null},
 {QA_QUEUE:null},{PRIVATE_ARCHIVE_MANIFEST:null}]){
  const e=Object.assign(mockEnv(),changes);
  await assert.rejects(sendImageQaFromCerebro(command,e),/PRIVATE_BINDINGS/);
  assert.equal(e.sent.length,0);
 }
});
test('corrupt or wrong-origin archive secret is denied before calling Gateway',async()=>{
 for(const m of ['bad-json',{...manifest,image_sha256:'0'},
 {...manifest,archive_zip_bytes:-1},{...manifest,source_qa_drive_file_id:'https://fake.invalid'},
 {...manifest,publish_enabled:true}]){
  const e=mockEnv();e.PRIVATE_ARCHIVE_MANIFEST=typeof m==='string'?m:JSON.stringify(m);
  await assert.rejects(sendImageQaFromCerebro(command,e),/PRIVATE_ARCHIVE/);
  assert.equal(e.called.length,0);assert.equal(e.sent.length,0);
 }
});
test('tampered CEREBRO Gateway reply denies queue emission',async()=>{
 const variants=[{mode:'WRITE'},{environment:'PROD'},{company_id:'evil'},
 {cost_eur:1},{publish_authorized:true},{downloaded:true},{production_approved:true},
 {status:'READY_TO_PUBLISH'},{provider:'openverse'},{results:null}];
 for(const variant of variants){
  const e=mockEnv();e.CEREBRO_PRODUCER.latest=async()=>({...gatewayReply,...variant});
  await assert.rejects(sendImageQaFromCerebro(command,e),/CEREBRO_PRIVATE_RPC_UNTRUSTED/);
  assert.equal(e.sent.length,0);
 }
});
test('CEREBRO Gateway SOURCE_NOT_READY still demonstrates private RPC without implying approval',async()=>{
 const e=mockEnv();e.CEREBRO_PRODUCER.latest=async()=>({...gatewayReply,status:'SOURCE_NOT_READY'});
 const r=await sendImageQaFromCerebro(command,e);
 assert.equal(r.gateway_rpc_status,'SOURCE_NOT_READY');
 assert.equal(r.signed_editorial_or_rights_verified,false);
 assert.equal(e.sent.length,1);
});
test('RPC failure never produces a QA send',async()=>{
 const e=mockEnv();e.CEREBRO_PRODUCER.latest=async()=>{throw Error('OFFLINE')};
 await assert.rejects(sendImageQaFromCerebro(command,e),/OFFLINE/);
 assert.equal(e.sent.length,0);
});
test('QA Queue failure cannot be misreported as accepted',async()=>{
 const e=mockEnv();e.QA_QUEUE.send=async()=>{throw Error('QUEUE_UNAVAILABLE')};
 await assert.rejects(sendImageQaFromCerebro(command,e),/QUEUE_UNAVAILABLE/);
});
test('every outgoing flag fails closed: no paid inference, video, PROD, publishing, rights',async()=>{
 const e=mockEnv();const r=await sendImageQaFromCerebro(command,e);
 for(const k of ['rights_approved','editorial_approved','publish_enabled','video_enabled',
  'production_enabled','paid_execution_enabled','delivery_allowed'])
  assert.equal(e.sent[0][k],false);
 for(const k of ['publish_enabled','video_enabled','paid_execution_enabled','production_enabled'])
  assert.equal(r[k],false);
 assert.equal(r.cost_added_eur,0);
});
test('private queue handles valid command and ACKs, no public fetch endpoint',async()=>{
 const e=mockEnv();let ack=0,retry=0;
 await sender.queue({queue:'cerebro-ums001-image-sender-command-lab-eu',messages:[
 {body:command,ack(){ack++},retry(){retry++}}]},e);
 assert.equal(e.sent.length,1);assert.equal(ack,1);assert.equal(retry,0);
 const fetchResult=await sender.fetch(new Request('https://example.com'));
 assert.equal(fetchResult.status,404);assert.equal(await fetchResult.text(),'Not Found');
});
test('invalid command ACKs with no retry storm',async()=>{
 const e=mockEnv();let ack=0,retry=0;const old=console.error;
 console.error=()=>{};
 try{await sender.queue({queue:'cerebro-ums001-image-sender-command-lab-eu',messages:[
 {body:{...command,action:'PUBLISH'},ack(){ack++},retry(){retry++}}]},e)}
 finally{console.error=old}
 assert.equal(ack,1);assert.equal(retry,0);assert.equal(e.sent.length,0);
});
test('internal RPC outage triggers bounded queue retry but no submission',async()=>{
 const e=mockEnv();e.CEREBRO_PRODUCER.latest=async()=>{throw Error('CEREBRO_DOWN')};
 let ack=0,retry=0;const old=console.error;console.error=()=>{};
 try{await sender.queue({queue:'cerebro-ums001-image-sender-command-lab-eu',messages:[
 {body:command,ack(){ack++},retry(){retry++}}]},e)}
 finally{console.error=old}
 assert.equal(ack,0);assert.equal(retry,1);assert.equal(e.sent.length,0);
});
test('unexpected command queue or batch of two refused',async()=>{
 const e=mockEnv();
 await assert.rejects(sender.queue({queue:'cerebro-ums001-producer-demand-lab-eu',messages:[]},e),/WRONG_QUEUE/);
 await assert.rejects(sender.queue({queue:'cerebro-ums001-image-sender-command-lab-eu',
 messages:[{body:command},{body:command}]},e),/BATCH_SIZE_DENIED/);
});
