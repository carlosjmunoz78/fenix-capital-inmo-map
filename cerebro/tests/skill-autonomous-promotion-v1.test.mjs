import test from 'node:test';
import assert from 'node:assert/strict';
import {approvalScopeFingerprint} from '../governance/human-communication.mjs';
import {
  validateStandingAuthorization,
  isCandidateEligibleForStandingSafeLane,
  isCandidateEligibleForExactOwnerLane,
  isCandidateEligibleForLearnedStandingLane,
  selectPromotionCandidate,
  buildAutonomousPreprodContract,
  buildAutonomousReadonlyCanaryContract,
  completeReadonlyAdvisoryPromotion
} from '../skills/skill-autonomous-promotion-v1.mjs';

function auth(){return {
  status:'ACTIVE_STANDING_AUTHORIZATION',company_id:'GLOBAL',engine_id:'FACT-001',authorization_basis:'explicit-test',
  scope:{autonomous_preprod_shadow_promotion:true,autonomous_prod_readonly_canary:true,autonomous_readonly_advisory_registration:true,autonomous_retry_and_recovery:true,autonomous_prod_write:false,autonomous_customer_data_access:false,autonomous_external_skill_code_execution:false,autonomous_new_credentials:false,autonomous_trading:false,autonomous_paid_fallback:false,autonomous_app_fenix_deploy:false},
  cost:{additional_cost_budget_eur:0}
};}
function item(){return {candidate_id:'candidate-a',name:'obsidian',engine_id:'FACT-001',wrapper_id:'skillwrap:a',stage:'PREPROD_PROMOTION_REVIEW',status:'WAITING_HUMAN',human_required:'HIGH_RISK',authorization_class:'BOUNDED_PREPROD_PROMOTION',requested_capability:'PREPROD_PROMOTION',external_skill_code_execution:false,customer_data_used:false,prod_write:false,trading_access:false,paid_fallback:false,max_money_eur:0,additional_cost_eur:0,evidence:{reason:'GREEN_PROMOTION_READINESS',tribunal_decision:'GREEN'}};}
function state(){return {waiting_human:{'candidate-a':item()},completed:{},prod_authorized:false,autonomous_prod_promotion_authorized:false};}
function scopeFor(value=item()){return approvalScopeFingerprint({...value,engine_id:value.engine_id??'FACT-001'});}
function ownerAction(overrides={}){const current=item();return {approval_id:'APR-20261008-ABCDEF12',status:'AUTHORIZED_WAITING_EXECUTION',scope_fingerprint:scopeFor(current),technical_id:'candidate-a',stage:'PREPROD_PROMOTION_REVIEW',source:'OWNER_EMAIL_EXACT_COMMAND',one_time:true,authorized_at:'2026-10-08T08:00:00Z',...overrides};}
function learnedStanding(value=item()){const scope=scopeFor(value);return {scope,status:'ACTIVE',entry:{status:'ACTIVE',approval_id:'APR-STANDING',scope_fingerprint:scope,execution_binding:'SKILL_AUTONOMY_READONLY_V1',exact_scope_only:true}};}

test('standing authorization is bounded and zero-cost',()=>{
  assert.equal(validateStandingAuthorization(auth()).green,true);
  const bad=auth();bad.scope.autonomous_prod_write=true;
  assert.equal(validateStandingAuthorization(bad).green,false);
});

test('green candidate is eligible but unsafe evidence fails closed',()=>{
  assert.equal(isCandidateEligibleForStandingSafeLane(item(),auth()).green,true);
  const bad=item();bad.evidence.prod_write=true;
  assert.equal(isCandidateEligibleForStandingSafeLane(bad,auth()).green,false);
});

test('exact owner action must match current candidate stage and scope',()=>{
  assert.equal(isCandidateEligibleForExactOwnerLane(item(),ownerAction()).green,true);
  assert.equal(isCandidateEligibleForExactOwnerLane(item(),ownerAction({stage:'OTHER'})).green,false);
  const unsafe=item();unsafe.prod_write=true;
  assert.equal(isCandidateEligibleForExactOwnerLane(unsafe,ownerAction()).green,false);
});

test('stale exact authorization is rejected after scope changes',()=>{
  const original=item();
  const action=ownerAction({scope_fingerprint:scopeFor(original)});
  const changed={...original,resource_scope:['different-resource']};
  const check=isCandidateEligibleForExactOwnerLane(changed,action);
  assert.equal(check.green,false);
  assert.ok(check.errors.includes('OWNER_ACTION_SCOPE_MISMATCH'));
});

