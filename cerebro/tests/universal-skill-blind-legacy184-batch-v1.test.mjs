import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectBlindLegacyBatch,normalizeLegacy184Item} from '../runtime/universal-skill-legacy184-normalizer-v1.mjs';
import {runUniversalSkillBatchOnce} from '../runtime/universal-skill-batch-orchestrator-v1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const realFile=path.resolve(here,'../skills/cerebro-184-items-38-50-live-reconciliation.v2.json');
const realDoc=JSON.parse(fs.readFileSync(realFile,'utf8'));

test('blind selector consumes real catalog reconciliation rather than handcrafted skill fixtures',()=>{
  assert.equal(realDoc.state_type,'CEREBRO_184_ITEMS_38_50_LIVE_RECONCILIATION_V2');
  const selection=selectBlindLegacyBatch(realDoc,{limit:4,source_ref:'cerebro/skills/cerebro-184-items-38-50-live-reconciliation.v2.json'});
  assert.equal(selection.catalog_range,'38-50');
  assert.equal(selection.selected.length,4);
  const names=selection.selected.map((x)=>x.activation_input?.technical_name??'').join(' ');
  for(const forbidden of ['supabase-postgres-best-practices','agent-browser','skill-creator','obsidian','github'])assert.ok(!names.includes(forbidden),forbidden);
  assert.ok(selection.selected.some((x)=>x.expected_outcome==='ABSORBED'));
  assert.ok(selection.selected.some((x)=>x.expected_outcome==='BLOCKED_EXTERNAL'));
  assert.ok(selection.selected.some((x)=>x.expected_outcome==='ENGINEERING_TASK_REQUIRED'));
  assert.ok(selection.excluded_terminal.some((x)=>x.expected_outcome==='REJECTED'));
});

test('generic legacy normalizer uses disposition/state/evidence rules, not item-id special cases',()=>{
  const fabricated={id:999,name:'Synthetic capability gap',disposition:'FABRICAR_GRATIS',state:'DEFINED_NOT_BUILT',owner_engine_ids:['FACT-001','QA-001'],evidence:['evidence:x'],reason:'generic gap'};
  const normalized=normalizeLegacy184Item(fabricated,{source_ref:'test:generic'});
  assert.equal(normalized.source_item_id,999);
  assert.equal(normalized.expected_outcome,'ENGINEERING_TASK_REQUIRED');
  assert.ok(normalized.activation_input.capabilities.length>=1);
  assert.equal(normalized.prod_authorized,false);
});

test('blind real-catalog batch reaches truthful outcomes without candidate-specific integration code',()=>{
  const selection=selectBlindLegacyBatch(realDoc,{limit:4,source_ref:'cerebro/skills/cerebro-184-items-38-50-live-reconciliation.v2.json'});
  const candidates=selection.selected.map((x)=>({activation_input:x.activation_input,candidate_evidence:x.candidate_evidence,low_risk:true,external_side_effects:false}));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'usaf-blind-real184-'));
  const report=runUniversalSkillBatchOnce({root_dir:root,candidates,max_jobs:20,source_run_id:184038050,source_head_sha:'3333333333333333333333333333333333333333',now_ms:5000000});
  assert.equal(report.processed,candidates.length);
  const expected=Object.fromEntries(selection.selected.map((x)=>[x.activation_input.candidate_id,x.expected_outcome]));
  for(const result of report.results){
    assert.equal(result.status,expected[result.candidate_id],`${result.candidate_id}:${result.status}`);
    assert.notEqual(result.status,'FULL_SAFE_PREPROD','Blind legacy evidence must not be upgraded to FULL without real semantic adapter evidence');
  }
  assert.ok(report.results.some((x)=>x.status==='ABSORBED'));
  assert.ok(report.results.some((x)=>x.status==='BLOCKED_EXTERNAL'));
  assert.ok(report.results.some((x)=>x.status==='ENGINEERING_TASK_REQUIRED'));
  assert.equal(report.prod_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});

test('reference-only and HOLD items are explicitly excluded as REJECTED instead of being activated',()=>{
  const selection=selectBlindLegacyBatch(realDoc,{limit:4,source_ref:'real:38-50'});
  const rejected=selection.excluded_terminal.filter((x)=>x.expected_outcome==='REJECTED');
  assert.ok(rejected.length>=1);
  assert.ok(rejected.every((x)=>['CATALOGAR','HOLD','DESCARTAR'].includes(x.source_disposition)));
  assert.ok(rejected.every((x)=>x.excluded_from_activation_batch===true));
});
