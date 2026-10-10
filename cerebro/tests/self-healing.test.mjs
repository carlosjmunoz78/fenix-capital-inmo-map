import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQaHealingPlans,planHealing} from '../supervisor/self-healing.mjs';

const context={company_id:'fenix',engine_id:'SELF-001',environment:'PREPROD',version:'0.1.0'};

test('SELF-001 preserves legacy reversible healing planner semantics',()=>{
  const r=planHealing({context,action:'REQUEUE_JOB'});
  assert.equal(r.status,'PLAN_READY');assert.equal(r.execute,false);assert.equal(r.rollback_required,true);assert.equal(r.verification_required,true);assert.equal(r.prod_write_authorized,false);
});

test('SELF-001 blocks Trading, PROD writes, paid work and unknown healing',()=>{
  assert.equal(planHealing({context,action:'RETRY',trading:true}).reason,'POLICY_CONFLICT');
  assert.equal(planHealing({context,action:'RETRY',prod_write:true}).reason,'HIGH_RISK');
  assert.equal(planHealing({context,action:'RETRY',additional_cost_eur:1}).reason,'MONEY_LIMIT');
  assert.equal(planHealing({context,action:'DELETE_DATABASE'}).reason,'HIGH_RISK');
  assert.equal(planHealing({context:{...context,environment:'PROD'},action:'RETRY'}).reason,'HIGH_RISK');
});

function remediation(cases){return {
  schema_version:'0.1.0',state_type:'CEREBRO_QA_AUTONOMOUS_REMEDIATION_STATE_V0',company_id:'fenix',engine_id:'SELF-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',updated_at:'2026-10-11T00:00:00Z',cases,
  authority:{app_web_prod_autofix:false,assisted_owner_engines_preserved:true,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false},
  safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
};}

const baseCase={company_id:'fenix',environment:'PREPROD',owner_engine:'HCI-001',source:'IMPROVEMENT',human_required:null,prod_write_authorized:false,additional_cost_eur:0,gates:{regression_test_required:false,old_vs_new_required:true,preprod_required:true,independent_judge_required:true,rollback_required:true,rebuild_required:true}};

test('QA improvement becomes a plan-only owner repair package, never an implicit code mutation',()=>{
  const batch=buildQaHealingPlans(remediation([{...baseCase,case_id:'case-1'}]),{now:'2026-10-11T01:00:00Z'});
  assert.equal(batch.status,'PLANS_READY');assert.equal(batch.plans_total,1);assert.equal(batch.plan_ready,1);assert.equal(batch.human_required_total,0);
  const p=batch.plans[0];
  assert.equal(p.action,'PREPARE_OWNER_PATCH');assert.equal(p.execute,false);assert.equal(p.code_mutation_authorized,false);assert.equal(p.branch_required,true);assert.equal(p.old_vs_new_required,true);assert.equal(p.prod_write_authorized,false);assert.equal(p.additional_cost_eur,0);
  assert.equal(batch.next_gate,'OWNER_EXECUTOR_CAPABILITY_AUDIT');
});

test('QA bug plan requires permanent regression binding',()=>{
  const batch=buildQaHealingPlans(remediation([{...baseCase,case_id:'case-bug',source:'BUG',owner_engine:'WEB-001',gates:{...baseCase.gates,regression_test_required:true}}]));
  assert.equal(batch.plans[0].action,'REPRODUCE_AND_PREPARE_OWNER_PATCH');assert.equal(batch.plans[0].regression_test_required,true);assert.equal(batch.plans[0].owner_engine,'WEB-001');
});

test('existing HUMAN_REQUIRED remains fail-closed and canonical',()=>{
  const batch=buildQaHealingPlans(remediation([{...baseCase,case_id:'case-sec',human_required:'SECURITY_INCIDENT'}]));
  assert.equal(batch.status,'PLANNED_WITH_HUMAN_HOLDS');assert.equal(batch.plan_ready,0);assert.equal(batch.human_required_total,1);assert.equal(batch.plans[0].reason,'SECURITY_INCIDENT');assert.equal(batch.plans[0].execute,false);
});

test('SELF-001 rejects remediation authority or safety drift',()=>{
  assert.throws(()=>buildQaHealingPlans({...remediation([]),authority:{promotion_authorized:true,prod_write_authorized:false}}),/authority boundary drift/);
  assert.throws(()=>buildQaHealingPlans({...remediation([]),safety:{prod_write:true,customer_data:false,trading:false,additional_subscription_eur:0}}),/safety boundary drift/);
});
