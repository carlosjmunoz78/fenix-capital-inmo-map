import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{acceptImageQaOrder,validateImageQaOrder,QA_KEY_PREFIX}
 from '../cloudflare/ums001-image-qa-shadow-lab-eu/worker.mjs';
const receipt=JSON.parse(readFileSync('cerebro/media-studio/v2/qa/UMS001_MULTICHANNEL_IMAGE_GATE_REAL_20261111_V5.json','utf8'));
const real=receipt.real_evidence.find(x=>x.item_id==='LI-FEED-01');
const sample={schema_version:1,company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
 order_id:'UMS001-LAB-LI-FEED-01-ARCHIVE-20261112',item_id:'LI-FEED-01',
 consumer_engine_id:'UMS-QA-LAB',
 archive_drive_file_id:'LAB_SYNTHETIC_ARCHIVE_REF_A_20261112',
 archive_zip_sha256:'11104a4e711bc4e220b6650a5bb320f84239a6f680460055216f7a300dc8ef24',
 archive_zip_bytes:100650,image_sha256:real.branded_sha256,image_bytes:99552,
 image_type:'image/webp',
 source_qa_zip_sha256:'e71ce6c5481ba8d37b74ffb745f425454a08dfa9fe53d975df5a002e1b7f848e',
 source_qa_drive_file_id:'LAB_SYNTHETIC_QA_REF_B_20261112',
 stage:'QA_ONLY_INBOX',rights_approved:false,editorial_approved:false,
 publish_enabled:false,video_enabled:false,production_enabled:false,
 paid_execution_enabled:false,delivery_allowed:false};
function clone(x){return structuredClone(x)}
function mkEnv(){const kv=new Map();return {QA_ONLY_ENABLED:'true',
 QA_KV:{async get(k){const x=kv.get(k);return x?JSON.parse(x):null},
   async put(k,v){kv.set(k,v)}},kv};}
