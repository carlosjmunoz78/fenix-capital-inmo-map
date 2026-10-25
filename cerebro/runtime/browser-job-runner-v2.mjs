import { pathToFileURL } from 'node:url';
import { runInteractiveBrowserSessionV3 } from './browser-interactive-session-v3.mjs';

const DEFAULT_AUDIENCE='cerebro-browser-worker-v1';
const CREDENTIAL_PLACEHOLDER=/^\$CREDENTIAL\.([A-Za-z0-9_.-]{1,120})$/;
const MAX_BROWSER1_ACTIONS=50;
const OIDC_REFRESH_SKEW_MS=60_000;
const OIDC_LAST_RESORT_MS=5_000;

const DEFAULT_ENDPOINT=process.env.CEREBRO_BROWSER_DISPATCH_URL || '';
const DEFAULT_SLOT=Number(process.env.CEREBRO_BROWSER_WORKER_SLOT || 1);
const DEFAULT_STAGE=Number(process.env.CEREBRO_BROWSER_STAGE_CONCURRENCY || 2);

function required(value,name){if(value===undefined||value===null||value==='')throw new Error(`MISSING_${name}`);return value;}
function plainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}
function browserWorkerOptions(){const channel=String(process.env.CEREBRO_BROWSER_CHANNEL||'').trim();return channel?{launch_options:{channel}}:{};}
export async function getGitHubOidcTokenV2({audience=process.env.CEREBRO_BROWSER_OIDC_AUDIENCE||DEFAULT_AUDIENCE,request_url=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,request_token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,fetch_impl=fetch}={}){
  required(request_url,'ACTIONS_ID_TOKEN_REQUEST_URL'); required(request_token,'ACTIONS_ID_TOKEN_REQUEST_TOKEN');
  const url=new URL(request_url); url.searchParams.set('audience',audience);
  const response=await fetch_impl(url,{headers:{authorization:`Bearer ${request_token}`},redirect:'error'});
  if(!response.ok)throw new Error(`GITHUB_OIDC_TOKEN_REQUEST_FAILED:${response.status}`);
  const body=await response.json(); if(!body?.value||typeof body.value!=='string')throw new Error('GITHUB_OIDC_TOKEN_MISSING');
  return body.value;
}
export function oidcTokenExpiryMs(token){
  try{
    const payload=String(token||'').split('.')[1];
    if(!payload)return 0;
    const parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    const exp=Number(parsed?.exp||0);
    return Number.isFinite(exp)&&exp>0?exp*1000:0;
  }catch{return 0;}
}
export function createOidcTokenProviderV2({static_token=null,fetch_impl=fetch,refresh_skew_ms=OIDC_REFRESH_SKEW_MS,now=()=>Date.now(),oidc_options={}}={}){
  let cached=static_token?String(static_token):'';
  let expiresAt=static_token?Number.POSITIVE_INFINITY:0;
  let inFlight=null;
  return async()=>{
    const current=now();
    if(cached&&current<expiresAt-refresh_skew_ms)return cached;
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      try{
        const next=await getGitHubOidcTokenV2({...oidc_options,fetch_impl});
        cached=next;
        const parsedExpiry=oidcTokenExpiryMs(next);
        expiresAt=parsedExpiry>current?parsedExpiry:current+4*60_000;
        return cached;
      }catch(error){
        if(cached&&current<expiresAt-OIDC_LAST_RESORT_MS)return cached;
        throw error;
      }
    })().finally(()=>{inFlight=null;});
    return inFlight;
  };
}
function resolveCredentialPath(secret,dottedPath){let value=secret;for(const segment of dottedPath.split('.')){if(!plainObject(value)||!Object.prototype.hasOwnProperty.call(value,segment))throw new Error('CREDENTIAL_PLACEHOLDER_NOT_AVAILABLE');value=value[segment];}if(value===undefined||value===null||!['string','number','boolean'].includes(typeof value))throw new Error('CREDENTIAL_PLACEHOLDER_VALUE_INVALID');return String(value);}
export function hydrateCredentialPlaceholdersV2(value,secret){if(typeof value==='string'){const match=CREDENTIAL_PLACEHOLDER.exec(value);return match?resolveCredentialPath(secret,match[1]):value;}if(Array.isArray(value))return value.map(item=>hydrateCredentialPlaceholdersV2(item,secret));if(plainObject(value))return Object.fromEntries(Object.entries(value).map(([key,nested])=>[key,hydrateCredentialPlaceholdersV2(nested,secret)]));return value;}

