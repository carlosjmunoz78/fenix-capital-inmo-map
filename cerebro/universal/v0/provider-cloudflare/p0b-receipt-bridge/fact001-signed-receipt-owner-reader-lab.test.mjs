import test from 'node:test';
import assert from 'node:assert/strict';
import {signFact001LabReceiptV0} from './fact001-receipt-signature-lab.mjs';
import {readFact001SignedReceiptOwnerLabV0 as baseRead} from './fact001-signed-receipt-owner-reader-lab.mjs';
const ownerContext=Object.freeze({actor_id:'CARLOS-ADMIN',
 auth_source:'SERVER_VERIFIED_FENIX_CONTEXT',company_ids:['fenix'],
 scopes:['cerebro:audit:read']});
const read=(opts)=>baseRead({verifyOwnerSession:async()=>ownerContext,sessionToken:'x'.repeat(32),...opts});

const key=Uint8Array.from({length:32},(_,i)=>i+1); // FIXTURE ONLY: never a deployment key
const clock=1794855339509;
const jobId='FACT001-OPERATIVA-P0B-261116-SIGNED-CREATE-01';
const resource='cerebro-fact001-managed-lab-sig261116a';
const sample=()=>({
 receipt_id:'11111111-1111-4111-8111-111111111111',
 run_id:'22222222-2222-4222-8222-222222222222',
 job_id:jobId,request_id:'FACT001-SIGNED-261116-CREATE-001',
 idempotency_key:'fact001-signed-261116-create-001',
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',
 version:'1.0.0',operation:'worker.create_private',resource_name:resource,
 policy_version:'FACT001-P0B-LAB-V1',provider:'CLOUDFLARE_WORKERS',
 provider_version_id:'10801551-eb14-4ce1-b947-1032cdda565c',
 readback_status:'READBACK_MATCHED_UNATTESTED',observed_at_ms:clock,
 signer_key_id:'FACT001-LAB-KEY-V1'
});
const job=(r)=>({
 id:r.job_id,company_id:r.company_id,engine_id:r.engine_id,
 environment:r.environment,version:r.version,operation:r.operation,
 resource_name:r.resource_name,request_id:r.request_id,
 idempotency_key:r.idempotency_key,state:'COMPLETED',
 attempts:1,max_cost_eur:0,created_at_ms:clock-30000,updated_at_ms:clock-1000
});
const event=(r)=>({job_id:r.job_id,event:'JOB_FINISHED',state:'COMPLETED',
 phase:'CREATED_V1_PRIVATE',error_code:null,recorded_at_ms:clock-100});