test('uses independently observed real LI-FEED-01 image SHA',()=>{
 assert.equal(sample.image_sha256,'5e65cfc30f9cdee5c8e9a93942d05e85a3f1e362d66fd623689525b8b7b2e170');
 assert.equal(validateImageQaOrder(sample),sample);
});
test('QA-only receipt persisted, never claims physical readback, signatures or publication',async()=>{
 const env=mkEnv(),r=await acceptImageQaOrder(sample,env);
 const doc=JSON.parse(env.kv.get(QA_KEY_PREFIX+sample.order_id));
 assert.equal(r.status,'QA_INBOX_RECEIVED_UNVERIFIED');
 assert.equal(doc.archive_zip_sha256,sample.archive_zip_sha256);
 assert.equal(doc.image_sha256,sample.image_sha256);
 assert.equal(doc.source_asset_verified_by_this_worker,false);
 assert.equal(doc.rights_approved,false);
 assert.equal(doc.independent_qa_signatures_verified,false);
 assert.equal(doc.signed_destination_receipt_verified,false);
 assert.equal(doc.commercial_delivery_allowed,false);
 assert.equal(doc.publish_enabled,false);
 assert.equal(doc.video_enabled,false);
 assert.equal(doc.paid_execution_enabled,false);
 assert.equal(doc.cost_added_eur,0);
});
test('exact duplicate receipt does not issue another KV PUT',async()=>{
 const env=mkEnv();let writes=0;const put=env.QA_KV.put;
 env.QA_KV.put=async(...args)=>{writes++;return put(...args)};
 await acceptImageQaOrder(sample,env);
 let r=await acceptImageQaOrder(sample,env);
 assert.equal(r.status,'QA_INBOX_ALREADY_PRESENT');assert.equal(writes,1);
});
test('tampered same order ID cannot overwrite immutable receipt',async()=>{
 const env=mkEnv();await acceptImageQaOrder(sample,env);
 const overwritten={...sample,image_sha256:'a'.repeat(64)};
 await assert.rejects(acceptImageQaOrder(overwritten,env),/IDEMPOTENCY_CONFLICT/);
 const stored=JSON.parse(env.kv.get(QA_KEY_PREFIX+sample.order_id));
 assert.equal(stored.image_sha256,sample.image_sha256);
});
test('rejects extra fields that could smuggle publication permission',()=>{
 assert.throws(()=>validateImageQaOrder({...sample,url:'https://example.com'}),/SCHEMA/);
});
test('rejects missing fields',()=>{
 let x=clone(sample);delete x.delivery_allowed;
 assert.throws(()=>validateImageQaOrder(x),/SCHEMA/);
});
test('rejects PROD and cross-tenant',()=>{
 for(const x of [{...sample,environment:'PROD'},{...sample,company_id:'other'},
 {...sample,engine_id:'UMS-002'}])
 assert.throws(()=>validateImageQaOrder(x),/SCOPE/);
});
test('rejects a different item or sales recipient',()=>{
 for(const x of [{...sample,item_id:'IG-STORY-01'},
 {...sample,consumer_engine_id:'SOC-001'}])
 assert.throws(()=>validateImageQaOrder(x),/SCOPE/);
});
test('rejects any paid, video, publication, commercial delivery flags',()=>{
 for(const flag of ['rights_approved','editorial_approved','publish_enabled',
   'video_enabled','production_enabled','paid_execution_enabled','delivery_allowed']){
  assert.throws(()=>validateImageQaOrder({...sample,[flag]:true}),/PROHIBITED_ACTION/);
 }
});
test('rejects forged asset refs, checksums and excessive bytes',()=>{
 for(const x of [{...sample,archive_drive_file_id:'https://evil.invalid'},
 {...sample,image_sha256:'fake'},{...sample,archive_zip_bytes:0},
 {...sample,image_bytes:12000001},{...sample,image_type:'application/octet-stream'}])
 assert.throws(()=>validateImageQaOrder(x),/IDENTITY|SHA|ASSET_TYPE_SIZE/);
});
test('missing KV and disabled worker cannot accept',async()=>{
 for(const env of [{QA_ONLY_ENABLED:'false',QA_KV:mkEnv().QA_KV},
 {QA_ONLY_ENABLED:'true'},{QA_ONLY_ENABLED:'true',QA_KV:{}}])
 await assert.rejects(acceptImageQaOrder(sample,env),/DISABLED_OR_STORAGE_NOT_ISOLATED/);
});
test('queue consumer persists first canary once and acknowledges successful message',async()=>{
 const env=mkEnv();let ack=0,retry=0;
 const m={body:sample,ack(){ack++},retry(){retry++}};
 await worker.queue({queue:'cerebro-ums001-image-qa-shadow-lab-eu',messages:[m,m]},env);
 assert.equal(ack,2);assert.equal(retry,0);assert.equal(env.kv.size,1);
});
test('queue consumer quarantines malformed message and ACKs without retry storm',async()=>{
 const env=mkEnv();let ack=0,retry=0;
 const m={body:{...sample,publish_enabled:true},ack(){ack++},retry(){retry++}};
 await worker.queue({queue:'cerebro-ums001-image-qa-shadow-lab-eu',messages:[m]},env);
 assert.equal(ack,1);assert.equal(retry,0);assert.equal(env.kv.size,0);
});
test('storage outage bounded retry and no metadata claim of success',async()=>{
 const env=mkEnv();env.QA_KV.put=async()=>{throw Error('KV_UNAVAILABLE')};
 let ack=0,retry=0;
 const m={body:sample,ack(){ack++},retry(){retry++}};
 await worker.queue({queue:'cerebro-ums001-image-qa-shadow-lab-eu',messages:[m]},env);
 assert.equal(ack,0);assert.equal(retry,1);assert.equal(env.kv.size,0);
});
test('wrong queue is never consumed; public fetch always 404',async()=>{
 const env=mkEnv();
 await assert.rejects(worker.queue({queue:'cerebro-ums001-producer-demand-lab-eu',messages:[]},env),/WRONG_QUEUE/);
 const r=await worker.fetch(new Request('https://example.com'));
 assert.equal(r.status,404);assert.equal(await r.text(),'Not Found');
});
