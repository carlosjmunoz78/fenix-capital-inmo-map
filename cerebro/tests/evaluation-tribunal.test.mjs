import test from 'node:test';
import assert from 'node:assert/strict';
import {defineBenchmark,evaluateOldNew,tribunalDecision,validateEvaluatorChange} from '../runtime/evaluation-tribunal.mjs';

const benchmark=defineBenchmark({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',benchmark_id:'seo-quality',benchmark_version:'v1',metric:'score',holdout_ref:'secret:holdout',adversarial_refs:['adv:1']});
const old={experiment_id:'exp-1',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',arm:'OLD',metrics:{score:70}};
const newer={...old,arm:'NEW',metrics:{score:80}};

test('holdout evaluation rejects leakage and produces deterministic OLD vs NEW delta',()=>{
  assert.throws(()=>evaluateOldNew({benchmark,old_result:old,new_result:newer,candidate_visible_holdout:true}),/leakage/);
  const evaluation=evaluateOldNew({benchmark,old_result:old,new_result:newer});
  assert.equal(evaluation.delta,10);
  assert.equal(evaluation.leakage_check,'PASS');
  assert.equal(evaluation.prod_authorized,false);
});

test('tribunal requires independent judge',()=>{
  const evaluation=evaluateOldNew({benchmark,old_result:old,new_result:newer});
  const result=tribunalDecision({evaluation,judge_id:'candidate',candidate_actor_id:'candidate'});
  assert.equal(result.decision,'FAIL');
  assert.equal(result.reason,'judge_not_independent');
});

test('tribunal detects Goodhart when evaluator improves but real outcome degrades',()=>{
  const evaluation=evaluateOldNew({benchmark,old_result:old,new_result:newer});
  const result=tribunalDecision({evaluation,judge_id:'JDG-001',candidate_actor_id:'LRN-001',real_outcome_delta:-1});
  assert.equal(result.decision,'FAIL');
  assert.equal(result.reason,'GOODHART_DETECTED');
});

test('evaluator cannot weaken itself or elevate judge permissions or budget',()=>{
  assert.equal(validateEvaluatorChange({reduces_requirements:true,independent_gate:false}).ok,false);
  assert.equal(validateEvaluatorChange({may_edit_judge:true}).ok,false);
  assert.equal(validateEvaluatorChange({may_elevate_permissions:true}).ok,false);
  assert.equal(validateEvaluatorChange({may_elevate_budget:true}).ok,false);
});
