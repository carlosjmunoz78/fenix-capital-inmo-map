import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectNextSkillFullAdoption,validateSkillFullAdoptionQueue} from '../skills/skill-full-adoption-selector-v1.mjs';

const registry=()=>JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));

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

test('queue advances to admitted Obsidian while earlier safe capabilities are FULL and high-risk skills stay blocked',()=>{
  const q=registry();
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

test('HIGH_RISK candidates remain blocked and become the next gate only after Obsidian also reaches FULL or terminal',()=>{
  const q=registry();
  const obsidian=q.queue.find(x=>x.technical_name==='obsidian');
  assert.ok(obsidian);
  obsidian.status='FULL_SAFE_PREPROD';
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'HUMAN_REQUIRED_PENDING');
  assert.equal(out.selected,null);
  assert.deepEqual(out.blocked.map(x=>x.alias_es),['Optimización y seguridad de bases de datos','Control avanzado del navegador']);
  assert.ok(out.blocked.every(x=>x.human_required==='HIGH_RISK'));
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

test('specialized wrapper inventory is reconciled with Obsidian admitted only after green synthetic judge and tribunal',()=>{
  const q=registry();
  assert.equal(q.inventory_audit.specialized_cerebro_wrappers_observed,5);
  assert.equal(q.inventory_audit.admitted_full_queue_count,5);
  assert.equal(q.inventory_audit.observed_not_admitted_count,0);
  assert.equal(q.inventory_audit.full_safe_preprod_count,3);
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
