/**
 * Non-billing UMS-001 cinematic route selection. No outbound calls, PROD or publishing.
 * A model route is a hypothesis until comparative visual QA produces physical evidence.
 */
import { planReplicateJob } from './replicate-provider-lab-v0.mjs';
export const CINEMATIC_ROUTES = Object.freeze({
  IMAGE_REFERENCE:'FLUX_1_1_PRO',
  IMAGE_CONTINUITY:'FLUX_KONTEXT_PRO',
  VIDEO_ROUTINE:'PRUNA_P_VIDEO_2_PRO_COST',
  VIDEO_CHARACTER:'PRUNA_P_VIDEO_2_PRO_QUALITY',
  VIDEO_ACTION:'SEEDANCE_1_5_PRO_SILENT',
  VIDEO_HERO:'VEO_3_1_FAST_SILENT',
  VIDEO_CAMERA:'RUNWAY_GEN_4_5'
});
const DEFAULT_DURATIONS = Object.freeze({
  VIDEO_ROUTINE:5,VIDEO_CHARACTER:5,VIDEO_ACTION:5,VIDEO_HERO:8,VIDEO_CAMERA:5
});
const VIDEO_TYPES = new Set(['VIDEO_ROUTINE','VIDEO_CHARACTER','VIDEO_ACTION','VIDEO_HERO','VIDEO_CAMERA']);
export function routeCinematicShot({company_id='fenix',request_id,scene_type='VIDEO_ROUTINE',
  prompt,reference_image=null,estimated_remaining_budget_usd=0,aspect_ratio='9:16'}={}){
  const model_key=CINEMATIC_ROUTES[scene_type];
  if(!model_key)throw new Error('CINEMATIC_SCENE_TYPE_DENIED');
  if(!Number.isFinite(estimated_remaining_budget_usd)||estimated_remaining_budget_usd<0)
    throw new Error('CINEMATIC_BUDGET_INVALID');
  if(!['9:16','16:9','1:1'].includes(aspect_ratio))
    throw new Error('CINEMATIC_RATIO_DENIED');
  if(typeof prompt!=='string'||!prompt.trim())throw new Error('CINEMATIC_PROMPT_REQUIRED');
  const duration=DEFAULT_DURATIONS[scene_type];
  const input={prompt:prompt.trim(),aspect_ratio};
  if(duration)input.duration=duration;
  if(reference_image){
    if(typeof reference_image!=='string'||!reference_image.startsWith('https://'))
      throw new Error('CINEMATIC_REFERENCE_DENIED');
    input[scene_type==='IMAGE_CONTINUITY'?'input_image':'image']=reference_image;
  }
  if(scene_type==='IMAGE_CONTINUITY'&&!reference_image)
    throw new Error('CINEMATIC_REFERENCE_REQUIRED');
  const plan=planReplicateJob({company_id,request_id,environment:'LAB',model_key,input});
  const budget_fit=plan.estimated_cost_usd<=estimated_remaining_budget_usd;
  return Object.freeze({
    ...plan,execute_allowed:false,provider_selection_reason:scene_type,
    estimated_remaining_budget_usd,budget_fit,
    next_gate:budget_fit?'VISUAL_OLD_VS_NEW_QA_AND_ATOMIC_SPEND_GATE':'MONEY_LIMIT',
    export_channels:Object.freeze(VIDEO_TYPES.has(scene_type)?['INSTAGRAM','FACEBOOK']:[]),
    rights_note:'Original cinematic storytelling; no franchise-character, soundtrack or logo imitation.',
    approval_note:'Do not confuse script plan or test render with physically approved cinematic quality.'
  });
}
