import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStandingAuthorization,isCandidateEligibleForStandingSafeLane,buildAutonomousPreprodContract,buildAutonomousReadonlyCanaryContract,completeReadonlyAdvisoryPromotion} from '../skills/skill-autonomous-promotion-v1.mjs';

function auth(){return {
  status:'ACTIVE_STANDING_AUTHORIZATION',company_id:'GLOBAL',engine_id:'FACT-001',authorization_basis:'explicit-test',
  scope:{autonomous_preprod_shadow_promotion:true,autonomous_prod_readonly_canary:true,autonomous_readonly_advisory_registration:true,autonomous_retry_and_recovery:true,autonomous_prod_write:false,autonomous_customer_data_access:false,autonomous_external_skill_code_execution:false,autonomous_new_credentials:false,autonomous_trading:false,autonomous_paid_fallback:false,autonomous_app_fenix_deploy:false},
  cost:{additional_cost_budget_eur:0}
};}
function item(){return {candidate_id:'candidate-a',name:'obsidian',wrapper_id:'skillwrap:a',stage:'PREPROD_PROMOTION_REVIEW',status:'WAITING_HUMAN',human_required:'HIGH_RISK',external_skill_code_execution:false,customer_data_used:false,prod_write:false,trading_access:false,paid_fallback:false,additional_cost_eur:0,evidence:{reason:'GREEN_PROMOTION_READINESS',tribunal_decision:'GREEN'}};}
function state(){return {waiting_human:{'candidate-a':item()},completed:{},prod_authorized:false,autonomous_prod_promotion_authorized:false};}

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

test('contracts remain read-only and zero-cost',()=>{
  const p=buildAutonomousPreprodContract(item(),{source_run_id:10,artifact_id:20,artifact_digest:'sha256:x'});
  const c=buildAutonomousReadonlyCanaryContract(item(),{observed_main_sha:'abc',source_manifest_verified:true});
  assert.equal(p.status,'GREEN_AUTONOMOUS_PREPROD_SHADOW');
  assert.equal(p.prod_write,false);
  assert.equal(c.status,'GREEN_AUTONOMOUS_PROD_READONLY_CANARY');
  assert.deepEqual(c.allowed_http_methods,['GET']);
  assert.equal(c.prod_write,false);
});

test('completed promotion consumes bounded standing auth and preserves PROD deny',()=>{
  const p=buildAutonomousPreprodContract(item());
  const c=buildAutonomousReadonlyCanaryContract(item(),{observed_main_sha:'abc'});
  const out=completeReadonlyAdvisoryPromotion(state(),'candidate-a',{authorization:auth(),preprod:p,canary:c,now:'2026-10-08T00:00:00Z'});
  assert.equal(out.waiting_human['candidate-a'],undefined);
  assert.equal(out.completed['candidate-a'].status,'COMPLETED_READONLY_ADVISORY');
  assert.equal(out.completed['candidate-a'].prod_write,false);
  assert.equal(out.completed['candidate-a'].external_skill_code_execution,false);
});
