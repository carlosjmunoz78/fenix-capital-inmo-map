import test from 'node:test';
import assert from 'node:assert/strict';
import {SUPABASE_EDGE_LEDGER_SCHEMA,SUPABASE_EDGE_LEDGER_INFO,digestSupabaseEdgePlan,makeSupabaseEdgeLedger} from '../supabase-mgmt-edge-d1-ledger.mjs';

const NOW=1794419220000;
const PRINCIPAL={trusted:true,source:'github_oidc',client_id:'cerebro',company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',capability:'fact001.supabase.edge_canary.lab'};
const ledger=opts=>makeSupabaseEdgeLedger({...opts,principal:PRINCIPAL});
const H='a'.repeat(64),A='b'.repeat(64),R='c'.repeat(64);
function plan(overrides={}){
 return {status:'LAB_MUTATION_PLAN_ONLY',executed:false,needs_signed_executor:true,
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 project_ref:'cluhljgonannaafpmblx',resource_slug:'cerebro-fact001-sb-mgmt-canary-lab',
 operation:'edge.update',request_id:'FACT001-SBMGT-20261111-LEDGER01',
 idempotency_key:'FACT001-SBMGT-20261111-LEDGER01',before_sha256:H,artifact_sha256:A,
 rollback_sha256:R,max_cost_eur:0,...overrides};
}
function db(){
 const jobs=new Map(),events=[];
 const query=async(sql,params)=>{
  if(sql.startsWith('INSERT INTO fact001_supabase_edge_jobs_v1')){
   const [id,hash,project,slug,op,expires,before]=params;
   if(jobs.has(id))return [];
   const r={request_id:id,command_sha256:hash,status:'PREPARED',attempts:0,expires_at_ms:expires,project_ref:project,resource_slug:slug,operation:op,before_sha256:before};
   jobs.set(id,r);events.push('PREPARED');return [{request_id:id,status:r.status,attempts:r.attempts,command_sha256:hash}];
  }
  if(sql.startsWith('UPDATE fact001_supabase_edge_jobs_v1')&&sql.includes("SET status='IN_FLIGHT'")){
   const [id,hash,now]=params,r=jobs.get(id);
   if(!r||r.command_sha256!==hash||r.status!=='PREPARED'||r.attempts!==0||r.expires_at_ms<=now)return [];
   r.status='IN_FLIGHT';r.attempts=1;events.push('IN_FLIGHT');return [{request_id:id,status:r.status,attempts:r.attempts,command_sha256:hash}];
  }
  if(sql.startsWith('UPDATE fact001_supabase_edge_jobs_v1')&&sql.includes('SET status=?3')){
   const [id,hash,outcome,after]=params,r=jobs.get(id);
   if(!r||r.command_sha256!==hash||r.status!=='IN_FLIGHT'||r.attempts!==1)return [];
   r.status=outcome;r.after_sha256=after;events.push(outcome);return [{request_id:id,status:r.status,attempts:r.attempts,command_sha256:hash}];
  }
  if(sql.startsWith('SELECT request_id,status')){const r=jobs.get(params[0]);return r?[{request_id:r.request_id,status:r.status,attempts:r.attempts,command_sha256:r.command_sha256}]:[];}
  throw Error('MOCK_SQL_NOT_ALLOWLISTED');
 };
 return{jobs,events,query};
}
const fail=async(fn,code)=>assert.rejects(fn,e=>e.message===code);

test('new tables are namespaced, strictly LAB, and intentionally unapplied',()=>{
 assert.equal(SUPABASE_EDGE_LEDGER_INFO.schema_applied,false);
 assert.equal(SUPABASE_EDGE_LEDGER_INFO.provider_mutations_enabled,false);
 assert.equal(SUPABASE_EDGE_LEDGER_INFO.d1_uuid,'1305f791-7c44-47f9-946b-f330a09c88aa');
 assert.equal(SUPABASE_EDGE_LEDGER_SCHEMA.length,6);
 assert(SUPABASE_EDGE_LEDGER_SCHEMA.every(x=>!/\bDROP\b|\bALTER\b/i.test(x)));
 assert(SUPABASE_EDGE_LEDGER_SCHEMA[0].includes("CHECK(environment='LAB')"));
 assert(SUPABASE_EDGE_LEDGER_SCHEMA[4].includes('AUDIT_IMMUTABLE'));
});
test('no DB adapter is allowed',()=>assert.throws(()=>ledger({}),/SB_LEDGER_TRUSTED_ADAPTER_REQUIRED/));
test('deterministic order hash changes with scope and expected version',async()=>{
 const a=await digestSupabaseEdgePlan(plan()),b=await digestSupabaseEdgePlan({...plan(),artifact_sha256:R});
 assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);assert.equal(a,await digestSupabaseEdgePlan(plan()));
});
test('reserve/claim/verified-complete exactly one attempt',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW}),p=plan();
 const a=await l.prepare({plan:p,expires_at_ms:NOW+5000});
 assert.equal(a.status,'PREPARED');
 const c=await l.claim(a);assert.equal(c.attempts,1);
 const done=await l.settle({...a,outcome:'COMPLETED',after_sha256:R,
 readback:{verified:true,project_ref:p.project_ref,resource_slug:p.resource_slug,sha256:R,checked_at:NOW-1000}});
 assert.equal(done.status,'COMPLETED');assert.deepEqual(d.events,['PREPARED','IN_FLIGHT','COMPLETED']);
 assert.deepEqual(await l.status(a.request_id),{request_id:a.request_id,status:'COMPLETED',attempts:1});
});
test('duplicate reserve is blocked even with same request ID',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW}),p=plan();
 await l.prepare({plan:p,expires_at_ms:NOW+5000});
 await fail(()=>l.prepare({plan:p,expires_at_ms:NOW+5000}),'SB_LEDGER_REPLAY_OR_UNVERIFIED');
 assert.deepEqual(d.events,['PREPARED']);
});
test('concurrent claim is CAS once',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 const a=await l.prepare({plan:plan(),expires_at_ms:NOW+5000});
 const x=await Promise.allSettled([l.claim(a),l.claim(a)]);
 assert.equal(x.filter(z=>z.status==='fulfilled').length,1);
 assert.equal(x.filter(z=>z.status==='rejected').length,1);
 assert.equal(d.jobs.get(a.request_id).attempts,1);
});
test('expiry before claim cannot be bypassed',async()=>{
 const d=db();let ts=NOW;const l=ledger({query:d.query,now:()=>ts});
 const a=await l.prepare({plan:plan(),expires_at_ms:NOW+2000});ts=NOW+2001;
 await fail(()=>l.claim(a),'SB_LEDGER_ALREADY_CLAIMED_OR_EXPIRED');
 assert.equal(d.jobs.get(a.request_id).attempts,0);
});
test('unknown failure remains RECONCILE, never automatically retries',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 const a=await l.prepare({plan:plan(),expires_at_ms:NOW+10000});
 await l.claim(a);
 assert.equal((await l.settle({...a,outcome:'RECONCILE'})).status,'RECONCILE');
 await fail(()=>l.claim(a),'SB_LEDGER_ALREADY_CLAIMED_OR_EXPIRED');
 await fail(()=>l.settle({...a,outcome:'COMPLETED',readback:{verified:true,project_ref:plan().project_ref,resource_slug:plan().resource_slug}}),'SB_LEDGER_ALREADY_SETTLED_RECONCILE');
});
test('cannot claim wrong hash, bad request ID, or skip prepare',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 await fail(()=>l.claim({request_id:'bad',command_sha256:H}),'SB_LEDGER_CLAIM_INPUT_DENIED');
 await fail(()=>l.claim({request_id:plan().request_id,command_sha256:H}),'SB_LEDGER_ALREADY_CLAIMED_OR_EXPIRED');
});
test('completion requires verified exact resource readback',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 const a=await l.prepare({plan:plan(),expires_at_ms:NOW+5000});await l.claim(a);
 for(const bad of [null,{verified:false},{verified:true,project_ref:'other',resource_slug:plan().resource_slug},
   {verified:true,project_ref:plan().project_ref,resource_slug:'cerebro-console-gateway-v0'}])
   await fail(()=>l.settle({...a,outcome:'COMPLETED',readback:bad}),'SB_LEDGER_READBACK_REQUIRED');
 assert.equal(d.jobs.get(a.request_id).status,'IN_FLIGHT');
});
test('scope injection, another tenant, PROD or paid plans blocked before write',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 for(const x of [{project_ref:'hnqlnvakzaywtafeiybt'},{company_id:'other'},
    {environment:'PROD'},{resource_slug:'cerebro-console-gateway-v0'},{max_cost_eur:1},
    {request_id:'BAD'},{idempotency_key:'other'}]){
   await fail(()=>l.prepare({plan:plan(x),expires_at_ms:NOW+5000}),'SB_LEDGER_SCOPE_DENIED');
 }
 assert.equal(d.jobs.size,0);
});
test('reject impossible expiration and malformed DB results',async()=>{
 const p=plan();const l=ledger({query:db().query,now:()=>NOW});
 await fail(()=>l.prepare({plan:p,expires_at_ms:NOW-1}),'SB_LEDGER_EXPIRY_DENIED');
 await fail(()=>l.prepare({plan:p,expires_at_ms:NOW+9999999}),'SB_LEDGER_EXPIRY_DENIED');
 const b=ledger({query:async()=>({rows:[]}),now:()=>NOW});
 await fail(()=>b.prepare({plan:p,expires_at_ms:NOW+5000}),'SB_LEDGER_DB_RESPONSE_DENIED');
});
test('request status query never accepts SQL or arbitrary identifiers',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 await fail(()=>l.status("x'; DROP TABLE x;--"),'SB_LEDGER_STATUS_INPUT_DENIED');
 assert.equal(await l.status(plan().request_id),null);
});
test('no guessed success on RECONCILE',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 const a=await l.prepare({plan:plan(),expires_at_ms:NOW+3000});await l.claim(a);
 await fail(()=>l.settle({...a,outcome:'RECONCILE',after_sha256:R}),'SB_LEDGER_RECONCILE_NO_ASSUMPTIONS');
});

