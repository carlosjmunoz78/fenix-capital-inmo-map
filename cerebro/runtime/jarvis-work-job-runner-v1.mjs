import {pathToFileURL} from 'node:url';
import {createRepoSandboxJobHandlerV1} from './repo-sandbox-job-handler-v1.mjs';

const DEFAULT_ENDPOINT=process.env.JARVIS_WORK_DISPATCH_URL||'';
const DEFAULT_AUDIENCE='jarvis-work-worker-v1';
const EXPECTED_ENVIRONMENT=process.env.JARVIS_EXPECTED_ENVIRONMENT||'PREPROD';
const ALLOWED_ENVIRONMENTS=new Set(['PREPROD','PROD']);

function required(value,label){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`MISSING_${label}`);return String(value).trim()}
async function oidcToken({audience=process.env.JARVIS_WORK_OIDC_AUDIENCE||DEFAULT_AUDIENCE,fetch_impl=fetch}={}){
 const requestUrl=required(process.env.ACTIONS_ID_TOKEN_REQUEST_URL,'ACTIONS_ID_TOKEN_REQUEST_URL');
 const requestToken=required(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,'ACTIONS_ID_TOKEN_REQUEST_TOKEN');
 const url=new URL(requestUrl);url.searchParams.set('audience',audience);
 const response=await fetch_impl(url,{headers:{authorization:`Bearer ${requestToken}`},redirect:'error'});
 if(!response.ok)throw new Error(`GITHUB_OIDC_TOKEN_REQUEST_FAILED:${response.status}`);
 const body=await response.json();if(!body?.value)throw new Error('GITHUB_OIDC_TOKEN_MISSING');return body.value;
}
async function dispatch(endpoint,route,body={},fetch_impl=fetch){
 const token=await oidcToken({fetch_impl});
 const response=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(`JARVIS_WORK_${route.toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}`);
 return data;
}

export async function runOneJarvisWorkJobV1({endpoint=DEFAULT_ENDPOINT,workspace_root=process.env.RUNNER_TEMP,image_ref=process.env.JARVIS_SANDBOX_IMAGE_REF,fetch_impl=fetch}={}){
 required(endpoint,'JARVIS_WORK_DISPATCH_URL');required(workspace_root,'RUNNER_TEMP');required(image_ref,'JARVIS_SANDBOX_IMAGE_REF');
 if(!ALLOWED_ENVIRONMENTS.has(EXPECTED_ENVIRONMENT))throw new Error('UNSUPPORTED_EXPECTED_ENVIRONMENT');
 const lease=await dispatch(endpoint,'lease-v1',{lease_seconds:300},fetch_impl);const job=lease?.job;
 if(!job)return Object.freeze({ok:true,status:'NO_JOB'});
 if(job.environment!==EXPECTED_ENVIRONMENT)throw new Error(`WORK_JOB_ENVIRONMENT_MISMATCH:${job.environment}:${EXPECTED_ENVIRONMENT}`);
 if(job.name!=='repo.sandbox.public.readonly.v0')throw new Error(`UNSUPPORTED_WORK_JOB:${job.name}`);
 const context={company_id:job.company_id,engine_id:job.engine_id,environment:job.environment,version:job.version};
 const controller=new AbortController();let heartbeatTimer=null;let timeoutTimer=null;
 const handler=createRepoSandboxJobHandlerV1({workspace_root,image_ref});
 try{
  await dispatch(endpoint,'checkpoint-v1',{job_id:job.job_id,lease_id:job.lease_id,checkpoint:{stage:'WORKER_ACCEPTED',at:new Date().toISOString(),worker_id:lease.worker_id,environment:EXPECTED_ENVIRONMENT}},fetch_impl);
  heartbeatTimer=setInterval(()=>{void dispatch(endpoint,'heartbeat-v1',{job_id:job.job_id,lease_id:job.lease_id,extend_seconds:300},fetch_impl).catch(()=>controller.abort())},30_000);heartbeatTimer.unref?.();
  timeoutTimer=setTimeout(()=>controller.abort(),Math.min(Math.max(Number(job.timeout_ms||30000),1000),3600000));timeoutTimer.unref?.();
  const result=await handler({context,payload:job.payload,signal:controller.signal,heartbeat:()=>{},checkpoint:()=>{}});
  const completion=await dispatch(endpoint,'complete-v1',{job_id:job.job_id,lease_id:job.lease_id,result_summary:{...result,control_plane_environment:EXPECTED_ENVIRONMENT,prod_touched:false,trading_touched:false}},fetch_impl);
  return Object.freeze({ok:true,status:completion?.job?.status||'SUCCEEDED',job_id:job.job_id,exit_code:result.exit_code,command_hash:result.command_hash,evidence:result.evidence});
 }catch(error){
  await dispatch(endpoint,'fail-v1',{job_id:job.job_id,lease_id:job.lease_id,error_code:controller.signal.aborted?'WORK_ABORTED':'WORKER_FAILED',error_detail:String(error?.message||error).slice(0,2000),retryable:!controller.signal.aborted},fetch_impl).catch(()=>null);
  throw error;
 }finally{if(heartbeatTimer)clearInterval(heartbeatTimer);if(timeoutTimer)clearTimeout(timeoutTimer)}
}

async function main(){
 const result=await runOneJarvisWorkJobV1();
 console.log(JSON.stringify({ok:result.ok,status:result.status,job_id:result.job_id||null,exit_code:result.exit_code??null,command_hash:result.command_hash||null,evidence:result.evidence||null,environment:EXPECTED_ENVIRONMENT,secret_material_logged:false}));
 if(result.ok!==true&&!['NO_JOB'].includes(result.status))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const JARVIS_WORK_JOB_RUNNER_V1_CONTRACT=Object.freeze({
 schema_version:'1.1.0',environment:EXPECTED_ENVIRONMENT,supported_environments:['PREPROD','PROD'],authentication:'GITHUB_ACTIONS_OIDC',queue:'jarvis_work_job_v1',jobs:['repo.sandbox.public.readonly.v0'],
 sandbox:'DOCKER_CLI_OCI',network:'DENY',source:'PUBLIC_GITHUB_EXACT_SHA',secrets:'DENY',prod_mutation:false,trading_access:false,additional_cost_eur:0
});
