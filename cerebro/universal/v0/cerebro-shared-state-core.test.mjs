import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSharedState,classifyProfile,buildEngineActivity,CONTRACT} from './cerebro-shared-state-core.mjs';
import engineRegistry from '../../registry/engine-registry.v1.json' with {type:'json'};
const now=Date.parse('2026-11-18T12:00:00Z');
const source={status:'ACTIVO',observed_at:'2026-11-18T11:59:40Z'};
const run={provider:'GITHUB_ACTIONS',runtime_id:'44288787233',engine_id:'SEO-001',profile_key:'AGENT_ROLE:SEO-PF01:DIRECTOR',profile_provenance:'EXPLICIT_EXECUTOR_ATTESTATION',company_id:'fenix',observed_at:source.observed_at,last_run:'2026-11-18T11:59:25Z',last_run_result:'success',source:'CEREBRO_CONSOLE_ACTIVITY_V0',evidence:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44288787233',status:'POR_VERIFICAR'};
const profile=(id,kind='AGENT_ROLE')=>({id,name:id,kind,family:'SEO_ENTERPRISE',engine_ids:['SEO-001'],parent_id:null,runtime_verified:false});
test('group by original department no migration, no orphan and exact counts',()=>{
 const data=buildSharedState([profile('A'),profile('B'),{...profile('T','SUBAGENT_TEMPLATE'),family:'SOCIAL_FACEBOOK'}],source,now);
 assert.equal(data.schema,CONTRACT);assert.equal(data.overview.total_profiles,3);assert.equal(data.overview.states.DEFINIDO,1);
 assert.equal(data.departments.find(x=>x.department_key==='SEO_ENTERPRISE').total,2);
 assert.equal(data.records[2].shared_state.department_key,'SOCIAL_FACEBOOK');
 assert.equal(data.records[0].id,'A');
});
test('engine ID association alone never makes the role active or failing',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,profile_key:null,profile_provenance:null,status:'ACTIVO'},runtime_verified:true};
 assert.equal(classifyProfile(x,source,now).status,'POR_VERIFICAR');
});
test('missing explicit profile attestation never becomes active',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,profile_key:undefined,status:'ACTIVO'},runtime_verified:true};
 assert.equal(classifyProfile(x,source,now).status,'POR_VERIFICAR');
});
test('another profile kind or cross-company attestation is rejected',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,status:'ACTIVO'},runtime_verified:true};
 assert.equal(classifyProfile({...x,kind:'SUBAGENT_ROLE'},source,now).status,'POR_VERIFICAR');
 assert.equal(classifyProfile({...x,runtime_observation:{...run,company_id:'aion'}},source,now).status,'POR_VERIFICAR');
});
test('explicit attestation is the only proof that a shared engine is running a specialist',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,status:'ACTIVO',last_run_result:null},runtime_verified:true};
 assert.equal(classifyProfile(x,source,now).status,'ACTIVO');
});
test('a fresh EXACT id with running proof can be active',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,status:'ACTIVO',last_run_result:null},runtime_verified:true};
 assert.equal(classifyProfile(x,source,now).status,'ACTIVO');
});
test('exact failed and passed job do not claim perfect quality',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:run};
 assert.equal(classifyProfile(x,source,now).status,'PARCIAL');
 assert.equal(classifyProfile({...x,runtime_observation:{...run,last_run_result:'failure'}},source,now).status,'FALLANDO');
});
test('PERFECTO requires quality tests, Tribunal GREEN and verified rollback together',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,quality_gate:'TRIBUNAL_GREEN',required_tests_passed:true,rollback_verified:true}};
 assert.equal(classifyProfile(x,source,now).status,'PERFECTO');
 assert.equal(classifyProfile({...x,runtime_observation:{...x.runtime_observation,rollback_verified:false}},source,now).status,'PARCIAL');
 assert.equal(classifyProfile({...x,runtime_observation:{...x.runtime_observation,quality_gate:'PENDING'}},source,now).status,'PARCIAL');
});
test('stale or degraded sources cannot claim running',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,status:'ACTIVO'},runtime_verified:true};
 assert.equal(classifyProfile(x,{status:'DEGRADADO',observed_at:source.observed_at},now).status,'POR_VERIFICAR');
 assert.equal(classifyProfile(x,{...source,observed_at:'2026-11-17T12:00:00Z'},now).status,'POR_VERIFICAR');
});
test('no exact evidence, forged provider or wrong company is rejected',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,status:'ACTIVO'},runtime_verified:true};
 for(const update of [{provider:'CLOUDFLARE'},{company_id:'other'},{evidence:'https://example.com/fake'},{runtime_id:'fake'}]){
  assert.equal(classifyProfile({...x,runtime_observation:{...x.runtime_observation,...update}},source,now).status,'POR_VERIFICAR');
 }
});
test('duplicates rejected without mutation',()=>assert.throws(()=>buildSharedState([profile('A'),profile('A')],source,now),/DUPLICATE/));

