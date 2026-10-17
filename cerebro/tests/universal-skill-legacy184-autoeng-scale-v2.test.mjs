import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runLegacy184AutoEngineeringScale} from '../runtime/universal-skill-legacy184-autoeng-scale-v2.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));const REPO_ROOT=path.resolve(__dirname,'../..');

test('Scale184 V2 truthfully re-runs prior engineering gaps and promotes only evidenced FULL',()=>{const report=runLegacy184AutoEngineeringScale({root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-scale184-v2-test-')),source_run_id:184200002,source_head_sha:'cccccccccccccccccccccccccccccccccccccccc'});assert.equal(report.status,'GREEN_TRUTHFUL_AUTO_ENGINEERING_SCALE');assert.equal(report.catalog_size,184);assert.equal(report.matrix.length,184);const stripe=report.matrix.find((x)=>x.item_id===128);assert.ok(stripe);assert.equal(stripe.previous_outcome,'ENGINEERING_TASK_REQUIRED');assert.equal(stripe.observed_outcome,'FULL_SAFE_PREPROD');assert.equal(stripe.full_safe_preprod,true);assert.deepEqual(stripe.domain_ids,['finance-accounting-payments']);assert.equal(stripe.generated_semantic_evidence_count,6);assert.ok(report.auto_engineering_improvements.some((x)=>x.item_id===128));for(const row of report.new_full_safe_preprod){assert.equal(row.full_safe_preprod,true);assert.equal(row.evidence_status,'FULL_EVIDENCE_GREEN');}assert.equal(report.full_claim,false);});

test('Scale184 V2 runtime has no item-specific promotion branch',()=>{const runtime=fs.readFileSync(path.join(REPO_ROOT,'cerebro/runtime/universal-skill-legacy184-autoeng-scale-v2.mjs'),'utf8');assert.equal(/item_id\s*===\s*128|source_item_id\s*===\s*128|case\s+128/.test(runtime),false);assert.equal(runtime.includes('FULL_SAFE_PREPROD'),true);});
