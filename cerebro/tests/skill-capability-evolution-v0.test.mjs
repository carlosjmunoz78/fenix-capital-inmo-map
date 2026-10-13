import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  validateSkillManifest,normalizeSkillManifest,analyzeSkillImpact,buildOldVsNewPlans,evaluateOldVsNew,
  buildSkillLearningRecord,finalizeSkillEvaluation,ingestSkillCapability,SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT
} from '../runtime/skill-capability-evolution.mjs';

const skill=Object.freeze({
  company_id:'fenix',environment:'PREPROD',skill_id:'safe-engineering-profile',skill_version:'1.0.0',
  capabilities:['safe-engineering'],inputs:[],outputs:[],tags:['engineering'],permissions:[],risk_class:'LOW',
  source:'CEREBRO_SAFE_ENGINEERING_PROFILE_V1',additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false
});
const engine=Object.freeze({
  company_id:'fenix',engine_id:'AUTO-001',version:'1.0.0',capabilities:['safe-engineering'],inputs:[],outputs:[],tags:['engineering'],autonomy_state:'ASSISTED'
});

function makePlan(){
  const impact=analyzeSkillImpact({skill,engines:[engine]});
  return {impact,plan:buildOldVsNewPlans({skill,impact_analysis:impact})[0]};
}

test('skill evolution contract is PREPROD-only, zero-cost and cannot expand PROD or Trading authority',()=>{
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.environment,'PREPROD');
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.prod_writes,false);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.trading_access,false);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.rollback_required,true);
  const valid=validateSkillManifest(skill);
  assert.equal(valid.ok,true);
  const forbidden=validateSkillManifest({...skill,environment:'PROD',prod_write_authorized:true,trading_access:true,additional_cost_eur:1});
  assert.equal(forbidden.ok,false);
  for(const error of ['environment_must_be_preprod','additional_cost_must_be_zero','authority_expansion_forbidden']) assert.ok(forbidden.errors.includes(error));
});

test('normalization is multi-company scoped and deterministic before registration timestamp',()=>{
  const a=normalizeSkillManifest({...skill,registered_at:'2026-10-13T00:00:00.000Z'});
  const b=normalizeSkillManifest({...skill,registered_at:'2026-10-14T00:00:00.000Z'});
  assert.equal(a.company_id,'fenix');
  assert.equal(a.engine_id,'SKILL-REGISTRY');
  assert.equal(a.environment,'PREPROD');
  assert.equal(a.skill_fingerprint,b.skill_fingerprint);
  assert.equal(a.idempotency_key,b.idempotency_key);
  assert.equal(a.prod_authorized,false);
  assert.equal(a.trading_access,false);
});

test('impact analysis extends an existing engine first and never auto-creates a new engine',()=>{
  const impact=analyzeSkillImpact({skill,engines:[engine]});
  assert.equal(impact.gap_detected,false);
  assert.equal(impact.factory_action,'EXTEND_EXISTING_ENGINE');
  assert.equal(impact.create_new_engine_authorized,false);
  assert.equal(impact.impacts[0].engine_id,'AUTO-001');
  assert.equal(impact.additional_cost_eur,0);
  const gap=analyzeSkillImpact({skill,engines:[]});
  assert.equal(gap.gap_detected,true);
  assert.equal(gap.factory_action,'FACT001_REGISTRY_CANDIDATE_REQUIRED');
  assert.equal(gap.create_new_engine_authorized,false);
  assert.equal(gap.next_gate,'FACT001_CAPABILITY_GAP_REVIEW');
});

test('OLD vs NEW requires controlled evidence and rollback/rebuild; safety or cost regression fails closed',()=>{
  const {plan}=makePlan();
  assert.equal(plan.rollback_required,true);
  assert.equal(plan.rebuild_required,true);
  assert.equal(plan.same_dataset_required,true);
  assert.equal(plan.policy_locked,true);
  assert.equal(plan.permissions_locked,true);
  const baseline={success_rate:0.80,quality:0.80,latency_ms:100,cost_eur:0,policy_violations:0,safety_violations:0};
  const improved={success_rate:0.90,quality:0.90,latency_ms:90,cost_eur:0,policy_violations:0,safety_violations:0};
  const pass=evaluateOldVsNew({plan,baseline_metrics:baseline,candidate_metrics:improved});
  assert.equal(pass.decision,'PASS');
  assert.equal(pass.rollback_required,false);
  assert.equal(pass.next_gate,'LEARNING_AND_TRIBUNAL');
  const fail=evaluateOldVsNew({plan,baseline_metrics:baseline,candidate_metrics:{...improved,cost_eur:1,safety_violations:1}});
  assert.equal(fail.decision,'FAIL');
  assert.equal(fail.rollback_required,true);
  assert.ok(fail.reasons.includes('SAFETY_OR_POLICY_REGRESSION'));
  assert.ok(fail.reasons.includes('COST_REGRESSION'));
});

test('LRN handoff remains local PREPROD candidate evidence and Tribunal-gated',()=>{
  const {plan}=makePlan();
  const result=evaluateOldVsNew({
    plan,
    baseline_metrics:{success_rate:0.8,cost_eur:0,policy_violations:0,safety_violations:0},
    candidate_metrics:{success_rate:0.9,cost_eur:0,policy_violations:0,safety_violations:0}
  });
  const learning=buildSkillLearningRecord({skill,plan,result,observed_at:'2026-10-13T00:00:00.000Z'});
  assert.equal(learning.environment,'PREPROD');
  assert.equal(learning.promotion_state,'CANDIDATE');
  assert.equal(learning.persistence_scope,'LOCAL_PREPROD_LRN_LEDGER_ONLY');
  assert.equal(learning.prod_authorized,false);
  assert.equal(learning.trading_access,false);
  const final=finalizeSkillEvaluation({skill,plan,result,observed_at:'2026-10-13T00:00:00.000Z'});
  assert.equal(final.status,'SKILL_IMPROVEMENT_EVIDENCE_GREEN');
  assert.equal(final.action,'EXTEND_EXISTING_ENGINE');
  assert.equal(final.next_gate,'EVALUATION_TRIBUNAL');
  assert.equal(final.factory_create_authorized,false);
});

test('registry persists PREPROD skill once and duplicate intake is idempotent',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cerebro-skill-evolution-'));
  try{
    const registry_file=join(dir,'skills.v8');
    const first=ingestSkillCapability({skill:{...skill,registered_at:'2026-10-13T00:00:00.000Z'},engines:[engine],registry_file});
    assert.equal(first.status,'SKILL_REGISTERED_EXPERIMENTS_READY');
    assert.equal(first.registration.accepted,true);
    assert.equal(first.impact.factory_action,'EXTEND_EXISTING_ENGINE');
    assert.equal(first.plans.length,1);
    const second=ingestSkillCapability({skill:{...skill,registered_at:'2026-10-14T00:00:00.000Z'},engines:[engine],registry_file});
    assert.equal(second.registration.accepted,false);
    assert.equal(second.registration.duplicate,true);
    assert.equal(second.registration.sequence,1);
    assert.equal(second.prod_authorized,false);
    assert.equal(second.trading_access,false);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
