import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../registry/engine-registry.v1.json' with { type: 'json' };
import {UniversalGatewayLabV0} from './control-plane.mjs';
import {createStagingObservationReaderLabV0} from './staging-observation-reader.mjs';

const observation={status:'OK',source:'PREPROD_SQL_LIVE_AGGREGATE_NO_EXTERNAL_IO',
  state:'SUSPENDED_BY_OWNER',host:'staging.fenixcapital.es',company_id:'fenix',
  environment:'LAB',source_environment:'PREPROD',global_isolation_verified:false,
  known_controls_closed:true,staging_probed:false,executed_external_actions:false,
  prod_execution_enabled:false,staging_job001:{expected:15,found:15,paused:15,active:0},
  staging_cron:{expected:14,found:8,paused:8,active:0},
  sql_guard:{expected:4,found:4,protected:4}};
const mockActor=async()=>({actor_id:'CARLOS-ADMIN',company_ids:['fenix'],
 scopes:['cerebro:universal:read','cerebro:jobs:read','cerebro:audit:read','cerebro:command:dryrun']});
const ctx={company_id:'fenix',environment:'LAB'};
const owner='A'.repeat(45);
const observationReader={
 readForContext:async()=>({status:'OBSERVED',source:'LIVE_STAGING_SUSPENSION_PREPROD',
  observation,executed_external_actions:false,prod_execution_enabled:false}),
 captureForContext:async()=>({status:'EVIDENCE_PERSISTED',source:'PREPROD_LAB_DURABLE_EVIDENCE',
  observation,evidence_id:'00000000-0000-4000-8000-000000000001',replayed:false,
  executed_external_actions:false,prod_execution_enabled:false})
};

test('gateway serves a live suspension observation without any job execution',async()=>{
 const g=new UniversalGatewayLabV0({registry,authenticate:mockActor,stagingReader:observationReader});
 const r=await g.handle({session_token:owner,action:'get_staging_suspension_live',params:ctx});
 assert.equal(r.status,'OBSERVED');assert.equal(r.observation.staging_job001.paused,15);
 assert.equal(r.prod_execution_enabled,false);assert.equal(r.executed_external_actions,false);
});

test('gateway capture only permits LAB owner scope and a strict idempotent key',async()=>{
 const g=new UniversalGatewayLabV0({registry,authenticate:mockActor,stagingReader:observationReader});
 const params={...ctx,idempotency_key:'lab-observe-0123456789abcd'};
 const r=await g.handle({session_token:owner,action:'capture_staging_suspension',params});
 assert.equal(r.status,'EVIDENCE_PERSISTED');assert.equal(r.executed_external_actions,false);
 await assert.rejects(g.handle({session_token:owner,action:'capture_staging_suspension',
   params:{...params,target_url:'https://staging.fenixcapital.es'}}));
 await assert.rejects(g.handle({session_token:owner,action:'capture_staging_suspension',
   params:{...params,idempotency_key:'invalid'}}));
 await assert.rejects(g.handle({session_token:owner,action:'capture_staging_suspension',
   params:{...params,environment:'PROD'}}));
});

test('governed suspension receipt is advertised as a LAB capability only with owner scopes and reader',async()=>{
 const g=new UniversalGatewayLabV0({registry,authenticate:mockActor,stagingReader:observationReader});
 const list=await g.handle({session_token:owner,action:'list_capabilities',params:ctx});
 assert.equal(list.status,'OK');
 assert.deepEqual(list.capabilities.map(c=>c.capability_id),['gov.staging.suspension.capture']);
 assert.equal(list.capabilities[0].engine_id,'GOV-001');
 assert.equal(list.capabilities[0].side_effects,'APPEND_ONLY_LAB_EVIDENCE');
 assert.equal(list.capabilities[0].cost_budget_eur,0);
 const detail=await g.handle({session_token:owner,action:'get_capability',
  params:{...ctx,capability_id:'gov.staging.suspension.capture'}});
 assert.equal(detail.capability.policy,'LAB_ALLOWLISTED_DURABLE_EVIDENCE_ONLY');
 const status=await g.handle({session_token:owner,action:'get_engine_status',
  params:{...ctx,engine_id:'GOV-001'}});
 assert.deepEqual(status.lab_evidence_capabilities,['gov.staging.suspension.capture']);
 assert.equal(status.runtime,'NOT_VERIFIED');
 const unconnected=new UniversalGatewayLabV0({registry,authenticate:mockActor});
 assert.equal((await unconnected.handle({session_token:owner,action:'list_capabilities',params:ctx})).capabilities.length,0);
 const denied=new UniversalGatewayLabV0({registry,
  authenticate:async()=>({actor_id:'VIEWER',company_ids:['fenix'],scopes:['cerebro:universal:read']}),stagingReader:observationReader});
 assert.equal((await denied.handle({session_token:owner,action:'list_capabilities',params:ctx})).capabilities.length,0);
});

test('reader calls only fixed Supabase URL and never accepts fake evidence',async()=>{
 const requests=[];
 const reader=createStagingObservationReaderLabV0({
  preprodApiKey:'sb_publishable_test_key_123456',
  ownerApiKey:'a'.repeat(60),
  fetchImpl:async(url,options)=>{
   requests.push({url,method:options.method,body:options.body});
   const isCapture=options.method==='POST';
   return {status:200,json:async()=>isCapture?
    {status:'EVIDENCE_PERSISTED',source:'PREPROD_LAB_DURABLE_EVIDENCE',observation,
     prod_execution_enabled:false,executed_external_actions:false,
     evidence_id:'00000000-0000-4000-8000-000000000001',replayed:false,observation_executed:true}:
    {status:'OBSERVED',source:'LIVE_STAGING_SUSPENSION_PREPROD',observation,
     prod_execution_enabled:false,executed_external_actions:false}};
  }
 });
 const context={...ctx,session_token:owner};
 assert.equal((await reader.readForContext(context)).status,'OBSERVED');
 assert.equal((await reader.captureForContext({...context,idempotency_key:'lab-observe-0123456789abcd'})).status,'EVIDENCE_PERSISTED');
 assert.equal(requests.length,2);
 assert.ok(requests.every(x=>x.url==='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-universal-staging-observe-lab-v0'));
 assert.ok(!requests.some(x=>x.url.includes('staging.fenixcapital.es')));
});
test('reader fails closed on unauthenticated or invalid upstream results',async()=>{
 const opts={preprodApiKey:'sb_publishable_test_key_123456',ownerApiKey:'a'.repeat(60)};
 const denied=createStagingObservationReaderLabV0({...opts,fetchImpl:async()=>({status:403})});
 assert.equal((await denied.readForContext({...ctx,session_token:owner})).status,'UNAVAILABLE');
 const fake=createStagingObservationReaderLabV0({...opts,fetchImpl:async()=>({status:200,json:async()=>({
   status:'OBSERVED',source:'LIVE_STAGING_SUSPENSION_PREPROD',prod_execution_enabled:false,
   executed_external_actions:false,observation:{...observation,global_isolation_verified:true}})})});
 assert.equal((await fake.readForContext({...ctx,session_token:owner})).status,'UNAVAILABLE');
});
