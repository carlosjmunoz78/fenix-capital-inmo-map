import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SkillCapabilityRegistryV0,
  SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT,
  analyzeSkillImpact,
  buildOldVsNewPlans,
  buildSkillLearningRecord,
  evaluateOldVsNew,
  finalizeSkillEvaluation,
  ingestSkillCapability,
  normalizeSkillManifest,
  validateSkillManifest
} from '../runtime/skill-capability-evolution.mjs';
import {LearningLedgerV0} from '../runtime/learning-ledger.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-evolution-'));}
function skill(overrides={}){return {company_id:'fenix',environment:'PREPROD',skill_id:'VIDEO-ANALYSIS',skill_version:'1.0.0',capabilities:['video_analysis','content_quality'],inputs:['video'],outputs:['quality_signal'],tags:['marketing','training'],risk_class:'LOW',additional_cost_eur:0,...overrides};}
function engines(){return [
  {company_id:'fenix',engine_id:'MKT-001',version:'1.2.0',capabilities:['content_quality'],inputs:['quality_signal'],outputs:['campaign'],tags:['marketing'],autonomy_state:'ASSISTED'},
  {company_id:'fenix',engine_id:'TRN-001',version:'0.9.0',capabilities:['training_eval'],inputs:['quality_signal'],outputs:['training_score'],tags:['training'],autonomy_state:'ASSISTED'},
  {company_id:'other',engine_id:'OTHER-001',version:'1.0.0',capabilities:['video_analysis'],tags:['marketing']}
];}

function planAndResult({candidate={success_rate:0.90,quality:0.92,latency_ms:90,cost_eur:0,policy_violations:0,safety_violations:0}}={}){
  const canonical=normalizeSkillManifest(skill({registered_at:'2026-10-09T11:00:00Z'}));
  const impact=analyzeSkillImpact({skill:canonical,engines:engines()});
  const plan=buildOldVsNewPlans({skill:canonical,impact_analysis:impact})[0];
  const result=evaluateOldVsNew({plan,baseline_metrics:{success_rate:0.80,quality:0.80,latency_ms:100,cost_eur:0,policy_violations:0,safety_violations:0},candidate_metrics:candidate});
  return {canonical,impact,plan,result};
}

test('manifest is PREPROD, multiempresa and zero-cost fail-closed',()=>{
  assert.equal(validateSkillManifest(skill()).ok,true);
  assert.equal(validateSkillManifest(skill({environment:'PROD'})).ok,false);
  assert.equal(validateSkillManifest(skill({additional_cost_eur:1})).ok,false);
  assert.equal(validateSkillManifest(skill({prod_authorized:true})).ok,false);
  assert.equal(validateSkillManifest(skill({human_required:'GENERIC_ERROR'})).ok,false);
});

test('normalization is deterministic across registration timestamps',()=>{
  const a=normalizeSkillManifest(skill({registered_at:'2026-10-09T10:00:00Z'}));
  const b=normalizeSkillManifest(skill({registered_at:'2026-10-09T11:00:00Z'}));
  assert.equal(a.skill_fingerprint,b.skill_fingerprint);
  assert.equal(a.company_id,'fenix');
  assert.equal(a.engine_id,'SKILL-REGISTRY');
  assert.equal(a.environment,'PREPROD');
  assert.equal(a.additional_cost_eur,0);
});

