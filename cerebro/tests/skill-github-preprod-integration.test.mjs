import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runGitHubPreprodIntegration,GitHubPreprodBindingStoreV0} from '../skills/skill-github-preprod-integration.mjs';
import {judgeSkillPreprodEvidence} from '../skills/skill-preprod-judge.mjs';
import {runGitHubPreprodTribunal} from '../skills/skill-github-preprod-tribunal.mjs';

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-github-preprod-test-'));}

const trigger=Object.freeze({
  confirm:'RUN_GITHUB_PREPROD_INTEGRATION',scope:'PREPROD_LOCAL_CEREBRO_RUNTIME_ONLY',target_candidate:'github',
  target_candidate_id:'lobehub-skills:52441cd3d76607ffffab',expected_wrapper_id:'skillwrap:cerebro-github-v0.1.0',expected_human_gate:'HIGH_RISK',
  additional_cost_budget_eur:0,paid_fallback:false,allow_prod_data:false,allow_customer_data:false,allow_external_skill_code_execution:false,allow_prod_write:false,allow_trading_access:false,
  expected_lab_head_sha:'08d46dd25ee40376bf4f548f4f2f6083c53e93f0',expected_lab_run_id:37666101006,expected_lab_artifact_id:11502662046,expected_lab_artifact_digest:'sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e'
});
const labReadiness=Object.freeze({status:'READY_FOR_PREPROD_PROMOTION_REVIEW',ready:true,human_required:'HIGH_RISK',merge_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false});
const labTribunal=Object.freeze({decision:'GREEN',green:true,blockers:[],prod_authorized:false,autonomous_promotion_authorized:false});
const registry=Object.freeze({capability_id:'cap:skill-supply-chain',owner_engine_id:'FACT-001',safety:{prod_authorized:false,prod_write_authorized:false,autonomous_promotion_authorized:false}});
const contract=Object.freeze({contract_id:'contract:skill-supply-chain-v0',owner_engine_id:'FACT-001',invariants:{prod_write_default:false,external_skill_code_execution_default:false,paid_fallback_default:false}});

test('GitHub PREPROD executes OLD vs NEW, observability, rollback and rebuild with zero side effects',async()=>{
  const report=await runGitHubPreprodIntegration({rootDir:tempRoot(),observedAt:'2026-10-07T00:00:00.000Z'});
  assert.equal(report.status,'PREPROD_INTEGRATION_COMPLETE');
  assert.equal(report.environment,'PREPROD');
  assert.equal(report.runtime_integration_real,true);
  assert.equal(report.calls_executed,9);
  assert.equal(report.observability_records,9);
  assert.equal(report.audit_records,9);
  assert.equal(report.finops_records,9);
  assert.equal(report.audit_chain_valid,true);
  assert.equal(report.measured_additional_cost_eur,0);
  assert.equal(report.prod_data_used,false);
  assert.equal(report.customer_data_used,false);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.prod_writes,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.paid_fallback,false);
  assert.equal(report.final_binding_state,'DISABLED');
  assert.equal(report.packages.length,1);
  const pkg=report.packages[0];
  assert.equal(pkg.target,'GITHUB_WRAPPER');
  assert.equal(pkg.wrapper_id,'skillwrap:cerebro-github-v0.1.0');
  assert.equal(pkg.status,'PREPROD_PACKAGE_COMPLETE');
  assert.equal(pkg.rollback_proof.ready,true);
  assert.equal(pkg.rollback_proof.rebuild_default_disabled,true);
  assert.equal(pkg.fixture_results.length,3);
  assert.ok(pkg.fixture_results.every(x=>x.candidate.constraint_compliance===100));
  assert.ok(pkg.fixture_results.every(x=>x.candidate.evidence_quality_proxy>=x.baseline.evidence_quality_proxy));
  assert.ok(pkg.fixture_results.some(x=>x.candidate.evidence_quality_proxy>x.baseline.evidence_quality_proxy));
  const safePr=pkg.fixture_results.find(x=>x.fixture_id==='safe-pr-plan');
  assert.equal(safePr.candidate.human_exception_correctness,100);
  assert.equal(safePr.candidate.output.human_required,'HIGH_RISK');
  assert.ok(pkg.rollback_proof.results.every(x=>x.restored===true));
});

test('GitHub PREPROD fails closed on unsafe environment, writes or paid path',async()=>{
  await assert.rejects(()=>runGitHubPreprodIntegration({rootDir:tempRoot(),environment:'PROD'}),/exact PREPROD/);
  await assert.rejects(()=>runGitHubPreprodIntegration({rootDir:tempRoot(),allowProdWrite:true}),/unsafe GitHub PREPROD permission/);
  await assert.rejects(()=>runGitHubPreprodIntegration({rootDir:tempRoot(),additionalCostEur:0.01}),/zero additional cost/);
});

test('GitHub PREPROD binding store rebuilds to disabled and rejects corrupt state',()=>{
  const root=tempRoot();
  const file=path.join(root,'binding.json');
  const store=new GitHubPreprodBindingStoreV0({file_path:file});
  assert.equal(store.read().state,'DISABLED');
  store.set('BASELINE','GITHUB_WRAPPER');
  store.set('GITHUB_WRAPPER','GITHUB_WRAPPER');
  assert.equal(store.read().state,'GITHUB_WRAPPER');
  assert.equal(store.rebuildDisabled().state,'DISABLED');
  fs.writeFileSync(file,JSON.stringify({state:'GITHUB_WRAPPER',target:'GITHUB_WRAPPER',enabled:false,generation:1}));
  assert.throws(()=>store.read(),/active GitHub PREPROD binding must be enabled/);
});

test('deterministic PREPROD judge and GitHub tribunal stop at next HIGH_RISK gate',async()=>{
  const preprod=await runGitHubPreprodIntegration({rootDir:tempRoot(),observedAt:'2026-10-07T00:00:00.000Z'});
  const judge=judgeSkillPreprodEvidence(preprod);
  assert.equal(judge.decision,'GREEN_FOR_PREPROD_TRIBUNAL');
  assert.equal(judge.green,true);
  const tribunal=runGitHubPreprodTribunal({preprod,judge,labReadiness,labTribunal,registry,contract,trigger});
  assert.equal(tribunal.decision,'GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW');
  assert.equal(tribunal.green,true);
  assert.equal(tribunal.human_required,'HIGH_RISK');
  assert.equal(tribunal.next_gate,'PROD_READONLY_CANARY');
  assert.equal(tribunal.merge_authorized,false);
  assert.equal(tribunal.prod_authorized,false);
  assert.equal(tribunal.autonomous_promotion_authorized,false);
});

test('GitHub PREPROD tribunal rejects missing immutable LAB gate evidence',async()=>{
  const preprod=await runGitHubPreprodIntegration({rootDir:tempRoot(),observedAt:'2026-10-07T00:00:00.000Z'});
  const judge=judgeSkillPreprodEvidence(preprod);
  const bad={...labReadiness,status:'NOT_READY',ready:false};
  const tribunal=runGitHubPreprodTribunal({preprod,judge,labReadiness:bad,labTribunal,registry,contract,trigger});
  assert.equal(tribunal.green,false);
  assert.equal(tribunal.decision,'HOLD');
  assert.ok(tribunal.blockers.includes('LAB_PROMOTION_READINESS_NOT_GREEN'));
});
