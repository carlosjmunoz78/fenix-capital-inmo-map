/** Owner-verified GitHub Actions observation through existing read-only CEREBRO activity API.
 * Not JOB-001. Never relabel actual GitHub workflows as LAB jobs or imply engine execution.
 */
const ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/';
const REPOSITORY='carlosjmunoz78/fenix-capital-inmo-map';
const RUN_URL=/^https:\/\/github\.com\/carlosjmunoz78\/fenix-capital-inmo-map\/actions\/runs\/[0-9]+$/;
const SOURCE_STATES=new Set(['LIVE','CACHED']);
const RUN_STATES=new Set(['queued','in_progress','completed','waiting','requested','pending']);
const asString=(v,n=120)=>typeof v==='string'?v.slice(0,n):'';
const unavailable=(reason)=>({status:'UNAVAILABLE',source:'GITHUB_ACTIONS',source_status:'UNAVAILABLE',reason,runs:[],observed_at:null,provenance:'EXISTING_ACTIVITY_EDGE_NOT_JOB001'});
export function createGithubWorkActivityReaderV0({apiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof apiKey!=='string'||apiKey.length<12||apiKey.length>256)throw Error('PUBLISHABLE_KEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 return Object.freeze({
  source:'EXISTING_CEREBRO_ACTIVITY_EDGE_GITHUB_ACTIONS',
  async listForContext({company_id,environment,session_token}={}){
   if(company_id!=='fenix'||environment!=='LAB')throw Error('FENIX_LAB_ONLY');
   if(typeof session_token!=='string'||session_token.length<20||session_token.length>8192||/\s/.test(session_token))throw Error('SESSION_REQUIRED');
   let response;
   try{
    response=await fetchImpl(ENDPOINT,{method:'GET',headers:{authorization:'Bearer '+session_token,apikey:apiKey,accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8500)});
   }catch{return unavailable('SOURCE_NETWORK_UNAVAILABLE');}
   if(response.status!==200)return unavailable('SOURCE_HTTP_UNAVAILABLE');
   let raw;
   try{raw=await response.json();}catch{return unavailable('SOURCE_JSON_INVALID');}
   if(!raw||raw.status!=='OK'||raw.source!=='GITHUB_ACTIONS'||raw.repository!==REPOSITORY||!SOURCE_STATES.has(raw.source_status)||!Array.isArray(raw.runs))return unavailable('SOURCE_CONTRACT_MISMATCH');
   const observed_at=asString(raw.observed_at,50);
   if(!Number.isFinite(Date.parse(observed_at)))return unavailable('SOURCE_TIMESTAMP_INVALID');
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
