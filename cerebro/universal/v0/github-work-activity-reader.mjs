/** Owner-verified GitHub Actions observation through existing read-only CEREBRO activity API.
 * Not JOB-001. Never relabel actual GitHub workflows as LAB jobs or imply engine execution.
 */
const ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/';
const REPOSITORY='carlosjmunoz78/fenix-capital-inmo-map';
const PUBLIC_GITHUB_ACTIONS_URL='https://api.github.com/repos/'+REPOSITORY+'/actions/runs?per_page=30';
const RUN_URL=/^https:\/\/github\.com\/carlosjmunoz78\/fenix-capital-inmo-map\/actions\/runs\/[0-9]+$/;
const SOURCE_STATES=new Set(['LIVE','CACHED']);
const RUN_STATES=new Set(['queued','in_progress','completed','waiting','requested','pending']);
const asString=(v,n=120)=>typeof v==='string'?v.slice(0,n):'';
const unavailable=(reason)=>({status:'UNAVAILABLE',source:'GITHUB_ACTIONS',source_status:'UNAVAILABLE',reason,runs:[],observed_at:null,provenance:'EXISTING_ACTIVITY_EDGE_NOT_JOB001'});
// One deterministic metadata-only public GitHub request, used only if the
// owner-authenticated existing Activity source has degraded. Repository is public.
// No GitHub token, no second queue, no workflow dispatch and no polling.
async function readPublicGitHubActionsOnce({fetchImpl}){
 let response;
 try{
  response=await fetchImpl(PUBLIC_GITHUB_ACTIONS_URL,{
   method:'GET',headers:{accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'cerebro-universal-lab-read-fallback'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)
  });
 }catch{return unavailable('BOTH_SOURCES_NETWORK_UNAVAILABLE');}
 if(response.status!==200)return unavailable('PUBLIC_GITHUB_REST_UNAVAILABLE');
 let data;try{data=await response.json();}catch{return unavailable('PUBLIC_GITHUB_REST_INVALID_JSON');}
 if(!data||!Array.isArray(data.workflow_runs)||!Number.isSafeInteger(data.total_count)||data.total_count<0)return unavailable('PUBLIC_GITHUB_REST_SCHEMA_INVALID');
 const stamp=new Date().toISOString(),runs=[];
 for(const item of data.workflow_runs.slice(0,30)){
  if(!item||!Number.isSafeInteger(item.id)||item.id<1||!RUN_URL.test(item.html_url||''))continue;
  const status=asString(item.status,24);
  if(!RUN_STATES.has(status))continue;
  const rawName=asString(item.name,120),rawPath=asString(item.path,130);
  const engine=rawName.match(/\b([A-Z][A-Z0-9]{1,15}-\d{3})\b/)?.[1]||null;
  const text=(rawName+' '+rawPath).toUpperCase();
  const env=text.includes('PREPROD')||text.includes('STAGING')?'PREPROD':text.includes('PROD')||text.includes('LIVE')?'PROD':text.includes('LAB')?'LAB':'UNKNOWN';
  runs.push({
   run_id:item.id,engine_id:engine,workflow_name:rawName,status,
   conclusion:asString(item.conclusion,30)||null,
   environment:env,version:asString(item.head_sha,12)||'UNKNOWN',html_url:item.html_url,
   progress_percent:null,running_jobs:null,queued_jobs:null,
   jobs_provenance:'UNAVAILABLE',observed_at:stamp,source:'GITHUB_ACTIONS',
   provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',
   environment_provenance:'DERIVED_WORKFLOW_NAME',
   origin_environment:env
  });
 }
 return {status:'OK',source:'GITHUB_ACTIONS',source_status:'LIVE',observed_at:stamp,
  repository:REPOSITORY,runs,sample_limited:true,job001_connected:false,
  activity_provenance:'PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK',
  source_warning:'Existing activity feed unavailable: this is a limited public workflow run sample, no job-step telemetry'};
}
export function createGithubWorkActivityReaderV0({apiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof apiKey!=='string'||apiKey.length<12||apiKey.length>256)throw Error('PUBLISHABLE_KEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 return Object.freeze({
  source:'EXISTING_CEREBRO_ACTIVITY_EDGE_GITHUB_ACTIONS',
  async listForContext({company_id,environment,session_token}={}){
   const fallbackOnce=()=>readPublicGitHubActionsOnce({fetchImpl});
   if(company_id!=='fenix'||environment!=='LAB')throw Error('FENIX_LAB_ONLY');
   if(typeof session_token!=='string'||session_token.length<20||session_token.length>8192||/\s/.test(session_token))throw Error('SESSION_REQUIRED');
   let response;
   try{
    response=await fetchImpl(ENDPOINT,{method:'GET',headers:{authorization:'Bearer '+session_token,apikey:apiKey,accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8500)});
   }catch{return fallbackOnce();}
   if(response.status!==200)return fallbackOnce();
   let raw;
   try{raw=await response.json();}catch{return fallbackOnce();}
   if(!raw||raw.status!=='OK'||raw.source!=='GITHUB_ACTIONS'||raw.repository!==REPOSITORY||!SOURCE_STATES.has(raw.source_status)||!Array.isArray(raw.runs))return fallbackOnce();
   const observed_at=asString(raw.observed_at,50);
   if(!Number.isFinite(Date.parse(observed_at)))return fallbackOnce();
   const runs=[];
   for(const r of raw.runs.slice(0,60)){
    if(!r||r.company_id!=='fenix'||r.source!=='GITHUB_ACTIONS'||r.provenance!=='REAL')continue;
    if(!Number.isSafeInteger(r.run_id)||r.run_id<=0||!RUN_URL.test(r.html_url||''))continue;
    const status=asString(r.status,24);
    if(!RUN_STATES.has(status))continue;
    const engine_id=/^[A-Za-z0-9-]{2,100}$/.test(r.engine_id||'')?r.engine_id:null;
    runs.push({
     run_id:r.run_id,engine_id,workflow_name:asString(r.workflow_name,120),
     status,conclusion:asString(r.conclusion,40)||null,
     environment:asString(r.environment,32)||'UNKNOWN',version:asString(r.version,60)||'UNKNOWN',
     html_url:r.html_url,
     progress_percent:r.progress_provenance==='REAL_GITHUB_JOBS'&&Number.isFinite(r.progress_percent)?Math.min(100,Math.max(0,Math.round(r.progress_percent))):null,
     running_jobs:r.jobs_provenance==='REAL_GITHUB_JOBS'&&Number.isSafeInteger(r.running_jobs)&&r.running_jobs>=0?r.running_jobs:null,
     queued_jobs:r.jobs_provenance==='REAL_GITHUB_JOBS'&&Number.isSafeInteger(r.queued_jobs)&&r.queued_jobs>=0?r.queued_jobs:null,
     jobs_provenance:r.jobs_provenance==='REAL_GITHUB_JOBS'?'REAL_GITHUB_JOBS':'UNAVAILABLE',
     observed_at,source:'GITHUB_ACTIONS',provenance:'REAL',origin_environment:asString(r.environment,32)||'UNKNOWN'
    });
    if(runs.length>=40)break;
   }
   return {status:'OK',source:'GITHUB_ACTIONS',source_status:raw.source_status,
    observed_at,repository:REPOSITORY,runs,sample_limited:true,
    job001_connected:false,activity_provenance:'EXISTING_ACTIVITY_EDGE_GITHUB_ACTIONS'};
  }
 });
}
