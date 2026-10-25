import {buildCreativeOutputPlan,PROD_CORE_CERTIFICATION} from '../../../runtime/creative-output-pipeline-v1.mjs';

const ALLOWED_OUTPUTS=new Set(['REEL','SHORT_VIDEO','LANDSCAPE_VIDEO']);
function ref(value,label){if(typeof value!=='string'||!value.trim()||!/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/.test(value.trim()))throw new Error(`${label}_INVALID`);return value.trim();}

export function planExistingCreativePipelineReuse(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD')throw new Error('UMS_EXISTING_CREATIVE_ADAPTER_PREPROD_ONLY');
  const company_id=ref(input.company_id??'GLOBAL','COMPANY_ID');
  const request_id=ref(input.request_id,'REQUEST_ID');
  const asset_ref=ref(input.asset_ref,'ASSET_REF');
  const output_type=String(input.output_type??'LANDSCAPE_VIDEO').toUpperCase();
  if(!ALLOWED_OUTPUTS.has(output_type))throw new Error('UMS_EXISTING_CREATIVE_ADAPTER_VIDEO_OUTPUT_REQUIRED');
  const plan=buildCreativeOutputPlan({
    company_id,target_company_id:company_id,engine_id:'UMS-001',environment:'PREPROD',version:'ums-existing-creative-v1',
    request_id,asset_ref,brand_profile_ref:input.brand_profile_ref??'ums:synthetic:brand:v1',brief_ref:input.brief_ref??'ums:bm01:brief:v1',
    channel:input.channel??'TRAINING',output_type,duration_sec:input.duration_sec??4,confidence:input.confidence??1,
    expected_cost_eur:0,paid_provider_requested:false,extra_purchase_requested:false,prefer_local:true,local_fallback_allowed:true,
    generated_visuals_required:false,voice_requested:false,source_clips_present:false,captions_required:false,publish_requested:false,
    ffmpeg_binary_verified:input.ffmpeg_binary_verified===true,ffmpeg_binary_version_ref:input.ffmpeg_binary_version_ref??null
  });
  if(plan.ok!==true)throw new Error(`EXISTING_CREATIVE_PIPELINE_REUSE_NOT_READY:${plan.status}`);
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_EXISTING_CREATIVE_PIPELINE_REUSE_V1',company_id,engine_id:'UMS-001',environment:'PREPROD',version:'1.0.0',
    status:'EXISTING_CREATIVE_PIPELINE_REUSE_PLAN_READY',source_runtime:'cerebro/runtime/creative-output-pipeline-v1.mjs',source_capability:PROD_CORE_CERTIFICATION.capability_id,
    observed_existing_prod_core:Object.freeze({provider:PROD_CORE_CERTIFICATION.provider,status:PROD_CORE_CERTIFICATION.status,execution_plane:PROD_CORE_CERTIFICATION.execution_plane,heavy_render_outside_supabase:PROD_CORE_CERTIFICATION.heavy_render_outside_supabase,additional_cost_eur:PROD_CORE_CERTIFICATION.additional_cost_eur}),
    wrapped_plan:plan,
    ums_binding_state:'PREPROD_PLAN_ONLY',physical_execution_via_ums_proven:false,ums_prod_binding_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,installation_authorized:false,new_media_runtime_created:false,additional_cost_eur:0
  });
}
