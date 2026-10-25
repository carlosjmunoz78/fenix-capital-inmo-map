#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {buildCreativeOutputPlan} from '../../../runtime/creative-output-pipeline-v1.mjs';
import {executeQwen3TtsPhysicalPreprod} from '../runtime/qwen3-tts-physical-adapter.mjs';

const cwd=process.cwd();
const evidenceDir=path.resolve(process.env.UMS_E2E_DIR??'.ums-qwen3-tts-e2e');
fs.mkdirSync(evidenceDir,{recursive:true});

const requestId=process.env.UMS_E2E_REQUEST_ID??'ums:qwen:e2e:001';
const assetRef=process.env.UMS_E2E_ASSET_REF??'ums:bm01:voice:e2e001';
const text=process.env.UMS_E2E_TEXT??'CEREBRO, prueba integrada de voz en español.';

const creativePlan=buildCreativeOutputPlan({
  company_id:'GLOBAL',target_company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'ums-qwen-e2e-v1',
  request_id:requestId,asset_ref:assetRef,brand_profile_ref:'ums:synthetic:brand:v1',brief_ref:'ums:bm01:brief:v1',
  channel:'TRAINING',output_type:'LANDSCAPE_VIDEO',duration_sec:4,confidence:1,expected_cost_eur:0,
  paid_provider_requested:false,extra_purchase_requested:false,prefer_local:true,local_fallback_allowed:true,
  generated_visuals_required:false,voice_requested:true,source_clips_present:false,captions_required:false,publish_requested:false,
  ffmpeg_binary_verified:true,ffmpeg_binary_version_ref:'runtime:ffmpeg:preprod'
});
if(creativePlan.ok!==true)throw new Error(`CREATIVE_PLAN_NOT_READY:${creativePlan.status}`);
const qwenStage=creativePlan.video?.stages?.find((stage)=>stage?.adapter==='QWEN3_TTS');
if(!qwenStage||qwenStage.task_type!=='VOICE_SYNTHESIS'||qwenStage.allowed!==true)throw new Error('QWEN_STAGE_NOT_ROUTED_THROUGH_CREATIVE_PIPELINE');

const physical=await executeQwen3TtsPhysicalPreprod({
  company_id:'GLOBAL',environment:'PREPROD',request_id:requestId,asset_ref:assetRef,text,language:'Spanish',speaker:'Aiden',
  confidence:1,max_cost_eur:0,contains_personal_data:false,real_person_voice_requested:false,voice_clone_requested:false,
  preprod_physical_test:true,cwd,artifact_dir:evidenceDir,timeout_ms:900000,max_new_tokens:96
});

const evidence={
  schema_version:'1.0.0',state_type:'CEREBRO_UMS_QWEN3_TTS_ROUTED_E2E_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',
  status:'QWEN3_TTS_UMS_ROUTED_E2E_GREEN',
  creative_pipeline:{status:creativePlan.status,voice_requested:creativePlan.video.voice_requested,qwen_stage:{adapter:qwenStage.adapter,task_type:qwenStage.task_type,block:qwenStage.block,selected_runtime_state:qwenStage.selected_runtime_state}},
  physical_binding:{status:physical.status,provider_id:physical.provider_id,model_id:physical.model_id,fallback_chain:physical.fallback_chain,artifact:physical.artifact,model_load_seconds:physical.physical_report.model_load_seconds,generation_seconds:physical.physical_report.generation_seconds,elapsed_seconds:physical.physical_report.elapsed_seconds},
  gates:{prod_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,real_person_voice:false,voice_clone:false,additional_cost_eur:0},
  next_block:'MUSE_TALK_RUNTIME_CAPABILITY_GATE'
};
const evidencePath=path.join(evidenceDir,'ums-qwen3-tts-routed-e2e.json');
fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
