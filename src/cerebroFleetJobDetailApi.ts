import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type JobDetail={
 status:'FAILED_STEP_VERIFIED'|'FAILED_JOB_STEP_UNKNOWN';
 source:'GITHUB_ACTIONS_PUBLIC_JOB_METADATA';repo:string;run_id:number;job_id:number;
 job_name:string;failed_step_number:number|null;failed_step_name:string|null;
 evidence_url:string;engine_id:null;agent_id:null;subagent_id:null;
 runtime_failure_verified:false;executed:false;
};
export type JobDetailRead={kind:'ready'|'unavailable'|'denied';reason:string;data:JobDetail|null};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const REPOS=new Set(['fenix-capital-inmo-map','capital-mapa-pro']);
const failed=(kind:'unavailable'|'denied',reason:string):JobDetailRead=>({kind,reason,data:null});
export async function readFailedJobDetail(repo:string,run_id:number):Promise<JobDetailRead>{
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||
  new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')
  return failed('denied','PREVIEW_ONLY');
 if(!REPOS.has(repo)||!Number.isSafeInteger(run_id)||run_id<=0)return failed('denied','TARGET_NOT_ALLOWLISTED');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return failed('denied','OWNER_SESSION_REQUIRED');
 try{
  const query=new URLSearchParams({company_id:'fenix',repo,run_id:String(run_id)});
  const result=await fetch('/api/cerebro-fleet-job-detail?'+query.toString(),{
   method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,
    apikey:SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'}});
  if(result.status===401||result.status===403)return failed('denied','OWNER_DENIED');
  const raw:unknown=await result.json().catch(()=>null);
  if(result.status!==200)return failed('unavailable',
   typeof raw==='object'&&raw!==null&&'reason'in raw&&typeof raw.reason==='string'?
   raw.reason:'GITHUB_JOBS_NOT_AVAILABLE');
  if(!raw||typeof raw!=='object')return failed('unavailable','JOB_DETAIL_CONTRACT_INVALID');
  const s=raw as Record<string,unknown>;
  const expected='https://github.com/carlosjmunoz78/'+repo+'/actions/runs/'+run_id+'/job/';
  if(s.status!=='OK'||s.company_id!=='fenix'||s.environment!=='LAB'||s.owner_verified!==true||
   s.read_only!==true||s.executed!==false||
   !['FAILED_STEP_VERIFIED','FAILED_JOB_STEP_UNKNOWN'].includes(String(s.job_status||''))) {
   // Endpoint returns its normalized job status in the job evidence itself; it is overwritten
   // by the envelope status OK, so the transport must expose a distinct job_status field.
   return failed('unavailable','JOB_DETAIL_CONTRACT_INVALID');
  }
  const item=s as Record<string,unknown>;
  const status=item.job_status;
  if(item.source!=='GITHUB_ACTIONS_PUBLIC_JOB_METADATA'||item.repo!=='carlosjmunoz78/'+repo||
   item.run_id!==run_id||!Number.isSafeInteger(item.job_id)||Number(item.job_id)<=0||
   item.engine_id!==null||item.agent_id!==null||item.subagent_id!==null||
   item.runtime_failure_verified!==false||
   typeof item.job_name!=='string'||item.job_name.length>100||
   typeof item.evidence_url!=='string'||item.evidence_url!==expected+item.job_id||
   (status==='FAILED_STEP_VERIFIED'?
    !(Number.isSafeInteger(item.failed_step_number)&&Number(item.failed_step_number)>0&&
     typeof item.failed_step_name==='string'&&item.failed_step_name.length>0&&item.failed_step_name.length<=100):
    item.failed_step_number!==null||item.failed_step_name!==null))
   return failed('unavailable','JOB_DETAIL_CONTRACT_INVALID');
  const data:JobDetail={
   status:status as JobDetail['status'],source:'GITHUB_ACTIONS_PUBLIC_JOB_METADATA',
   repo:item.repo as string,run_id,job_id:item.job_id as number,
   job_name:item.job_name,failed_step_number:item.failed_step_number as number|null,
   failed_step_name:item.failed_step_name as string|null,
   evidence_url:item.evidence_url,engine_id:null,agent_id:null,subagent_id:null,
   runtime_failure_verified:false,executed:false};
  return {kind:'ready',reason:'',data};
 }catch{return failed('unavailable','JOB_DETAIL_NETWORK_UNAVAILABLE')}
}
