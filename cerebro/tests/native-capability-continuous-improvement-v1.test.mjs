import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runNativeCapabilityOperationalLoopV1} from '../runtime/native-capability-operational-loop-v1.mjs';
import {runNativeCapabilityContinuousImprovementV1,NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT} from '../runtime/native-capability-continuous-improvement-v1.mjs';

const REQUIRED=['FACT-SKILL-NATIVE','GH-SAFE-NATIVE','DB-SAFE-NATIVE','EVT-001','TECH-CAP-SCOUT-NATIVE','COMPET-NATIVE','CAP-NATIVE','LEAD-NATIVE'];

test('continuous improvement contract keeps all eight capabilities governed and PREPROD-only',()=>{
  assert.deepEqual([...NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.capabilities].sort(),[...REQUIRED].sort());
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.environment,'PREPROD');
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.learning_engine_id,'LRN-001');
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.persistent_state,true);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.daily,true);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.old_vs_new_required,true);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.evaluation_required,true);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.tribunal_required,true);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.automatic_code_mutation,false);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.automatic_prod_promotion,false);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.additional_cost_target_eur,0);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.prod_authorized,false);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.trading_access,false);
  assert.equal(NATIVE_CAPABILITY_CONTINUOUS_IMPROVEMENT_V1_CONTRACT.android_touched,false);
});

test('real operational loop output is consumed by LRN, materializes governed candidates and executes learning horizons',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-continuous-improvement-'));
  try{
    const operationalRoot=path.join(root,'operational');
    const stateRoot=path.join(root,'learning-state');
    const operational=await runNativeCapabilityOperationalLoopV1({company_id:'fenix',cycle_anchor:'2026-10-16T00:00:00Z',workdir:operationalRoot,source_run_id:101,source_head_sha:'1111111111111111111111111111111111111111'});
    assert.equal(operational.status,'OPERATIONAL_FULL_PREPROD');
    const improvement=await runNativeCapabilityContinuousImprovementV1({operational_report:operational,outbox_root:path.join(operationalRoot,'lrn-outbox'),state_root:stateRoot,now:'2026-10-16T00:00:00Z'});
    assert.equal(improvement.status,'CONTINUOUS_IMPROVEMENT_GREEN_PREPROD');
    assert.equal(improvement.continuous_improvement_green,true);
    assert.equal(improvement.learning_events_total,8);
    assert.equal(improvement.learning.status,'GREEN');
    assert.equal(improvement.learning.persisted_this_cycle,8);
    assert.equal(improvement.candidates.status,'CANDIDATES_GREEN');
    assert.equal(improvement.candidates.candidate_total,8);
    assert.equal(improvement.candidates.new_candidates_this_cycle,8);
    assert.equal(improvement.candidates.held_total,0);
    assert.equal(improvement.candidates.production_apply_allowed,false);
    assert.equal(improvement.candidates.auto_promotion_allowed,false);
    assert.equal(improvement.orchestration.status,'ORCHESTRATOR_GREEN');
    assert.equal(improvement.horizons.status,'HORIZON_EXECUTORS_GREEN');
    assert.equal(improvement.horizons.daily_green,true);
    assert.equal(improvement.meta_observability.status,'META_METRICS_GREEN');
    assert.equal(improvement.persistence.idempotency_green,true);
    assert.ok(improvement.learning.idempotency_receipts_skipped_second_pass>=1);
    assert.equal(improvement.governance.old_vs_new_required,true);
    assert.equal(improvement.governance.evaluation_required,true);
    assert.equal(improvement.governance.tribunal_required,true);
    assert.equal(improvement.governance.automatic_code_mutation,false);
    assert.equal(improvement.governance.automatic_prod_promotion,false);
    assert.equal(improvement.authority.prod_authorized,false);
    assert.equal(improvement.authority.provider_write_authorized,false);
    assert.equal(improvement.authority.crm_write_authorized,false);
    assert.equal(improvement.authority.db_mutation_authorized,false);
    assert.equal(improvement.authority.spend_authorized,false);
    assert.equal(improvement.authority.trading_access,false);
    assert.equal(improvement.authority.android_touched,false);
    assert.equal(improvement.authority.additional_cost_eur,0);
    const candidateLedger=path.join(stateRoot,'data','fenix','LRN-001','improvement-candidates.v8');
    const learningLedger=path.join(stateRoot,'data','fenix','LRN-001','learning.v8');
    assert.equal(fs.existsSync(candidateLedger),true);
    assert.equal(fs.existsSync(learningLedger),true);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('cross-company or incomplete operational evidence cannot enter the learning loop',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-continuous-reject-'));
  try{
    await assert.rejects(()=>runNativeCapabilityContinuousImprovementV1({operational_report:{state_type:'CEREBRO_NATIVE_CAPABILITY_OPERATIONAL_FULL_REPORT',status:'OPERATIONAL_FULL_PREPROD',operational_full:true,company_id:'other',environment:'PREPROD',version:'1.0.0',capability_count:8,capabilities:[]},outbox_root:path.join(root,'outbox'),state_root:path.join(root,'state')}),/scope invalid|must contain eight/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
