import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeFleetRun,summarizeFleetRuns,summarizeFleetRoles,classifyFleetMessage,planFleetControl} from './operator-fleet-logic.mjs';
const reg=JSON.parse(fs.readFileSync(new URL('../../registry/role-agent-registry.v1.json',import.meta.url),'utf8'));
const repo='carlosjmunoz78/fenix-capital-inmo-map';
const run=(id,status='in_progress')=>({id,name:'JOB LAB',status,conclusion:null,updated_at:'2026-11-15T00:00:00Z',
 html_url:'https://github.com/'+repo+'/actions/runs/'+id,repository:{full_name:repo}});
test('11 role definitions are never mislabeled as running agents or observed subagents',()=>{
 const r=summarizeFleetRoles(reg);
 assert.equal(r.declared_role_profiles,11);
 assert.deepEqual(r.by_department,{ENGINEERING:10,REVENUE_SALES:1});
 assert.equal(r.active_agent_count,null);
 assert.equal(r.verified_subagent_count,null);
 assert.equal(r.hierarchy_complete,false);
 assert.equal(r.entries.filter(x=>x.runtime_verified).length,0);
});
test('github observed workflow jobs never become autonomous agent/engine counts',()=>{
 const s=summarizeFleetRuns({total_count:200,workflow_runs:[run(1),run(2,'queued'),run(3,'completed')]},repo);
 assert.equal(s.observed_sample,3);
 assert.equal(s.active_in_sample,1);
 assert.equal(s.queued_in_sample,1);
 assert.equal(s.total_repo_run_count,200);
 assert.equal(s.recent[0].agent_id,null);
 assert.equal(s.recent[0].engine_id,null);
});
test('forged repo URLs, paths and statuses fail closed',()=>{
 assert.equal(normalizeFleetRun({...run(7),html_url:'https://example.com/steal'},repo),null);
 assert.equal(normalizeFleetRun({...run(7),repository:{full_name:'other/repo'}},repo),null);
 assert.equal(normalizeFleetRun({...run(7),status:'I_AM_RUNNING'},repo),null);
 assert.equal(summarizeFleetRuns({workflow_runs:Array(65).fill(run(1))},repo),null);
});
test('Spanish natural language routes inventory and blocks actions until target and executor',()=>{
 assert.deepEqual(classifyFleetMessage('¿cuántos agentes y subagentes tenemos en cada sitio?'),{kind:'FLEET_QUERY'});
 assert.deepEqual(classifyFleetMessage('qué motores hay y cuál está trabajando'),{kind:'FLEET_QUERY'});
 assert.deepEqual(classifyFleetMessage('pausar SEO-001'),{kind:'CONTROL_PRECHECK',action:'PAUSE',engine_id:'SEO-001'});
 assert.deepEqual(classifyFleetMessage('reactivar SEO-001'),{kind:'CONTROL_PRECHECK',action:'RESUME',engine_id:'SEO-001'});
 assert.equal(classifyFleetMessage('hola'),null);
 assert.equal(planFleetControl({action:'PAUSE',engine_id:'SEO-001'}).reason,'NO_VERIFIED_CONTROL_EXECUTOR');
 assert.equal(planFleetControl({action:'RESUME',engine_id:'SEO-001',environment:'STAGING'}).reason,'PROTECTED_ENVIRONMENT');
 assert.equal(planFleetControl({action:'PAUSE'}).reason,'EXACT_TARGET_REQUIRED');
 assert.equal(planFleetControl({action:'DELETE',engine_id:'SEO-001'}).reason,'ACTION_NOT_ALLOWLISTED');
 assert.deepEqual(classifyFleetMessage('pausar C360-001'),{kind:'CONTROL_PRECHECK',action:'PAUSE',engine_id:'C360-001'});
 assert.equal(planFleetControl({action:'PAUSE',engine_id:'C360-001'}).reason,'NO_VERIFIED_CONTROL_EXECUTOR');
});
test('fleet control source excludes all real mutation primitives by construction',()=>{
 const c=fs.readFileSync(new URL('./operator-fleet-logic.mjs',import.meta.url),'utf8');
 assert.ok(!/fetch\s*\(|\.delete\s*\(|\.insert\s*\(|\.update\s*\(/.test(c));
 assert.ok(c.includes('NO_VERIFIED_CONTROL_EXECUTOR'));
});

test('new fleet lambda loads under Node24 and refuses any non-Preview request before network access',async(t)=>{
 const originalEnv=process.env.VERCEL_ENV,originalFetch=globalThis.fetch;
 t.after(()=>{process.env.VERCEL_ENV=originalEnv;globalThis.fetch=originalFetch});
 process.env.VERCEL_ENV='production';
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('UNAUTHORIZED_NETWORK')};
 const {default:handler}=await import('../../../api/cerebro-fleet-observe.ts');
 let status=null,body=null;
 const res={setHeader(){},status(code){status=code;return this},json(o){body=o;return this}};
 await handler({method:'GET',url:'/api/cerebro-fleet-observe?company_id=fenix',
  headers:{host:'fenix-capital-preprod-qa.vercel.app'}},res);
 assert.equal(status,403);assert.equal(body.reason,'PREVIEW_ONLY');assert.equal(calls,0);
});

test('completed successful GitHub workflow run timings are bounded proxies, never engine timings',()=>{
 const completed=(id,s,updated)=>({...run(id,'completed'),name:'CEREBRO Universal Gateway V0 LAB contract CI',
  conclusion:'success',run_started_at:s,updated_at:updated});
 const source=[
  completed(201,'2026-11-15T10:00:00Z','2026-11-15T10:00:10Z'),
  completed(202,'2026-11-15T10:00:00Z','2026-11-15T10:00:20Z'),
  completed(203,'2026-11-15T10:00:00Z','2026-11-15T10:00:30Z'),
  completed(204,'2026-11-15T10:00:00Z','2026-11-15T10:00:40Z'),
  {...completed(205,'2026-11-15T10:00:00Z','2026-11-15T10:00:25Z'),conclusion:'failure'}
 ];
 const summary=summarizeFleetRuns({workflow_runs:source},repo);
 assert.equal(summary.timing_samples.length,1);
 assert.deepEqual(summary.timing_samples[0],{
  workflow_name:'CEREBRO Universal Gateway V0 LAB contract CI',sample_size:4,
  p50_upper_bound_seconds:20,p90_upper_bound_seconds:40,
  method:'GITHUB_RUN_STARTED_TO_LAST_UPDATE_PROXY',engine_mapping_verified:false
 });
 assert.equal(summary.recent[0].engine_id,null);
 assert.equal(summary.recent[0].agent_id,null);
 assert.equal(summary.recent[0].duration_upper_bound_seconds,10);
 assert.equal(summary.recent[4].duration_upper_bound_seconds,null);
 assert.equal(normalizeFleetRun({...run(303,'completed'),conclusion:'success',
  run_started_at:'2026-11-14T00:00:00Z',updated_at:'2026-11-15T10:00:00Z'},repo)?.duration_upper_bound_seconds,122400);
 assert.equal(normalizeFleetRun({...run(304,'completed'),conclusion:'success',
  run_started_at:'INVALID'},repo)?.duration_upper_bound_seconds,null);
});
test('no ETA extrapolation when fewer than three matching successful runs exist',()=>{
 const raw={workflow_runs:[{...run(12,'completed'),conclusion:'success',
  run_started_at:'2026-11-15T10:00:00Z',updated_at:'2026-11-15T10:00:10Z'}]};
 assert.deepEqual(summarizeFleetRuns(raw,repo)?.timing_samples,[]);
});

test('declared role engine mappings are explicit, bounded and never count live agents',()=>{
 const actual=summarizeFleetRoles(reg);
 assert.ok(actual);
 assert.equal(actual.entries.length,11);
 assert.deepEqual(actual.entries.find(r=>r.id==='AGT-SALES-EXECUTIVE').engine_bindings,
  ['SALE-001','LEAD-001','NBA-001','COM-001','CRM-001','C360-001','CTX-001']);
 assert.equal(actual.entries.filter(r=>r.engine_bindings.includes('FACT-001')).length,10);
 assert.equal(actual.entries.filter(r=>r.engine_bindings.includes('SEO-001')).length,0);
 assert.equal(actual.active_agent_count,null);
 assert.equal(actual.entries.every(r=>r.runtime_verified===false),true);
 const forged={roles:[{...reg.roles[0],engines:['FACT-001','FACT-001']}]};
 assert.equal(summarizeFleetRoles(forged),null);
 const forged2={roles:[{...reg.roles[0],engines:['https://attacker.invalid/agent']}]};
 assert.equal(summarizeFleetRoles(forged2),null);
});
