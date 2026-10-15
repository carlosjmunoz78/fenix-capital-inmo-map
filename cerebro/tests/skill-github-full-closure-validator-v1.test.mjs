import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateGitHubFullClosure} from '../skills/skill-github-full-closure-validator-v1.mjs';

const closure=JSON.parse(fs.readFileSync(new URL('../registry/skill-github-full-safe-preprod.v1.json',import.meta.url),'utf8'));
const registry=JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));
const supplyChain=JSON.parse(fs.readFileSync(new URL('../registry/skill-supply-chain-v0.json',import.meta.url),'utf8'));

function preprodReport(){
  return {
    status:'PREPROD_INTEGRATION_COMPLETE',environment:'PREPROD',engine_id:'FACT-001',runtime_integration_real:true,calls_executed:9,
    actual_current_cerebro_baseline_executed:true,candidate_wrapper_binding_executed:true,physical_binding_rollback_executed:true,
    rebuild_default_disabled:true,final_binding_state:'DISABLED',audit_chain_valid:true,observability_records:9,audit_records:9,finops_records:9,
    measured_additional_cost_eur:0,prod_data_used:false,customer_data_used:false,external_skill_code_executed:false,prod_writes:false,
    trading_access:false,paid_fallback:false,merge_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false,
    packages:[{
      target:'GITHUB_WRAPPER',wrapper_id:'skillwrap:cerebro-github-v0.1.0',approved_upstream_full_name:'openclaw/openclaw',
      approved_manifest_path:'skills/github/SKILL.md',status:'PREPROD_PACKAGE_COMPLETE',fixture_results:[{},{},{}],
      rollback_proof:{ready:true,rebuild_default_disabled:true}
    }]
  };
}

function validate(overrides={}){
  return validateGitHubFullClosure({
    closure:overrides.closure??structuredClone(closure),
    adoptionRegistry:overrides.registry??structuredClone(registry),
    supplyChainRegistry:overrides.supplyChain??structuredClone(supplyChain),
    preprodReport:overrides.preprodReport??preprodReport(),
    fileExists:overrides.fileExists??(()=>true)
  });
}

test('GitHub closure is ready only with exact pinned, frozen and current PREPROD evidence',()=>{
  const report=validate();
  assert.equal(report.status,'READY_TO_PROMOTE_QUEUE');
  assert.deepEqual(report.errors,[]);
  assert.equal(report.new_prod_activity_authorized,false);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.auto_merge_authorized,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
});

test('GitHub closure fails closed on provenance drift',()=>{
  const bad=structuredClone(closure);
  bad.provenance.observed_manifest_sha256='bad';
  const report=validate({closure:bad});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('OBSERVED_MANIFEST_HASH_MISMATCH'));
});

test('GitHub closure fails closed on any write or merge authority',()=>{
  const bad=structuredClone(closure);
  bad.safety.auto_merge=true;
  const report=validate({closure:bad});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('UNSAFE_FLAG:auto_merge'));
});

test('GitHub closure fails closed if frozen tribunal evidence drifts',()=>{
  const supply=structuredClone(supplyChain);
  supply.behavioral_candidates.github.tribunal_decision='HOLD';
  const report=validate({supplyChain:supply});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('FROZEN_BEHAVIORAL_TRIBUNAL_NOT_GREEN'));
});

test('GitHub closure fails closed if current physical PREPROD rollback is absent',()=>{
  const runtime=preprodReport();
  runtime.packages[0].rollback_proof.ready=false;
  const report=validate({preprodReport:runtime});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('CURRENT_PACKAGE_ROLLBACK_NOT_PROVEN'));
});

test('GitHub queue cannot claim FULL before closure has current-head CI GREEN marker',()=>{
  const q=structuredClone(registry);
  const item=q.queue.find((x)=>x.candidate_id===closure.candidate_id);
  item.status='FULL_SAFE_PREPROD';
  item.target_engine_bindings=['FACT-001'];
  const prePromotionClosure=structuredClone(closure);
  prePromotionClosure.status='READY_FOR_FULL_SAFE_PREPROD_VALIDATION';
  prePromotionClosure.validation_status='PENDING_CURRENT_HEAD_CI';
  delete prePromotionClosure.validated_by;
  const report=validate({registry:q,closure:prePromotionClosure});
  assert.equal(report.status,'HOLD');
  assert.ok(report.errors.includes('QUEUE_FULL_REQUIRES_FULL_CLOSURE_STATUS'));
  assert.ok(report.errors.includes('QUEUE_FULL_REQUIRES_CI_GREEN_MARKER'));
});
