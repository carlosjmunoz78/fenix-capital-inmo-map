import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectNextSkillFullAdoption,validateSkillFullAdoptionQueue} from '../skills/skill-full-adoption-selector-v1.mjs';

const registry=()=>JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));

function restoreHistoricalHighRiskState(q){
  const supabase=q.queue.find(x=>x.technical_name==='supabase-postgres-best-practices');
  const browser=q.queue.find(x=>x.technical_name==='agent-browser');
  assert.ok(supabase); assert.ok(browser);
  supabase.status='REVIEW_READY_HIGH_RISK';
  supabase.human_required='HIGH_RISK';
  supabase.autonomous_ceiling='EVIDENCE_ONLY_UNTIL_CANONICAL_HIGH_RISK_GATE_RESOLVED';
  supabase.next_gate='HIGH_RISK_REVIEW_AFTER_ALL_NON_MUTATING_EVIDENCE_IS_COMPLETE';
  browser.status='EXTERNAL_SKILL_REVIEW_READY_HIGH_RISK_INTERNAL_BROWSER_POLICY_GREEN';
  browser.human_required='HIGH_RISK';
  browser.autonomous_ceiling='INTERNAL_TRANSVERSAL_BROWSER_POLICY_GREEN_EXTERNAL_SKILL_EVIDENCE_ONLY_UNTIL_CANONICAL_GATE_RESOLVED';
  browser.next_gate='EXTERNAL_SKILL_HIGH_RISK_REVIEW_INDEPENDENT_FROM_INTERNAL_BROWSER_AUTONOMY';
  return {supabase,browser};
}

test('priority strategy keeps the compounding factory skill first before its FULL closure',()=>{
  const q=registry();
  assert.equal(validateSkillFullAdoptionQueue(q).green,true);
  q.queue[0].status='ADMITTED_INCOMPLETE';
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'SAFE_WORK_AVAILABLE');
  assert.equal(out.selected.alias_es,'Fábrica inteligente de skills');
  assert.equal(out.selected.candidate_id,'lobehub-skills:950cf07380d1daa6de69');
  assert.equal(out.prod_write_authorized,false);
  assert.equal(out.trading_access,false);
  assert.equal(out.additional_cost_eur,0);
});

test('queue advances to safe GitHub capability after factory skill is FULL while GitHub remains incomplete',()=>{
  const q=registry();
  assert.equal(q.queue[0].status,'FULL_SAFE_PREPROD');
  q.queue[1].status='ADMITTED_INCOMPLETE';
  delete q.queue[1].closure_evidence;
  delete q.queue[1].validated_by_workflow_run;
  delete q.queue[1].validated_head_sha;
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'SAFE_WORK_AVAILABLE');
  assert.equal(out.selected.alias_es,'Manejo seguro de GitHub');
  assert.equal(out.selected.candidate_id,'lobehub-skills:52441cd3d76607ffffab');
});

test('historical queue advances to admitted Obsidian while earlier safe capabilities are FULL and unresolved high-risk skills stay blocked',()=>{
  const q=registry();
  restoreHistoricalHighRiskState(q);
  assert.equal(q.queue[0].status,'FULL_SAFE_PREPROD');
  assert.equal(q.queue[1].status,'FULL_SAFE_PREPROD');
  const obsidian=q.queue.find(x=>x.technical_name==='obsidian');
  assert.ok(obsidian);
  obsidian.status='ADMITTED_INCOMPLETE';
  delete obsidian.closure_evidence;
  delete obsidian.validated_by_workflow_run;
  delete obsidian.validated_head_sha;
  delete obsidian.full_validation_workflows;
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'SAFE_WORK_AVAILABLE');
  assert.equal(out.selected.alias_es,'Asistente seguro de conocimiento en Obsidian');
  assert.equal(out.selected.candidate_id,'lobehub-skills:9a6e3fac20369220df43');
  assert.deepEqual(out.blocked.map(x=>x.alias_es),['Optimización y seguridad de bases de datos','Control avanzado del navegador']);
});

