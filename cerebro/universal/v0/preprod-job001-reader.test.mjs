import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectJob001ReadSnapshot,projectCronObservation,projectDispatchRpcObservation,ownerIsVerified} from './preprod-job001-reader/job001-projection.mjs';

const source=fs.readFileSync(new URL('./preprod-job001-reader/index.ts',import.meta.url),'utf8');
const observedAt='2026-11-13T18:30:00.000Z';
const jobs=[{job_id:2,company_id:'FENIX_CAPITAL',engine_id:'SEO-001',environment:'PREPROD',version:'v0',enabled:true,updated_at:'2026-09-28T10:57:15Z'}];
const external=[{job_id:25,company_id:'FENIX_CAPITAL',engine_id:'SOCIAL-001',environment:'PREPROD',version:'v0',enabled:false,updated_at:'2026-09-28T12:08:28Z'}];
const engines=[{company_id:'fenix',engine_id:'COMP-REG-001',environment:'PREPROD',version:'1.0.0',state:'GREEN',updated_at:'2026-10-13T12:52:01Z'}];

test('owner identity accepts canonical wrapped or flat context without widening privileges',()=>{
 assert.equal(ownerIsVerified({actor_code:'CARLOS-ADMIN'}),true);
 assert.equal(ownerIsVerified({context:{actor_code:'CARLOS-ADMIN'}}),true);
 assert.equal(ownerIsVerified({ok:true,context:{actor_code:'CARLOS-ADMIN'}}),true);
 assert.equal(ownerIsVerified({ok:false,context:{actor_code:'CARLOS-ADMIN'}}),false);
 assert.equal(ownerIsVerified({context:{actor_code:'CARLOS-ADMIN',company_id:'aion'},ok:false}),false);
 assert.equal(ownerIsVerified({actor_code:'OTHER'}),false);
 assert.equal(ownerIsVerified({context:{actor_code:'OTHER'}}),false);
 assert.equal(ownerIsVerified(null),false);
 assert.equal(ownerIsVerified({}),false);
 assert.ok(source.includes('if(!ownerIsVerified(principal))'));
 assert.equal(source.includes('principal?.ok!==true'),false);
});
test('legacy PREPROD controls are non-operational metadata with evidence and environment preserved',()=>{
 const r=projectJob001ReadSnapshot({jobs,external,engines,telemetryCount:0,observedAt});
 assert.equal(r.status,'OK');
 assert.equal(r.company_id,'fenix');
 assert.equal(r.source_company_id,'FENIX_CAPITAL');
 assert.equal(r.environment,'PREPROD');
 assert.deepEqual(r.totals,{job_controls:1,external_controls:1,engine_state_records:1,telemetry_records:0});
 assert.equal(r.telemetry_status,'NO_TELEMETRY_ROWS');
 assert.equal(r.job_controls[0].enabled,true);
 assert.equal(r.job_controls[0].freshness,'STALE_CONFIG');
 assert.equal(r.job_controls[0].runtime_verified,false);
 assert.equal(r.job_controls[0].dispatch_verified,false);
 assert.equal(r.external_controls[0].enabled,false);
 assert.equal(r.engine_state_records[0].declared_state,'GREEN');
 assert.equal(r.engine_state_records[0].runtime_verified,false);
 assert.equal(r.live_execution_verified,false);
 assert.equal(r.actual_dispatch_enabled,false);
 assert.equal(r.job001_queue_connected,false);
 assert.equal(r.write_operations,0);
});
test('cross-tenant, PROD, malformed job IDs and missing authentic source rows are refused',()=>{
 for(const variant of [
  {...jobs[0],company_id:'aion'},
  {...jobs[0],environment:'PROD'},
  {...jobs[0],job_id:0},
  {...jobs[0],enabled:'true'}
 ]){
  assert.throws(()=>projectJob001ReadSnapshot({jobs:[variant],external,engines,telemetryCount:0,observedAt}),/CROSS_COMPANY_OR_INVALID_ROW/);
 }
 assert.throws(()=>projectJob001ReadSnapshot({jobs,external,engines:[{...engines[0],company_id:'aion'}],telemetryCount:0,observedAt}),/CROSS_COMPANY_OR_INVALID_ROW/);
 assert.throws(()=>projectJob001ReadSnapshot({jobs,external,engines,telemetryCount:-1,observedAt}),/TELEMETRY_COUNT_INVALID/);
 assert.throws(()=>projectJob001ReadSnapshot({jobs:new Array(65).fill(jobs[0]),external,engines,telemetryCount:0,observedAt}),/SOURCE_SIZE_INVALID/);
});
test('new isolated Edge route has only GET + owner resolver + Fénix LAB gate + fixed PREPROD queries',()=>{
 assert.ok(source.includes('if(req.method!=="GET")'));
 assert.ok(source.includes('ownerResponse=await fetch(PROD_OWNER'));
 assert.ok(source.includes('if(!ownerIsVerified(principal))'));
 assert.ok(source.includes('url.searchParams.get("environment")!=="LAB"'));
 assert.ok(source.includes('url.searchParams.get("company_id")!=="fenix"'));
 assert.ok(source.includes('.eq("company_id","FENIX_CAPITAL").eq("environment","PREPROD")'));
 assert.ok(source.includes('.eq("company_id","fenix").eq("environment","PREPROD")'));
 assert.ok(source.includes('.select("company_id",{head:true,count:"exact"}).eq("company_id","fenix")'));
 assert.ok(source.includes('hnqlnvakzaywtafeiybt.supabase.co'));
 assert.ok(source.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'));
 assert.ok(!source.includes('cerebro_job001_dispatch_preprod'));
 assert.ok(!source.includes('x-cerebro-job-secret'));
 assert.ok(!source.includes('.insert('));
 assert.ok(!source.includes('.update('));
 assert.ok(!source.includes('.upsert('));
 assert.ok(!source.includes('.delete('));
 assert.ok(!source.includes('serviceKey}'));
});
test('stale vs recent config timestamps distinguish metadata from live operational proof',()=>{
 const recent={...jobs[0],updated_at:'2026-11-13T18:29:00Z'};
 const r=projectJob001ReadSnapshot({jobs:[recent],external:[],engines:[],telemetryCount:3,observedAt});
 assert.equal(r.job_controls[0].freshness,'RECENT_CONFIG');
 assert.equal(r.job_controls[0].runtime_verified,false);
 assert.equal(r.telemetry_status,'RECORDS_PRESENT_NOT_VALIDATED');
 assert.equal(r.live_execution_verified,false);
});

test('pg_cron PREPROD observed runs are sanitized, fixed to 4 IDs, not Hostinger master runtime',()=>{
 const jobs=[6,22,23,25].map(id=>({legacy_pg_cron_job_id:id,active:true,last_status:'succeeded',
  last_run_at:'2026-11-13T19:07:00+00:00',last_finished_at:'2026-11-13T19:07:01+00:00',
  run_record_present:true,downstream_effect_verified:false,secret:'NEVER_LEAK'}));
 const raw={source:'PREPROD_PG_CRON_OBSERVATION',is_job001_hostinger_master:false,is_job001_runtime_proof:false,jobs};
 const projected=projectCronObservation(raw,{observedAt:'2026-11-13T19:30:00Z'});
 assert.equal(projected.status,'OK');
 assert.equal(projected.active,4);
 assert.equal(projected.run_records,4);
 assert.equal(projected.recent_successful_cron_commands,4);
 assert.equal(projected.is_job001_hostinger_master,false);
 assert.equal(projected.is_job001_runtime_proof,false);
 assert.equal(JSON.stringify(projected).includes('NEVER_LEAK'),false);
 for(const change of [
  {...raw,is_job001_hostinger_master:true},
  {...raw,is_job001_runtime_proof:true},
  {...raw,jobs:[...jobs,{...jobs[0],legacy_pg_cron_job_id:9}]},
  {...raw,jobs:[jobs[0],jobs[0]]},
  {...raw,jobs:[{...jobs[0],downstream_effect_verified:true}]}
 ]){
  const response=projectCronObservation(change,{observedAt:'2026-11-13T19:30:00Z'});
  assert.equal(response.status,'UNAVAILABLE');
 }
});

test('JOB001 PostgREST call observation is cumulative only and cannot claim job completion',()=>{
 const raw={source:'PREPROD_JOB001_DISPATCH_RPC_STATS',
  source_semantics:'POSTGREST_SQL_RPC_INVOCATION_COUNTER_NOT_JOB_COMPLETION',
  observed_at:'2026-11-13T20:29:37Z',stats_reset_at:'2026-08-14T16:57:07Z',
  matching_normalized_statements:1,rpc_calls_since_reset:79994,
  hostinger_origin_verified:false,runtime_execution_verified:false,downstream_effect_verified:false,
  secret:'DO_NOT_LEAK'};
 const x=projectDispatchRpcObservation(raw);
 assert.equal(x.status,'OK');assert.equal(x.rpc_calls_since_reset,79994);
 assert.equal(x.runtime_execution_verified,false);
 assert.equal(x.downstream_effect_verified,false);
 assert.equal(JSON.stringify(x).includes('DO_NOT_LEAK'),false);
 for(const patch of [
  {runtime_execution_verified:true},{downstream_effect_verified:true},
  {hostinger_origin_verified:true},{rpc_calls_since_reset:-2},
  {rpc_calls_since_reset:'79994'},{matching_normalized_statements:0},
  {stats_reset_at:'INVALID'}
 ])assert.equal(projectDispatchRpcObservation({...raw,...patch}).status,'UNAVAILABLE');
});
