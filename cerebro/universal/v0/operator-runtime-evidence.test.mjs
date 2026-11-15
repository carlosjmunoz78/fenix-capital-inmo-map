import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLabRuntimeEvidence,describeLabRuntimeEvidence} from '../../../src/cerebroRuntimeEvidence.ts';

const stamp='2026-11-15T20:00:00.000Z';
const now=Date.parse(stamp);
const baseline=()=>({
 status:'OK',source:'PREPROD_LAB_WORKER_RPC_V0',transport:'PREPROD_OWNER_LAB_RUNTIME_V0',
 company_id:'fenix',environment:'LAB',engine_id:'LAB-DEMO-001',version:'0.1.0',
 desired_state:'RUNNING',priority:4,revision:3,work_units:1,
 last_receipt_id:'123e4567-e89b-42d3-a456-000000000003',
 observed_at:stamp,updated_at:'2026-11-15T19:59:00.000Z',
 runtime_kind:'DETERMINISTIC_MANUAL_LAB_WORKER',
 autonomous_scheduling:false,prod_execution_enabled:false,executed:false
});

test('fresh owner LAB state is an observation, not an agent heartbeat or running job',()=>{
 const result=summarizeLabRuntimeEvidence(baseline(),now);
 assert.equal(result.kind,'ready');
 const p=result.proof;
 assert.equal(p.health,'OBSERVED_STATE_RECENT');
 assert.equal(p.state,'RUNNING');
 assert.equal(p.active_execution_verified,false);
 assert.equal(p.agent_id,null);
 assert.equal(p.subagent_id,null);
 assert.equal(p.job_id,null);
 assert.equal(p.heartbeat_at,null);
 assert.equal(p.autonomous_scheduling,false);
 assert.equal(p.cost_eur,'NO_MEDIDO');
 assert.equal(p.last_receipt_id,'123e4567-e89b-42d3-a456-000000000003');
 const response=describeLabRuntimeEvidence(baseline(),now);
 assert.match(response,/RUNNING \(estado deseado, no ejecución activa\)/);
 assert.match(response,/agent_id, subagent_id, job_id y heartbeat: NO VERIFICADOS/);
 assert.match(response,/Ejecución autónoma y trabajo en curso: NO ACREDITADOS/);
 assert.doesNotMatch(response,/agente activo comprobado|0 euros|€0/);
});
test('PAUSED is only desired state, not proof a worker has stopped every external task',()=>{
 const state={...baseline(),desired_state:'PAUSED',work_units:0};
 const result=summarizeLabRuntimeEvidence(state,now);
 assert.equal(result.kind,'ready');
 assert.equal(result.proof.state,'PAUSED');
 assert.equal(result.proof.active_execution_verified,false);
 assert.match(describeLabRuntimeEvidence(state,now),/PAUSED \(estado deseado, no ejecución activa\)/);
});
test('stale, future or malformed observations fail closed without invented zero agents',()=>{
 const stale={...baseline(),observed_at:'2026-11-15T19:54:00.000Z',updated_at:'2026-11-15T19:53:00.000Z'};
 assert.deepEqual(summarizeLabRuntimeEvidence(stale,now),{kind:'unavailable',proof:null,reason:'OBSERVATION_STALE'});
 const future={...baseline(),observed_at:'2026-11-15T20:02:00.000Z'};
 assert.equal(summarizeLabRuntimeEvidence(future,now).reason,'OBSERVATION_CLOCK_INVALID');
 const invalid={...baseline(),observed_at:'invalid'};
 assert.equal(summarizeLabRuntimeEvidence(invalid,now).reason,'OBSERVATION_CLOCK_INVALID');
 const noReading=describeLabRuntimeEvidence(stale,now);
 assert.match(noReading,/lectura de estado no acreditada/);
 assert.match(noReading,/No se puede concluir/);
});
test('wrong company, environment, engine, autonomy and revision do not count as LAB evidence',()=>{
 const cases=[
 {company_id:'other'}, {environment:'PROD'}, {engine_id:'SEO-001'},
 {runtime_kind:'AUTONOMOUS_AGENT'},{autonomous_scheduling:true},
 {prod_execution_enabled:true},{executed:true},{revision:0},{work_units:-1},
 {priority:9},{desired_state:'UNSPECIFIED'},{version:'99.0.0'}
 ];
 for(const change of cases){
  const result=summarizeLabRuntimeEvidence({...baseline(),...change},now);
  assert.equal(result.kind,'unavailable',JSON.stringify(change));
  assert.equal(result.reason,'STATE_NOT_VERIFIED',JSON.stringify(change));
 }
});
test('invalid receipt and unknown cost must not get fabricated proof',()=>{
 const state={...baseline(),last_receipt_id:'not-a-uuid'};
 const result=summarizeLabRuntimeEvidence(state,now);
 assert.equal(result.kind,'ready');
 assert.equal(result.proof.last_receipt_id,null);
 assert.equal(result.proof.cost_eur,'NO_MEDIDO');
 assert.match(describeLabRuntimeEvidence(state,now),/Sin último recibo comprobable/);
});
