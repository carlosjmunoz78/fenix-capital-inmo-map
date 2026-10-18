import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runRepositoryActivation,snapshotRepositoryDirectory,normalizeRepositoryCandidate} from '../runtime/universal-skill-repository-intake-v1.mjs';
import {runLegacy184ScaleBatch} from '../runtime/universal-skill-legacy184-scale-v1.mjs';
import {runLegacy184AutoEngineeringScale} from '../runtime/universal-skill-legacy184-autoeng-scale-v2.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(__dirname,'../..');
const B19_REGISTRY=path.join(REPO_ROOT,'cerebro/registry/universal-skill-b19-universal-e2e-real.v1.json');
const CORE_FILES=[
  'cerebro/runtime/universal-skill-activation-planner-v1.mjs',
  'cerebro/runtime/universal-skill-adapter-factory-v1.mjs',
  'cerebro/runtime/universal-skill-auto-engineering-v1.mjs',
  'cerebro/runtime/universal-skill-real-binding-v1.mjs',
  'cerebro/runtime/universal-skill-repository-intake-v1.mjs',
  'cerebro/runtime/universal-skill-batch-orchestrator-v1.mjs'
];

function writeNovelRepo({license='MIT',withManifest=true}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b20-novel-repo-'));
  const nonce=crypto.randomBytes(10).toString('hex');
  const technicalName=`b20-novel-finance-reconciliation-${nonce}`;
  if(withManifest){
    const manifest={
      schema_version:'1.0.0',
      technical_name:technicalName,
      version:'0.1.0',
      license,
      description:'Read-only financial reconciliation capability for a company tenant. It cannot execute payments and enforces MONEY_LIMIT.',
      policy:{payment_execution_authorized:false,MONEY_LIMIT:'ENFORCED',tenant_scope:'company_id'},
      capabilities:[{
        technical_name:`b20-safe-reconcile-${nonce}`,
        description:'Accounting reconciliation and finance checking without payment execution.',
        terms:['finance','accounting','reconciliation'],
        declared_domains:['finance-accounting-payments']
      }]
    };
    fs.writeFileSync(path.join(dir,'cerebro.skill.json'),`${JSON.stringify(manifest,null,2)}\n`);
  }
  fs.writeFileSync(path.join(dir,'LICENSE'),license==='MIT'?'MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy.\n':'Custom restricted license\n');
  fs.writeFileSync(path.join(dir,'README.md'),'# B20 novel skill\nRead-only reconciliation. No payment execution. Tenant scope company_id. MONEY_LIMIT enforced.\n');
  return {dir,technicalName};
}

function assertBoundedAuthority(report){
  assert.equal(report.prod_authorized,false);
  if('prod_write_authorized' in report)assert.equal(report.prod_write_authorized,false);
  if('prod_mutation_authorized' in report)assert.equal(report.prod_mutation_authorized,false);
  if('trading_access' in report)assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
}

test('B20 reuses persisted B19 acceptance evidence instead of reconstructing closed B19',()=>{
  const b19=JSON.parse(fs.readFileSync(B19_REGISTRY,'utf8'));
  assert.equal(b19.status,'B19_GREEN_PREPROD');
  assert.equal(b19.evidence.initial_registration_status,'HOLD');
  assert.equal(b19.evidence.final_registration_status,'NATIVE_FULL_PREPROD');
  assert.equal(b19.evidence.rollback_green,true);
  assert.equal(b19.evidence.rebuild_green,true);
  assert.equal(b19.evidence.idempotency_proven,true);
  assert.equal(b19.evidence.audit_chain_valid,true);
  assert.equal(b19.authority.prod_authorized,false);
  assert.equal(b19.authority.prod_write_authorized,false);
  assert.equal(b19.authority.auto_merge,false);
  assert.equal(b19.authority.customer_data,false);
  assert.equal(b19.authority.trading_access,false);
  assert.equal(b19.authority.additional_cost_eur,0);
});