export function applyHumanOperatorPacingV2(commands=[]){
  if(!Array.isArray(commands))throw new Error('COMMANDS_MUST_BE_ARRAY');
  const out=[];
  const shortSettle=new Set(['fill','write','type','select','check','uncheck']);
  const submitSettle=new Set(['click','double_click','press','upload','download_click','drag']);
  const navigationSettle=new Set(['goto','reload','open_tab','switch_tab']);
  for(let i=0;i<commands.length;i+=1){
    const command=commands[i];
    out.push(command);
    const name=String(command?.command||'').toLowerCase();
    const nextName=String(commands[i+1]?.command||'').toLowerCase();
    if(nextName==='wait')continue;
    let ms=0;
    if(shortSettle.has(name))ms=650;
    else if(submitSettle.has(name))ms=900;
    else if(navigationSettle.has(name))ms=700;
    if(!ms)continue;
    const remainingOriginal=commands.length-(i+1);
    if(out.length+1+remainingOriginal<=MAX_BROWSER1_ACTIONS)out.push({command:'wait',ms});
  }
  return out;
}

async function createDefaultBrowser1(){const mod=await import('./browser1-access-v1.mjs');return mod.createBrowser1Tool({sessions:[],worker_options:browserWorkerOptions()});}
function scrub(value,seen=new WeakSet()){
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);
  if(Array.isArray(value)){for(const item of value)scrub(item,seen);return;}
  for(const key of Object.keys(value)){const nested=value[key];if(nested&&typeof nested==='object')scrub(nested,seen);value[key]=null;}
}

async function callDispatch(endpoint,route,token,body={},fetch_impl=fetch){
  const response=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{
    method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`BROWSER_V2_${route.toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}`);
  return data;
}

function workerInput(job,commands=job.commands){
  const authority=job.authority&&typeof job.authority==='object'?job.authority:{};
  return {
    company_id:required(job.company_id,'COMPANY_ID'),department_id:required(job.department_id,'DEPARTMENT_ID'),engine_id:required(job.engine_id,'ENGINE_ID'),
    environment:required(job.environment,'ENVIRONMENT'),version:job.version||'v2',identity_id:job.identity_id||'public',account_id:job.account_id||'public',
    commands:required(commands,'COMMANDS'),request_id:String(job.job_id),audit_id:required(job.audit_id,'AUDIT_ID'),
    canonical_engine_ids:authority.canonical_engine_ids||[],browser_binding:authority.browser_binding||{},engine_authority:authority.engine_authority||{},
    kill_switch_enabled:authority.kill_switch_enabled===true,capture_final_evidence:true,incremental_spend_eur:0
  };
}

function resultSummary(result={},credential_materialized=false){
  const firstText=!credential_materialized&&Array.isArray(result.results)?result.results.find(value=>typeof value==='string'):null;
  return {ok:result.ok===true,authorization_status:result.authorization?.status||null,human_required:result.human_required===true,human_required_reason:result.human_required===true?String(result.human_required_reason||'').slice(0,120):null,human_required_code:result.human_required===true?String(result.human_required_code||'').slice(0,120):null,final_url:result.final_url||null,result_count:Array.isArray(result.results)?result.results.length:0,
    observed_text_sample:firstText?firstText.slice(0,300):null,evidence_captured:Boolean(result.final_evidence),credential_materialized,interactive_session:result.interactive_session===true,session_id:result.interactive_session===true?result.session_id||null:null,secret_material_logged:false};
}

function resourceSample(){
  const m=process.memoryUsage(); const c=process.cpuUsage();
  return {at:new Date().toISOString(),rss:m.rss,heap_used:m.heapUsed,cpu_user:c.user,cpu_system:c.system};
}

