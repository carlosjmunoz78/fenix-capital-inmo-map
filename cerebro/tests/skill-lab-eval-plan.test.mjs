import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLabEvaluationPlans} from '../skills/skill-lab-eval-plan.mjs';

const value={results:[
  {candidate_id:'github',wrapper_id:'w1',domain:'software-engineering-devops',engine_bindings:['FACT-001'],value_score:91,recommendation:'HIGH_VALUE_LAB_BENCHMARK',evidence_refs:{upstream_head_commit:'a'}},
  {candidate_id:'browser',wrapper_id:'w2',domain:'browser-automation-scraping',engine_bindings:['AUTO-001'],value_score:88,recommendation:'HIGH_VALUE_LAB_BENCHMARK',evidence_refs:{upstream_head_commit:'b'}},
  {candidate_id:'db',wrapper_id:'w3',domain:'data-database-supabase',engine_bindings:['DATA-001'],value_score:83,recommendation:'HIGH_VALUE_LAB_BENCHMARK',evidence_refs:{upstream_head_commit:'c'}},
  {candidate_id:'help',wrapper_id:'w4',domain:'agent-ai-orchestration',engine_bindings:['ORCH-001'],value_score:68,recommendation:'LAB_BENCHMARK',evidence_refs:{upstream_head_commit:'d'}}
]};

test('selects only top N candidates already ranked by static value',()=>{
  const report=buildLabEvaluationPlans(value,{topN:3});
  assert.deepEqual(report.plans.map((x)=>x.candidate_id),['github','browser','db']);
  assert.equal(report.plans_total,3);
});

test('software engineering plan requires reversible OLD-vs-NEW fixtures',()=>{
  const plan=buildLabEvaluationPlans(value,{topN:1}).plans[0];
  assert.equal(plan.comparison_mode,'OLD_VS_NEW_ON_IDENTICAL_SYNTHETIC_FIXTURES');
  assert.ok(plan.test_cases.some((x)=>x.case_id==='ci-diagnosis'));
  assert.equal(plan.pass_contract.rollback_required,true);
  assert.equal(plan.pass_contract.regression_required,true);
});

test('browser plan includes no-submit and no-antibot safeguards',()=>{
  const report=buildLabEvaluationPlans({results:[value.results[1]]},{topN:1});
  const plan=report.plans[0];
  assert.ok(plan.test_cases.some((x)=>x.case_id==='form-dry-run'));
  assert.ok(plan.test_cases.some((x)=>x.success.includes('no_antibot_evasion')));
  assert.equal(plan.sandbox.network,'DENY_BY_DEFAULT');
});

test('database plan checks RLS and migration safety',()=>{
  const plan=buildLabEvaluationPlans({results:[value.results[2]]},{topN:1}).plans[0];
  assert.ok(plan.test_cases.some((x)=>x.case_id==='rls-review'));
  assert.ok(plan.test_cases.some((x)=>x.case_id==='migration-plan'));
  assert.equal(plan.pass_contract.no_prod_write,true);
});

test('plans never authorize execution, installation or promotion',()=>{
  const report=buildLabEvaluationPlans(value,{topN:3});
  assert.equal(report.external_code_execution_authorized,false);
  assert.equal(report.install_authorized,false);
  assert.equal(report.prod_authorized,false);
  for(const plan of report.plans){
    assert.equal(plan.external_code_execution_authorized,false);
    assert.equal(plan.install_authorized,false);
    assert.equal(plan.prod_authorized,false);
    assert.equal(plan.pass_contract.promotion_from_this_plan,false);
    assert.equal(plan.sandbox.authorized,false);
    assert.equal(plan.sandbox.credentials,'NONE');
  }
});
