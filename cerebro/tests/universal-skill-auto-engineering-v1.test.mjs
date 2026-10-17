import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeLegacy184Item} from '../runtime/universal-skill-legacy184-normalizer-v1.mjs';
import {buildUniversalActivationPlan} from '../runtime/universal-skill-activation-planner-v1.mjs';
import {runUniversalSkillAutoEngineering,supportedAutoEngineeringDomains} from '../runtime/universal-skill-auto-engineering-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(__dirname,'../..');
const SOURCE_FILE='cerebro/skills/cerebro-184-items-118-131-live-reconciliation.v2.json';

function realFinanceCandidate(){
  const doc=JSON.parse(fs.readFileSync(path.join(REPO_ROOT,SOURCE_FILE),'utf8'));
  const item=doc.items.find((x)=>x.id===128);
  assert.ok(item);
  return normalizeLegacy184Item(item,{source_ref:SOURCE_FILE});
}

test('B8 family executor advances a real prior ENGINEERING_TASK_REQUIRED finance candidate without per-ID runtime code',()=>{
  const normalized=realFinanceCandidate();
  assert.equal(normalized.expected_outcome,'ENGINEERING_TASK_REQUIRED');
  const plan=buildUniversalActivationPlan(normalized.activation_input);
  assert.equal(plan.status,'ACTIVATION_PLAN_READY');
  assert.deepEqual(plan.domain_ids,['finance-accounting-payments']);
  assert.equal(plan.binding_count,6);

  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b8-finance-'));
  const report=runUniversalSkillAutoEngineering({activation_plan:plan,candidate_evidence:normalized.candidate_evidence,repo_root:REPO_ROOT,root_dir:root,source_run_id:8001,source_head_sha:'8888888888888888888888888888888888888888'});
  assert.equal(report.status,'FULL_SAFE_PREPROD');
  assert.equal(report.full_safe_preprod,true);
  assert.equal(report.fulfillment.initial_engineering_tasks,6);
  assert.equal(report.fulfillment.generated_semantic_evidence_count,6);
  assert.equal(report.fulfillment.unresolved_engineering_tasks.length,0);
  assert.equal(report.binding_report.binding_count,6);
  assert.equal(report.binding_report.independent_tribunal.decision,'PASS');
  assert.equal(report.binding_report.learning_sink.learning_outcome,'UNIVERSAL_SKILL_REAL_BINDINGS_GREEN');
  assert.equal(report.binding_report.backup_rollback_rebuild.rollback_green,true);
  assert.equal(report.binding_report.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(report.additional_cost_eur,0);
  for(const provider of report.fulfillment.provider_reports){
    assert.equal(provider.provider_id,'FIRST_PARTY_FINANCE_SAFE_WRAP_V1');
    assert.equal(provider.status,'SEMANTIC_EVIDENCE_GREEN');
    assert.equal(provider.checks.no_payment_execution,true);
    assert.equal(provider.checks.reconcilable_output,true);
    assert.equal(provider.external_skill_code_execution,false);
  }
});

test('B8 fails closed when first-party source evidence cannot be consumed',()=>{
  const normalized=realFinanceCandidate();
  const plan=buildUniversalActivationPlan(normalized.activation_input);
  const emptyRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b8-emptyrepo-'));
  const report=runUniversalSkillAutoEngineering({activation_plan:plan,candidate_evidence:normalized.candidate_evidence,repo_root:emptyRoot,root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b8-hold-'))});
  assert.equal(report.status,'ENGINEERING_TASK_REQUIRED');
  assert.equal(report.full_safe_preprod,false);
  assert.equal(report.fulfillment.generated_semantic_evidence_count,0);
  assert.equal(report.binding_report,null);
});

test('B8 exposes family-level providers, not candidate-specific adapters',()=>{
  assert.deepEqual(supportedAutoEngineeringDomains(),['finance-accounting-payments']);
  const runtime=fs.readFileSync(path.join(REPO_ROOT,'cerebro/runtime/universal-skill-auto-engineering-v1.mjs'),'utf8');
  assert.equal(runtime.includes('legacy184:'),false);
  assert.equal(runtime.includes('Stripe'),false);
  assert.equal(runtime.includes('item.id==='),false);
  assert.equal(runtime.includes('contract.required_constraints'),false);
});