test('historical HIGH_RISK candidates remain blocked until their canonical review gate is resolved',()=>{
  const q=registry();
  restoreHistoricalHighRiskState(q);
  const obsidian=q.queue.find(x=>x.technical_name==='obsidian');
  assert.ok(obsidian);
  obsidian.status='FULL_SAFE_PREPROD';
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'HUMAN_REQUIRED_PENDING');
  assert.equal(out.selected,null);
  assert.deepEqual(out.blocked.map(x=>x.alias_es),['Optimización y seguridad de bases de datos','Control avanzado del navegador']);
  assert.ok(out.blocked.every(x=>x.human_required==='HIGH_RISK'));
});

test('current admitted queue is fully closed after scoped HIGH_RISK resolution',()=>{
  const q=registry();
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'ALL_FULL_OR_TERMINAL');
  assert.equal(out.selected,null);
  assert.deepEqual(out.blocked,[]);
  assert.equal(out.incomplete_count,0);
  assert.equal(q.inventory_audit.full_safe_preprod_count,5);
  assert.equal(q.inventory_audit.all_admitted_full_safe_preprod_on_2026_10_17,true);
  const supabase=q.queue.find(x=>x.technical_name==='supabase-postgres-best-practices');
  const browser=q.queue.find(x=>x.technical_name==='agent-browser');
  assert.equal(supabase.status,'FULL_SAFE_PREPROD');
  assert.equal(supabase.human_required,null);
  assert.deepEqual(supabase.target_engine_bindings,['DATA-001','DBOFF-001','STOROFF-001','API-001','CRM-001']);
  assert.equal(supabase.external_skill_code_execution,false);
  assert.equal(supabase.db_mutation_authorized,false);
  assert.equal(browser.status,'FULL_SAFE_PREPROD');
  assert.equal(browser.human_required,null);
  assert.deepEqual(browser.target_engine_bindings,['AUTO-001','AUTBOOT-001','QA-001','WEB-001','SCAN-001']);
  assert.equal(browser.browser_is_tool_not_authority,true);
  assert.equal(browser.external_skill_code_execution,false);
  assert.equal(browser.browser_external_side_effect_authorized,false);
});

test('unsafe authority expansion fails closed',()=>{
  const q=registry();
  q.policy.prod_write=true;
  assert.throws(()=>validateSkillFullAdoptionQueue(q),/unsafe policy:prod_write/);
});

test('every queued skill must have a Spanish alias',()=>{
  const q=registry();
  q.queue[0].alias_es='';
  assert.throws(()=>validateSkillFullAdoptionQueue(q),/alias_es required/);
});

test('specialized wrapper inventory is reconciled with all five admitted skills FULL SAFE PREPROD',()=>{
  const q=registry();
  assert.equal(q.inventory_audit.specialized_cerebro_wrappers_observed,5);
  assert.equal(q.inventory_audit.admitted_full_queue_count,5);
  assert.equal(q.inventory_audit.observed_not_admitted_count,0);
  assert.equal(q.inventory_audit.full_safe_preprod_count,5);
  assert.ok(q.queue.every(x=>x.status==='FULL_SAFE_PREPROD'));
  const obsidian=q.queue.find(x=>x.technical_name==='obsidian');
  assert.ok(obsidian);
  assert.equal(obsidian.alias_es,'Asistente seguro de conocimiento en Obsidian');
  assert.equal(obsidian.status,'FULL_SAFE_PREPROD');
  assert.equal(obsidian.admitted,true);
  assert.equal(obsidian.install_authorized,false);
  assert.equal(obsidian.execution_authorized,false);
  assert.equal(obsidian.live_obsidian_cli_execution,false);
  assert.equal(obsidian.canonical_knowledge_migration_authorized,false);
  assert.equal(obsidian.human_required,null);
  assert.deepEqual(q.observed_not_admitted,[]);
});
