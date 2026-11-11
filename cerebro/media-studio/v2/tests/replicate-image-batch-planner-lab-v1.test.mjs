import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planReplicateImageBatch,validatePaidExecutionGates} from '../runtime/replicate-image-batch-planner-lab-v1.mjs';
const request=JSON.parse(readFileSync(new URL('../requests/UMS001_REPLICATE_4_ART_IMAGES_LAB_20261111.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(request);
test('Four original subjects, locations and hashes, dry run, estimated cost only',()=>{
  const plan=planReplicateImageBatch(clone());
  assert.equal(plan.concept_count,4);assert.equal(plan.projected_provider_cost_usd,0.24);
  assert.equal(plan.external_api_calls,0);assert.equal(plan.payment_authorized,false);
  assert.equal(new Set(plan.outputs.map(x=>x.prompt_sha256)).size,4);
  assert.ok(plan.outputs.every(x=>x.model_input.raw===true&&x.publication_approved===false));
  assert.match(plan.batch_status,/PENDING_BILLING/);
});
test('Prevents reuse of exact same creative scene even with new caption',()=>{
  const r=clone();r.concepts[1].setting_key=r.concepts[0].setting_key;
  assert.throws(()=>planReplicateImageBatch(r),/DUPLICATE/);
});
test('Rejects non-LAB, paid request mode and publishing',()=>{
  for(const [key,v] of [['environment','PROD'],['run_mode','EXECUTE'],['publish',true],['max_additional_cost_eur',1]]){
    const r=clone();r[key]=v;assert.throws(()=>planReplicateImageBatch(r),/DENIED|NOT_ZERO/);
  }
});
test('Rejects unreviewed characters and wrong number of images',()=>{
  const r=clone();r.concepts.pop();assert.throws(()=>planReplicateImageBatch(r),/FOUR_DISTINCT/);
  const t=clone();t.concepts[0].prompt='This is a drawing';assert.throws(()=>planReplicateImageBatch(t),/PROMPT_INVALID/);
});
test('External billing and storage gates are mandatory before paid execution',()=>{
  const p=planReplicateImageBatch(clone());
  assert.throws(()=>validatePaidExecutionGates(p,{}),/BILLING_GATE/);
  assert.throws(()=>validatePaidExecutionGates(p,{billing:{verified_by_trusted_operator:true,auto_reload_disabled:true,prepaid_credit_only:true,evidence_id:'operator-evidence-001'}}),/FINOPS_GATE/);
  assert.throws(()=>validatePaidExecutionGates(p,{billing:{verified_by_trusted_operator:true,auto_reload_disabled:true,prepaid_credit_only:true,evidence_id:'operator-evidence-001'},finops:{atomic_reservation_confirmed:true,reserved_usd:0.24,reservation_id:'reserve-001'}}),/STORAGE_GATE/);
});
test('Planned prompts cannot be mistaken for generated image assets',()=>{
  const p=planReplicateImageBatch(clone());
  assert.equal(p.storage_status,'NOT_GENERATED');
  for(const x of p.outputs){assert.equal(x.durable_asset_id,null);assert.equal(x.status,'PLANNED_NO_API_CALL')}
});
