import {createHash} from 'node:crypto';

const PROVIDER_MODELS=Object.freeze({
  'google-gemini-api-free': {provider:'gemini',model:'gemini-3.5-flash-lite'},
  'cloudflare-workers-ai-free': {provider:'cloudflare',model:'@cf/meta/llama-3.1-8b-instruct'}
});

function sha256(text){return createHash('sha256').update(String(text??'')).digest('hex');}
function requireString(value,label){if(typeof value!=='string'||!value.trim()) throw new TypeError(`${label} required`); return value.trim();}
function timeoutSignal(timeoutMs){const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs); return {controller,timer};}

export function providerModel(providerId,env=process.env){
  const base=PROVIDER_MODELS[providerId];
  if(!base) throw new Error(`unsupported provider: ${providerId}`);
  if(providerId==='google-gemini-api-free') return {provider:base.provider,model:env.CEREBRO_GEMINI_MODEL||base.model};
  if(providerId==='cloudflare-workers-ai-free') return {provider:base.provider,model:env.CEREBRO_CF_MODEL||base.model};
  return base;
}

function geminiGenerationConfig(model){
  // Gemini 3.x removed legacy sampling parameters from this route. Keep the
  // request minimal and deterministic by constraining output only.
  if(/^gemini-3\./.test(model)) return {maxOutputTokens:2048};
  return {temperature:0,maxOutputTokens:2048};
}

export function buildProviderRequest({providerId,prompt,env=process.env}){
  const safePrompt=requireString(prompt,'prompt');
  const spec=providerModel(providerId,env);
  if(providerId==='google-gemini-api-free'){
    const apiKey=requireString(env.CEREBRO_GEMINI_API_KEY,'CEREBRO_GEMINI_API_KEY');
    return Object.freeze({
      provider_id:providerId,
      model:spec.model,
      url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(spec.model)}:generateContent`,
      method:'POST',
      headers:{'content-type':'application/json','x-goog-api-key':apiKey},
      body:{contents:[{parts:[{text:safePrompt}]}],generationConfig:geminiGenerationConfig(spec.model)},
      prompt_sha256:sha256(safePrompt),
      secret_header_names:['x-goog-api-key']
    });
  }
  if(providerId==='cloudflare-workers-ai-free'){
    const token=requireString(env.CEREBRO_CF_WORKERS_AI_TOKEN,'CEREBRO_CF_WORKERS_AI_TOKEN');
    const accountId=requireString(env.CEREBRO_CF_ACCOUNT_ID,'CEREBRO_CF_ACCOUNT_ID');
    return Object.freeze({
      provider_id:providerId,
      model:spec.model,
      url:`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${spec.model}`,
      method:'POST',
      headers:{'content-type':'application/json','authorization':`Bearer ${token}`},
      body:{prompt:safePrompt,max_tokens:2048,temperature:0},
      prompt_sha256:sha256(safePrompt),
      secret_header_names:['authorization']
    });
  }
  throw new Error(`unsupported provider: ${providerId}`);
}

export function redactProviderRequest(request){
  const headers={...request.headers};
  for(const name of request.secret_header_names??[]) if(name in headers) headers[name]='[REDACTED]';
  return Object.freeze({provider_id:request.provider_id,model:request.model,url:request.url,method:request.method,headers,body_sha256:sha256(JSON.stringify(request.body)),prompt_sha256:request.prompt_sha256});
}

export function parseProviderResponse(providerId,payload){
  if(providerId==='google-gemini-api-free'){
    const text=(payload?.candidates??[]).flatMap(x=>x?.content?.parts??[]).map(x=>x?.text).filter(Boolean).join('\n').trim();
    if(!text) throw new Error('Gemini response missing text');
    return {text,usage:{prompt_tokens:payload?.usageMetadata?.promptTokenCount??null,output_tokens:payload?.usageMetadata?.candidatesTokenCount??null,total_tokens:payload?.usageMetadata?.totalTokenCount??null}};
  }
  if(providerId==='cloudflare-workers-ai-free'){
    if(payload?.success===false) throw new Error(`Cloudflare response error: ${JSON.stringify(payload.errors??[])}`);
    const text=String(payload?.result?.response??'').trim();
    if(!text) throw new Error('Cloudflare response missing text');
    return {text,usage:{prompt_tokens:null,output_tokens:null,total_tokens:null}};
  }
  throw new Error(`unsupported provider: ${providerId}`);
}

async function safeErrorEvidence(response){
  let payload=null;
  try{payload=await response.json();}catch{}
  const error=payload?.error??null;
  const rawMessage=typeof error?.message==='string'?error.message:'';
  return Object.freeze({
    provider_error_code:Number.isFinite(error?.code)?error.code:null,
    provider_error_status:typeof error?.status==='string'?error.status:null,
    provider_error_message_sha256:rawMessage?sha256(rawMessage):null,
    raw_error_message_emitted:false
  });
}

function failureReason(status,evidence){
  if(status===429) return 'HTTP_429';
  if(status===402) return 'PROVIDER_BILLING_REQUIRED';
  if(status===403){
    if(evidence.provider_error_status==='PERMISSION_DENIED') return 'PROVIDER_PERMISSION_DENIED';
    return 'PROVIDER_PERMISSION_OR_BILLING_REQUIRED';
  }
  return `HTTP_${status}`;
}

export async function invokeZeroCostProvider({providerId,prompt,gate,quotaDecisionResult,env=process.env,fetchImpl=fetch,timeoutMs=30000}){
  if(gate?.allowed!==true) throw new Error('BEHAVIORAL_EXECUTION_GATE_CLOSED');
  if(quotaDecisionResult?.status!=='ALLOW_NEXT_SYNTHETIC_CALL') throw new Error(`QUOTA_BLOCK:${quotaDecisionResult?.reason??'UNKNOWN'}`);
  if(gate?.synthetic_only!==true||gate?.paid_fallback!==false||gate?.prod_authorized!==false) throw new Error('UNSAFE_GATE_STATE');
  const request=buildProviderRequest({providerId,prompt,env});
  const {controller,timer}=timeoutSignal(timeoutMs);
  try{
    const response=await fetchImpl(request.url,{method:request.method,headers:request.headers,body:JSON.stringify(request.body),signal:controller.signal,redirect:'error'});
    if(!response.ok){
      const evidence=await safeErrorEvidence(response);
      return Object.freeze({ok:false,stop_reason:failureReason(response.status,evidence),http_status:response.status,provider_id:providerId,model:request.model,request:redactProviderRequest(request),...evidence,secret_values_emitted:false});
    }
    const payload=await response.json();
    const parsed=parseProviderResponse(providerId,payload);
    return Object.freeze({ok:true,provider_id:providerId,model:request.model,output_text:parsed.text,output_sha256:sha256(parsed.text),usage:parsed.usage,request:redactProviderRequest(request),secret_values_emitted:false,additional_cost_eur_claimed:0});
  } finally {clearTimeout(timer);}
}
