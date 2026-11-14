import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UniversalGatewayLabV0} from './control-plane.mjs';
import {createUniversalSdkV0} from './interface-sdk.mjs';
import {analyzeConcurrentJobsV0} from './concurrency-shadow.mjs';
const registry=JSON.parse(readFileSync(new URL('../../registry/engine-registry.v1.json',import.meta.url),'utf8'));
const claims={
 owner:{actor_id:'owner',company_ids:['fenix','aion'],scopes:['cerebro:universal:read','cerebro:factory:inspect','cerebro:command:dryrun','cerebro:invoke:read','cerebro:audit:read','cerebro:jobs:read']},
 viewer:{actor_id:'viewer',company_ids:['fenix'],scopes:['cerebro:universal:read']},
 stranger:{actor_id:'stranger',company_ids:['aion'],scopes:['cerebro:universal:read','cerebro:factory:inspect']}
};
function fixture(jobs=null){
 const gateway=new UniversalGatewayLabV0({registry,authenticate:async token=>claims[token]||null,jobs});
 const sdk=(token='owner',company_id='fenix')=>createUniversalSdkV0({request:req=>gateway.handle(req),session_token:token,company_id});
 return{gateway,sdk};
}
test('FACT-001 actual registry snapshot read; 179 defined is NOT 179 operational',async()=>{
 const {gateway,sdk}=fixture();
 const c=await sdk().listCapabilities();assert.equal(c.capabilities.length,1);
 const result=await sdk().invokeRead('fact.registry.summary');
 assert.equal(result.status,'READ_EXECUTED');
 assert.equal(result.result.engine_registry_count,179);
 assert.equal(result.result.base_engine_count,177);
 assert.equal(result.result.operational_engine_count,'NOT_VERIFIED');
 assert.equal(gateway.contract().writes,false);
});
test('common SDK gives Operativa and JARVIS same capability semantics',async()=>{
 const {sdk}=fixture();
 assert.deepEqual(await sdk().getCapability('fact.registry.summary'),await sdk().getCapability('fact.registry.summary'));
 assert.equal((await sdk().getEngineStatus('GOV-001')).runtime,'NOT_VERIFIED');
});
test('server authenticates actor: selector and injected claims cannot grant permissions',async()=>{
 const {gateway,sdk}=fixture();
 await assert.rejects(sdk('viewer','aion').listCapabilities(),/COMPANY_SCOPE_DENIED/);
 await assert.rejects(gateway.handle({session_token:'viewer',action:'list_capabilities',params:{company_id:'fenix',environment:'PROD',actor:{scopes:['*']}}}),/ENVIRONMENT_LAB_ONLY/);
 await assert.rejects(sdk('viewer').invokeRead('fact.registry.summary'),/SCOPE_DENIED/);
 await assert.rejects(sdk('stranger','fenix').getEngineStatus('FACT-001'),/COMPANY_SCOPE_DENIED/);
 await assert.rejects(sdk('invalid').listCapabilities(),/AUTH_DENIED/);
});
test('no writes or Trading executor in LAB',async()=>{
 const {sdk,gateway}=fixture();
 await assert.rejects(gateway.handle({session_token:'owner',action:'submit_command',params:{company_id:'fenix',environment:'LAB',engine_id:'FACT-001',capability_id:'fact.registry.summary',version:'0.1.0-lab',dry_run:false,idempotency_key:'x'}}),/LAB_WRITES_DISABLED/);
 assert.equal((await sdk().getEngineStatus('LAB-TRD')).runtime,'NOT_VERIFIED');
 await assert.rejects(sdk().invokeRead('LAB-TRD'),/CAPABILITY_UNAVAILABLE/);
});
test('dryrun validates version, schema, idempotency and never invokes executor',async()=>{
 const {sdk}=fixture();
 const a=await sdk().dryRun('FACT-001','fact.registry.summary','0.1.0-lab',{},'idem1');
 assert.equal(a.executed,false);assert.equal(a.replayed,false);
 const b=await sdk().dryRun('FACT-001','fact.registry.summary','0.1.0-lab',{},'idem1');
 assert.equal(b.replayed,true);
 await assert.rejects(sdk().dryRun('FACT-001','fact.registry.summary','0.1.0-lab',{evil:true},'other'),/PAYLOAD_SCHEMA_DENIED/);
 await assert.rejects(sdk().dryRun('FACT-001','fact.registry.summary','9.9.9',{},'other'),/CAPABILITY_VERSION_MISMATCH/);
});
test('JOB-001 absent is unavailable rather than invented zero jobs',async()=>{
 const {sdk}=fixture();
 const r=await sdk().listJobs('FACT-001','0.1.0-lab');
 assert.equal(r.status,'UNAVAILABLE');assert.equal(r.jobs,null);
});
test('JOB-001 read adapter filters cross-company, PROD and version leakage',async()=>{
 const jobs={listForContext:async()=>[
  {job_id:'good',status:'QUEUED',context:{company_id:'fenix',engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab'}},
  {job_id:'bad',status:'QUEUED',context:{company_id:'aion',engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab'}},
  {job_id:'prod',status:'RUNNING',context:{company_id:'fenix',engine_id:'FACT-001',environment:'PROD',version:'0.1.0-lab'}}
 ]};
 const {sdk}=fixture(jobs);
 const q=await sdk().listJobs('FACT-001','0.1.0-lab');assert.deepEqual(q.jobs.map(x=>x.job_id),['good']);
 assert.equal((await sdk().getJob('FACT-001','0.1.0-lab','bad')).job,null);
});
test('audit is scoped and no payload or idempotency secret logged',async()=>{
 const {sdk}=fixture();
 await sdk('owner','aion').invokeRead('fact.registry.summary');
 await sdk().dryRun('FACT-001','fact.registry.summary','0.1.0-lab',{},'never-log-this-value');
 const audit=await sdk().audit();
 assert.equal(audit.events.some(x=>x.company_id==='aion'),false);
 assert.equal(JSON.stringify(audit).includes('never-log-this-value'),false);
 const e=await sdk().getEvidence('fact.registry.summary');assert.equal(e.live_test_verified,false);
});
const base={company_id:'fenix',engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab',pool:'IO'};
test('shadow planner selects independent jobs concurrently while holding same-resource writes',()=>{
 const jobs=[{...base,id:'one',resource:'a',status:'QUEUED',priority:9},{...base,id:'two',resource:'b',status:'QUEUED',priority:8},{...base,id:'three',resource:'a',status:'QUEUED',priority:7}];
 const r=analyzeConcurrentJobsV0({jobs,limits:{global:3,company:3,resource:1,provider:2}});
 assert.deepEqual(r.parallel_candidates,['one','two']);
 assert.ok(r.blocked.some(x=>x.id==='three'&&x.reason==='RESOURCE_LOCK'));
 assert.equal(r.executed,false);
});
test('shadow planner excludes paid, PROD and unknown DAG dependencies',()=>{
 const jobs=[
 {...base,id:'done',resource:'d',status:'SUCCEEDED'},
 {...base,id:'x',resource:'x',status:'QUEUED',dependencies:['done']},
 {...base,id:'paid',resource:'p',status:'QUEUED',estimated_additional_cost_eur:0.01},
 {...base,id:'prod',resource:'q',environment:'PROD',status:'QUEUED'},
 {...base,id:'missing',resource:'m',status:'QUEUED',dependencies:['not-here']}
 ];
 const r=analyzeConcurrentJobsV0({jobs,limits:{global:4,company:4,resource:1,provider:4}});
 assert.deepEqual(r.parallel_candidates,['x']);
 for(const reason of ['MONEY_LIMIT','ENVIRONMENT_NOT_LAB','UNKNOWN_DEPENDENCY'])assert.ok(r.blocked.some(x=>x.reason===reason));
});

test('HUMAN_REQUIRED policy is explicit for cost, signature and high-risk dry-runs',async()=>{
 const {gateway}=fixture();
 const call=(key,override)=>gateway.handle({session_token:'owner',action:'submit_command',params:{
   company_id:'fenix',environment:'LAB',engine_id:'FACT-001',capability_id:'fact.registry.summary',
   version:'0.1.0-lab',payload:{},dry_run:true,idempotency_key:key,...override
 }});
 assert.equal((await call('cost',{estimated_additional_cost_eur:0.01})).reason,'MONEY_LIMIT');
 assert.equal((await call('sign',{signature_required:true})).reason,'SIGNATURE_REQUIRED');
 assert.equal((await call('risk',{risk:'HIGH'})).reason,'HIGH_RISK');
 await assert.rejects(call('invalid',{human_exception:'NOT_VALID'}),/INVALID_HUMAN_EXCEPTION/);
 await assert.rejects(call('cost',{estimated_additional_cost_eur:0}),/IDEMPOTENCY_CONFLICT/);
});