test('registry is idempotent and rejects same-version contract mutation',()=>{
  const root=temp();try{
    const file=path.join(root,'skills.v8');const registry=new SkillCapabilityRegistryV0({file_path:file});
    const first=registry.register(skill({registered_at:'2026-10-09T10:00:00Z'}));
    const duplicate=registry.register(skill({registered_at:'2026-10-09T11:00:00Z'}));
    assert.equal(first.accepted,true);assert.equal(duplicate.duplicate,true);assert.equal(registry.list({company_id:'fenix'}).length,1);
    assert.throws(()=>registry.register(skill({capabilities:['different_capability']})),/conflict/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('impact analyzer prefers extending existing engines and isolates companies',()=>{
  const result=analyzeSkillImpact({skill:skill({registered_at:'2026-10-09T10:00:00Z'}),engines:engines()});
  assert.equal(result.gap_detected,false);assert.equal(result.factory_action,'EXTEND_EXISTING_ENGINE');
  assert.equal(result.create_new_engine_authorized,false);assert.ok(result.impacts.length>=1);
  assert.equal(result.impacts.some((item)=>item.engine_id==='OTHER-001'),false);
  assert.equal(result.prod_authorized,false);
});

test('true capability gap emits FACT-001 candidate gate but never creates engine directly',()=>{
  const result=analyzeSkillImpact({skill:skill({capabilities:['novel_capability'],inputs:[],outputs:[],tags:[]}),engines:engines(),minimum_score:0.2});
  assert.equal(result.gap_detected,true);assert.equal(result.factory_action,'FACT001_REGISTRY_CANDIDATE_REQUIRED');
  assert.equal(result.create_new_engine_authorized,false);assert.equal(result.next_gate,'FACT001_CAPABILITY_GAP_REVIEW');
});

test('OLD vs NEW plan locks policy, permissions, rollback and rebuild',()=>{
  const {canonical,impact}=planAndResult();const plans=buildOldVsNewPlans({skill:canonical,impact_analysis:impact});
  assert.ok(plans.length>=1);for(const plan of plans){assert.equal(plan.environment,'PREPROD');assert.equal(plan.policy_locked,true);assert.equal(plan.permissions_locked,true);assert.equal(plan.rollback_required,true);assert.equal(plan.rebuild_required,true);assert.equal(plan.prod_write_authorized,false);}
});

test('candidate passes only with measured no-cost non-regressing improvement',()=>{
  const {result}=planAndResult();assert.equal(result.decision,'PASS');assert.equal(result.rollback_required,false);assert.equal(result.next_gate,'LEARNING_AND_TRIBUNAL');
});

test('quality, cost or safety regression fails closed to rollback',()=>{
  const cost=planAndResult({candidate:{success_rate:0.90,quality:0.92,latency_ms:90,cost_eur:1,policy_violations:0,safety_violations:0}}).result;
  assert.equal(cost.decision,'FAIL');assert.ok(cost.reasons.includes('COST_REGRESSION'));
  const safety=planAndResult({candidate:{success_rate:0.90,quality:0.92,latency_ms:90,cost_eur:0,policy_violations:1,safety_violations:0}}).result;
  assert.equal(safety.decision,'FAIL');assert.ok(safety.reasons.includes('SAFETY_OR_POLICY_REGRESSION'));assert.equal(safety.next_gate,'ROLLBACK');
  const quality=planAndResult({candidate:{success_rate:0.79,quality:0.79,latency_ms:101,cost_eur:0,policy_violations:0,safety_violations:0}}).result;
  assert.equal(quality.decision,'FAIL');assert.ok(quality.reasons.includes('METRIC_REGRESSION'));
});

test('measured result becomes a valid LRN-001 record and persists idempotently',()=>{
  const root=temp();try{
    const {canonical,plan,result}=planAndResult();const ledgerFile=path.join(root,'learning.v8');
    const learning=buildSkillLearningRecord({skill:canonical,plan,result,observed_at:'2026-10-09T11:10:00Z'});
    assert.equal(learning.created_by,'CEREBRO_SKILL_CAPABILITY_EVOLUTION_V0');assert.equal(learning.environment,'PREPROD');assert.equal(learning.judge_decision,'PASS');
    const first=finalizeSkillEvaluation({skill:canonical,plan,result,learning_ledger_file:ledgerFile,observed_at:'2026-10-09T11:10:00Z'});
    const second=finalizeSkillEvaluation({skill:canonical,plan,result,learning_ledger_file:ledgerFile,observed_at:'2026-10-09T11:11:00Z'});
    assert.equal(first.learning_persistence.accepted,true);assert.equal(second.learning_persistence.duplicate,true);
    const ledger=new LearningLedgerV0({file_path:ledgerFile,environment:'PREPROD'});assert.equal(ledger.listForContext({company_id:'fenix',engine_id:plan.engine_id}).length,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('universal intake registers skill and automatically prepares all matching experiments',()=>{
  const root=temp();try{
    const out=ingestSkillCapability({skill:skill({registered_at:'2026-10-09T11:00:00Z'}),engines:engines(),registry_file:path.join(root,'skills.v8')});
    assert.equal(out.status,'SKILL_REGISTERED_EXPERIMENTS_READY');assert.ok(out.plans.length>=1);assert.equal(out.next_gate,'OLD_VS_NEW_EXPERIMENT');
    assert.equal(out.prod_authorized,false);assert.equal(out.additional_cost_eur,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('runtime contract keeps supervisor, tribunal, rollback, FACT-001 and LRN-001 mandatory',()=>{
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.strategy,'EXTEND_EXISTING_BEFORE_FACTORY_CREATE');
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.learning_sink,'LRN-001');
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.supervisor_gate_required,true);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.tribunal_gate_required,true);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.rollback_required,true);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT.autonomous_global_prod,false);
});
