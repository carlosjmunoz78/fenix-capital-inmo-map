import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildGhSafeProducerBundle,consumeGhSafeOutputReal,runGhSafeFullE2ERealV1,GH_SAFE_REAL_REQUIRED_CONSUMERS} from '../runtime/gh-safe-real-consumer-adoption-v1.mjs';

const HEAD='a'.repeat(40);
function wd(label){return fs.mkdtempSync(path.join(os.tmpdir(),`gh-safe-real-${label}-`));}
function clone(v){return structuredClone(v);}
async function consume(bundle,label,extra={}){return consumeGhSafeOutputReal({producer_bundle:bundle,workdir:wd(label),source_run_id:77,source_head_sha:HEAD,...extra});}

test('GH-SAFE-NATIVE becomes FULL E2E REAL only when all eight declared consumers use the output and LRN persists feedback',async()=>{
  const r=await runGhSafeFullE2ERealV1({company_id:'fenix',workdir:wd('happy'),source_run_id:77,source_head_sha:HEAD});
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(r.full_e2e_real_preprod,true);
  assert.deepEqual(r.required_consumers,[...GH_SAFE_REAL_REQUIRED_CONSUMERS]);
  assert.equal(r.consumer_coverage,1);
  assert.equal(r.functional_consumer_coverage,1);
  assert.deepEqual(r.missing_consumers,[]);
  assert.deepEqual(r.failed_consumers,[]);
  assert.equal(r.consumers.length,8);
  assert.ok(r.consumers.every(x=>x.real_consumption===true&&x.fields_used.length>0&&x.outcome_hash));
  assert.equal(r.consumer_map['FACT-001'].decision,'FACT_GITHUB_CHANGE_STAGED');
  assert.equal(r.consumer_map['QA-001'].decision,'QA_GITHUB_CHECKS_PASS');
  assert.equal(r.consumer_map['EVA-001'].decision,'TRIBUNAL_PASS');
  assert.equal(r.consumer_map['MIG-001'].decision,'MIGRATION_REVERSIBLE');
  assert.equal(r.consumer_map['RBLD-001'].decision,'ROLLBACK_REBUILD_VERIFIED');
  assert.equal(r.consumer_map['DEP-001'].decision,'PREPROD_PROMOTION_VERIFIED');
  assert.equal(r.consumer_map['OBSERV-001'].decision,'OBSERVABILITY_RECORDED');
  assert.equal(r.consumer_map['FINOPS-001'].decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(r.learning_sink.engine_id,'LRN-001');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(r.owner_resolution.legacy_operational_owner,'SEC-001');
  assert.equal(r.owner_resolution.resolved_owner,'FACT-001');
  assert.equal(r.additional_cost_eur,0);
  assert.equal(r.state_persisted,true);
  assert.equal(r.restartable,true);
  assert.equal(r.idempotency_proven,true);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.prod_mutation_authorized,false);
  assert.equal(r.android_touched,false);
});

test('same durable workdir is restartable without duplicating LRN, OBSERV or FINOPS evidence',async()=>{
  const root=wd('restart');
  const one=await runGhSafeFullE2ERealV1({company_id:'fenix',workdir:root,source_run_id:77,source_head_sha:HEAD});
  const two=await runGhSafeFullE2ERealV1({company_id:'fenix',workdir:root,source_run_id:77,source_head_sha:HEAD});
  assert.equal(one.full_e2e_real_preprod,true);
  assert.equal(two.full_e2e_real_preprod,true);
  assert.equal(two.learning_sink.outcome.first_created_total,0);
  assert.equal(two.learning_sink.outcome.second_created_total,0);
  assert.equal(two.consumer_map['OBSERV-001'].outcome.records_for_correlation,1);
  assert.equal(two.consumer_map['FINOPS-001'].outcome.events,1);
  assert.equal(one.bundle_hash,two.bundle_hash);
  assert.equal(one.consumer_outcome_hash,two.consumer_outcome_hash);
  assert.equal(one.outcome_hash,two.outcome_hash);
});

test('FACT-001 really consumes the PR/commit linkage, not a declared binding',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.pr_create.result.head_sha='9'.repeat(40);
  const r=await consume(b,'fact');
  assert.equal(r.consumer_map['FACT-001'].decision,'FACT_GITHUB_HOLD');
  assert.ok(r.failed_consumers.includes('FACT-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('QA-001 and EVA-001 react to a failed exact-head CI result',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.ci_read.result.checks_green=false;
  b.operations.ci_read.result.conclusion='failure';
  const r=await consume(b,'qa');
  assert.equal(r.consumer_map['QA-001'].decision,'QA_GITHUB_CHECKS_FAIL');
  assert.notEqual(r.consumer_map['EVA-001'].decision,'TRIBUNAL_PASS');
  assert.ok(r.failed_consumers.includes('QA-001'));
  assert.ok(r.failed_consumers.includes('EVA-001'));
});

test('MIG-001 blocks a non-reversible migration delta',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.compare.result.reversible=false;
  const r=await consume(b,'mig');
  assert.equal(r.consumer_map['MIG-001'].decision,'MIGRATION_HOLD');
  assert.ok(r.failed_consumers.includes('MIG-001'));
});

test('RBLD-001 fails if the real rollback receipt does not restore the baseline',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.rollback_revert.result.reverted=false;
  const r=await consume(b,'rbld');
  assert.equal(r.consumer_map['RBLD-001'].decision,'ROLLBACK_REBUILD_FAIL');
  assert.ok(r.failed_consumers.includes('RBLD-001'));
});

test('DEP-001 holds when merge exact-head evidence no longer matches the PR',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.merge.expected_head_sha='8'.repeat(40);
  const r=await consume(b,'dep');
  assert.equal(r.consumer_map['DEP-001'].decision,'DEPLOYMENT_HOLD');
  assert.ok(r.failed_consumers.includes('DEP-001'));
});

test('OBSERV-001 consumes the complete eight-operation producer bundle',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.untracked_extra={additional_cost_eur:0};
  const r=await consume(b,'observ');
  assert.equal(r.consumer_map['OBSERV-001'].decision,'OBSERVABILITY_INCOMPLETE');
  assert.ok(r.failed_consumers.includes('OBSERV-001'));
});

test('FINOPS-001 blocks any non-zero GH-SAFE cost regression',async()=>{
  const b=clone(await buildGhSafeProducerBundle());
  b.operations.ci_read.additional_cost_eur=0.01;
  const r=await consume(b,'finops');
  assert.equal(r.consumer_map['FINOPS-001'].decision,'FINOPS_COST_POLICY_FAIL');
  assert.equal(r.consumer_map['FINOPS-001'].outcome.cost_eur_micros,10000);
  assert.equal(r.additional_cost_eur,0.01);
  assert.ok(r.failed_consumers.includes('FINOPS-001'));
});

test('LRN-001 feedback is a mandatory cross-cutting FULL gate even though it was not in the legacy required-consumer list',async()=>{
  const b=await buildGhSafeProducerBundle();
  const r=await consume(b,'lrn',{emit_learning:false});
  assert.equal(r.functional_consumer_coverage,1);
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_INCOMPLETE');
  assert.equal(r.full_e2e_real_preprod,false);
});
