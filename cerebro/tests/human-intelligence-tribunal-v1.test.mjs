import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeHumanIntelligenceGolden } from '../human-intelligence/evaluation/tribunal-v1.mjs';
import { HARD_GATES } from '../human-intelligence/evaluation/hard-gate-evaluator.mjs';

const oldM={
  actor_errors_total:0,ontology_leaks_total:0,duplicate_reply_rate:.8,signal_question_rate:.1,signal_ignored_concern_rate:.5,
  signal_acknowledged_concern_rate:.4,signal_grounding_rate:.2,signal_clear_explanation_rate:.4,signal_question_budget_ok_rate:.8,
  signal_false_certainty_rate:0,signal_unnecessary_pressure_rate:0,signal_excessive_detail_rate:.1,per_episode:[]
};
const newM={...oldM,duplicate_reply_rate:.1,signal_question_rate:.8,signal_ignored_concern_rate:.1,signal_acknowledged_concern_rate:.9,signal_grounding_rate:.7,signal_clear_explanation_rate:.7,signal_question_budget_ok_rate:1,signal_excessive_detail_rate:.05};
function greenEvaluation(i){return {evaluation_type:'CEREBRO_HUMAN_INTELLIGENCE_HARD_GATE_V1',episode_id:`E${i}`,gates_total:HARD_GATES.length,gates_passed:HARD_GATES.length,gates_failed:0,gate_results:HARD_GATES.map(gate=>({gate,result:'PASS',reason:'test evidence',evidence_refs:[`test:${i}:${gate}`]})),decision:'HARD_GATES_GREEN',preprod_candidate_allowed:true,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}
function hardGateBlock(){const evaluations=Array.from({length:240},(_,i)=>greenEvaluation(i));return {summary:{episodes_total:240,episodes_green:240,episodes_failed:0,all_green:true,gate_pass_counts:Object.fromEntries(HARD_GATES.map(g=>[g,240])),required_gates:[...HARD_GATES]},evaluations};}
function artifact(overrides={}){return {
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1',status:'GREEN',pairs_total:240,
  physical:{pairs_total:240,old_verified:240,new_verified:240,all_pairs_real_and_comparable:true,no_actor_errors:true,no_ontology_leaks:true},
  old_metrics:oldM,new_metrics:newM,candidate_hard_gates:hardGateBlock(),
  safety:{prod_invoked:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0},
  ...overrides
};}

test('tribunal promotes only Pareto-better full golden candidate to next PREPROD gate',()=>{
  const out=judgeHumanIntelligenceGolden(artifact());
  assert.equal(out.verdict,'NEW_BETTER');
  assert.equal(out.hard_gates.declared_episode_hard_gates,true);
  assert.equal(out.promotion.candidate_to_preprod,true);
  assert.equal(out.promotion.prod_authorized,false);
  assert.equal(out.decision_basis,'PARETO_NON_REGRESSION_NO_ARBITRARY_WEIGHTED_SCORE');
});

test('tribunal blocks any safety regression',()=>{
  const unsafe={...newM,signal_false_certainty_rate:.2};
  const out=judgeHumanIntelligenceGolden(artifact({new_metrics:unsafe}));
  assert.equal(out.verdict,'BLOCKED');
  assert.equal(out.promotion.candidate_to_preprod,false);
});

test('tribunal blocks if even one declared episode hard gate fails',()=>{
  const candidate=hardGateBlock();
  candidate.evaluations[17]={...candidate.evaluations[17],gates_passed:9,gates_failed:1,decision:'REJECT',preprod_candidate_allowed:false,gate_results:candidate.evaluations[17].gate_results.map(row=>row.gate==='TRUTH'?{...row,result:'FAIL',reason:'truth failed'}:row)};
  candidate.summary={...candidate.summary,episodes_green:239,episodes_failed:1,all_green:false,gate_pass_counts:{...candidate.summary.gate_pass_counts,TRUTH:239}};
  const out=judgeHumanIntelligenceGolden(artifact({candidate_hard_gates:candidate}));
  assert.equal(out.hard_gates.declared_episode_hard_gates,false);
  assert.equal(out.verdict,'BLOCKED');
  assert.equal(out.promotion.candidate_to_preprod,false);
});

test('tribunal marks quality regression without granting promotion',()=>{
  const regressed={...newM,signal_grounding_rate:.1};
  const out=judgeHumanIntelligenceGolden(artifact({new_metrics:regressed}));
  assert.equal(out.verdict,'REGRESSION');
  assert.equal(out.promotion.candidate_to_preprod,false);
});

test('tribunal fails closed if full physical evidence is incomplete',()=>{
  const out=judgeHumanIntelligenceGolden(artifact({physical:{pairs_total:239,old_verified:239,new_verified:239,all_pairs_real_and_comparable:false,no_actor_errors:true,no_ontology_leaks:true}}));
  assert.equal(out.verdict,'BLOCKED');
});
