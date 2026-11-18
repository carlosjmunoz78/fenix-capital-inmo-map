/** STATE-001 · Existing Supabase job-runtime evidence reader; owner session is verified
 * by the canonical gateway BEFORE invocation of this module. Never uses service-role
 * credentials in Vercel and cannot infer profile identity from engine/department.
 */
export const JOB_SOURCE_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-state001-jobs-readonly-canary';
const safeStatuses=new Set(['ACTIVO','FALLANDO','PARCIAL','POR_VERIFICAR']);
export function validateJobObservation(j){
 if(j?.schema!=='CEREBRO_STATE001_DB_JOB_OBSERVATION_V1'||j.company_id!=='fenix'||j.read_only!==true||
 j.privilege!=='CARLOS_ADMIN_ONLY'||!['OK','DEGRADED','UNAVAILABLE'].includes(j.source_health)||
 !Array.isArray(j.sources)||j.sources.length!==3||!Array.isArray(j.activity_events)||j.activity_events.length>100||
 j.profile_events_attributed!==0||!Number.isSafeInteger(j.observed_recent_events)||
 j.activity_events.some(x=>x.company_id!=='fenix'||!/^[A-Z0-9][A-Z0-9-]{2,25}$/.test(x.engine_id)||
 !safeStatuses.has(x.status)||x.profile_identity_attested!==false))
 throw Error('INVALID_JOB_SOURCE_CONTRACT');
 return{
  status:j.source_health,observed_at:j.observed_at,source_count:j.sources.length,
  sources:j.sources.map(x=>({source:x.source,status:x.status,recent:x.recent??null,latest_activity_at:x.latest_activity_at??null})),
  recent_job_events:j.observed_recent_events,profile_events_attributed:0,
  engine_events:j.activity_events.map(x=>({engine_id:x.engine_id,status:x.status,reason:x.reason,
    observed_at:x.observed_at,provider:'SUPABASE_JOBS',source:x.source})),
  meaning:'Owner-only real job runtime evidence; no profile_key in these tables, zero specialist execution attestations'
 };
}
let cache=null;
export async function readOwnerJobActivity(bearer,apikey,now=Date.now(),fetcher=fetch){
 if(cache&&now-cache.at<45_000)return cache.data;
 if(!/^Bearer\s+\S{20,8192}$/i.test(String(bearer))||!apikey)return {status:'UNAVAILABLE',reason:'MISSING_OWNER_SESSION'};
 try{
  const response=await fetcher(JOB_SOURCE_URL,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4500)});
  if(response.status!==200)throw Error('JOB_SOURCE_HTTP_'+response.status);
  const txt=await response.text();
  if(txt.length>60000)throw Error('JOB_SOURCE_TOO_LARGE');
  const result=validateJobObservation(JSON.parse(txt));
  cache={at:now,data:result};return result;
 }catch{return {status:'UNAVAILABLE',reason:'JOB_SOURCE_OR_OWNER_GATE_UNAVAILABLE',
  profile_events_attributed:0,recent_job_events:null,engine_events:[],sources:[]}}
}
export function resetJobCacheForTests(){cache=null}
