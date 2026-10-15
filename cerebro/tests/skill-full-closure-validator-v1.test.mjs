import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSkillFullClosure} from '../skills/skill-full-closure-validator-v1.mjs';

const closure=JSON.parse(fs.readFileSync('cerebro/registry/skill-creator-full-safe-preprod.v1.json','utf8'));
const registry=JSON.parse(fs.readFileSync('cerebro/registry/skill-full-adoption-v1.json','utf8'));
const staticLab=JSON.parse(fs.readFileSync('cerebro/skills/skill-creator-static-lab.v0.json','utf8'));

function preprodReport(){
  return {
    status:'PREPROD_INTEGRATION_COMPLETE',environment:'PREPROD',engine_id:'FACT-001',runtime_integration_real:true,
    actual_current_cerebro_baseline_executed:true,candidate_wrapper_binding_executed:true,physical_binding_rollback_executed:true,
    rebuild_default_disabled:true,final_binding_state:'DISABLED',audit_chain_valid:true,observability_records:9,audit_records:9,finops_records:9,
    measured_additional_cost_eur:0,prod_data_used:false,customer_data_used:false,external_skill_code_executed:false,prod_writes:false,
    trading_access:false,paid_fallback:false,merge_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false,
    packages:[{status:'PREPROD_PACKAGE_COMPLETE',rollback_proof:{ready:true,rebuild_default_disabled:true}}]
  };
}

function validate(overrides={}){
  return validateSkillFullClosure({
    closure:overrides.closure??structuredClone(closure),
    adoptionRegistry:overrides.registry??structuredClone(registry),
    staticLab:overrides.staticLab??structuredClone(staticLab),
    preprodReport:overrides.preprodReport??preprodReport(),
    fileExists:overrides.fileExists??(()=>true)
  });
}

test('skill-creator closure candidate is ready only with exact pinned PREPROD evidence',()=>{
  const report=validate();
  assert.equal(report.status,'READY_TO_PROMOTE_QUEUE');
  assert.deepEqual(report.errors,[]);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
});

test('closure fails closed on manifest provenance drift',()=>{
  const bad=structuredClone(closure);
  bad.provenance.observed_manifest_sha256='bad';
  const report=validate({closure:bad});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('OBSERVED_MANIFEST_HASH_MISMATCH'));
});

test('closure fails closed if any production authority appears',()=>{
  const bad=structuredClone(closure);
  bad.safety.prod_write=true;
  const report=validate({closure:bad});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('UNSAFE_FLAG:prod_write'));
});

test('closure fails closed if runtime rollback or audit proof is absent',()=>{
  const runtime=preprodReport();
  runtime.audit_chain_valid=false;
  runtime.packages[0].rollback_proof.ready=false;
  const report=validate({preprodReport:runtime});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('AUDIT_CHAIN_INVALID'));
  assert.ok(report.errors.includes('ROLLBACK_REBUILD_NOT_PROVEN'));
});

test('queue cannot claim FULL before closure carries CI GREEN marker and exact binding',()=>{
  const q=structuredClone(registry);
  const item=q.queue.find((x)=>x.candidate_id===closure.candidate_id);
  item.status='FULL_SAFE_PREPROD';
  item.target_engine_bindings=['FACT-001'];
  const report=validate({registry:q});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('QUEUE_FULL_REQUIRES_FULL_CLOSURE_STATUS'));
  assert.ok(report.errors.includes('QUEUE_FULL_REQUIRES_CI_GREEN_MARKER'));
});
