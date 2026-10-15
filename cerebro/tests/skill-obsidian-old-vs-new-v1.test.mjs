import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateObsidianOldVsNew} from '../skills/skill-obsidian-old-vs-new-v1.mjs';

const surface=JSON.parse(fs.readFileSync(new URL('../human-intelligence/knowledge/knowledge-surface-map.v1.json',import.meta.url),'utf8'));

test('Obsidian wrapper patterns improve all three synthetic knowledge cases without replacing canonical owners',()=>{
  const report=evaluateObsidianOldVsNew({knowledgeSurface:surface});
  assert.equal(report.status,'GREEN_FOR_GOVERNED_ADMISSION_REVIEW');
  assert.equal(report.cases.length,3);
  assert.equal(report.every_case_improves,true);
  assert.equal(report.every_case_non_regressing,true);
  assert.equal(report.measurable_improvement,true);
  assert.ok(report.delta>0);
  assert.deepEqual(report.canonical_structural_owners,['KNW-001','RAG-001','PRV-001','UPD-001']);
  assert.equal(report.canonical_knowledge_replaced,false);
  assert.equal(report.notion_or_rag_migration_authorized,false);
  assert.equal(report.admitted,false);
  assert.equal(report.next_gate,'INDEPENDENT_JUDGE_AND_TRIBUNAL_FOR_ADMISSION');
});

test('every Obsidian synthetic case preserves zero-cost and zero-authority hard gates',()=>{
  const report=evaluateObsidianOldVsNew({knowledgeSurface:surface});
  assert.equal(report.all_hard_gates_green,true);
  for(const item of report.cases){
    assert.equal(item.hard_gate_green,true);
    assert.equal(item.wrapper_applied,true);
    assert.equal(item.policy_conflict,false);
    assert.equal(item.live_obsidian_cli_execution,false);
    assert.equal(item.external_skill_code_execution,false);
    assert.equal(item.prod_authorized,false);
    assert.equal(item.prod_write_authorized,false);
    assert.equal(item.trading_access,false);
    assert.equal(item.additional_cost_eur,0);
  }
  assert.equal(report.real_vault_used,false);
  assert.equal(report.customer_data_used,false);
  assert.equal(report.additional_cost_eur,0);
});

test('comparison fails closed if canonical structural knowledge ownership drifts',()=>{
  const bad=structuredClone(surface);
  bad.canonical_owners.structural_knowledge=['RAG-001'];
  assert.throws(()=>evaluateObsidianOldVsNew({knowledgeSurface:bad}),/CANONICAL_KNOWLEDGE_OWNER_DRIFT/);
});

test('comparison fails closed if current knowledge surface gains unsafe production or Trading authority',()=>{
  for(const [field,value,error] of [
    ['prod_authority_expansion',true,/KNOWLEDGE_PROD_AUTHORITY_NOT_CLOSED/],
    ['prod_write_authority_expansion',true,/KNOWLEDGE_PROD_WRITE_NOT_CLOSED/],
    ['trading_access',true,/KNOWLEDGE_TRADING_NOT_CLOSED/],
    ['additional_cost_eur',1,/KNOWLEDGE_COST_NOT_ZERO/]
  ]){
    const bad=structuredClone(surface);
    bad.safety[field]=value;
    assert.throws(()=>evaluateObsidianOldVsNew({knowledgeSurface:bad}),error);
  }
});
