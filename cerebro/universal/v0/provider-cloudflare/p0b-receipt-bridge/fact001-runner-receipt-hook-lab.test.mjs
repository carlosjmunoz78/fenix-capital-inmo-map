import test from 'node:test';
import assert from 'node:assert/strict';
import {emitFact001ReceiptIfEnabledLabV0 as emit} from './fact001-runner-receipt-hook-lab.mjs';
const NOW=1794855339700;
const id='fact001-lab-runner-receipt-1',name='cerebro-fact001-managed-lab-rproof261116';
const version='10801551-eb14-4ce1-b947-1032cdda565c';
const job=()=>({id,company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',
 version:'1.0.0',operation:'worker.create_private',resource_name:name,
 request_id:'FACT001-LAB-RECEIPT-20261116',idempotency_key:'fact001-lab-receipt-20261116',
 max_cost_eur:0,state:'COMPLETED',attempts:1,created_at_ms:NOW-12000,updated_at_ms:NOW-7000});
const event=()=>({job_id:id,event:'JOB_FINISHED',state:'COMPLETED',phase:'CREATED_V1_PRIVATE',
 error_code:null,recorded_at_ms:NOW-6000});
const owned=()=>({name,state:'V1',v1_version_id:version,v2_version_id:null,current_version_id:version,
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 created_by_request:'FACT001-LAB-RECEIPT-20261116'});
const fakeD1=({row=job(),events=[event()],owner=owned()}={})=>{
 const store=new Map();let writes=0;
 return {get writes(){return writes},get records(){return [...store.values()]},
  prepare(sql){return {bind(...values){return {
   async all(){return {results:sql.includes('fact001_cf_command_events_v1')?events:[]}},
   async first(){
    if(sql.startsWith('SELECT id,company_id'))return row;
    if(sql.startsWith('SELECT name,state'))return owner;
    if(sql.startsWith('SELECT receipt_id'))return store.get(values[0])??null;
    if(sql.startsWith('INSERT INTO fact001_provider_receipts_lab_v0')){
     const fields=sql.match(/\(([^)]+)\)/)[1].split(',');
     const receipt=Object.fromEntries(fields.map((k,i)=>[k,values[i]]));
     if(store.has(receipt.job_id))return null;
     store.set(receipt.job_id,receipt);writes++;
     return {receipt_id:receipt.receipt_id,job_id:receipt.job_id,
      message_digest:receipt.message_digest,signature_hex:receipt.signature_hex};
    }
    throw Error('UNEXPECTED_D1_QUERY');
   }
  }}};}
 };
};
function provider(){
 let calls=0;
 const fetchImpl=async(uri,opts)=>{
  calls++;
  assert.equal(opts.method,'GET');
  const p=new URL(uri).pathname;
  if(p.endsWith('/workers/scripts'))return {status:200,json:async()=>({success:true,result:[{id:name}],result_info:{total_pages:1}})};
  if(p.endsWith('/workers/routes')||p.endsWith('/workers/domains'))return {status:200,json:async()=>({success:true,result:[]})};
  if(p.endsWith('/'+name))return {status:200};
  if(p.endsWith('/subdomain'))return {status:200,json:async()=>({success:true,result:{enabled:false,previews_enabled:false}})};
  if(p.endsWith('/schedules'))return {status:200,json:async()=>({success:true,result:{schedules:[]}})};
  if(p.endsWith('/settings'))return {status:200,json:async()=>({success:true,result:{bindings:[]}})};
  if(p.endsWith('/deployments'))return {status:200,json:async()=>({success:true,result:{deployments:[{versions:[{version_id:version}]}]}})};
  throw Error('UNEXPECTED_GET');
 };
 return {fetchImpl,get calls(){return calls}};
}
test('default-OFF preserves existing Worker behavior: no D1, no HTTP, no signing',async()=>{
 let operations=0;
 const out=await emit({env:{FACT001_RECEIPTS_ENABLED:'false',
  RECOVERY_DB:{prepare(){operations++;throw Error('TOUCHED')}},CF_WORKERS_TOKEN:'a'.repeat(32)},
  jobId:id,fetchImpl:async()=>{operations++;throw Error('FETCHED')}});
 assert.equal(out.status,'OFF');assert.equal(operations,0);
});
test('flag ON requires dedicated signer before touching provider or database',async()=>{
 const x=provider(),db=fakeD1();
 const result=await emit({env:{FACT001_RECEIPTS_ENABLED:'true',
  RECOVERY_DB:db,CF_WORKERS_TOKEN:'a'.repeat(32)},jobId:id,fetchImpl:x.fetchImpl});
 assert.equal(result.reason,'SIGNER_SECRET_MISSING');assert.equal(db.writes,0);
 assert.equal(x.calls,0);
});
test('authorized LAB run signs, writes, reads back D1, but does not assert external attestation',async()=>{
 const x=provider(),db=fakeD1(),env={FACT001_RECEIPTS_ENABLED:'true',
  RECOVERY_DB:db,CF_WORKERS_TOKEN:'a'.repeat(32),
  FACT001_RECEIPT_SIGNING_KEY_HEX:'a1'.repeat(32)}; // inert test key
 const out=await emit({env,jobId:id,fetchImpl:x.fetchImpl,clock:()=>NOW});
 assert.equal(out.status,'DURABLE_LAB_RECEIPT_UNATTESTED',JSON.stringify({reason:out.reason,calls:x.calls}));
 assert.equal(out.durable,true);
 assert.equal(out.provider_readback_matched,true);
 assert.equal(out.prod_promotion_allowed,false);
 assert.equal(db.writes,1);assert.equal(x.calls,8);
 assert.equal(db.records[0].signature_scheme,'HMAC-SHA256-LAB-V0');
 assert.equal(db.records[0].signed_runtime_receipt_verified,0);
});
test('fail closed before provider IO if wrong tenant, duplicate terminal event or incomplete job',async()=>{
 for(const d of [
  fakeD1({row:{...job(),company_id:'other'}}),
  fakeD1({events:[event(),event()]}),
  fakeD1({row:{...job(),state:'QUEUED'}})
 ]){
  const x=provider();
  const r=await emit({env:{FACT001_RECEIPTS_ENABLED:'true',RECOVERY_DB:d,
   CF_WORKERS_TOKEN:'a'.repeat(32),FACT001_RECEIPT_SIGNING_KEY_HEX:'01'.repeat(32)},
   jobId:id,fetchImpl:x.fetchImpl,clock:()=>NOW});
  assert.equal(r.status,'NOT_CERTIFIED');
  assert.equal(x.calls,0);
  assert.equal(d.writes,0);
 }
});
