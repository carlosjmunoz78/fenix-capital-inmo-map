import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planAuto001Patch} from '../platform/auto001-preprod-patch-planner-v0.mjs';
import {oldOrderSensitivePlannerB19} from './fixtures/auto001-order-sensitive-planner-b19-v1.mjs';
import {runB19UniversalE2EReal} from '../runtime/universal-skill-b19-universal-e2e-real-v1.mjs';

const BASELINE='f17fd6481c27d11df3442fb5764ba63c414bbfea';
const CANDIDATE='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('B19 closes factory -> registry HOLD -> measured LRN engineering -> tribunal -> promotion hold -> rollback/rebuild -> audit in PREPROD',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b19-test-'));
  try{
    const report=await runB19UniversalE2EReal({
      oldPlanner:oldOrderSensitivePlannerB19,
      newPlanner:planAuto001Patch,
      baselineSha:BASELINE,
      candidateSha:CANDIDATE,
      learningLedgerFile:path.join(root,'learning.v8'),
      rootDir:path.join(root,'run'),
      observedAt:'2026-10-18T00:00:00.000Z',
      sourceRunId:19
    });
    assert.equal(report.status,'B19_GREEN_PREPROD');
    assert.equal(report.environment,'PREPROD');
    assert.equal(report.factory.status,'ACTIVATION_PLAN_READY');
    assert.ok(report.factory.binding_count>0);
    assert.deepEqual(report.factory.domain_ids,['software-engineering-devops']);
    assert.equal(report.registration.initial_status,'HOLD');
    assert.equal(report.registration.initial_human_required,null);
    assert.equal(report.registration.final_status,'NATIVE_FULL_PREPROD');
    assert.equal(report.registration.final_native_full,true);
    assert.equal(report.measured_loop.status,'B18_GREEN_PREPROD');
    assert.equal(report.measured_loop.old_score,0);
    assert.equal(report.measured_loop.new_score,1);
    assert.equal(report.measured_loop.learning_persisted,true);
    assert.equal(report.measured_loop.next_learning_persisted,true);
    assert.equal(report.measured_loop.engineering_decision,'PASS_PREPROD_PLAN');
    assert.equal(report.measured_loop.comparison,'NEW_BETTER');
    assert.equal(report.measured_loop.tribunal_decision,'APPROVE_PREPROD_NEXT_STAGE');
    assert.equal(report.measured_loop.next_cycle_decision,'KEEP_NEW_MONITOR');
    assert.equal(report.promotion.initial_state,'PREPROD');
    assert.equal(report.promotion.initial_next_gate,'SHADOW_EVIDENCE');
    assert.equal(report.promotion.shadow_state,'SHADOW');
    assert.equal(report.promotion.canary_state,'CANARY');
    assert.equal(report.promotion.healthy_decision,'KEEP_NONPROD');
    assert.equal(report.promotion.controlled_breach_decision,'ROLLBACK');
    assert.equal(report.promotion.prod_authorized,false);
    assert.equal(report.physical_lifecycle.full_safe_preprod,true);
    assert.equal(report.physical_lifecycle.backup_ready,true);
    assert.equal(report.physical_lifecycle.rollback_green,true);
    assert.equal(report.physical_lifecycle.rebuild_green,true);
    assert.equal(report.physical_lifecycle.observability_green,true);
    assert.equal(report.physical_lifecycle.audit_green,true);
    assert.equal(report.physical_lifecycle.finops_green,true);
    assert.equal(report.physical_lifecycle.idempotency_proven,true);
    assert.equal(report.physical_lifecycle.learning_decision,'LRN_FEEDBACK_PERSISTED');
    assert.equal(report.audit.valid,true);
    assert.equal(report.audit.records,12);
    assert.equal(report.prod_authorized,false);
    assert.equal(report.prod_write_authorized,false);
    assert.equal(report.prod_mutation_authorized,false);
    assert.equal(report.auto_merge,false);
    assert.equal(report.customer_data,false);
    assert.equal(report.trading_access,false);
    assert.equal(report.additional_cost_eur,0);
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('B19 fails closed when OLD and candidate version are identical',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b19-same-head-'));
  try{
    await assert.rejects(()=>runB19UniversalE2EReal({
      oldPlanner:oldOrderSensitivePlannerB19,newPlanner:planAuto001Patch,baselineSha:BASELINE,candidateSha:BASELINE,
      learningLedgerFile:path.join(root,'learning.v8'),rootDir:path.join(root,'run')
    }),/baseline and candidate head must differ/);
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});
