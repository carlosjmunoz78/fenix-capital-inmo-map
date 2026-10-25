import test from 'node:test';
import assert from 'node:assert/strict';
import {planExistingCreativePipelineReuse} from '../runtime/existing-creative-pipeline-adapter.mjs';

test('UMS can plan reuse of existing creative video pipeline in PREPROD without new runtime',()=>{
  const result=planExistingCreativePipelineReuse({company_id:'GLOBAL',request_id:'ums:bm01:video:1',asset_ref:'ums:bm01:nova01',output_type:'LANDSCAPE_VIDEO',duration_sec:4});
  assert.equal(result.status,'EXISTING_CREATIVE_PIPELINE_REUSE_PLAN_READY');
  assert.equal(result.source_capability,'CREATIVE-PROGRAMMATIC-RENDER-V1');
  assert.equal(result.observed_existing_prod_core.provider,'CEREBRO_HTML_CHROMIUM_FFMPEG');
  assert.equal(result.observed_existing_prod_core.status,'PROD_GREEN');
  assert.equal(result.observed_existing_prod_core.heavy_render_outside_supabase,true);
  assert.equal(result.new_media_runtime_created,false);
  assert.equal(result.ums_binding_state,'PREPROD_PLAN_ONLY');
  assert.equal(result.physical_execution_via_ums_proven,false);
  assert.equal(result.ums_prod_binding_authorized,false);
  assert.equal(result.publish_authorized,false);
  assert.equal(result.spend_authorized,false);
  assert.equal(result.additional_cost_eur,0);
});

test('wrapper remains PREPROD only even though existing core has PROD certification',()=>{
  assert.throws(()=>planExistingCreativePipelineReuse({environment:'PROD',company_id:'GLOBAL',request_id:'ums:bm01:video:2',asset_ref:'ums:bm01:nova01'}),/PREPROD_ONLY/);
});

test('voice generative visuals and source clip editing are not silently enabled by reuse wrapper',()=>{
  const result=planExistingCreativePipelineReuse({company_id:'GLOBAL',request_id:'ums:bm01:video:3',asset_ref:'ums:bm01:nova01'});
  assert.equal(result.wrapped_plan.video.voice_requested,false);
  assert.equal(result.wrapped_plan.video.generated_visuals_required,false);
  assert.equal(result.wrapped_plan.video.source_clips_present,false);
  assert.equal(result.wrapped_plan.expected_cost_eur,0);
});
