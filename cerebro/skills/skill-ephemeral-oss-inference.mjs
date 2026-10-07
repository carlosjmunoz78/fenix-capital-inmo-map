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
  max_new_tokens:384,
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
  // Use the model's own instruct/chat template. The previous raw-string path was
  // provenance-safe but produced prose without the requested JSON on all six
  // synthetic arms, making the evaluator inconclusive rather than proving the
  // candidate bad. This changes only prompt framing, not gates, data, quota,
  // model, weights, scoring or promotion policy.
  const chat=[{role:'user',content:prompt}];
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
    output_text:text,
    output_sha256:sha256(text),
    prompt_sha256:sha256(prompt),
    usage:{prompt_tokens:null,output_tokens:null,total_tokens:null},
    secret_values_emitted:false,
    additional_cost_eur_claimed:0,
    own_server_required:false,
    external_skill_code_executed:false
  });
}

export function resetEphemeralOssInferenceForTests(){generatorPromise=null;}
