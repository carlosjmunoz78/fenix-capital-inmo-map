import {pathToFileURL} from 'node:url';
import {executeGitHubSafeAction} from './github-safe-native-v1.mjs';
import {createGitHubActionsSafeAdapterV1} from './github-actions-safe-adapter-v1.mjs';

const DEFAULT_ENDPOINT=process.env.JARVIS_GIT_DISPATCH_URL||'';
const DEFAULT_AUDIENCE='jarvis-git-worker-v1';
const MAX_ACTIONS=40;

function required(value,label,max=4096){if(typeof value!=='string'||!value.trim())throw new Error(`MISSING_${label}`);const out=value.trim();if(out.length>max||out.includes('\0'))throw new Error(`INVALID_${label}`);return out}
async function oidcToken({audience=process.env.JARVIS_GIT_OIDC_AUDIENCE||DEFAULT_AUDIENCE,fetch_impl=fetch}={}){const requestUrl=required(process.env.ACTIONS_ID_TOKEN_REQUEST_URL,'ACTIONS_ID_TOKEN_REQUEST_URL',8192);const requestToken=required(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,'ACTIONS_ID_TOKEN_REQUEST_TOKEN',32768);const url=new URL(requestUrl);url.searchParams.set('audience',audience);const response=await fetch_impl(url,{headers:{authorization:`Bearer ${requestToken}`},redirect:'error'});if(!response.ok)throw new Error(`GITHUB_OIDC_TOKEN_REQUEST_FAILED:${response.status}`);const body=await response.json();if(!body?.value)throw new Error('GITHUB_OIDC_TOKEN_MISSING');return body.value}
async function dispatch(endpoint,route,body={},fetch_impl=fetch){const token=await oidcToken({fetch_impl});const response=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(`JARVIS_GIT_${route.toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}`);return data}
function compactResult(result){const data=result?.result??{};const compact={operation:result.operation,status:result.status,executed:result.executed,authorized:result.authorized,reasons:result.reasons,receipt_hash:result.receipt_hash??null};for(const key of ['branch','head_sha','path','paths','created','dirty','discarded','staged','committed','pushed','force','exit_code','count','truncated','number','state','draft','html_url','total_count','status'])if(data[key]!==undefined)compact[key]=data[key];if(typeof data.porcelain==='string')compact.porcelain=data.porcelain.slice(0,20000);if(typeof data.diff==='string')compact.diff=data.diff.slice(0,100000);if(typeof data.content==='string')compact.content=data.content.slice(0,200000);if(Array.isArray(data.files))compact.files=data.files.slice(0,500);if(Array.isArray(data.matches))compact.matches=data.matches.slice(0,200);if(Array.isArray(data.checks))compact.checks=data.checks.slice(0,100);if(Array.isArray(data.reviews))compact.reviews=data.reviews.slice(0,100);return compact}

export async function runOneJarvisGitJobV1({endpoint=DEFAULT_ENDPOINT,cwd=process.cwd(),fetch_impl=fetch}={}){
 required(endpoint,'JARVIS_GIT_DISPATCH_URL');
 const lease=await dispatch(endpoint,'lease-v1',{lease_seconds:600},fetch_impl);const job=lease?.job;if(!job)return Object.freeze({ok:true,status:'NO_JOB'});
 if(job.environment!=='PREPROD'||job.name!=='git.safe.v1')throw new Error('UNSUPPORTED_GIT_JOB');
 const actions=job.payload?.actions;if(!Array.isArray(actions)||actions.length===0||actions.length>MAX_ACTIONS)throw new Error('ACTIONS_REQUIRED');
 const adapter=createGitHubActionsSafeAdapterV1({cwd});let heartbeatTimer=null;let lastCommitSha=null;const results=[];
 try{
  heartbeatTimer=setInterval(()=>{void dispatch(endpoint,'heartbeat-v1',{job_id:job.job_id,lease_id:job.lease_id,extend_seconds:600},fetch_impl).catch(()=>null)},45_000);heartbeatTimer.unref?.();
  await dispatch(endpoint,'checkpoint-v1',{job_id:job.job_id,lease_id:job.lease_id,checkpoint:{stage:'GIT_WORKER_ACCEPTED',action_count:actions.length,at:new Date().toISOString(),worker_id:lease.worker_id}},fetch_impl);
  for(let index=0;index<actions.length;index+=1){
   const current=await adapter.STATUS({});
   const raw={...actions[index]};
   if(raw.expected_head_sha==='$CURRENT_HEAD')raw.expected_head_sha=current.head_sha;
   if(raw.revert_of_sha==='$LAST_COMMIT'){if(!lastCommitSha)throw new Error('LAST_COMMIT_NOT_AVAILABLE');raw.revert_of_sha=lastCommitSha}
   const result=await executeGitHubSafeAction(raw,adapter);
   if(result.status==='DENIED'||result.executed!==true)throw new Error(`GIT_ACTION_NOT_EXECUTED:${raw.operation}:${(result.reasons||[]).join(',')||result.next_gate||'UNKNOWN'}`);
   const compact=compactResult(result);results.push(compact);
   if(['COMMIT','COMMIT_FILE'].includes(raw.operation)&&compact.head_sha)lastCommitSha=compact.head_sha;
   await dispatch(endpoint,'checkpoint-v1',{job_id:job.job_id,lease_id:job.lease_id,checkpoint:{stage:'GIT_ACTION_COMPLETE',index,operation:raw.operation,receipt_hash:result.receipt_hash,branch:compact.branch??null,head_sha:compact.head_sha??null,at:new Date().toISOString()}},fetch_impl);
  }
  const finalStatus=await adapter.STATUS({});
  const summary={status:'GIT_SAFE_PREPROD_GREEN',actions:results,final_branch:finalStatus.branch,final_head_sha:finalStatus.head_sha,final_porcelain:finalStatus.porcelain,secret_material_logged:false,prod_touched:false,trading_touched:false,additional_cost_eur:0};
  const completion=await dispatch(endpoint,'complete-v1',{job_id:job.job_id,lease_id:job.lease_id,result_summary:summary},fetch_impl);
  return Object.freeze({ok:true,status:completion?.job?.status||'SUCCEEDED',job_id:job.job_id,final_branch:finalStatus.branch,final_head_sha:finalStatus.head_sha,actions:results.length});
 }catch(error){await dispatch(endpoint,'fail-v1',{job_id:job.job_id,lease_id:job.lease_id,error_code:'GIT_SAFE_WORKER_FAILED',error_detail:String(error?.message||error).slice(0,3000),retryable:false},fetch_impl).catch(()=>null);throw error}
 finally{if(heartbeatTimer)clearInterval(heartbeatTimer)}
}

async function main(){const result=await runOneJarvisGitJobV1();console.log(JSON.stringify({ok:result.ok,status:result.status,job_id:result.job_id||null,final_branch:result.final_branch||null,final_head_sha:result.final_head_sha||null,actions:result.actions??0,secret_material_logged:false}));if(result.ok!==true&&result.status!=='NO_JOB')process.exitCode=1}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const JARVIS_GIT_JOB_RUNNER_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',environment:'PREPROD',authentication:'GITHUB_ACTIONS_OIDC',credential:'EPHEMERAL_GITHUB_TOKEN',queue:'jarvis_work_job_v1/name=git.safe.v1',max_actions:MAX_ACTIONS,protected_branches:['main','master','emergency-pages','cerebro/jarvis-interface-v1-20261102'],prod_authorized:false,trading_access:false,additional_cost_eur:0});