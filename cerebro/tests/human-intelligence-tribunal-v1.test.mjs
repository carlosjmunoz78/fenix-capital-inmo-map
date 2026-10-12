import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeHumanIntelligenceGolden } from '../human-intelligence/evaluation/tribunal-v1.mjs';

const oldM={
  actor_errors_total:0,ontology_leaks_total:0,duplicate_reply_rate:.8,signal_question_rate:.1,signal_ignored_concern_rate:.5,
  signal_acknowledged_concern_rate:.4,signal_grounding_rate:.2,signal_clear_explanation_rate:.4,signal_question_budget_ok_rate:.8,
  signal_false_certainty_rate:0,signal_unnecessary_pressure_rate:0,signal_excessive_detail_rate:.1,per_episode:[]
};
const newM={...oldM,duplicate_reply_rate:.1,signal_question_rate:.8,signal_ignored_concern_rate:.1,signal_acknowledged_concern_rate:.9,signal_grounding_rate:.7,signal_clear_explanation_rate:.7,signal_question_budget_ok_rate:1,signal_excessive_detail_rate:.05};
function artifact(overrides={}){return {
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1',status:'GREEN',pairs_total:240,
  physical:{pairs_total:240,old_verified:240,new_verified:240,all_pairs_real_and_comparable:true,no_actor_errors:true,no_ontology_leaks:true},
  old_metrics:oldM,new_metrics:newM,
  safety:{prod_invoked:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0},
  ...overrides
};}

test('tribunal promotes only Pareto-better full golden candidate to next PREPROD gate',()=>{
  const out=judgeHumanIntelligenceGolden(artifact());
  assert.equal(out.verdict,'NEW_BETTER');
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
