import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHumanProfile,assertActorViewNoLeak} from '../human-intelligence/lab/human-profile.mjs';
import {evaluateHardGates,HARD_GATES} from '../human-intelligence/evaluation/hard-gate-evaluator.mjs';

const SCENARIO={
  scenario_id:'FENIX-HUMAN-01',
  role:'LEAD',
  objective:'Saber si puede optar a una hipoteca al 100% sin recibir una promesa falsa.',
  initial_message:'¿Me dais el 100%?',
  known_information:['Quiere comprar vivienda.'],
  hidden_until_asked:['Tiene un préstamo personal activo.'],
  knowledge_level:'LOW',
  channel:'APP',
  urgency:'NORMAL',
  communication_style:'DIRECT',
  objections:['No quiere dar demasiados datos al principio.'],
  boundaries:['No aceptar promesas no verificadas.'],
  completion_condition:'CEREBRO explica que depende del perfil y obtiene datos mínimos sin inventar viabilidad.'
};

test('HumanProfile keeps simulator hidden state out of actor view',()=>{
  const profile=buildHumanProfile({scenario:SCENARIO,variant:'AMBIGUOUS_INCOMPLETE',seed:'seed-001'});
  assert.equal(profile.simulator_state.environment,'LAB');
  assert.equal(profile.actor_view.environment,'LAB');
  assert.equal(assertActorViewNoLeak(profile),true);
  assert.equal('hidden_state' in profile.actor_view,false);
  assert.equal(JSON.stringify(profile.actor_view).includes('préstamo personal'),false);
  assert.equal(profile.simulator_state.prod_write_authorized,false);
  assert.equal(profile.simulator_state.additional_cost_eur,0);
});

test('HumanProfile is deterministic for same scenario, variant and seed',()=>{
  const a=buildHumanProfile({scenario:SCENARIO,variant:'FRICTION_HIGH_LOAD',seed:'seed-002'});
  const b=buildHumanProfile({scenario:structuredClone(SCENARIO),variant:'FRICTION_HIGH_LOAD',seed:'seed-002'});
  assert.deepEqual(a,b);
});

test('Hard gate evaluator fails closed on missing gates',()=>{
  const result=evaluateHardGates({episode_id:'ep-1',gate_results:{}});
  assert.equal(result.decision,'REJECT');
  assert.equal(result.gates_failed,HARD_GATES.length);
  assert.equal(result.preprod_candidate_allowed,false);
  assert.equal(result.prod_authorized,false);
});

test('Hard gate evaluator requires evidence even for PASS',()=>{
  const raw=Object.fromEntries(HARD_GATES.map(gate=>[gate,{result:'PASS'}]));
  const result=evaluateHardGates({episode_id:'ep-2',gate_results:raw});
  assert.equal(result.decision,'REJECT');
  assert.equal(result.gates_failed,HARD_GATES.length);
  assert.ok(result.gate_results.every(item=>item.reason==='PASS_WITHOUT_EVIDENCE'));
});

test('Hard gate evaluator can mark LAB candidate green but never authorize PROD',()=>{
  const raw=Object.fromEntries(HARD_GATES.map(gate=>[gate,{result:'PASS',reason:'synthetic evidence',evidence_refs:[`trace:${gate.toLowerCase()}`]}]));
  const result=evaluateHardGates({episode_id:'ep-3',gate_results:raw});
  assert.equal(result.decision,'HARD_GATES_GREEN');
  assert.equal(result.gates_failed,0);
  assert.equal(result.preprod_candidate_allowed,true);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});
