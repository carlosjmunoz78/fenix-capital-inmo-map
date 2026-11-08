/**
 * UMS-001 Replicate adapter. LAB only, fail closed by default.
 * This is additive; not wired into the existing creative dispatch or PROD router.
 * The caller must supply an atomic budget reservation and a verified output webhook.
 */
export const REPLICATE_MODELS = Object.freeze({
  FLUX_1_1_PRO: Object.freeze({id:'black-forest-labs/flux-1.1-pro',kind:'IMAGE',usd_per_output:0.04}),
  FLUX_1_1_ULTRA: Object.freeze({id:'black-forest-labs/flux-1.1-pro-ultra',kind:'IMAGE',usd_per_output:0.06}),
  FLUX_KONTEXT_PRO: Object.freeze({id:'black-forest-labs/flux-kontext-pro',kind:'IMAGE',usd_per_output:0.04}),
  PRUNA_P_VIDEO_2_PRO_COST: Object.freeze({id:'prunaai/p-video-2-pro',kind:'VIDEO',usd_per_sec:0.045,mode:'cost',resolution:'1080p'}),
  PRUNA_P_VIDEO_2_PRO_QUALITY: Object.freeze({id:'prunaai/p-video-2-pro',kind:'VIDEO',usd_per_sec:0.095,mode:'quality',resolution:'1080p'}),
  SEEDANCE_1_5_PRO_SILENT: Object.freeze({id:'bytedance/seedance-1.5-pro',kind:'VIDEO',usd_per_sec:0.06,resolution:'1080p',generate_audio:false}),
  VEO_3_1_FAST_SILENT: Object.freeze({id:'google/veo-3.1-fast',kind:'VIDEO',usd_per_sec:0.10,generate_audio:false}),
  RUNWAY_GEN_4_5: Object.freeze({id:'runwayml/gen-4.5',kind:'VIDEO',usd_per_sec:0.12})
});
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/;
const ALLOWED_ENV = new Set(['LAB','PREPROD']);
function fail(code){throw new Error(code);}
function nonempty(value,key,max=6000){
  if(typeof value!=='string'||!value.trim()||value.length>max)fail('REPLICATE_'+key+'_INVALID');
  return value.trim();
}
export function planReplicateJob({company_id,request_id,environment='LAB',model_key='FLUX_1_1_PRO',input}={}){
  const company=nonempty(company_id,'COMPANY',100);
  const req=nonempty(request_id,'REQUEST_ID',120);
  if(!SAFE_ID.test(company)||!SAFE_ID.test(req))fail('REPLICATE_ID_INVALID');
  if(!ALLOWED_ENV.has(environment))fail('REPLICATE_ENVIRONMENT_DENIED');
  const model=REPLICATE_MODELS[model_key];
  if(!model)fail('REPLICATE_MODEL_NOT_ALLOWLISTED');
  if(!input||typeof input!=='object'||Array.isArray(input))fail('REPLICATE_INPUT_REQUIRED');
  const payload={prompt:nonempty(input.prompt,'PROMPT')};
  if(model.kind==='IMAGE'){
    if(input.aspect_ratio!==undefined)payload.aspect_ratio=nonempty(input.aspect_ratio,'ASPECT',20);
    if(input.output_format!==undefined)payload.output_format=nonempty(input.output_format,'FORMAT',8);
    if(model_key==='FLUX_KONTEXT_PRO'){
      payload.input_image=nonempty(input.input_image,'IMAGE_URL',2048);
      if(!payload.input_image.startsWith('https://'))fail('REPLICATE_IMAGE_URL_DENIED');
    }
  } else {
    if(!Number.isInteger(input.duration)||input.duration<5||input.duration>15)fail('REPLICATE_DURATION_DENIED');
    if(model_key==='RUNWAY_GEN_4_5'&&![5,10].includes(input.duration))fail('REPLICATE_RUNWAY_DURATION_DENIED');
    if(model_key==='VEO_3_1_FAST_SILENT'&&input.duration!==8)fail('REPLICATE_VEO_DURATION_DENIED');
    if(model_key==='SEEDANCE_1_5_PRO_SILENT'&&input.duration>12)fail('REPLICATE_SEEDANCE_DURATION_DENIED');
    payload.duration=input.duration;
    if(input.aspect_ratio!==undefined)payload.aspect_ratio=nonempty(input.aspect_ratio,'ASPECT',8);
    if(input.image!==undefined){
      payload.image=nonempty(input.image,'IMAGE_URL',2048);
      if(!payload.image.startsWith('https://'))fail('REPLICATE_IMAGE_URL_DENIED');
    }
    if(model.mode){
      payload.mode=model.mode;
      payload.resolution=model.resolution;
      payload.prompt_upsampler='turbo';
    } else if(model_key==='SEEDANCE_1_5_PRO_SILENT'){
      payload.resolution='1080p';
      payload.generate_audio=false;
    } else if(model_key==='VEO_3_1_FAST_SILENT'){
      payload.generate_audio=false;
    }
  }
  const estimate_usd=model.kind==='IMAGE'?model.usd_per_output:model.usd_per_sec*payload.duration;
  return Object.freeze({
    company_id:company,request_id:req,environment,model_key,model_id:model.id,
    kind:model.kind,input:Object.freeze(payload),estimated_cost_usd:Number(estimate_usd.toFixed(4)),
    status:'PLANNED_NO_PAID_EXECUTION',publish_requested:false
  });
}
export async function submitReplicateJob(plan,{
  token,
  paid_execution_enabled=false,
  spend_gate,
  verified_webhook_url,
  fetch_impl=globalThis.fetch
}={}){
  if(!paid_execution_enabled)fail('REPLICATE_PAID_EXECUTION_OFF');
  if(!plan||plan.environment!=='LAB')fail('REPLICATE_LAB_ONLY');
  const checked=planReplicateJob(plan);
  if(checked.model_key!==plan.model_key||checked.estimated_cost_usd!==plan.estimated_cost_usd)fail('REPLICATE_PLAN_MISMATCH');
  nonempty(token,'TOKEN',200);
  if(typeof spend_gate?.reserve!=='function'||typeof spend_gate?.recordPrediction!=='function')fail('REPLICATE_ATOMIC_SPEND_GATE_REQUIRED');
  const webhook=nonempty(verified_webhook_url,'WEBHOOK',2048);
  const webhookParsed=new URL(webhook);
  if(webhookParsed.protocol!=='https:'||webhookParsed.username||webhookParsed.password||webhookParsed.hash)fail('REPLICATE_WEBHOOK_INVALID');
  if(typeof fetch_impl!=='function')fail('REPLICATE_FETCH_REQUIRED');
  // Atomic reservation must account for taxes, FX, concurrency, existing spent and remaining balances.
  const reservation=await spend_gate.reserve({
    company_id:checked.company_id,request_id:checked.request_id,
    media_kind:checked.kind,estimated_cost_usd:checked.estimated_cost_usd,
    provider:'REPLICATE',model_id:checked.model_id,environment:'LAB'
  });
  if(reservation?.approved!==true||!reservation.reservation_id)fail('REPLICATE_BUDGET_NOT_APPROVED');
  let response;
  try{
    response=await fetch_impl(`https://api.replicate.com/v1/models/${checked.model_id}/predictions`,{
      method:'POST',redirect:'error',
      headers:{authorization:`Bearer ${token}`,'content-type':'application/json','Prefer':'wait=5'},
      body:JSON.stringify({input:checked.input,webhook,webhook_events_filter:['completed']})
    });
  } catch{
    // Network timeout can mean provider accepted the charge. NEVER auto-retry or release without reconciliation.
    fail('REPLICATE_SUBMISSION_UNCERTAIN_RECONCILIATION_REQUIRED');
  }
  if(!response.ok)fail(`REPLICATE_PROVIDER_HTTP_${response.status}_RECONCILE_RESERVATION`);
  const result=await response.json();
  if(!result?.id)fail('REPLICATE_PREDICTION_ID_MISSING_RECONCILIATION_REQUIRED');
  await spend_gate.recordPrediction({
    reservation_id:reservation.reservation_id,prediction_id:result.id,
    model_id:checked.model_id,request_id:checked.request_id,
    provider_status:result.status??'unknown'
  });
  // A completed API response is NOT a saved asset. Verified webhook must persist output and settle billing.
  return Object.freeze({status:'SUBMITTED_AWAITING_VERIFIED_OUTPUT_AND_SETTLEMENT',
    prediction_id:result.id,request_id:checked.request_id,model_id:checked.model_id});
}
