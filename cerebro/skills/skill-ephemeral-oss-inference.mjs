import {createHash} from 'node:crypto';

export const OSS_RUNTIME=Object.freeze({
  provider_id:'github-actions-ephemeral-oss',
  runtime_package:'@huggingface/transformers',
  runtime_version:'4.3.0',
  model_repo:'HuggingFaceTB/SmolLM2-1.7B-Instruct',
  model_revision:'31b70e2e869a7173562077fd711b654946d38674',
  model_dtype:'q4',
  model_q4_sha256:'467b7b8f62d99f184d3628d24b8d65c151e331695f6e9ea997616c4e279e9a51',
  model_license:'apache-2.0',
  device:'cpu',
  context_window_tokens:8192,
  max_new_tokens:384,
  max_prompt_utf8_bytes:7168,
  prompt_context_guard:'CONSERVATIVE_UTF8_HEAD_TAIL_V1',
  prompt_mode:'CHAT_TEMPLATE_MESSAGES',
  additional_cost_eur:0,
  own_server_required:false,
  execution_environment:'GITHUB_ACTIONS_EPHEMERAL_RUNNER'
});

let generatorPromise=null;

function sha256(text){return createHash('sha256').update(String(text??'')).digest('hex');}
function requireSafeGate(gate,quotaDecisionResult){
  if(gate?.allowed!==true) throw new Error('BEHAVIORAL_EXECUTION_GATE_CLOSED');
  if(quotaDecisionResult?.status!=='ALLOW_NEXT_SYNTHETIC_CALL') throw new Error(`QUOTA_BLOCK:${quotaDecisionResult?.reason??'UNKNOWN'}`);
  if(gate?.synthetic_only!==true||gate?.paid_fallback!==false||gate?.prod_authorized!==false) throw new Error('UNSAFE_GATE_STATE');
}

function prefixUtf8(text,maxBytes){
  if(maxBytes<=0) return '';
  const bytes=Buffer.from(String(text??''),'utf8');
  if(bytes.length<=maxBytes) return String(text??'');
  return bytes.subarray(0,maxBytes).toString('utf8').replace(/\uFFFD+$/g,'');
}
function suffixUtf8(text,maxBytes){
  if(maxBytes<=0) return '';
  const bytes=Buffer.from(String(text??''),'utf8');
  if(bytes.length<=maxBytes) return String(text??'');
  return bytes.subarray(bytes.length-maxBytes).toString('utf8').replace(/^\uFFFD+/g,'');
}

export function boundPromptForOssContext(prompt,{maxBytes=OSS_RUNTIME.max_prompt_utf8_bytes}={}){
  const original=String(prompt??'');
  const originalBytes=Buffer.byteLength(original,'utf8');
  if(!Number.isFinite(Number(maxBytes))||Number(maxBytes)<1024) throw new TypeError('invalid maxBytes');
  const limit=Math.trunc(Number(maxBytes));
  if(originalBytes<=limit){
    return Object.freeze({prompt:original,truncated:false,original_utf8_bytes:originalBytes,effective_utf8_bytes:originalBytes,guard:OSS_RUNTIME.prompt_context_guard});
  }
  const marker='\n\n[CEREBRO_CONTEXT_TRUNCATED_FOR_LOCAL_OSS]\n\n';
  const markerBytes=Buffer.byteLength(marker,'utf8');
  const contentBudget=Math.max(0,limit-markerBytes);
  const headBudget=Math.floor(contentBudget*0.58);
  const tailBudget=contentBudget-headBudget;
  let bounded=`${prefixUtf8(original,headBudget)}${marker}${suffixUtf8(original,tailBudget)}`;
  while(Buffer.byteLength(bounded,'utf8')>limit&&bounded.length>marker.length){
    bounded=bounded.slice(0,-1);
  }
  return Object.freeze({
    prompt:bounded,
    truncated:true,
    original_utf8_bytes:originalBytes,
    effective_utf8_bytes:Buffer.byteLength(bounded,'utf8'),
    guard:OSS_RUNTIME.prompt_context_guard
  });
}

async function getGenerator({importImpl=(specifier)=>import(specifier)}={}){
  if(!generatorPromise){
    generatorPromise=(async()=>{
      const mod=await importImpl('@huggingface/transformers');
      if(typeof mod?.pipeline!=='function') throw new Error('TRANSFORMERS_JS_PIPELINE_MISSING');
      if(mod?.env){
        mod.env.allowRemoteModels=true;
        mod.env.allowLocalModels=true;
        mod.env.cacheDir=process.env.CEREBRO_HF_CACHE_DIR||'.cache/cerebro-hf';
      }
      const generator=await mod.pipeline('text-generation',OSS_RUNTIME.model_repo,{
        dtype:OSS_RUNTIME.model_dtype,
        revision:OSS_RUNTIME.model_revision,
        device:OSS_RUNTIME.device
      });
      return generator;
    })().catch(err=>{generatorPromise=null;throw err;});
  }
  return generatorPromise;
}

function extractGeneratedText(output){
  const first=Array.isArray(output)?output[0]:output;
  const value=first?.generated_text;
  if(typeof value==='string'&&value.trim()) return value.trim();
  if(Array.isArray(value)){
    const last=value.at(-1);
    if(typeof last?.content==='string'&&last.content.trim()) return last.content.trim();
  }
  throw new Error('OSS_MODEL_OUTPUT_MISSING');
}

export async function invokeEphemeralOssInference({prompt,gate,quotaDecisionResult,importImpl}={}){
  requireSafeGate(gate,quotaDecisionResult);
  if(typeof prompt!=='string'||!prompt.trim()) throw new TypeError('prompt required');
  const generator=await getGenerator({importImpl});
  const bounded=boundPromptForOssContext(prompt);
  // Use the model's own instruct/chat template, but never allow arbitrarily large
  // skill guidance to consume the full model context. The conservative UTF-8
  // cap intentionally leaves >1k context positions for chat-template overhead
  // and bounded generation, preventing rotary-position overflow while keeping
  // both CEREBRO policy at the head and output/evidence requirements at the tail.
  const chat=[{role:'user',content:bounded.prompt}];
  const output=await generator(chat,{
    max_new_tokens:OSS_RUNTIME.max_new_tokens,
    do_sample:false,
    return_full_text:false
  });
  const text=extractGeneratedText(output);
  return Object.freeze({
    ok:true,
    provider_id:OSS_RUNTIME.provider_id,
    model:OSS_RUNTIME.model_repo,
    model_revision:OSS_RUNTIME.model_revision,
    model_dtype:OSS_RUNTIME.model_dtype,
    device:OSS_RUNTIME.device,
    prompt_mode:OSS_RUNTIME.prompt_mode,
    prompt_context_guard:bounded.guard,
    prompt_truncated:bounded.truncated,
    original_prompt_utf8_bytes:bounded.original_utf8_bytes,
    effective_prompt_utf8_bytes:bounded.effective_utf8_bytes,
    output_text:text,
    output_sha256:sha256(text),
    prompt_sha256:sha256(bounded.prompt),
    original_prompt_sha256:sha256(prompt),
    usage:{prompt_tokens:null,output_tokens:null,total_tokens:null},
    secret_values_emitted:false,
    additional_cost_eur_claimed:0,
    own_server_required:false,
    external_skill_code_executed:false
  });
}

export function resetEphemeralOssInferenceForTests(){generatorPromise=null;}