test('selector ignores stale owner action and selects newest exact current action',()=>{
  const disabled=auth();disabled.status='DISABLED';
  const current=item();
  const stale=ownerAction({approval_id:'APR-20261008-11111111',scope_fingerprint:approvalScopeFingerprint({...current,resource_scope:['old'],engine_id:'FACT-001'}),authorized_at:'2026-10-08T09:00:00Z'});
  const exactOld=ownerAction({approval_id:'APR-20261008-22222222',authorized_at:'2026-10-08T08:00:00Z'});
  const exactNew=ownerAction({approval_id:'APR-20261008-33333333',authorized_at:'2026-10-08T10:00:00Z'});
  const communication={authorized_actions:{stale,exactOld,exactNew}};
  const selected=selectPromotionCandidate(state(),disabled,communication);
  assert.equal(selected.authorization_source,'OWNER_EMAIL_EXACT_COMMAND');
  assert.equal(selected.approval_id,exactNew.approval_id);
});

test('learned standing authorization executes only through registered exact safe binding',()=>{
  const disabled=auth();disabled.status='DISABLED';
  const learned=learnedStanding();
  assert.equal(isCandidateEligibleForLearnedStandingLane(item(),learned.entry,learned.scope).green,true);
  const communication={standing_authorizations:{[learned.scope]:learned.entry}};
  const selected=selectPromotionCandidate(state(),disabled,communication);
  assert.equal(selected.authorization_source,'LEARNED_STANDING_AUTHORIZATION');
  assert.equal(selected.learned_standing.execution_binding,'SKILL_AUTONOMY_READONLY_V1');
  const wrong={...learned.entry,execution_binding:'UNKNOWN'};
  assert.equal(isCandidateEligibleForLearnedStandingLane(item(),wrong,learned.scope).green,false);
});

test('contracts remain read-only and zero-cost',()=>{
  const p=buildAutonomousPreprodContract(item(),{source_run_id:10,artifact_id:20,artifact_digest:'sha256:x'});
  const c=buildAutonomousReadonlyCanaryContract(item(),{observed_main_sha:'abc',source_manifest_verified:true});
  assert.equal(p.status,'GREEN_AUTONOMOUS_PREPROD_SHADOW');
  assert.equal(p.prod_write,false);
  assert.equal(c.status,'GREEN_AUTONOMOUS_PROD_READONLY_CANARY');
  assert.deepEqual(c.allowed_http_methods,['GET']);
  assert.equal(c.prod_write,false);
});

test('completed static standing promotion preserves PROD deny',()=>{
  const p=buildAutonomousPreprodContract(item());
  const c=buildAutonomousReadonlyCanaryContract(item(),{observed_main_sha:'abc'});
  const out=completeReadonlyAdvisoryPromotion(state(),'candidate-a',{authorization:auth(),preprod:p,canary:c,now:'2026-10-08T00:00:00Z'});
  assert.equal(out.waiting_human['candidate-a'],undefined);
  assert.equal(out.completed['candidate-a'].status,'COMPLETED_READONLY_ADVISORY');
  assert.equal(out.completed['candidate-a'].prod_write,false);
  assert.equal(out.completed['candidate-a'].external_skill_code_execution,false);
  assert.equal(out.completed['candidate-a'].authorization_source,'STANDING_AUTHORIZATION');
});

test('completed exact-owner promotion records approval source without broadening permissions',()=>{
  const action=ownerAction();
  const p=buildAutonomousPreprodContract(item(),{authorization_source:'OWNER_EMAIL_EXACT_COMMAND'});
  const c=buildAutonomousReadonlyCanaryContract(item(),{observed_main_sha:'abc',authorization_source:'OWNER_EMAIL_EXACT_COMMAND'});
  const out=completeReadonlyAdvisoryPromotion(state(),'candidate-a',{owner_action:action,preprod:p,canary:c,now:'2026-10-08T00:00:00Z'});
  assert.equal(out.completed['candidate-a'].authorization_source,'OWNER_EMAIL_EXACT_COMMAND');
  assert.equal(out.completed['candidate-a'].authorization_basis,action.approval_id);
  assert.equal(out.completed['candidate-a'].prod_write,false);
  assert.equal(out.completed['candidate-a'].customer_data_used,false);
});

test('completed learned standing promotion records learned source and exact policy approval',()=>{
  const learned=learnedStanding();
  const p=buildAutonomousPreprodContract(item(),{authorization_source:'LEARNED_STANDING_AUTHORIZATION'});
  const c=buildAutonomousReadonlyCanaryContract(item(),{observed_main_sha:'abc',authorization_source:'LEARNED_STANDING_AUTHORIZATION'});
  const out=completeReadonlyAdvisoryPromotion(state(),'candidate-a',{learned_standing:{...learned.entry,scope_fingerprint:learned.scope},preprod:p,canary:c,now:'2026-10-08T00:00:00Z'});
  assert.equal(out.completed['candidate-a'].authorization_source,'LEARNED_STANDING_AUTHORIZATION');
  assert.equal(out.completed['candidate-a'].authorization_basis,'APR-STANDING');
  assert.equal(out.completed['candidate-a'].prod_write,false);
});