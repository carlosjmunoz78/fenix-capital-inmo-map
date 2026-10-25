import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {planMultimediaTask} from '../../../digital-build/multimedia-factory-runtime-v0.mjs';
import {routeToolModel,assertNoSilentSpend} from './tool-model-router.mjs';

const SAFE_REF=/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const MODEL_ID='Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice';
const PROVIDER_ID='QWEN3_TTS_0_6B_CPU';
const FALLBACK_ID='PIPER_ZERO_COST';
const ALLOWED_LANGUAGES=new Set(['Spanish','English']);

function ref(value,label){
  const out=String(value??'').trim();
  if(!SAFE_REF.test(out))throw new Error(`${label}_INVALID`);
  return out;
}
function boundedText(value,label,max=500){
  const out=String(value??'').trim();
  if(!out)throw new Error(`${label}_REQUIRED`);
  if(out.length>max)throw new Error(`${label}_TOO_LONG`);
  return out;
}
function assertPreprod(input){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD')throw new Error('QWEN3_TTS_PHYSICAL_ADAPTER_PREPROD_ONLY');
  if(input.prod_write_requested===true||input.publish_requested===true||input.send_requested===true)throw new Error('QWEN3_TTS_EXTERNAL_SIDE_EFFECT_DENIED');
  if(Number(input.max_cost_eur??0)!==0)throw new Error('MONEY_LIMIT');
  if(input.paid_api_requested===true||input.purchase_requested===true)throw new Error('MONEY_LIMIT');
  if(input.contains_personal_data===true||input.real_person_voice_requested===true||input.voice_clone_requested===true)throw new Error('QWEN3_TTS_SYNTHETIC_BUILTIN_VOICE_ONLY');
  return environment;
}

export function planQwen3TtsPhysicalPreprod(input={}){
  const environment=assertPreprod(input);
  const company_id=ref(input.company_id??'GLOBAL','COMPANY_ID');
  const request_id=ref(input.request_id,'REQUEST_ID');
  const asset_ref=ref(input.asset_ref,'ASSET_REF');
  const language=boundedText(input.language??'Spanish','LANGUAGE',40);
  if(!ALLOWED_LANGUAGES.has(language))throw new Error('QWEN3_TTS_LANGUAGE_NOT_IN_PREPROD_ALLOWLIST');
  const speaker=boundedText(input.speaker??'Aiden','SPEAKER',80);
  const text=boundedText(input.text,'TEXT',500);

  const multimedia_plan=planMultimediaTask({
    context:{company_id,engine_id:'FACT-001',capability_id:'DIGITAL-BUILD-MULTIMEDIA',environment:'PREPROD',version:'v0'},
    request_id:`${request_id}:qwen3tts`,asset_ref:`${asset_ref}:voice`,adapter:'QWEN3_TTS',task_type:'VOICE_SYNTHESIS',confidence:Number(input.confidence??1)
  });
  if(multimedia_plan.allowed!==true)throw new Error(`QWEN3_TTS_MULTIMEDIA_PLAN_BLOCKED:${multimedia_plan.code??multimedia_plan.status}`);

  const routing=assertNoSilentSpend(routeToolModel({
    capability:'TTS',identity_sensitivity:'SYNTHETIC',privacy:'LOCAL_ONLY',cost_ceiling_eur:0,quality_target:60
  },[
    {id:PROVIDER_ID,route_class:'oss_local',estimated_cost_eur:0,quality_score:85,license_ok:true,security_ok:true,real_identity_allowed:false,execution_location:'LOCAL',offline:false,enabled:true},
    {id:FALLBACK_ID,route_class:'oss_local',estimated_cost_eur:0,quality_score:60,license_ok:true,security_ok:true,real_identity_allowed:false,execution_location:'LOCAL',offline:true,enabled:true}
  ]),0);
  if(routing.decision!=='PASS'||routing.selected?.id!==PROVIDER_ID)throw new Error('QWEN3_TTS_ROUTE_NOT_SELECTED');

  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_QWEN3_TTS_PHYSICAL_PLAN_V1',company_id,engine_id:'UMS-001',environment,version:'1.0.0',
    request_id,asset_ref,text,language,speaker,model_id:MODEL_ID,provider_id:PROVIDER_ID,
    fallback_chain:Object.freeze([FALLBACK_ID]),multimedia_plan,routing,
    execution_policy:Object.freeze({device:'cpu',max_cost_eur:0,paid_api:false,network_model_download_allowed_in_preprod_job:true,real_person_voice:false,voice_clone:false,publish:false,send:false,prod_write:false}),
    status:'QWEN3_TTS_PREPROD_PLAN_READY',physical_execution_proven:false,prod_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,additional_cost_eur:0
  });
}

