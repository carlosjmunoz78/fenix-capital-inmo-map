/**
 * Verified secret existence via GitHub owner UI 2026-11-06; rerun metadata-only probe.
 * SEO-D13 cloud provider metadata verification. Does not generate text.
 * Uses the registered Gemini Free LAB key only for one read-only model metadata
 * request, never in URLs/logs. Does not infer Google project billing state.
 */
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const GEMINI_MODEL_METADATA_URL='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite';
export const STATUS_FIELDS=Object.freeze(['status','reason','model_available','cloud_only','additional_cost_eur','inference_calls','can_publish','billing_tier_verified','key_present']);
const safety=Object.freeze({cloud_only:true,local_pc_required:false,inference_calls:0,additional_cost_eur:0,
 can_publish:false,billing_tier_verified:false,wordpress_writes:0});
const result=(status,reason,detail={})=>Object.freeze({...safety,status,reason,...detail});
export async function probeGeminiModelMetadata({
  key=null,fetch_impl=globalThis.fetch,timeout_ms=6000
}={}){
 const has_key=typeof key==='string'&&key.length>=16;
 if(!has_key)return result('HOLD','SECRET_NOT_PRESENT',{key_present:false,model_available:false});
 if(typeof fetch_impl!=='function'||!Number.isInteger(timeout_ms)||timeout_ms<1000||timeout_ms>10000)
  return result('HOLD','UNAVAILABLE_TRANSPORT',{key_present:true,model_available:false});
 let reply;
 try{
  reply=await fetch_impl(GEMINI_MODEL_METADATA_URL,{
   method:'GET',headers:{'x-goog-api-key':key,'accept':'application/json'},
   redirect:'error',signal:AbortSignal.timeout(timeout_ms)
  });
 }catch{return result('HOLD','MODEL_METADATA_REQUEST_UNAVAILABLE',{key_present:true,model_available:false})}
 if(!reply?.ok)return result('HOLD','MODEL_METADATA_HTTP_FAILURE',{
  key_present:true,model_available:false,http_status:Number(reply?.status)||null
 });
 let metadata;
 try{metadata=await reply.json()}catch{
  return result('HOLD','MODEL_METADATA_PARSE_FAILURE',{key_present:true,model_available:false})
 }
 const available=metadata?.name==='models/gemini-3.5-flash-lite'&&
   Array.isArray(metadata.supportedGenerationMethods)&&
   metadata.supportedGenerationMethods.includes('generateContent');
 if(!available)return result('HOLD','MODEL_GENERATION_NOT_ADVERTISED',{key_present:true,model_available:false});
 return result('METADATA_ONLY_VERIFIED','BILLING_TIER_UNVERIFIED',{
  key_present:true,model_available:true,
  provider:'GOOGLE_GEMINI_EXISTING_LAB',model:'gemini-3.5-flash-lite',
  credential_value_logged:false,connection_verified:true
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 // The cloud job injects key securely. Never echo ENV, URLs containing a key or responses.
 const state=await probeGeminiModelMetadata({key:process.env.CEREBRO_GEMINI_FREE_API_KEY||null});
 process.stdout.write(JSON.stringify(state)+'\n');
 // Metadata probing is diagnostic: no inference; unreadiness is HOLD, not CI red.
}
