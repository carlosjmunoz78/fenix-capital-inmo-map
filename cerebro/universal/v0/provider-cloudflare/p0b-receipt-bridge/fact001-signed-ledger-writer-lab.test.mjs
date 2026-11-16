import test from 'node:test';
import assert from 'node:assert/strict';
import {persistFact001SignedLedgerReceiptLabV0 as persist,decodeFact001SignerSecretV0} from './fact001-signed-ledger-writer-lab.mjs';
import {verifyFact001LabReceiptV0} from './fact001-receipt-signature-lab.mjs';
const NOW=1794855339700;
const key=Uint8Array.from({length:32},(_,i)=>i+1); // inert, test-only
const version='10801551-eb14-4ce1-b947-1032cdda565c';
const NAME='cerebro-fact001-managed-lab-rproof261116';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const baseline=(operation='worker.create_private')=>{
 const deleted=operation==='worker.delete_private';
 const job={id:'fact001-lab-p0b-proof-1',request_id:'FACT001-P0B-PROOF-20261116',
  idempotency_key:'fact001-p0b-proof-1',company_id:'fenix-capital',engine_id:'FACT-001',
  environment:'LAB',version:'1.0.0',operation,resource_name:NAME,state:'COMPLETED',
  attempts:1,max_cost_eur:0,created_at_ms:NOW-20000,updated_at_ms:NOW-10000};
 const event={job_id:job.id,event:'JOB_FINISHED',state:'COMPLETED',phase:deleted?'OWNED_WORKER_REMOVED':'CREATED_V1_PRIVATE',
  error_code:null,recorded_at_ms:NOW-6000};
 const ownership={name:NAME,company_id:job.company_id,engine_id:job.engine_id,
  environment:job.environment,version:job.version,created_by_request:job.request_id,
  state:deleted?'DELETED':'V1',v1_version_id:version,v2_version_id:null,current_version_id:deleted?null:version};
 const provider={name:NAME,account_id:'e39a57e1ac42650ca5a6d5307cf0ac8e',exists:!deleted,
  api_read_success:true,workers_dev_enabled:false,preview_urls_enabled:false,
  bindings_count:0,crons_count:0,routes_count:0,domains_count:0,version_id:deleted?null:version,
  ...(deleted?{list_read_success:true,script_get_http_status:404}:{})};
 const readback={source:'CLOUDFLARE_PROVIDER_API',name:NAME,exists:!deleted,
  version_id:deleted?null:version,observed_at_ms:NOW-3000};
 return {job,event,ownership,provider,readback,observed_at_ms:NOW,signingKey:key,
  idFactory:(()=>{let i=0;return ()=>ids[i++];})()};
};
function fakeD1(){
 const persisted=new Map();let writes=0, lastSQL='';
 return {
  get writes(){return writes},get records(){return Array.from(persisted.values())},get lastSQL(){return lastSQL},
  prepare(sql){
   return {bind(...args){return {async first(){
    if(sql.startsWith('INSERT INTO fact001_provider_receipts_lab_v0')){
     lastSQL=sql;const match=sql.match(/^INSERT INTO [^(]+\(([^)]+)\)/);
     const fields=match[1].split(',');const row=Object.fromEntries(fields.map((k,i)=>[k,args[i]]));
     if(persisted.has(row.job_id))return null;
     persisted.set(row.job_id,row);writes++;return {receipt_id:row.receipt_id,job_id:row.job_id,
      message_digest:row.message_digest,signature_hex:row.signature_hex};
    }
    const record=persisted.get(args[0]);return record||null;
   }}}};
  }
 };
}
test('writer inserts immutable-enveloped LAB record, re-reads and never promotes PROD',async()=>{
 const db=fakeD1(),base=baseline();
 const result=await persist({...base,db});
 assert.equal(result.status,'DURABLE_LAB_RECEIPT_UNATTESTED');
 assert.equal(result.runtime_hmac_signed,true);
 assert.equal(result.external_signature_verified,false);
 assert.equal(result.prod_promotion_allowed,false);
 assert.equal(db.writes,1);
 assert.match(db.lastSQL,/ON CONFLICT\(job_id\) DO NOTHING/);
 const stored=db.records[0];
 assert.equal(stored.company_id,'fenix-capital');
 assert.equal(stored.environment,'LAB');
 assert.equal(stored.signature_is_provider_native,0);
 assert.equal(stored.signed_runtime_receipt_verified,0);
 assert.equal(stored.prod_promotion_allowed,0);
 const receiptFields=['receipt_id','run_id','job_id','request_id','idempotency_key','company_id',
  'engine_id','environment','version','operation','resource_name','policy_version','provider',
  'provider_version_id','readback_status','observed_at_ms','signer_key_id'];
 const receipt=Object.fromEntries(receiptFields.map(k=>[k,stored[k]]));
 assert.equal(await verifyFact001LabReceiptV0({envelope:{receipt,message_digest:stored.message_digest,
  signature_hex:stored.signature_hex,signature_scheme:stored.signature_scheme,
  signature_is_provider_native:false},signingKey:key}),true);
});
test('delete proof can create signed durable receipt with null version and no Worker',async()=>{
 const result=await persist({...baseline('worker.delete_private'),db:fakeD1()});
 assert.equal(result.status,'DURABLE_LAB_RECEIPT_UNATTESTED');
 assert.equal(result.provider_native_signature,false);
});
test('fail closed on job mismatch, altered event and forged provider readback before write',async()=>{
 for(const change of [
  x=>{x.job.company_id='fenix';},
  x=>{x.job.state='QUEUED';},
  x=>{x.event.phase='OTHER';},
  x=>{x.provider.version_id='different';},
  x=>{x.readback.observed_at_ms=NOW-999999;},
  x=>{x.provider.workers_dev_enabled=true;}
 ]){
  const a=baseline(),db=fakeD1();change(a);
  assert.equal((await persist({...a,db})).status,'NOT_CERTIFIED');
  assert.equal(db.writes,0);
 }
});
test('strict secret decoding, missing signer, missing D1 all block',async()=>{
 assert.equal(decodeFact001SignerSecretV0('b'.repeat(64)).length,32);
 for(const bad of ['','not-a-secret','b'.repeat(63),'b'.repeat(130),'Z'.repeat(64)])
  assert.equal(decodeFact001SignerSecretV0(bad),null);
 assert.equal((await persist({...baseline(),db:fakeD1(),signingKey:new Uint8Array(4)})).status,'NOT_CERTIFIED');
 assert.equal((await persist({...baseline(),db:null})).status,'NOT_CERTIFIED');
});
test('repeat of same job id does not replace existing receipt or impersonate idempotency',async()=>{
 const db=fakeD1();
 const a=await persist({...baseline(),db});
 assert.equal(a.status,'DURABLE_LAB_RECEIPT_UNATTESTED');
 const b=await persist({...baseline(),db});
 assert.equal(b.status,'NOT_CERTIFIED');
 assert.equal(b.reason,'DURABLE_READBACK_OR_IDEMPOTENCY_BLOCKED');
 assert.equal(db.writes,1);
});