function defaultProcessRunner({script,env,cwd,timeoutMs=900000}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.env.PYTHON??'python', [script], {cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
    let stdout='';let stderr='';let settled=false;
    const timer=setTimeout(()=>{if(settled)return;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),30000).unref();},timeoutMs);
    child.stdout.on('data',(d)=>{stdout+=d.toString();});
    child.stderr.on('data',(d)=>{stderr+=d.toString();});
    child.once('error',(err)=>{if(settled)return;settled=true;clearTimeout(timer);reject(err);});
    child.once('close',(code,signal)=>{if(settled)return;settled=true;clearTimeout(timer);resolve({code,signal,stdout,stderr});});
  });
}

function assertArtifactInside(baseDir,file){
  const base=path.resolve(baseDir);
  const resolved=path.resolve(file);
  if(resolved!==base&&!resolved.startsWith(`${base}${path.sep}`))throw new Error('QWEN3_TTS_ARTIFACT_PATH_ESCAPE');
  return resolved;
}

export async function executeQwen3TtsPhysicalPreprod(input={},deps={}){
  const plan=planQwen3TtsPhysicalPreprod(input);
  if(input.preprod_physical_test!==true)throw new Error('QWEN3_TTS_PREPROD_PHYSICAL_TEST_FLAG_REQUIRED');
  const cwd=path.resolve(input.cwd??process.cwd());
  const artifactDir=path.resolve(input.artifact_dir??path.join(cwd,'.ums-qwen3-tts'));
  fs.mkdirSync(artifactDir,{recursive:true});
  const reportPath=assertArtifactInside(artifactDir,path.join(artifactDir,`${plan.request_id.replaceAll(':','_')}.json`));
  const outputPath=assertArtifactInside(artifactDir,path.join(artifactDir,`${plan.request_id.replaceAll(':','_')}.wav`));
  const script=path.resolve(input.python_script??path.join(cwd,'cerebro/media-studio/v2/probes/qwen3_tts_cpu_probe.py'));
  const runProcess=deps.runProcess??defaultProcessRunner;
  const result=await runProcess({script,cwd,timeoutMs:Number(input.timeout_ms??900000),env:{
    UMS_QWEN_MODEL:MODEL_ID,UMS_QWEN_TEXT:plan.text,UMS_QWEN_SPEAKER:plan.speaker,UMS_QWEN_LANGUAGE:plan.language,
    UMS_QWEN_MAX_NEW_TOKENS:String(input.max_new_tokens??96),UMS_QWEN_REPORT:reportPath,UMS_QWEN_OUTPUT:outputPath
  }});
  if(Number(result?.code)!==0)throw new Error(`QWEN3_TTS_PROCESS_FAILED:${result?.code}:${String(result?.signal??'')}`);
  if(!fs.existsSync(reportPath))throw new Error('QWEN3_TTS_REPORT_MISSING');
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  if(report.status!=='PASSED_CPU_REAL_INFERENCE')throw new Error(`QWEN3_TTS_SEMANTIC_GATE_FAILED:${report.status}`);
  if(!fs.existsSync(outputPath)||!report.artifact?.sha256||Number(report.artifact?.duration_seconds??0)<=0)throw new Error('QWEN3_TTS_ARTIFACT_INVALID');
  return Object.freeze({
    ...plan,status:'QWEN3_TTS_PREPROD_PHYSICAL_GREEN',physical_execution_proven:true,physical_report:report,
    artifact:Object.freeze({path:outputPath,sha256:report.artifact.sha256,duration_seconds:Number(report.artifact.duration_seconds),sample_rate:Number(report.artifact.sample_rate),bytes:Number(report.artifact.bytes)}),
    stdout_tail:String(result.stdout??'').slice(-2000),stderr_tail:String(result.stderr??'').slice(-2000),
    prod_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,external_side_effect_executed:false,additional_cost_eur:0
  });
}

export async function executeSyntheticVoiceWithFallbackPreprod(input={},deps={}){
  try{return await executeQwen3TtsPhysicalPreprod(input,deps);}catch(error){
    if(typeof deps.piperFallback!=='function')throw error;
    const fallback=await deps.piperFallback({input,error});
    if(!fallback||fallback.ok!==true)throw error;
    return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UMS_SYNTHETIC_VOICE_FALLBACK_V1',company_id:ref(input.company_id??'GLOBAL','COMPANY_ID'),engine_id:'UMS-001',environment:'PREPROD',status:'PIPER_FALLBACK_GREEN',primary_provider:PROVIDER_ID,fallback_provider:FALLBACK_ID,primary_error:String(error?.message??error),fallback,prod_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,external_side_effect_executed:false,additional_cost_eur:0});
  }
}

export const QWEN3_TTS_PREPROD_BINDING=Object.freeze({provider_id:PROVIDER_ID,model_id:MODEL_ID,capability:'TTS',route_class:'oss_local',environment:'PREPROD',device:'cpu',license:'Apache-2.0',cost_target_eur:0,fallback:FALLBACK_ID,real_person_voice_allowed:false,voice_clone_allowed:false,prod_binding:false});
