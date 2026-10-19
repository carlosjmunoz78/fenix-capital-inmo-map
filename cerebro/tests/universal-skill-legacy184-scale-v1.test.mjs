import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LEGACY184_FILES,loadLegacy184Inventory,buildLegacy184ScalePlan,runLegacy184ScaleBatch} from '../runtime/universal-skill-legacy184-scale-v1.mjs';

test('scale inventory covers every legacy catalog item exactly once across canonical reconciliation files',()=>{
  const inventory=loadLegacy184Inventory();
  assert.equal(LEGACY184_FILES.length,16);
  assert.equal(inventory.catalog_size,184);
  assert.equal(inventory.rows.length,184);
  const ids=inventory.rows.map((x)=>x.item.id);
  assert.equal(new Set(ids).size,184);
  assert.deepEqual(ids,[...Array(184)].map((_,i)=>i+1));
});

test('scale plan never upgrades current legacy evidence to FULL merely because item normalization exists',()=>{
  const plan=buildLegacy184ScalePlan();
  assert.equal(plan.catalog_size,184);
  assert.equal(plan.normalized.length,184);
  assert.equal(plan.prod_authorized,false);
  assert.ok(!('FULL_SAFE_PREPROD' in plan.expected_outcome_counts));
  assert.ok(plan.activation_candidates.length>0);
  assert.ok(plan.excluded_terminal.length>0);
});

test('all 184 receive a truthful observed outcome without claiming all are physically active',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'usaf-scale184-test-'));
  const report=runLegacy184ScaleBatch({root_dir:root,source_run_id:184000777,source_head_sha:'5555555555555555555555555555555555555555',now_ms:7000000});
  assert.equal(report.status,'GREEN_TRUTHFUL_184_OUTCOME_MATRIX');
  assert.equal(report.catalog_size,184);
  assert.equal(report.matrix.length,184);
  assert.equal(report.mismatches.length,0);
  assert.equal(report.full_claim,false);
  assert.ok(report.processed_runtime>0);
  assert.ok(report.terminal_without_runtime>0);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
  assert.ok(report.matrix.every((x)=>x.expected_outcome===x.observed_outcome));
  assert.ok(report.observed_outcome_counts.ABSORBED>=1);
  assert.ok(report.observed_outcome_counts.BLOCKED_EXTERNAL>=1);
  assert.ok(report.observed_outcome_counts.REJECTED>=1);
});

test('scale report is evidence classification, not a false activation certificate',()=>{
  const report=runLegacy184ScaleBatch({root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'usaf-scale184-truth-')),now_ms:8000000});
  assert.equal(report.full_claim,false);
  assert.match(report.note,/does NOT mean 184 items are physically active or FULL/);
  const activeLike=(report.observed_outcome_counts.FULL_SAFE_PREPROD??0)+(report.observed_outcome_counts.FULL_REAL??0);
  assert.equal(activeLike,0);
});