export async function runOneBrowserJobV2({
  endpoint=DEFAULT_ENDPOINT,
  worker_slot=DEFAULT_SLOT,
  stage_concurrency=DEFAULT_STAGE,
  seed_canary=false,
  browser1=null,
  fetch_impl=fetch,
  token=null,
  run_id=process.env.GITHUB_RUN_ID||`local-${Date.now()}`
}={}){
  required(endpoint,'CEREBRO_BROWSER_DISPATCH_URL');
  if(!Number.isInteger(worker_slot)||worker_slot<1||worker_slot>128)throw new Error('INVALID_WORKER_SLOT');
  if(!Number.isInteger(stage_concurrency)||stage_concurrency<1||stage_concurrency>128)throw new Error('INVALID_STAGE_CONCURRENCY');
  const tokenProvider=createOidcTokenProviderV2({static_token:token,fetch_impl});
  const dispatch=async(route,body={})=>callDispatch(endpoint,route,await tokenProvider(),body,fetch_impl);
  const browser=browser1||await createDefaultBrowser1();
  if(seed_canary)await dispatch('phase2-canary-seed',{worker_slot,stage_concurrency});
  const lease=await dispatch('lease-v2',{worker_slot,stage_concurrency});
  const job=lease?.job;
  if(!job)return Object.freeze({ok:true,status:'NO_JOB',backpressure:lease?.backpressure||null,worker_slot,stage_concurrency});
  const workerId=required(lease.worker_id,'WORKER_ID');
  const start=resourceSample(); const startMs=Date.now();
  let secretPayload=null; let effectiveCommands=job.commands; let credentialMaterialized=false; let heartbeatTimer=null;
  try{
    const hb=await dispatch('heartbeat-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id,extend_seconds:Math.min(Number(job.timeout_seconds||300)+120,1800)});
    if(hb?.cancel_requested===true){
      await dispatch('complete-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id,outcome:'FAILED',error_code:'CANCELLED_BEFORE_EXECUTION',retryable:false,result_summary:{ok:false,secret_material_logged:false}});
      return Object.freeze({ok:false,status:'CANCELLED',job_id:job.job_id,worker_slot,stage_concurrency});
    }
    heartbeatTimer=setInterval(()=>{void dispatch('heartbeat-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id,extend_seconds:Math.min(Number(job.timeout_seconds||300)+120,1800)}).catch(()=>null);},60_000);
    heartbeatTimer.unref?.();

    if(job.credential_ref_id){
      const materialized=await dispatch('credential-materialize-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id});
      if(!materialized?.ok||!plainObject(materialized.secret_payload))throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');
      secretPayload=materialized.secret_payload; effectiveCommands=hydrateCredentialPlaceholdersV2(job.commands,secretPayload); credentialMaterialized=true;
    }

    effectiveCommands=applyHumanOperatorPacingV2(effectiveCommands);
    let result;
    if(String(job.capability||'')==='browser1.interactive'){
      if(credentialMaterialized)throw new Error('INTERACTIVE_V3_CREDENTIAL_MATERIALIZATION_NOT_YET_ALLOWED');
      result=await runInteractiveBrowserSessionV3({job:{...job,commands:effectiveCommands},token_provider:tokenProvider,fetch_impl});
    }else{
      const mode=String(job.mode||'OBSERVE').toUpperCase();
      const executeTool=mode==='MUTATE'?browser.act:browser.observe;
      if(typeof executeTool!=='function')throw new Error(`BROWSER1_${mode}_EXECUTOR_MISSING`);
      result=await executeTool(workerInput(job,effectiveCommands));
    }
    const humanRequired=result.authorization?.status==='HUMAN_REQUIRED';
    const authorized=result.ok===true&&!humanRequired;
    const outcome=humanRequired?'HOLD':authorized?'SUCCEEDED':'FAILED';
    const summary=resultSummary(result,credentialMaterialized);
    const errorCode=authorized?null:(humanRequired?String(result.human_required_code||result.authorization?.code||'HUMAN_REQUIRED').slice(0,240):(result.authorization?.status||'BROWSER1_NOT_AUTHORIZED'));
    const completion=await dispatch('complete-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id,outcome,error_code:errorCode,retryable:outcome==='FAILED',result_summary:summary});
    const end=resourceSample(); const duration=Date.now()-startMs;
    await dispatch('metrics-v2',{worker_slot,run_id,stage_concurrency,job_id:job.job_id,company_id:job.company_id,department_id:job.department_id,browser_profile_id:job.browser_profile_id,
      started_at:start.at,finished_at:end.at,duration_ms:duration,rss_start_bytes:start.rss,rss_end_bytes:end.rss,heap_used_start_bytes:start.heap_used,heap_used_end_bytes:end.heap_used,
      cpu_user_micros:Math.max(0,end.cpu_user-start.cpu_user),cpu_system_micros:Math.max(0,end.cpu_system-start.cpu_system),outcome:completion?.status||outcome});
    return Object.freeze({ok:authorized,status:completion?.status||outcome,job_id:job.job_id,worker_id:workerId,worker_slot,stage_concurrency,duration_ms:duration,summary});
  }catch(error){
    const end=resourceSample(); const duration=Date.now()-startMs;
    await dispatch('complete-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id,outcome:'FAILED',error_code:String(error?.message||error).slice(0,240),retryable:true,result_summary:{ok:false,credential_materialized:credentialMaterialized,secret_material_logged:false}}).catch(()=>null);
    await dispatch('metrics-v2',{worker_slot,run_id,stage_concurrency,job_id:job.job_id,company_id:job.company_id,department_id:job.department_id,browser_profile_id:job.browser_profile_id,
      started_at:start.at,finished_at:end.at,duration_ms:duration,rss_start_bytes:start.rss,rss_end_bytes:end.rss,heap_used_start_bytes:start.heap_used,heap_used_end_bytes:end.heap_used,
      cpu_user_micros:Math.max(0,end.cpu_user-start.cpu_user),cpu_system_micros:Math.max(0,end.cpu_system-start.cpu_system),outcome:'FAILED'}).catch(()=>null);
    throw error;
  }finally{
    if(heartbeatTimer)clearInterval(heartbeatTimer); scrub(secretPayload); scrub(effectiveCommands);
  }
}

function safeConsoleResult(result){return {ok:result.ok,status:result.status,job_id:result.job_id||null,worker_slot:result.worker_slot,stage_concurrency:result.stage_concurrency,duration_ms:result.duration_ms||null,final_url:result.summary?.final_url||null,authorization_status:result.summary?.authorization_status||null,human_required:result.summary?.human_required===true,human_required_reason:result.summary?.human_required_reason||null,human_required_code:result.summary?.human_required_code||null,credential_materialized:result.summary?.credential_materialized===true,interactive_session:result.summary?.interactive_session===true,secret_material_logged:false};}

async function main(){
  const result=await runOneBrowserJobV2({seed_canary:process.env.CEREBRO_BROWSER_PHASE2_SEED_CANARY==='true'});
  console.log(JSON.stringify(safeConsoleResult(result)));
  if(!['NO_JOB','HOLD'].includes(result.status)&&result.ok!==true)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const BROWSER_JOB_RUNNER_V2_CONTRACT=Object.freeze({schema_version:'2.4.1',capability_id:'BROWSER-1',orchestrator:'BROWSER-ORCH-V2',authentication:'GITHUB_ACTIONS_OIDC_REFRESHING',worker_pool:true,one_serial_browser1_per_worker:true,raw_credentials_in_queue:false,vault_credential_materialization:true,human_operator_liveness:true,human_required_hold_nonfatal:true,adaptive_ui_settle_pacing:true,interactive_phase3_opt_in:true,interactive_same_v2_queue:true,host_browser_channel_supported:true,oidc_refresh_before_expiry:true,no_stealth_evasion:true,metrics_without_secrets:true,incremental_cost_eur:0,serial_v1_rollback_preserved:true});
