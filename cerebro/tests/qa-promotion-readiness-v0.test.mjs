import test from 'node:test';
import assert from 'node:assert/strict';
import {assessQaPromotionReadiness} from '../governance/qa-promotion-readiness-v0.mjs';

const tribunal={state_type:'CEREBRO_AUTO001_REPAIR_TRIBUNAL_V0',status:'APPROVE_PREPROD_PATCH',approved:true};
const handoff={state_type:'CEREBRO_AUTO001_PR_HANDOFF_V0',status:'BLOCKED_REPOSITORY_ACTIONS_POLICY',preprod_patch_validated:true,tribunal_approved:true};
const policies={state_type:'CEREBRO_RSI_DOMAIN_AUTONOMY_POLICY_REGISTRY',prod_authorized:false,prod_write_authorized:false,policies:[{engine_id:'APP-001',autonomy_mode:'ASSISTED',evidence_state:'DOMAIN_EVIDENCE_WIRING_REQUIRED',prod_authorized:false,prod_write_authorized:false,kill_switch_enabled:true,kill_switch_state:'ARMED',automatic_rollback_allowed:true,additional_cost_limit_eur:0}]};
const autonomousPolicies={...policies,prod_authorized:false,prod_write_authorized:false,policies:[{engine_id:'APP-001',autonomy_mode:'PREPROD_AUTONOMOUS',evidence_state:'GOVERNED_PROD_PROMOTION_V1_ELIGIBLE',prod_authorized:true,prod_write_authorized:true,kill_switch_enabled:true,kill_switch_state:'ARMED',automatic_rollback_allowed:true,additional_cost_limit_eur:0}]};
const autonomousHandoff={...handoff,status:'OPENED_AUTONOMOUSLY'};

test('promotion stays HUMAN_REQUIRED when repository/domain policy blocks autonomy',()=>{
 const state=assessQaPromotionReadiness({tribunal,prHandoff:handoff,policies,now:'2026-10-11T06:00:00Z'});
 assert.equal(state.status,'HUMAN_REQUIRED');
 assert.equal(state.human_required.reason,'POLICY_CONFLICT');
 assert.ok(state.blockers.includes('PR_CREATION_BLOCKED_BY_REPOSITORY_POLICY'));
 assert.ok(state.blockers.includes('DOMAIN_AUTONOMY_MODE_ASSISTED'));
 assert.ok(state.blockers.includes('DOMAIN_EVIDENCE_DOMAIN_EVIDENCE_WIRING_REQUIRED'));
 assert.ok(state.blockers.includes('DOMAIN_PROD_AUTHORITY_NOT_GRANTED'));
 assert.equal(state.authority.merge_authorized,false);
 assert.equal(state.authority.prod_write_authorized,false);
 assert.equal(state.safety.additional_subscription_eur,0);
});

test('fully green APP domain policy hands authority to governed promotion executor without global PROD authority',()=>{
 const state=assessQaPromotionReadiness({tribunal,prHandoff:autonomousHandoff,policies:autonomousPolicies});
 assert.equal(state.status,'AUTONOMOUS_PROMOTION_READY');
 assert.equal(state.human_required,null);
 assert.equal(state.authority.merge_authorized,true);
 assert.equal(state.authority.promotion_authorized,true);
 assert.equal(state.authority.prod_authorized,true);
 assert.equal(state.authority.prod_write_authorized,true);
 assert.equal(state.next_gate,'GOVERNED_PROMOTION_EXECUTOR_V1');
});

test('red tribunal routes to autonomous repair instead of a false human exception',()=>{
 const red={...tribunal,status:'REJECT_PREPROD_PATCH',approved:false};
 const state=assessQaPromotionReadiness({tribunal:red,prHandoff:autonomousHandoff,policies:autonomousPolicies});
 assert.equal(state.status,'REPAIR_REQUIRED');
 assert.equal(state.human_required,null);
 assert.ok(state.blockers.includes('TRIBUNAL_NOT_APPROVED'));
 assert.equal(state.authority.promotion_authorized,false);
 assert.equal(state.next_gate,'AUTONOMOUS_REPAIR_LOOP');
});