test('B20 activates a genuinely new repository entry without candidate-specific factory-core code',()=>{
  const {dir,technicalName}=writeNovelRepo();
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b20-novel-work-'));
  try{
    for(const relative of CORE_FILES){
      const source=fs.readFileSync(path.join(REPO_ROOT,relative),'utf8');
      assert.equal(source.includes(technicalName),false,`${relative} must not contain novel candidate name`);
    }
    const report=runRepositoryActivation({
      repo_dir:dir,
      source_locator:'b20://novel-generated-at-test',
      company_id:'fenix',
      root_dir:root,
      source_run_id:20001,
      source_head_sha:'2020202020202020202020202020202020202020'
    });
    assert.equal(report.status,'FULL_SAFE_PREPROD');
    assert.equal(report.full_safe_preprod,true);
    assert.match(report.candidate_id,/^repo:[a-f0-9]{28}$/);
    assert.equal(report.license_spdx,'MIT');
    assert.deepEqual(report.activation_plan.domain_ids,['finance-accounting-payments']);
    assert.ok(report.activation_plan.binding_count>0);
    assert.equal(report.auto_engineering.fulfillment.source_evidence_kind,'GOVERNED_READONLY_REMOTE');
    assert.ok(report.auto_engineering.fulfillment.generated_semantic_evidence_count>0);
    assert.equal(report.auto_engineering.binding_report.independent_tribunal.decision,'PASS');
    assert.equal(report.native_registration.status,'NATIVE_FULL_PREPROD');
    assert.equal(report.external_skill_code_execution,false);
    assert.equal(report.dependency_install_authorized,false);
    assertBoundedAuthority(report);
  } finally {
    fs.rmSync(dir,{recursive:true,force:true});
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('B20 terminal truth remains fail-closed for missing manifest and incompatible license',()=>{
  const missing=writeNovelRepo({withManifest:false});
  const restricted=writeNovelRepo({license:'CUSTOM-NONCOMMERCIAL'});
  try{
    const snapshot=snapshotRepositoryDirectory({repo_dir:missing.dir});
    const candidate=normalizeRepositoryCandidate({snapshot,company_id:'fenix'});
    assert.equal(candidate.status,'HUMAN_REQUIRED');
    assert.equal(candidate.human_required,'LOW_CONFIDENCE');
    assert.equal(candidate.reason,'CEREBRO_SKILL_MANIFEST_MISSING');

    const rejected=runRepositoryActivation({repo_dir:restricted.dir,company_id:'fenix'});
    assert.equal(rejected.status,'REJECTED');
    assert.equal(rejected.terminal_state,'REJECTED');
    assert.equal(rejected.full_safe_preprod,false);
  } finally {
    fs.rmSync(missing.dir,{recursive:true,force:true});
    fs.rmSync(restricted.dir,{recursive:true,force:true});
  }
});

test('B20 reconciles Scale184 V1 terminal truth with Scale184 V2 evidenced improvement without false global FULL',()=>{
  const v1=runLegacy184ScaleBatch({root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b20-scale-v1-')),source_run_id:20002,source_head_sha:'2121212121212121212121212121212121212121'});
  const v2=runLegacy184AutoEngineeringScale({root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b20-scale-v2-')),source_run_id:20003,source_head_sha:'2222222222222222222222222222222222222222'});
  assert.equal(v1.status,'GREEN_TRUTHFUL_184_OUTCOME_MATRIX');
  assert.equal(v1.catalog_size,184);
  assert.equal(v1.mismatches.length,0);
  assert.equal(v1.full_claim,false);
  assert.equal(v2.status,'GREEN_TRUTHFUL_AUTO_ENGINEERING_SCALE');
  assert.equal(v2.catalog_size,184);
  assert.equal(v2.full_claim,false);
  assert.ok(v2.new_full_safe_preprod.length>=1);
  assert.ok(v2.new_full_safe_preprod.every((row)=>row.full_safe_preprod===true&&row.evidence_status==='FULL_EVIDENCE_GREEN'));
  assertBoundedAuthority(v1);
  assertBoundedAuthority(v2);
});
