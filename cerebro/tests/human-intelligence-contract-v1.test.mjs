import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contracts=JSON.parse(fs.readFileSync(new URL('../human-intelligence/contracts/human-interaction-contracts.v1.json',import.meta.url),'utf8'));
const baseline=JSON.parse(fs.readFileSync(new URL('../human-intelligence/baseline/old-baseline.v1.json',import.meta.url),'utf8'));
const scenarios=JSON.parse(fs.readFileSync(new URL('../human-intelligence/scenarios/scenario-suite.v1.json',import.meta.url),'utf8'));

test('Human Intelligence V1 is composite and cannot silently expand PROD authority',()=>{
  assert.equal(contracts.system_id,'CEREBRO_HUMAN_INTELLIGENCE_SYSTEM');
  assert.equal(contracts.invariants.new_engine_id_authorized,false);
  assert.equal(contracts.invariants.new_parallel_chat_store_authorized,false);
  assert.equal(contracts.invariants.new_parallel_learning_store_authorized,false);
  assert.equal(contracts.invariants.prod_write_authorized,false);
  assert.equal(contracts.invariants.prod_promotion_authorized,false);
  assert.equal(contracts.invariants.trading_access,false);
  assert.equal(contracts.invariants.customer_data_in_lab,false);
  assert.equal(contracts.invariants.secrets_in_lab,false);
  assert.equal(contracts.invariants.additional_cost_eur,0);
});

test('Human Intelligence V1 reuses canonical engine owners',()=>{
  assert.equal(contracts.owners.conversation_gateway,'CHAT-001');
  assert.equal(contracts.owners.context,'CTX-001');
  assert.equal(contracts.owners.learning,'LRN-001');
  assert.equal(contracts.owners.simulation,'SIM-001');
  assert.equal(contracts.owners.evaluation,'EVA-001');
  assert.equal(contracts.owners.tribunal,'JDG-001');
  assert.equal(contracts.owners.red_team,'RED-001');
  assert.equal(contracts.owners.regression,'REG-001');
  assert.equal(contracts.owners.policy,'POL-001');
  assert.equal(contracts.owners.human_exception,'HEX-001');
});

test('HUMAN_REQUIRED set remains exact',()=>{
  assert.deepEqual(contracts.invariants.human_required_reasons,[
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
});

test('Simulation is LAB-only, synthetic-safe and hidden state cannot leak to actor',()=>{
  const sim=contracts.contracts.SimulationEpisode;
  assert.equal(sim.forced_defaults.environment,'LAB');
  assert.equal(sim.forced_defaults.contains_customer_data,false);
  assert.equal(sim.forced_defaults.contains_secrets,false);
  assert.equal(sim.forced_defaults.prod_write_authorized,false);
  assert.equal(sim.forced_defaults.trading_access,false);
  assert.equal(sim.forced_defaults.additional_cost_eur,0);
  assert.equal(sim.rules.hidden_state_visible_to_actor,false);
  assert.equal(scenarios.generation_rules.real_customer_data_forbidden,true);
  assert.ok(scenarios.scenario_contract.actor_visibility.hidden.includes('hidden_until_asked'));
  assert.ok(scenarios.scenario_contract.actor_visibility.hidden.includes('judge_rubric'));
});

test('Conversation evaluation cannot authorize PROD',()=>{
  const evalContract=contracts.contracts.ConversationEvaluation;
  assert.deepEqual(evalContract.decisions,['REJECT','HOLD','PREPROD_CANDIDATE']);
  assert.ok(evalContract.forbidden_decisions.includes('PROD_AUTHORIZED'));
  assert.ok(evalContract.forbidden_decisions.includes('AUTONOMOUS_PROD'));
  assert.equal(evalContract.hard_gate_failure_policy,'REJECT');
});

test('OLD baseline is paired, reproducible and uses 60 canonical scenarios x 4 variants',()=>{
  assert.equal(baseline.status,'DEFINED_NOT_EXECUTED');
  assert.equal(baseline.scenario_source.scenarios,60);
  assert.equal(baseline.variants_per_scenario.length,4);
  assert.equal(baseline.target_episodes,240);
  assert.equal(baseline.paired_replay,true);
  assert.equal(baseline.same_seed_same_profile_same_tools_same_policy,true);
  assert.equal(baseline.promotion_to_preprod_candidate.hard_gates_pass_rate,1);
  assert.equal(baseline.promotion_to_preprod_candidate.prod_authorized,false);
  assert.equal(baseline.lab_safety.additional_cost_eur,0);
});

test('HumanSignal is observational and does not auto-promote isolated behavior',()=>{
  const hs=contracts.contracts.HumanSignal;
  assert.equal(hs.rules.observable_only,true);
  assert.equal(hs.rules.psychological_diagnosis_forbidden,true);
  assert.equal(hs.rules.isolated_signal_auto_promotes_rule,false);
});

test('LearningEvent routes to existing universal ingress and remains fail-closed',()=>{
  const learn=contracts.contracts.LearningEvent;
  assert.equal(learn.downstream,'UNIVERSAL_LEARNING_INGRESS');
  assert.ok(learn.signal_types.includes('HUMAN_CORRECTION'));
  assert.ok(learn.signal_types.includes('TRIBUNAL_DECISION'));
  assert.equal(learn.forced_defaults.prod_authorized,false);
  assert.equal(learn.forced_defaults.prod_write_authorized,false);
  assert.equal(learn.forced_defaults.trading_access,false);
  assert.equal(learn.forced_defaults.additional_cost_eur,0);
});