test('all 179 canonical engines remain independent of logical profile certification',()=>{
 const report=buildEngineActivity(engineRegistry.engine_ids,source,now);
 assert.equal(report.registry_count,179);
 assert.equal(report.observed_workflow_engines,0);
 assert.equal(report.runtime_health_verified,0);
 assert.equal(report.status_counts.POR_VERIFICAR,179);
});
test('an actual workflow with exact canonical engine ID changes only that engine',()=>{
 const r={engine_id:'SEO-001',company_id:'fenix',provider:'GITHUB_ACTIONS',runtime_id:'12345678',
  observed_at:source.observed_at,status:'in_progress',conclusion:null,
  evidence:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/12345678'};
 const one=buildEngineActivity(engineRegistry.engine_ids,{...source,engine_runs:[r]},now);
 assert.equal(one.status_counts.ACTIVO,1);
 assert.equal(one.status_counts.POR_VERIFICAR,178);
 assert.equal(one.runtime_health_verified,0);
 const failed=buildEngineActivity(engineRegistry.engine_ids,{...source,engine_runs:[{...r,status:'completed',conclusion:'failure'}]},now);
 assert.equal(failed.status_counts.FALLANDO,1);
 const success=buildEngineActivity(engineRegistry.engine_ids,{...source,engine_runs:[{...r,status:'completed',conclusion:'success'}]},now);
 assert.equal(success.status_counts.PARCIAL,1);
 const stale=buildEngineActivity(engineRegistry.engine_ids,{...source,status:'DEGRADADO',engine_runs:[r]},now);
 assert.equal(stale.status_counts.ACTIVO,0);
 assert.equal(stale.status_counts.POR_VERIFICAR,179);
});
test('canonical 3RD-001 motor ID is accepted, never misclassified as a specialist',()=>{
 const runtime={engine_id:'3RD-001',company_id:'fenix',provider:'GITHUB_ACTIONS',runtime_id:'12345678',
  observed_at:source.observed_at,status:'in_progress',conclusion:null,
  evidence:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/12345678'};
 const r=buildEngineActivity(engineRegistry.engine_ids,{...source,engine_runs:[runtime]},now);
 assert.equal(r.status_counts.ACTIVO,1);
 assert.equal(r.records.find(x=>x.engine_id==='3RD-001').status,'ACTIVO');
 assert.equal(r.runtime_health_verified,0);
});
test('engine observations with fake URL or wrong company cannot assert real status',()=>{
 const r={engine_id:'SEO-001',company_id:'other',provider:'GITHUB_ACTIONS',runtime_id:'12345678',
  observed_at:source.observed_at,status:'in_progress',evidence:'https://example.org/runs/12345678'};
 const x=buildEngineActivity(engineRegistry.engine_ids,{...source,engine_runs:[r]},now);
 assert.equal(x.observed_workflow_engines,0);
 assert.equal(x.status_counts.ACTIVO,0);
});
