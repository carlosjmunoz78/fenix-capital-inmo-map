import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScenarioPlan,VARIANTS,VARIANT_CONTRACT,CANONICAL_SCENARIO_PAGE} from '../human-intelligence/lab/scenario-plan.mjs';

const SHA='3b6b3f45fb3eea624b1834d0c592c6b6f6550e1e';

test('Human Intelligence LAB planner deterministically creates canonical 60 x 4 paired episode slots',()=>{
  const a=buildScenarioPlan({baseline_sha:SHA});const b=buildScenarioPlan({baseline_sha:SHA});
  assert.equal(a.episodes_total,240);assert.equal(a.scenarios_total,60);assert.equal(a.variants_total,4);assert.equal(a.canonical_library_id,'FENIX_HUMAN_60_V1');assert.deepEqual(a,b);
  assert.equal(new Set(a.episodes.map(x=>x.episode_id)).size,240);assert.equal(new Set(a.episodes.map(x=>x.seed)).size,240);assert.deepEqual([...new Set(a.episodes.slice(0,4).map(x=>x.variant))],VARIANTS);
});

test('every planned episode carries the canonical human situation rather than a numeric placeholder',()=>{
  const plan=buildScenarioPlan({baseline_sha:SHA});
  for(const episode of plan.episodes){
    assert.equal(episode.scenario.source_case_number,episode.source_case_number);
    assert.equal(typeof episode.scenario.title,'string');assert.ok(episode.scenario.title.length>5);
    assert.equal(typeof episode.scenario.initial_human_utterance,'string');assert.ok(episode.scenario.initial_human_utterance.length>10);
    assert.equal(typeof episode.scenario.human_objective,'string');assert.equal(typeof episode.scenario.response_pattern,'string');assert.equal(typeof episode.scenario.avoid,'string');assert.equal(typeof episode.scenario.next_step,'string');
    assert.deepEqual(episode.simulator_overrides,VARIANT_CONTRACT[episode.variant]);
  }
  assert.match(plan.episodes[0].scenario.title,/100 %/);
  assert.match(plan.episodes.at(-1).scenario.title,/Conflicto entre dos miembros/);
});

test('four variants are physically different in simulator posture and state',()=>{
  const plan=buildScenarioPlan({baseline_sha:SHA,scenario_count:1});
  const variants=Object.fromEntries(plan.episodes.map(e=>[e.variant,e.simulator_overrides]));
  assert.equal(variants.NORMAL_COOPERATIVE.dimensions.cooperation_posture,'HIGH');
  assert.equal(variants.AMBIGUOUS_INCOMPLETE.dimensions.privacy_posture,'MINIMAL_DISCLOSURE');
  assert.equal(variants.FRICTION_HIGH_LOAD.dimensions.urgency,'HIGH');
  assert.ok(variants.FRICTION_HIGH_LOAD.initial_state.friction>variants.NORMAL_COOPERATIVE.initial_state.friction);
  assert.equal(variants.ADVERSARIAL_CONTRADICTORY.dimensions.adversariality,'HIGH');
  assert.ok(variants.ADVERSARIAL_CONTRADICTORY.initial_state.trust<variants.NORMAL_COOPERATIVE.initial_state.trust);
});

test('Every planned episode is LAB-only and fail-closed for PROD, secrets, customer data and Trading',()=>{
  const plan=buildScenarioPlan({baseline_sha:SHA});assert.equal(plan.environment,'LAB');assert.equal(plan.engine_id,'SIM-001');assert.equal(plan.canonical_scenario_page,CANONICAL_SCENARIO_PAGE);
  for(const episode of plan.episodes){assert.equal(episode.environment,'LAB');assert.equal(episode.engine_id,'SIM-001');assert.equal(episode.contains_customer_data,false);assert.equal(episode.contains_secrets,false);assert.equal(episode.prod_authorized,false);assert.equal(episode.prod_write_authorized,false);assert.equal(episode.trading_access,false);assert.equal(episode.additional_cost_eur,0);assert.equal(episode.baseline_sha,SHA);}
  assert.deepEqual(plan.safety,{contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
});

test('Planner validates scope and git anchor',()=>{
  assert.throws(()=>buildScenarioPlan({baseline_sha:'bad'}),/baseline_sha/);assert.throws(()=>buildScenarioPlan({baseline_sha:SHA,scenario_count:0}),/scenario_count/);assert.throws(()=>buildScenarioPlan({baseline_sha:SHA,scenario_count:61}),/scenario_count/);assert.throws(()=>buildScenarioPlan({baseline_sha:SHA,company_id:' '}),/company_id/);
});
