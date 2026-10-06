import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const sha256=(text)=>createHash('sha256').update(String(text??'')).digest('hex');

export function classifyGeminiError({httpStatus=null,payload=null}={}){
  const status=String(payload?.error?.status??'').toUpperCase();
  const message=String(payload?.error?.message??'').toLowerCase();
  if(httpStatus===429||status==='RESOURCE_EXHAUSTED') return 'FREE_QUOTA_OR_RATE_LIMIT';
  if(/billing|billable|payment|paid tier|enable billing/.test(message)) return 'BILLING_REQUIRED';
  if(/has not been used|service.*disabled|api.*disabled|enable.*api|serviceusage/.test(message)) return 'API_NOT_ENABLED_OR_SERVICE_DISABLED';
  if(/api key/.test(message)&&/invalid|not valid|expired|deleted/.test(message)) return 'API_KEY_INVALID';
  if(/api key|key restriction|restricted|blocked/.test(message)) return 'API_KEY_RESTRICTION_OR_BLOCK';
  if(/location|region|country|geograph/.test(message)) return 'REGION_OR_LOCATION_RESTRICTION';
  if(httpStatus===403||status==='PERMISSION_DENIED') return 'PERMISSION_DENIED_UNCLASSIFIED';
  if(httpStatus===404||status==='NOT_FOUND') return 'MODEL_OR_ENDPOINT_NOT_FOUND';
  if(httpStatus===400||status==='INVALID_ARGUMENT') return 'INVALID_REQUEST_OR_MODEL_ACCESS';
  return httpStatus&&httpStatus>=400?'PROVIDER_ERROR_UNCLASSIFIED':'NONE';
}

export async function probeGeminiAccess({env=process.env,fetchImpl=fetch,timeoutMs=15000}={}){
  const apiKey=String(env.CEREBRO_GEMINI_API_KEY??'').trim();
  if(!apiKey) return Object.freeze({schema_version:'0.1.0',status:'NO_CREDENTIAL',credential_present:false,secret_values_emitted:false,inference_executed:false,additional_cost_eur_claimed:0});
  const model=String(env.CEREBRO_GEMINI_MODEL||'gemini-3.5-flash-lite').trim();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`;
    const response=await fetchImpl(url,{method:'GET',headers:{'x-goog-api-key':apiKey},signal:controller.signal,redirect:'error'});
    let payload=null;
    try{payload=await response.json();}catch{}
    const errorClass=response.ok?'NONE':classifyGeminiError({httpStatus:response.status,payload});
    const returnedName=String(payload?.name??'');
    const methods=Array.isArray(payload?.supportedGenerationMethods)?payload.supportedGenerationMethods:[];
    return Object.freeze({
      schema_version:'0.1.0',
      execution_mode:'ZERO_COST_PROVIDER_ACCESS_PROBE',
      status:response.ok?'MODEL_METADATA_ACCESSIBLE':'MODEL_METADATA_NOT_ACCESSIBLE',
      http_status:response.status,
      credential_present:true,
      target_model:model,
      target_model_returned:response.ok&&returnedName.endsWith(`/models/${model}`)||returnedName===`models/${model}`,
      generate_content_supported:methods.includes('generateContent'),
      provider_error_code:payload?.error?.code??null,
      provider_error_status:payload?.error?.status??null,
      provider_error_class:errorClass,
      provider_error_message_sha256:payload?.error?.message?sha256(payload.error.message):null,
      raw_error_message_emitted:false,
      secret_values_emitted:false,
      inference_executed:false,
      additional_cost_eur_claimed:0
    });
  }catch(err){
    return Object.freeze({schema_version:'0.1.0',execution_mode:'ZERO_COST_PROVIDER_ACCESS_PROBE',status:'PROBE_NETWORK_ERROR',credential_present:true,target_model:model,provider_error_class:'NETWORK_OR_TIMEOUT',error_name:err?.name??'Error',raw_error_message_emitted:false,secret_values_emitted:false,inference_executed:false,additional_cost_eur_claimed:0});
  }finally{clearTimeout(timer);}
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-gemini-access-probe.json';
  const report=await probeGeminiAccess();
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify(report));
}
