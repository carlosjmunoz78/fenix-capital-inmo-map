import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveGovernedSkillBindings,buildSkillEngineBindingBundle,runSkillRealEngineBinding,
  EXPECTED_BINDINGS,SUPABASE_SKILL,BROWSER_SKILL
} from '../skills/skill-real-engine-binding-v1.mjs';

const SHA='4444444444444444444444444444444444444444';

test('governed evidence resolves exactly ten canonical bindings',()=>{
  const r=resolveGovernedSkillBindings();
  assert.deepEqual(r.supabase,[...EXPECTED_BINDINGS[SUPABASE_SKILL.technical_name]]);
  assert.deepEqual(r.browser,[...EXPECTED_BINDINGS[BROWSER_SKILL.technical_name]]);
  assert.equal(r.all.length,10);
  assert.equal(r.canonical_engine_count,179);
});

test('every relevant engine semantically consumes its normalized wrapper',()=>{
  const b=buildSkillEngineBindingBundle({company_id:'fenix'});
  assert.equal(b.status,'TEN_BINDINGS_READY');
  assert.equal(b.receipts.length,10);
  for(const receipt of b.receipts){
    assert.equal(receipt.consumer_class,'REAL_SEMANTIC_ENGINE_BINDING');
    assert.equal(receipt.real_consumption,true);
    assert.equal(receipt.meaningful_change,true);
    assert.equal(receipt.outcome.old_vs_new,'PASS');
    assert.equal(receipt.outcome.candidate_coverage,1);
    assert.ok(receipt.outcome.baseline_coverage<1);
    assert.ok(receipt.outcome.semantic_constraints.length>=2);
    assert.equal(receipt.external_skill_code_execution,false);
    assert.equal(receipt.prod_write_authorized,false);
    assert.equal(receipt.permission_expansion_authorized,false);
    assert.equal(receipt.additional_cost_eur,0);
  }
  assert.equal(b.human_resolution.decision,'AUTHORIZE_SAFE_PREPROD_BINDING_CLOSURE_ONLY');
  assert.equal(b.prior_evidence.prior_high_risk_review_green,true);
  assert.equal(b.external_skill_code_executed,false);
});

test('strict skill binding route reaches FULL_SAFE_PREPROD',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'skill-bindings-real-'));
  const r=runSkillRealEngineBinding({company_id:'fenix',root_dir:root,source_run_id:401,source_head_sha:SHA});
  assert.equal(r.status,'FULL_SAFE_PREPROD');
  assert.equal(r.full_safe_preprod,true);
  assert.equal(r.binding_count,10);
  assert.equal(r.semantic_bindings.length,10);
  assert.equal(r.per_binding_old_vs_new_pass,true);
  assert.equal(r.old_vs_new_results.length,10);
  assert.equal(r.old_vs_new_results.every(x=>x.decision==='PASS'&&x.candidate_coverage===1&&x.baseline_coverage<1),true);
  assert.equal(r.independent_tribunal.decision,'PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(r.observability_consumer.decision,'OBSERVABILITY_RECORDED');
  assert.equal(r.finops_consumer.decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(r.audit_green,true);
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);
  assert.equal(r.backup_rollback_rebuild.rollback_green,true);
  assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(r.restartable,true);
  assert.equal(r.idempotency_proven,true);
  assert.equal(r.external_skill_code_executed,false);
  assert.equal(r.raw_external_skill_runtime_installed,false);
  assert.equal(r.additional_cost_eur,0);
  for(const key of ['prod_authorized','prod_write_authorized','prod_mutation_authorized','db_mutation_authorized','crm_write_authorized','provider_write_authorized','browser_external_side_effect_authorized','permission_expansion_authorized','customer_data_used','paid_fallback','spend_authorized','trading_access'])assert.equal(r[key],false,key);
});

test('strict route remains semantically idempotent across restart',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'skill-bindings-restart-'));
  const a=runSkillRealEngineBinding({company_id:'fenix',root_dir:root,source_run_id:402,source_head_sha:SHA});
  const b=runSkillRealEngineBinding({company_id:'fenix',root_dir:root,source_run_id:402,source_head_sha:SHA});
  assert.equal(a.binding_id,b.binding_id);
  assert.equal(a.semantic_outcome_hash,b.semantic_outcome_hash);
  assert.equal(a.binding_count,b.binding_count);
  assert.equal(b.full_safe_preprod,true);
  assert.equal(b.idempotency_proven,true);
});