test('independent service principal is mandatory and never derived from an order',()=>{
 assert.throws(()=>makeSupabaseEdgeLedger({query:db().query,now:()=>NOW}),/SB_MGMT_SERVICE_IDENTITY_DENIED/);
 for(const bad of [{...PRINCIPAL,trusted:false},{...PRINCIPAL,environment:'PROD'},
  {...PRINCIPAL,source:'chatgpt_oauth'},{...PRINCIPAL,capability:'*'}])
  assert.throws(()=>makeSupabaseEdgeLedger({query:db().query,now:()=>NOW,principal:bad}),/SB_MGMT_SERVICE_IDENTITY_DENIED/);
});
test('completion cannot rely on stale readback or self-declared hashes',async()=>{
 const d=db(),l=ledger({query:d.query,now:()=>NOW});
 const a=await l.prepare({plan:plan(),expires_at_ms:NOW+5000});await l.claim(a);
 const good={verified:true,project_ref:plan().project_ref,resource_slug:plan().resource_slug,sha256:R,checked_at:NOW-1000};
 for(const readback of [{...good,sha256:A},{...good,checked_at:NOW-90000},{...good,checked_at:NOW+1}])
  await fail(()=>l.settle({...a,outcome:'COMPLETED',after_sha256:R,readback}),'SB_LEDGER_READBACK_REQUIRED');
 assert.equal(d.jobs.get(a.request_id).status,'IN_FLIGHT');
});
