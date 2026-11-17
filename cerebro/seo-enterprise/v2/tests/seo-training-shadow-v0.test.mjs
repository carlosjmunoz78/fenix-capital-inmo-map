import test from 'node:test';
import assert from 'node:assert/strict';
import {runSeoShadowTraining} from '../runtime/seo-training-shadow-v0.mjs';
test('real OLD vs NEW rule correction improves public LAB fixture with tested rollback',()=>{
 const a=runSeoShadowTraining();
 assert.equal(a.status,'LAB_CORRECTION_SHADOW_AND_ROLLBACK_PASS');
 assert.ok(a.old.f1<a.new.f1);
 assert.equal(a.new.f1,1);
 assert.equal(a.rollback.f1,a.old.f1);
 assert.equal(a.separate_os_processes_verified,true);
 assert.equal(a.rollback.replay_verified,true);
 assert.equal(a.tribunal_decision,'PASS');
 assert.equal(a.benchmark_blinded,false);
 assert.equal(a.candidate_auto_replaced,false);
 assert.equal(a.physical_site_rollback_verified,false);
 assert.equal(a.iam_roles_authenticated,false);
 assert.equal(a.additional_cost_eur,0);
});
test('self judgement is forbidden even in laboratory shadow',()=>{
 assert.throws(()=>runSeoShadowTraining({judge_actor_id:'SEO_D15_NEW'}),/SELF_EVALUATION_DENIED/);
});
test('candidate that hallucinates a typo fails OLD vs NEW and cannot promote',()=>{
 const cases=[
  {case_id:'X1',text:'furura cuota',expected_codes:['FUTURE_TYPO']},
  {case_id:'X2',text:'constucción',expected_codes:[]}
 ];
 const a=runSeoShadowTraining({cases});
 assert.equal(a.tribunal_decision,'FAIL');
 assert.equal(a.status,'LAB_CANDIDATE_REJECTED');
 assert.equal(a.candidate_auto_replaced,false);
});
test('inconclusive performance does not permit substitution',()=>{
 const a=runSeoShadowTraining({cases:[{case_id:'C1',text:'futura cuota correcta',expected_codes:[]},
  {case_id:'C2',text:'furura cuota',expected_codes:['FUTURE_TYPO']}]});
 assert.equal(a.status,'LAB_CANDIDATE_REJECTED');
 assert.equal(a.tribunal_decision,'MORE_EVIDENCE');
});
