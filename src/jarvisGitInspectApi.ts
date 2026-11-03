import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';
import {fetchJarvisWorkJob,type JarvisRepoHead,type JarvisWorkJob} from './jarvisWorkApi';

export type JarvisGitInspectOperation='STATUS'|'DIFF'|'CI_READ'|'COMPARE';
export type JarvisGitActionResult={operation?:string;status?:string;executed?:boolean;authorized?:boolean;branch?:string;head_sha?:string;porcelain?:string;diff?:string;total_count?:number;checks?:Array<{name:string;status:string;conclusion:string|null;html_url?:string}>;files?:Array<{filename:string;status:string;additions:number;deletions:number;changes:number}>;[key:string]:unknown};
export type JarvisGitInspectJob=JarvisWorkJob;

type ApiResult<T>={status:number;data:T|null};
const GATEWAY=IS_PRODUCTION?'jarvis-git-gateway-v1':'jarvis-git-gateway-v1-preprod';

async function call<T>(path:string,body:unknown):Promise<ApiResult<T>>{
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null};
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/${GATEWAY}/${path.replace(/^\/+/, '')}`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const data=await response.json().catch(()=>null) as T|null;
  return{status:response.status,data};
 }catch{return{status:0,data:null}}
}

export function inspectJarvisGit(input:{operation:JarvisGitInspectOperation;expected_head_sha:string;staged?:boolean;base?:string;head?:string}){
 return call<{status?:string;job?:JarvisGitInspectJob;reason?:string}>('inspect',input);
}

export async function waitJarvisGitJob(jobId:string,onUpdate?:(job:JarvisGitInspectJob)=>void){
 for(let attempt=0;attempt<180;attempt+=1){
  const{status,data}=await fetchJarvisWorkJob(jobId);
  if(status===200&&data?.job){
   onUpdate?.(data.job);
   if(['SUCCEEDED','DEAD_LETTER','CANCELLED'].includes(data.job.status))return data.job;
  }
  await new Promise(resolve=>window.setTimeout(resolve,1000));
 }
 return null;
}

export function gitActions(job:JarvisGitInspectJob|null|undefined):JarvisGitActionResult[]{
 const actions=job?.result_summary?.actions;
 return Array.isArray(actions)?actions as JarvisGitActionResult[]:[];
}

export function gitHeadFromStatus(head:Partial<JarvisRepoHead>|null|undefined){return typeof head?.head_sha==='string'?head.head_sha:'';}
