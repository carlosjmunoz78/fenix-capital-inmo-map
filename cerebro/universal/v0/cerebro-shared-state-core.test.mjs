import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSharedState,classifyProfile,CONTRACT} from './cerebro-shared-state-core.mjs';
const now=Date.parse('2026-11-18T12:00:00Z');
const source={status:'ACTIVO',observed_at:'2026-11-18T11:59:40Z'};
const run={provider:'GITHUB_ACTIONS',runtime_id:'44288787233',engine_id:'SEO-PF01:DIRECTOR',company_id:'fenix',observed_at:source.observed_at,last_run:'2026-11-18T11:59:25Z',last_run_result:'success',source:'CEREBRO_CONSOLE_ACTIVITY_V0',evidence:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44288787233',status:'POR_VERIFICAR'};
const profile=(id,kind='AGENT_ROLE')=>({id,name:id,kind,family:'SEO_ENTERPRISE',engine_ids:['SEO-001'],parent_id:null,runtime_verified:false});
test('group by original department no migration, no orphan and exact counts',()=>{
 const data=buildSharedState([profile('A'),profile('B'),{...profile('T','SUBAGENT_TEMPLATE'),family:'SOCIAL_FACEBOOK'}],source,now);
 assert.equal(data.schema,CONTRACT);assert.equal(data.overview.total_profiles,3);assert.equal(data.overview.states.DEFINIDO,1);
 assert.equal(data.departments.find(x=>x.department_key==='SEO_ENTERPRISE').total,2);
 assert.equal(data.records[2].shared_state.department_key,'SOCIAL_FACEBOOK');
 assert.equal(data.records[0].id,'A');
});
test('engine ID association alone never makes the role active or failing',()=>{
 const x={...profile('SEO-PF01:DIRECTOR'),runtime_observation:{...run,engine_id:'SEO-001',status:'ACTIVO'},runtime_verified:true};
 assert.equal(classifyProfile(x,source,now).status,'POR_VERIFICAR');
});
test('a fresh EXACT id with running proof can be active',()=>{
 const x={...profile(run.engine_id),runtime_observation:{...run,status:'ACTIVO',last_run_result:null},runtime_verified:true};
 assert.equal(classifyProfile(x,source,now).status,'ACTIVO');
});
test('exact failed and passed job do not claim perfect quality',()=>{
 const x={...profile(run.engine_id),runtime_observation:run};
 assert.equal(classifyProfile(x,source,now).status,'PARCIAL');
 assert.equal(classifyProfile({...x,runtime_observation:{...run,last_run_result:'failure'}},source,now).status,'FALLANDO');
});
test('stale or degraded sources cannot claim running',()=>{
 const x={...profile(run.engine_id),runtime_observation:{...run,status:'ACTIVO'},runtime_verified:true};
 assert.equal(classifyProfile(x,{status:'DEGRADADO',observed_at:source.observed_at},now).status,'POR_VERIFICAR');
 assert.equal(classifyProfile(x,{...source,observed_at:'2026-11-17T12:00:00Z'},now).status,'POR_VERIFICAR');
});
test('no exact evidence, forged provider or wrong company is rejected',()=>{
 const x={...profile(run.engine_id),runtime_observation:{...run,status:'ACTIVO'},runtime_verified:true};
 for(const update of [{provider:'CLOUDFLARE'},{company_id:'other'},{evidence:'https://example.com/fake'},{runtime_id:'fake'}]){
  assert.equal(classifyProfile({...x,runtime_observation:{...x.runtime_observation,...update}},source,now).status,'POR_VERIFICAR');
 }
});
test('duplicates rejected without mutation',()=>assert.throws(()=>buildSharedState([profile('A'),profile('A')],source,now),/DUPLICATE/));
