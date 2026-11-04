/** B9 CUT04 · Existing PREPROD promotion policy compatibility.
 * No promoter, no deployment. Detects unsafe conclusions from candidate reports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLearningRecord,validateImprovementPackage,canPromote}
 from '../../../cerebro/runtime/continuous-improvement-contract.mjs';
const context={company_id:'fenix',engine_id:'ORCH-001',environment:'PREPROD',version:'0.1.0'};
const record=()=>({...context,learning_id:'synthetic-learning-b9',
 source_event_ids:['synthetic-event-1'],source_type:'SYNTHETIC_TEST',
 observed_at:'2026-11-04T06:00:00Z',hypothesis:'No regressions',
 expected_metric_delta:0.1,confidence:0.95,risk_class:'LOW',
 evidence_refs:['synthetic-test-report'],promotion_state:'PREPROD',
 created_by:'synthetic-owner',reason:'test only',judge_decision:'PASS'});
const improvement=()=>({...context,baseline_version:'0.1.0',candidate_version:'0.2.0',
 scope:'synthetic-lab-only',hypothesis:'candidate under evaluation',
 affected_contracts:['ORCH-001'],tests_before:'synthetic-old-tests',
 tests_after:'synthetic-new-tests',evaluation_before:'synthetic-old-eval',
 evaluation_after:'synthetic-new-eval',cost_before:0,cost_after:0,
 risks:[],rollback:{ref:'synthetic-rollback'},rebuild:{ref:'synthetic-rebuild'},
 judge:{independent:true},promotion_decision:'CANDIDATE_ONLY'});
test('B9 existing PREPROD learning and improvement contracts validate but never switch PROD',()=>{
 const r=record(),p=improvement();
 assert.equal(validateLearningRecord(r).ok,true);
 assert.equal(validateImprovementPackage(p).ok,true);
 const gate=canPromote({record:r,improvementPackage:p,independentJudge:true,
  rollbackReady:true,rebuildReady:true,policyLocked:true});
 assert.equal(gate.ok,true);assert.equal(gate.next_gate,'PROMOTION_PIPELINE_REVIEW');
 assert.equal(gate.prod_authorized,false);assert.equal(gate.prod_write_authorized,false);
 assert.equal(gate.permissions_elevated,false);assert.equal(gate.budget_elevated,false);
});
test('B9 readiness blocks if independent judge, rollback, rebuild or policy immutability missing',()=>{
 for(const omitted of ['independentJudge','rollbackReady','rebuildReady','policyLocked']){
  const args={record:record(),improvementPackage:improvement(),
   independentJudge:true,rollbackReady:true,rebuildReady:true,policyLocked:true};
  args[omitted]=false;
  const x=canPromote(args);
  assert.equal(x.ok,false);assert.equal(x.next_gate,'HOLD');
  assert.equal(x.prod_authorized,false);
 }
});
test('B9 candidate cannot claim promotion merely from green synthetic tests',()=>{
 const r=record();r.judge_decision='MORE_EVIDENCE';
 const p=improvement();
 const gate=canPromote({record:r,improvementPackage:p,
  independentJudge:false,rollbackReady:true,rebuildReady:true,policyLocked:false});
 assert.equal(gate.ok,false);
 assert.equal(gate.blockers.includes('judge_not_pass'),true);
 assert.equal(gate.blockers.includes('policy_or_permissions_mutable_by_candidate'),true);
});
test('B9 incomplete improvement evidence denies review even with positive score',()=>{
 const p=improvement();p.rollback={};
 const g=canPromote({record:record(),improvementPackage:p,
  independentJudge:true,rollbackReady:true,rebuildReady:true,policyLocked:true});
 assert.equal(g.ok,false);assert.equal(g.blockers.includes('rollback_not_ready'),true);
});
