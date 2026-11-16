import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFact001ProviderReadbackV0 as verify} from './fact001-provider-receipt-bridge.mjs';
const NOW=1794840000000;
const v1='ac121573-2b78-4e54-91f5-23c6fa2bcac9';
const base=(operation='worker.create_private')=>{
 const del=operation==='worker.delete_private';
 const phase=del?'OWNED_WORKER_REMOVED':'CREATED_V1_PRIVATE';
 const name='cerebro-fact001-managed-lab-proof2026';
 const job={id:'fact001-lab-job-proof2026',company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
   request_id:'FACT001-LAB-READBACK-20261116',idempotency_key:'lab-proof-20261116',
   resource_name:name,operation,state:'COMPLETED',attempts:1,max_cost_eur:0,created_at_ms:NOW-20000,updated_at_ms:NOW-10000};
 const event={job_id:job.id,event:'JOB_FINISHED',state:'COMPLETED',phase,error_code:null,recorded_at_ms:NOW-9000};
 const ownership={company_id:job.company_id,engine_id:job.engine_id,environment:job.environment,version:job.version,
   name,state:del?'DELETED':'V1',created_by_request:job.request_id,v1_version_id:v1,v2_version_id:null,current_version_id:del?null:v1};
 const provider={name,account_id:'e39a57e1ac42650ca5a6d5307cf0ac8e',exists:!del,
   api_read_success:true,workers_dev_enabled:false,preview_urls_enabled:false,
   routes_count:0,domains_count:0,crons_count:0,bindings_count:0,
   list_read_success:del?true:undefined,script_get_http_status:del?404:undefined,version_id:del?null:v1};
 const readback={source:'CLOUDFLARE_PROVIDER_API',name,exists:!del,version_id:del?null:v1,observed_at_ms:NOW-3000};
 return {job,event,ownership,provider,readback,observed_at_ms:NOW};
};
test('valid isolated LAB create yields matched but NEVER certified or PROD',()=>{
 const value=verify(base());
 assert.equal(value.status,'READBACK_MATCHED_UNATTESTED');
 assert.equal(value.provider_readback_matched,true);
 assert.equal(value.provider_causality_certified,false);
 assert.equal(value.prod_promotion_allowed,false);
});
test('valid isolated delete requires no Worker and no current version',()=>{
 assert.equal(verify(base('worker.delete_private')).status,'READBACK_MATCHED_UNATTESTED');
});
test('refuse forged tenant, engine, version, state and unsafe job contract',()=>{
 for(const [field,val] of [['company_id','fenix'],['environment','PROD'],['engine_id','JOB-001'],['state','QUEUED'],['attempts',2],['resource_name','cerebro-jarvis-lab-eu'],['max_cost_eur',1]]){
  const b=base();b.job[field]=val;assert.equal(verify(b).status,'NOT_CERTIFIED',field);
 }
});
test('refuse missing event, wrong phase and timestamps out of order',()=>{
 const b=base();delete b.event;assert.equal(verify(b).status,'NOT_CERTIFIED');
 for(const p of ['UPDATED_V2_PRIVATE','UNKNOWN']){const x=base();x.event.phase=p;assert.equal(verify(x).status,'NOT_CERTIFIED');}
 const x=base();x.observed_at_ms=NOW+600000;assert.equal(verify(x).status,'NOT_CERTIFIED');
});
test('refuse altered ownership, target and provider version',()=>{
 const x=base();x.ownership.name='other';assert.equal(verify(x).status,'NOT_CERTIFIED');
 const y=base();y.provider.version_id='wrong';assert.equal(verify(y).status,'NOT_CERTIFIED');
 const z=base();z.readback.version_id='wrong';assert.equal(verify(z).status,'NOT_CERTIFIED');
});
test('refuse public route, preview URL, binding, cron and absent provider',()=>{
 for(const [field,val] of [['routes_count',1],['preview_urls_enabled',true],['bindings_count',1],['crons_count',1],['exists',false]]){
  const x=base();x.provider[field]=val;assert.equal(verify(x).status,'NOT_CERTIFIED',field);
 }
});
test('refuse stale or wrong-source independent provider readback',()=>{
 const x=base();x.readback.observed_at_ms=NOW-600001;assert.equal(verify(x).status,'NOT_CERTIFIED');
 const y=base();y.readback.source='LOCAL_OPERATOR';assert.equal(verify(y).status,'NOT_CERTIFIED');
});
test('historical operator P0-B proof cannot be promoted as FACT runner receipt',()=>{
 const x=base();x.job.resource_name='cerebro-fact001-p0b-proof-20261116-lab';
 assert.equal(verify(x).status,'NOT_CERTIFIED');
});
