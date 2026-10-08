import test from 'node:test';
import assert from 'node:assert/strict';
import {createPromotionPlan} from '../runtime/promotion-pipeline.mjs';
import {defineDomainAutonomyPolicy,evaluateDomainAdoptionPolicy,tripDomainKillSwitch,RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT} from '../runtime/rsi-domain-autonomy-policy.mjs';

function policy(overrides={}){
  return defineDomainAutonomyPolicy({policy_id:'rsi-domain:seo-preprod',policy_version:'v1',company_id:'fenix',engine_id:'SEO-001',domain_id:'seo.continuous_improvement',environment:'PREPROD',autonomy_mode:'PREPROD_AUTONOMOUS',kill_switch_enabled:true,kill_switch_state:'ARMED',automatic_rollback_allowed:true,min_confidence:0.60,max_canary_percent:10,blast_radius:{max_percent:10,max_records:100,scope:'PREPROD_ONLY'},additional_cost_limit_eur:0,allowed_risk_classes:['LOW','MEDIUM'],...overrides});
}
function candidate(overrides={}){return {candidate_id:'cand:policy',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',candidate_version:'new-v2',risk_class:'LOW',confidence:0.90,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,...overrides};}
function promotion(overrides={}){return {...createPromotionPlan({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'new-v2',baseline_version:'old-v1',candidate_version:'new-v2',judge_decision:'PASS',tribunal_decision:'GREEN',rollback_ref:'rollback:p:1',rebuild_ref:'rebuild:p:1',post_metrics:{score:{min:80}},canary_percent:5}),...overrides};}

test('domain policy allows only bounded PREPROD canary with rollback and kill switch armed',()=>{
  const p=policy();
  const result=evaluateDomainAdoptionPolicy({policy:p,candidate:candidate(),promotion_plan:promotion()});
  assert.equal(result.ok,true);
  assert.equal(result.decision,'ALLOW_PREPROD_CANARY');
  assert.equal(result.autonomy_mode,'PREPROD_AUTONOMOUS');
  assert.equal(result.kill_switch_state,'ARMED');
  assert.equal(result.blast_radius.effective_max_percent,10);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});

test('kill switch trip blocks adoption deterministically',()=>{
  const tripped=tripDomainKillSwitch(policy(),'regression');
  const result=evaluateDomainAdoptionPolicy({policy:tripped,candidate:candidate(),promotion_plan:promotion()});
  assert.equal(result.decision,'KILL_SWITCH_BLOCK');
  assert.equal(result.next_gate,'RECOVERY_AND_REVIEW');
  assert.equal(result.prod_authorized,false);
});

test('domain policy maps HIGH risk and LOW confidence to canonical HUMAN_REQUIRED',()=>{
  const high=evaluateDomainAdoptionPolicy({policy:policy(),candidate:candidate({risk_class:'HIGH'}),promotion_plan:promotion()});
  assert.equal(high.decision,'HUMAN_REQUIRED');
  assert.equal(high.human_required,'HIGH_RISK');
  const low=evaluateDomainAdoptionPolicy({policy:policy(),candidate:candidate({confidence:0.50}),promotion_plan:promotion()});
  assert.equal(low.decision,'HUMAN_REQUIRED');
  assert.equal(low.human_required,'LOW_CONFIDENCE');
});

test('domain policy blocks blast radius or missing rollback autonomy without asking a human',()=>{
  const tooWide=evaluateDomainAdoptionPolicy({policy:policy(),candidate:candidate(),promotion_plan:promotion({canary_percent:20})});
  assert.equal(tooWide.decision,'HOLD');
  assert.equal(tooWide.reasons[0],'CANARY_EXCEEDS_BLAST_RADIUS');
  const noAuto=evaluateDomainAdoptionPolicy({policy:policy({automatic_rollback_allowed:false}),candidate:candidate(),promotion_plan:promotion()});
  assert.equal(noAuto.decision,'HOLD');
  assert.equal(noAuto.reasons[0],'AUTOMATIC_ROLLBACK_REQUIRED_FOR_CANARY');
});

test('domain policy fails closed on scope or authority conflict',()=>{
  const scope=evaluateDomainAdoptionPolicy({policy:policy(),candidate:candidate({company_id:'other'}),promotion_plan:promotion()});
  assert.equal(scope.human_required,'POLICY_CONFLICT');
  const authority=evaluateDomainAdoptionPolicy({policy:policy(),candidate:candidate({prod_authorized:true}),promotion_plan:promotion()});
  assert.equal(authority.human_required,'SECURITY_INCIDENT');
});

test('domain policy itself cannot exceed zero cost or PREPROD bounded blast radius',()=>{
  assert.throws(()=>policy({additional_cost_limit_eur:1}),/additional cost limit must remain zero/);
  assert.throws(()=>policy({max_canary_percent:30}),/max_canary_percent/);
  assert.throws(()=>policy({environment:'PROD'}),/must remain PREPROD/);
});

test('domain policy contract declares autonomy per domain, never globally',()=>{
  assert.equal(RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT.scope,'PER_DOMAIN');
  assert.equal(RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT.environment,'PREPROD');
  assert.equal(RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT.prod_authorized,false);
  assert.equal(RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT.prod_write_authorized,false);
  assert.equal(RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT.trading_access,false);
  assert.equal(RSI_DOMAIN_AUTONOMY_POLICY_CONTRACT.additional_cost_target_eur,0);
});
