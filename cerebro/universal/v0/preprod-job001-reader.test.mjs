import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectJob001ReadSnapshot,ownerIsVerified} from './preprod-job001-reader/job001-projection.mjs';

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
 assert.ok(source.includes('principal?.context?.actor_code!=="CARLOS-ADMIN"'));
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
