import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';

const CANONICAL_ACTIVITY_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/';
const RAW_ACTIVITY_URL=(import.meta.env.VITE_CEREBRO_ACTIVITY_URL as string|undefined)?.trim()||CANONICAL_ACTIVITY_URL;

export type CerebroActivityStatus='queued'|'in_progress'|'completed'|'waiting'|'requested'|'pending'|string;
export type CerebroProgressProvenance='REAL_GITHUB_JOBS'|'TERMINAL_STATUS'|'UNAVAILABLE';
export type CerebroJobsProvenance='REAL_GITHUB_JOBS'|'UNAVAILABLE';

export type CerebroActivityRun={
  run_id:number;
  workflow_name:string;
  workflow_alias:string;
  workflow_path:string;
  status:CerebroActivityStatus;
  parent_status?:CerebroActivityStatus;
  conclusion:string|null;
  event:string;
  html_url:string;
  created_at:string;
  run_started_at:string|null;
  updated_at:string;
  engine_id:string|null;
  company_id:string;
  environment:string;
  version:string;
  source:'GITHUB_ACTIONS';
  provenance:'REAL';
  company_provenance:'DERIVED_REPOSITORY_SCOPE';
  alias_provenance:'ENGINE_ID'|'DERIVED_WORKFLOW_NAME';
  progress_percent:number|null;
  progress_completed_steps:number|null;
  progress_total_steps:number|null;
  current_step:string|null;
  next_step:string|null;
  progress_provenance:CerebroProgressProvenance;
  running_jobs?:number|null;
  queued_jobs?:number|null;
  completed_jobs?:number|null;
  total_jobs?:number|null;
  jobs_provenance?:CerebroJobsProvenance;
};

export type CerebroActivityTotals={
  running_observed:number;
  queued_observed:number;
  active_observed:number;
  provenance:'GITHUB_ACTION_RUN_TOTALS';
  semantics:'LOWER_BOUND_PHYSICAL_JOBS';
};

export type CerebroActivityResponse={
  status:'OK'|'ERROR';
  observed_at:string;
  source:'GITHUB_ACTIONS';
  source_status:'LIVE'|'CACHED'|'UNAVAILABLE';
  repository:string;
  runs:CerebroActivityRun[];
  physical_totals?:CerebroActivityTotals;
  reason?:string;
};

function activityEndpoint(){
  try{
    const url=new URL(RAW_ACTIVITY_URL);
    if(url.protocol!=='https:')return null;
    if(!url.pathname.endsWith('/'))url.pathname=`${url.pathname}/`;
    return url.toString();
  }catch{return null}
}

async function authHeaders(){
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return null;
  return{
    Authorization:`Bearer ${token}`,
    apikey:SUPABASE_PUBLISHABLE_KEY,
    'content-type':'application/json'
  };
}

export async function fetchCerebroActivity():Promise<{status:number;data:CerebroActivityResponse|null}>{
  const endpoint=activityEndpoint();
  if(!endpoint)return{status:0,data:null};
  const headers=await authHeaders();
  if(!headers)return{status:401,data:null};
  try{
    const response=await fetch(endpoint,{method:'GET',headers,cache:'no-store'});
    let data:CerebroActivityResponse|null=null;
    try{data=await response.json() as CerebroActivityResponse}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}
