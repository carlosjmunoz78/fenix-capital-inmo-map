import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type JobGroup={
 source:'JARVIS_WORK'|'BROWSER_V2'|'CREATIVE_V1';
 environment:'LAB'|'PREPROD';engine_id:string;status:string;records:number;
 latest_updated_at:string|null;created_24h_count:number;heartbeat_5m_count:number;
 heartbeat_24h_count:number;unexpired_lease_count:number;stale_queued_24h_count:number;
};
export type JobLiveSnapshot={
 status:'OK';source:'FENIX_LAB_AGENT_JOB_AGGREGATE_V1';
 company_id:'fenix';environment:'LAB';observed_at:string;read_only:true;executed:false;
 agent_identity_verified:false;active_agent_count:null;active_subagent_count:null;active_job_count:null;
 independent_worker_heartbeat_verified:false;source_semantics:'HISTORICAL_JOB_RECORDS_IN_LAB_PROJECT';
 groups:JobGroup[];source_totals:{source:JobGroup['source'];total_rows:number;last_updated_at:string|null}[];
 attention_groups:(JobGroup&{priority_suggestion:string})[];
 cost_metrics:{source:'BROWSER_WORKER_METRIC_V2';total_samples:number;cost_samples:number;
  recorded_incremental_cost_eur:number|null;overall_infrastructure_cost_eur:null;
  duration_samples:number;p50_duration_seconds:number|null;p90_duration_seconds:number|null;
  last_observation_at:string|null;warning:string};
};
export type JobLiveResult={kind:'ready';data:JobLiveSnapshot;reason:''}|
 {kind:'unavailable'|'denied';data:null;reason:string};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const fail=(kind:'unavailable'|'denied',reason:string):JobLiveResult=>({kind,data:null,reason});
const known=new Set(['FENIX_LAB_AGENT_JOB_AGGREGATE_V1']);
function isValid(x:unknown):x is JobLiveSnapshot{
 if(!x||typeof x!=='object')return false;
 const p=x as Record<string,unknown>;
 return p.status==='OK'&&known.has(String(p.source))&&p.company_id==='fenix'&&p.environment==='LAB'&&
 p.read_only===true&&p.executed===false&&p.agent_identity_verified===false&&
 p.active_agent_count===null&&p.active_subagent_count===null&&p.active_job_count===null&&
 p.independent_worker_heartbeat_verified===false&&
 p.source_semantics==='HISTORICAL_JOB_RECORDS_IN_LAB_PROJECT'&&
 typeof p.observed_at==='string'&&Number.isFinite(Date.parse(p.observed_at))&&
 Date.now()-Date.parse(p.observed_at)<180000&&Date.parse(p.observed_at)<=Date.now()+60000&&
 Array.isArray(p.groups)&&p.groups.length<=60&&Array.isArray(p.attention_groups)&&
 Array.isArray(p.source_totals)&&p.source_totals.length===3&&
 !!p.cost_metrics&&typeof p.cost_metrics==='object';
}
export async function readJobFleetLive(signal?:AbortSignal):Promise<JobLiveResult>{
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||
  new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')
  return fail('denied','PREVIEW_ONLY');
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return fail('denied','OWNER_SESSION_REQUIRED');
  const r=await fetch('/api/cerebro-agent-job-live?company_id=fenix',{method:'GET',
   headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'},
   signal,cache:'no-store'});
  const obj:unknown=await r.json().catch(()=>null);
  if(r.status===401||r.status===403)return fail('denied','OWNER_NOT_AUTHORIZED');
  if(r.status!==200)return fail('unavailable','LAB_JOB_SOURCE_UNAVAILABLE');
  return isValid(obj)?{kind:'ready',data:obj,reason:''}:fail('unavailable','SOURCE_CONTRACT_INVALID');
 }catch{return fail('unavailable',signal?.aborted?'REQUEST_ABORTED':'LAB_JOB_SOURCE_UNREACHABLE')}
}
