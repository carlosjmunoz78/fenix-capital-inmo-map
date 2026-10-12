import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScenarioPlan,VARIANTS,CANONICAL_SCENARIO_PAGE} from '../human-intelligence/lab/scenario-plan.mjs';

const SHA='3b6b3f45fb3eea624b1834d0c592c6b6f6550e1e';

test('Human Intelligence LAB planner deterministically creates 60 x 4 paired episode slots',()=>{
  const a=buildScenarioPlan({baseline_sha:SHA});
  const b=buildScenarioPlan({baseline_sha:SHA});
  assert.equal(a.episodes_total,240);
  assert.equal(a.scenarios_total,60);
  assert.equal(a.variants_total,4);
  assert.deepEqual(a,b);
  assert.equal(new Set(a.episodes.map(x=>x.episode_id)).size,240);
  assert.equal(new Set(a.episodes.map(x=>x.seed)).size,240);
  assert.deepEqual([...new Set(a.episodes.slice(0,4).map(x=>x.variant))],VARIANTS);
});

test('Every planned episode is LAB-only and fail-closed for PROD, secrets, customer data and Trading',()=>{
  const plan=buildScenarioPlan({baseline_sha:SHA});
  assert.equal(plan.environment,'LAB');
  assert.equal(plan.engine_id,'SIM-001');
  assert.equal(plan.canonical_scenario_page,CANONICAL_SCENARIO_PAGE);
  for(const episode of plan.episodes){
    assert.equal(episode.environment,'LAB');
    assert.equal(episode.engine_id,'SIM-001');
    assert.equal(episode.contains_customer_data,false);
    assert.equal(episode.contains_secrets,false);
    assert.equal(episode.prod_authorized,false);
    assert.equal(episode.prod_write_authorized,false);
    assert.equal(episode.trading_access,false);
    assert.equal(episode.additional_cost_eur,0);
    assert.equal(episode.baseline_sha,SHA);
  }
  assert.deepEqual(plan.safety,{
    contains_customer_data:false,
    contains_secrets:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });
});

test('Planner validates scope and git anchor',()=>{
  assert.throws(()=>buildScenarioPlan({baseline_sha:'bad'}),/baseline_sha/);
  assert.throws(()=>buildScenarioPlan({baseline_sha:SHA,scenario_count:0}),/scenario_count/);
  assert.throws(()=>buildScenarioPlan({baseline_sha:SHA,scenario_count:501}),/scenario_count/);
  assert.throws(()=>buildScenarioPlan({baseline_sha:SHA,company_id:' '}),/company_id/);
});
