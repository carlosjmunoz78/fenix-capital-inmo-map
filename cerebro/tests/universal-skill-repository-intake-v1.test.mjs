import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runRepositoryActivation,snapshotRepositoryDirectory,normalizeRepositoryCandidate} from '../runtime/universal-skill-repository-intake-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(__dirname,'../..');

function makeUnseenRepo({license='MIT',withManifest=true}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-unseen-repository-'));
  const nonce=crypto.randomBytes(8).toString('hex');
  if(withManifest){
    const manifest={
      schema_version:'1.0.0',technical_name:`unseen-finance-safe-${nonce}`,version:'0.1.0',license,
      description:'Read-only finance reconciliation capability with explicit zero-payment authority, company tenant scope and money limit guard.',
      policy:{payment_execution_authorized:false,MONEY_LIMIT:'ENFORCED',tenant_scope:'company_id'},
      capabilities:[{technical_name:`safe-finance-reconciliation-${nonce}`,description:'Finance accounting reconciliation without payment execution and with company_id tenant scope.',terms:['finance','accounting','payments','reconciliation'],declared_domains:['finance-accounting-payments']}]
    };
    fs.writeFileSync(path.join(dir,'cerebro.skill.json'),`${JSON.stringify(manifest,null,2)}\n`);
  }
  fs.writeFileSync(path.join(dir,'LICENSE'),license==='MIT'?'MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy.':'Custom restricted license');
  fs.writeFileSync(path.join(dir,'README.md'),'# Unseen finance skill\nRead-only reconciliation. No payment execution authority. MONEY_LIMIT enforced. Tenant scope uses company_id.\n');
  return dir;
}

test('B9 unseen repository goes from raw directory to FULL_SAFE_PREPROD with no candidate-specific integration',()=>{
  const dir=makeUnseenRepo();
  const report=runRepositoryActivation({repo_dir:dir,source_locator:'sandbox-unseen://generated-at-test',company_id:'fenix',root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b9-work-')),source_run_id:9001,source_head_sha:'9999999999999999999999999999999999999999'});
  assert.equal(report.status,'FULL_SAFE_PREPROD');
  assert.equal(report.full_safe_preprod,true);
  assert.match(report.candidate_id,/^repo:[a-f0-9]{28}$/);
  assert.equal(report.license_spdx,'MIT');
  assert.equal(report.activation_plan.binding_count,6);
  assert.deepEqual(report.activation_plan.domain_ids,['finance-accounting-payments']);
  assert.equal(report.auto_engineering.fulfillment.source_evidence_kind,'GOVERNED_READONLY_REMOTE');
  assert.equal(report.auto_engineering.fulfillment.generated_semantic_evidence_count,6);
  assert.equal(report.auto_engineering.binding_report.independent_tribunal.decision,'PASS');
  assert.equal(report.native_registration.status,'NATIVE_FULL_PREPROD');
  assert.equal(report.native_registration.native_full,true);
  assert.equal(report.native_registration.discovery_import.external_skill_code_executed,false);
  assert.equal(report.external_skill_code_execution,false);
  assert.equal(report.dependency_install_authorized,false);
  assert.equal(report.additional_cost_eur,0);
  assert.ok(report.elapsed_ms<60000);
});

test('B9 missing manifest fails closed to LOW_CONFIDENCE instead of guessing capability',()=>{
  const dir=makeUnseenRepo({withManifest:false});
  const snapshot=snapshotRepositoryDirectory({repo_dir:dir});
  const candidate=normalizeRepositoryCandidate({snapshot,company_id:'fenix'});
  assert.equal(candidate.status,'HUMAN_REQUIRED');
  assert.equal(candidate.human_required,'LOW_CONFIDENCE');
  assert.equal(candidate.reason,'CEREBRO_SKILL_MANIFEST_MISSING');
});

test('B9 incompatible or unverified license is rejected before activation',()=>{
  const dir=makeUnseenRepo({license:'CUSTOM-NONCOMMERCIAL'});
  const report=runRepositoryActivation({repo_dir:dir,company_id:'fenix'});
  assert.equal(report.status,'REJECTED');
  assert.equal(report.terminal_state,'REJECTED');
  assert.equal(report.reason,'LICENSE_INCOMPATIBLE_OR_UNVERIFIED');
  assert.equal(report.full_safe_preprod,false);
});

test('B9 runtime contains no generated candidate ID or external code execution path',()=>{
  const runtime=fs.readFileSync(path.join(REPO_ROOT,'cerebro/runtime/universal-skill-repository-intake-v1.mjs'),'utf8');
  assert.equal(runtime.includes('unseen-finance-safe-'),false);
  assert.equal(runtime.includes('child_process'),false);
  assert.equal(runtime.includes('npm install'),false);
  assert.equal(runtime.includes('exec('),false);
  assert.equal(runtime.includes('external_skill_code_execution:true'),false);
});
