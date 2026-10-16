import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runNativeCapabilityOperationalLoopV1,NATIVE_CAPABILITY_OPERATIONAL_LOOP_V1_CONTRACT} from '../runtime/native-capability-operational-loop-v1.mjs';

const registry=JSON.parse(fs.readFileSync(new URL('../registry/native-capability-operational-adoption-v1.json',import.meta.url),'utf8'));
const engines=JSON.parse(fs.readFileSync(new URL('../registry/engine-registry.seed.json',import.meta.url),'utf8'));

test('operational FULL contract covers exactly all eight Lote 1+2 native capabilities',()=>{
  assert.deepEqual([...NATIVE_CAPABILITY_OPERATIONAL_LOOP_V1_CONTRACT.capabilities].sort(),[
    'FACT-SKILL-NATIVE','GH-SAFE-NATIVE','DB-SAFE-NATIVE','EVT-001','TECH-CAP-SCOUT-NATIVE','COMPET-NATIVE','CAP-NATIVE','LEAD-NATIVE'
  ].sort());
  assert.equal(registry.capabilities.length,8);
  assert.equal(registry.definition_of_full.all_required_consumers_bound,true);
  assert.equal(registry.definition_of_full.automatic_recurring_execution,true);
  assert.equal(registry.definition_of_full.learning_feedback_to_lrn001,true);
  assert.equal(registry.shared_runtime.schedule_configured,true);
  assert.equal(registry.shared_runtime.cadence,'DAILY');
});

test('every explicit consumer binding exists in canonical engine registry and EVT expands to all engines',()=>{
  const ids=new Set(engines.engine_ids);
  assert.equal(ids.size,engines.count);
  for(const cap of registry.capabilities){
    assert.equal(ids.has(cap.owner_engine_id),true,`owner ${cap.owner_engine_id}`);
    for(const consumer of cap.required_consumers){
      if(consumer==='ALL_REGISTERED_ENGINES')continue;
      assert.equal(ids.has(consumer),true,`${cap.capability_id} consumer ${consumer}`);
    }
  }
  const evt=registry.capabilities.find(x=>x.capability_id==='EVT-001');
  assert.deepEqual(evt.required_consumers,['ALL_REGISTERED_ENGINES']);
});

test('authority stays PREPROD, zero-cost and fail-closed for external mutation',()=>{
  const a=registry.authority;
  assert.equal(a.prod_authorized,false);
  assert.equal(a.prod_write_authorized,false);
  assert.equal(a.provider_write_authorized,false);
  assert.equal(a.crm_write_authorized,false);
  assert.equal(a.db_mutation_authorized,false);
  assert.equal(a.spend_authorized,false);
  assert.equal(a.trading_access,false);
  assert.equal(a.android_touched,false);
  assert.equal(a.additional_cost_eur,0);
});

test('shared operational loop invokes all eight capabilities, all required consumers and LRN feedback',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-opfull-test-'));
  try{
    const report=await runNativeCapabilityOperationalLoopV1({company_id:'fenix',cycle_anchor:'2026-10-16T00:00:00Z',workdir:root,source_run_id:1,source_head_sha:'1111111111111111111111111111111111111111'});
    assert.equal(report.status,'OPERATIONAL_FULL_PREPROD');
    assert.equal(report.operational_full,true);
    assert.equal(report.capability_count,8);
    assert.equal(report.capabilities.every(x=>x.status==='ACTIVE_CONTINUOUS_PREPROD'&&x.consumer_coverage===1),true);
    assert.equal(report.all_registered_engines_total,engines.count);
    assert.equal(report.event_bus_all_engines_green,true);
    assert.equal(report.learning.status,'OUTBOX_GREEN');
    assert.equal(report.learning.batches_total,1);
    assert.equal(report.learning.feedback_events_total,8);
    assert.equal(report.continuous.schedule_configured,true);
    assert.equal(report.continuous.soak_complete,false);
    assert.equal(report.continuous.soak_overclaimed,false);
    assert.equal(report.authority.prod_authorized,false);
    assert.equal(report.authority.android_touched,false);
    assert.equal(report.authority.additional_cost_eur,0);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('operational loop is deterministic for the same daily anchor and source identity',async()=>{
  const a=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-opfull-a-'));
  const b=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-opfull-b-'));
  try{
    const x=await runNativeCapabilityOperationalLoopV1({company_id:'fenix',cycle_anchor:'2026-10-16T00:00:00Z',workdir:a,source_run_id:9,source_head_sha:'2222222222222222222222222222222222222222'});
    const y=await runNativeCapabilityOperationalLoopV1({company_id:'fenix',cycle_anchor:'2026-10-16T00:00:00Z',workdir:b,source_run_id:9,source_head_sha:'2222222222222222222222222222222222222222'});
    assert.equal(x.evidence_hash,y.evidence_hash);
    assert.equal(x.binding_receipts_total,y.binding_receipts_total);
  } finally {fs.rmSync(a,{recursive:true,force:true});fs.rmSync(b,{recursive:true,force:true});}
});