function dbMock({receipt,jobRow,events}={}){
 let queries=[];
 return {
  get queries(){return queries;},
  prepare(sql){
   return {bind(id){
    return {
     async first(){
      queries.push({sql,id});
      if(sql.startsWith('SELECT receipt_id'))return receipt??null;
      if(sql.startsWith('SELECT id,company_id'))return jobRow??null;
      throw Error('UNEXPECTED_SELECT');
     },
     async all(){
      queries.push({sql,id});
      return {results:events??[]};
     }
    };
   }};
  }
 };
}
async function fixture(){
 const r=sample(),signed=await signFact001LabReceiptV0({receipt:r,signingKey:key});
 const record={...r,message_digest:signed.message_digest,signature_hex:signed.signature_hex,
  signature_scheme:signed.signature_scheme,signature_is_provider_native:0,
  source:'FACT001_RUNNER_LAB',signed_runtime_receipt_verified:0,
  prod_promotion_allowed:0};
 return {r,record,signed,db:dbMock({receipt:record,jobRow:job(r),events:[event(r)]})};
}
test('signed immutable LAB evidence is authenticated locally but NEVER certified for provider or PROD',async()=>{
 const f=await fixture();
 const output=await read({db:f.db,jobId,signingKey:key});
 assert.equal(output.status,'HMAC_VALID_LAB_ONLY');
 assert.equal(output.signed_hmac_integrity_verified,true);
 assert.equal(output.independent_provider_attestation,false);
 assert.equal(output.signed_runtime_receipt_verified,false);
 assert.equal(output.prod_promotion_allowed,false);
 assert.equal(output.canonical_company_registry_mapping_verified,false);
 assert.equal(output.receipt_found,true);
 assert.equal(output.receipt_id,f.r.receipt_id);
 assert.equal(output.evidence_age,'HISTORICAL_LEDGER_RECORD_NOT_REALTIME_PROVIDER_CHECK');
 assert.equal(f.db.queries.length,3);
 assert(f.db.queries.every(q=>q.sql.startsWith('SELECT')));
 const serialized=JSON.stringify(output);
 assert(!serialized.includes(f.signed.signature_hex));
 assert(!serialized.includes(f.signed.message_digest));
 assert(!serialized.includes(Array.from(key).join(',')));
});
test('missing D1 row, missing server private key, absent D1 and wrong job key fail closed',async()=>{
 const f=await fixture();
 for(const c of [
  {db:dbMock({jobRow:job(f.r),events:[event(f.r)]}),jobId,signingKey:key},
  {db:f.db,jobId,signingKey:null},
  {db:null,jobId,signingKey:key},
  {db:f.db,jobId:'../../another-company',signingKey:key}
 ]){
  const o=await read(c);
  assert.equal(o.status,'NOT_CERTIFIED');
  assert.equal(o.prod_promotion_allowed,false);
 }
});
test('altered signed fields and metadata cannot be accepted',async()=>{
 const f=await fixture();
 for(const [name,bad] of [
  ['environment','PROD'],['company_id','fenix'],['job_id','other-job'],
  ['operation','worker.delete_private'],['provider','WRONG_PROVIDER'],
  ['policy_version','UNKNOWN_POLICY'],['provider_version_id','another-version'],
  ['signature_hex','a'.repeat(64)],['message_digest','a'.repeat(64)],
  ['signature_is_provider_native',1],['source','CHATGPT_OPERATOR'],
  ['signed_runtime_receipt_verified',1],['prod_promotion_allowed',1]
 ]){
  const altered={...f.record,[name]:bad};
  const db=dbMock({receipt:altered,jobRow:job(f.r),events:[event(f.r)]});
  const o=await read({db,jobId,signingKey:key});
  assert.equal(o.status,'NOT_CERTIFIED',name);
 }
});
test('independently verifies HMAC with same key and rejects wrong key without leaking key material',async()=>{
 const f=await fixture();
 assert.equal((await read({db:f.db,jobId,signingKey:key})).status,'HMAC_VALID_LAB_ONLY');
 const badKey=Uint8Array.from({length:32},(_,i)=>i+3);
 const o=await read({db:f.db,jobId,signingKey:badKey});
 assert.equal(o.reason,'SIGNATURE_OR_DIGEST_INVALID');
 assert.equal(JSON.stringify(o).includes('signingKey'),false);
});
test('terminal evidence must uniquely match completed FACT-001 LAB job',async()=>{
 const f=await fixture();
 const variants=[
  {jobRow:{...job(f.r),state:'RECONCILE'},events:[event(f.r)]},
  {jobRow:{...job(f.r),attempts:2},events:[event(f.r)]},
  {jobRow:{...job(f.r),max_cost_eur:1},events:[event(f.r)]},
  {jobRow:job(f.r),events:[]},
  {jobRow:job(f.r),events:[event(f.r),event(f.r)]},
  {jobRow:job(f.r),events:[{...event(f.r),phase:'OWNED_WORKER_REMOVED'}]},
  {jobRow:job(f.r),events:[{...event(f.r),recorded_at_ms:clock+200}]}
 ];
 for(const v of variants){
  const db=dbMock({receipt:f.record,...v});
  const output=await read({db,jobId,signingKey:key});
  assert.equal(output.status,'NOT_CERTIFIED');
 }
});
test('query errors cannot become false certified receipts or disclose error body',async()=>{
 const db={prepare(){throw Error('BEARER_SUPERSECRET_DO_NOT_LOG')}};
 const result=await read({db,jobId,signingKey:key});
 assert.equal(result.status,'NOT_CERTIFIED');
 assert.equal(JSON.stringify(result).includes('BEARER_SUPERSECRET'),false);
});

test('server-verified Fenix owner context is compulsory before any D1 read',async()=>{
 const f=await fixture();
 let calls=0;
 const db={prepare(){calls++;throw Error('UNEXPECTED_IO')}};
 for(const c of [
  undefined,
  {actor_id:'CARLOS-ADMIN',auth_source:'CLIENT_ASSERTED',company_ids:['fenix'],scopes:['cerebro:audit:read']},
  {...ownerContext,company_ids:['aion']},
  {...ownerContext,scopes:['cerebro:jobs:read']},
  {...ownerContext,actor_id:'OTHER'}
 ]){
  const out=await baseRead({db,jobId,signingKey:key,verifyOwnerSession:async()=>c,sessionToken:'x'.repeat(32)});
  assert.equal(out.status,'NOT_CERTIFIED');
  assert.equal(out.reason,'OWNER_SERVER_CONTEXT_NOT_VERIFIED');
  assert.equal(out.prod_promotion_allowed,false);
 }
 assert.equal(calls,0);
});

test('client-supplied context is not accepted; server must authenticate session before D1',async()=>{
 let reads=0,verifies=0;
 const db={prepare(){reads++;throw Error('SHOULD_NOT_QUERY')}};
 const missing=await baseRead({db,jobId,signingKey:key,ownerContext,sessionToken:'x'.repeat(32)});
 assert.equal(missing.reason,'OWNER_SESSION_VERIFIER_MISSING');
 const malformed=await baseRead({db,jobId,signingKey:key,sessionToken:'bad',verifyOwnerSession:async()=>{verifies++;return ownerContext}});
 assert.equal(malformed.reason,'OWNER_SESSION_VERIFIER_MISSING');
 const rejected=await baseRead({db,jobId,signingKey:key,sessionToken:'x'.repeat(32),
  verifyOwnerSession:async()=>{verifies++;throw Error('private upstream details')}});
 assert.equal(rejected.reason,'OWNER_SESSION_VERIFICATION_FAILED');
 assert.equal(JSON.stringify(rejected).includes('private upstream'),false);
 assert.equal(reads,0);
 assert.equal(verifies,1);
});
