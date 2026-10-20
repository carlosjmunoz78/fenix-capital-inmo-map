import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';

const CANONICAL_ACTIVITY_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/';
const RAW_ACTIVITY_URL=(import.meta.env.VITE_CEREBRO_ACTIVITY_URL as string|undefined)?.trim()||CANONICAL_ACTIVITY_URL;

export type CerebroActivityStatus='queued'|'in_progress'|'completed'|'waiting'|'requested'|'pending'|string;
export type CerebroProgressProvenance='REAL_GITHUB_JOBS'|'TERMINAL_STATUS'|'UNAVAILABLE';

export type CerebroActivityRun={
  run_id:number;
  workflow_name:string;
  workflow_alias:string;
  workflow_path:string;
  status:CerebroActivityStatus;
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
};

export type CerebroActivityFailedStep={
  job_name:string;
  step_name:string;
  step_number:number|null;
  conclusion:string|null;
};

export type CerebroActivityRunDetail={
  run_id:number;
  status:string;
  conclusion:string|null;
  started_at:string|null;
  completed_at:string|null;
  duration_ms:number|null;
  failed_job:string|null;
  failed_step:string|null;
  failure_summary:string|null;
  failed_steps:CerebroActivityFailedStep[];
  jobs:Array<{
    name:string;
    status:string;
    conclusion:string|null;
    started_at:string|null;
    completed_at:string|null;
    html_url:string;
  }>;
};

export type CerebroActivityResponse={
  status:'OK'|'ERROR';
  observed_at:string;
  source:'GITHUB_ACTIONS';
  source_status:'LIVE'|'CACHED'|'UNAVAILABLE';
  repository:string;
  runs:CerebroActivityRun[];
  reason?:string;
};

export type CerebroActivityRunDetailResponse={
  status:'OK'|'ERROR';
  observed_at:string;
  source:'GITHUB_ACTIONS';
  repository:string;
  run_detail?:CerebroActivityRunDetail;
  reason?:string;
};

function activityEndpoint(){
  try{
    const url=new URL(RAW_ACTIVITY_URL);
    if(url.protocol!=='https:')return null;
    if(!url.pathname.endsWith('/'))url.pathname=`${url.pathname}/`;
    return url;
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
    const response=await fetch(endpoint.toString(),{method:'GET',headers,cache:'no-store'});
    let data:CerebroActivityResponse|null=null;
    try{data=await response.json() as CerebroActivityResponse}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}

export async function fetchCerebroActivityRunDetail(runId:number):Promise<{status:number;data:CerebroActivityRunDetailResponse|null}>{
  const endpoint=activityEndpoint();
  if(!endpoint||!Number.isSafeInteger(runId)||runId<=0)return{status:0,data:null};
  endpoint.searchParams.set('run_id',String(runId));
  const headers=await authHeaders();
  if(!headers)return{status:401,data:null};
  try{
    const response=await fetch(endpoint.toString(),{method:'GET',headers,cache:'no-store'});
    let data:CerebroActivityRunDetailResponse|null=null;
    try{data=await response.json() as CerebroActivityRunDetailResponse}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}
