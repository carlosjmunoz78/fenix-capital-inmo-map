/** STATE-001 · Provider inventory projection, no runtime claims.
 * Public feed carries only sanitized totals, never resource names or customer data.
 * API reads this after normal owner authorization, and fails closed on stale sources.
 */
export const PROVIDER_SCHEMA='CEREBRO_PROVIDER_DISCOVERY_V1';
export const URL='https://raw.githubusercontent.com/carlosjmunoz78/fenix-capital-inmo-map/cerebro/state001-provider-feed-20261118/cerebro/state001/provider-discovery.v1.json';
const maxAge=2*60*60*1000;
export function validateProviderDiscovery(doc,now=Date.now()){
 if(!doc||doc.schema!==PROVIDER_SCHEMA||doc.company_id!=='fenix'||doc.canonical_engines!==179||
 doc.read_only!==true||doc.no_runtime_execution_claim!==true||!Array.isArray(doc.engine_candidates))
 throw Error('PROVIDER_FEED_INVALID');
 const c=doc.providers?.cloudflare,s=doc.providers?.supabase;
 const ct=Date.parse(c?.observed_at||doc.generated_at),st=Date.parse(s?.observed_at||doc.generated_at);
 if(!Number.isFinite(ct)||!Number.isFinite(st)||now-ct< -120000||now-st< -120000||
 !Number.isSafeInteger(c.worker_scripts_total)||c.worker_scripts_total<0||c.worker_scripts_total>5000||
 !Number.isSafeInteger(s.edge_functions_total)||s.edge_functions_total<0||s.edge_functions_total>5000||
 doc.engine_candidates.some(x=>!/^[A-Z0-9][A-Z0-9-]{2,25}$/.test(x.engine_id)||
 !Number.isSafeInteger(x.cloudflare_worker_count)||!Number.isSafeInteger(x.supabase_function_count)||
 x.cloudflare_worker_count<0||x.supabase_function_count<0))throw Error('PROVIDER_FEED_COUNT_OR_DATE_INVALID');
 const recentCf=now-ct<=maxAge,recentS=now-st<=maxAge;
 return{
  status:recentCf&&recentS?'FRESH':recentCf||recentS?'PARTIAL':'STALE',
  observed_at:doc.generated_at,
  sources:{
   cloudflare:{status:recentCf?'FRESH':'STALE',observed_at:new Date(ct).toISOString(),
    total:c.worker_scripts_total,lab_named:c.lab_named??null},
   supabase:{status:recentS?'FRESH':'STALE',observed_at:new Date(st).toISOString(),
    total:s.edge_functions_total,active_deployed:s.active_deployed??null,lab_named:s.lab_named??null}
  },
  engine_candidates_count:doc.engine_candidates.length,
  candidate_links:doc.engine_candidates.map(x=>({
    engine_id:x.engine_id,cloudflare_worker_count:x.cloudflare_worker_count,
    supabase_function_count:x.supabase_function_count,attestation:'NAME_CANDIDATE_ONLY'
  })),
  runtime_activity_verified:false,profiles_running_verified:0,
  semantics:'Provider resource exists, NOT proof of running engine or agent'
 };
}
let cache=null;
export async function readProviderDiscovery(now=Date.now(),fetcher=fetch){
 if(cache&&now-cache.at<45_000)return cache.data;
 try{
  const response=await fetcher(URL,{method:'GET',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(4500),headers:{accept:'application/json'}});
  if(response.status!==200)throw Error('PROVIDER_FEED_HTTP_'+response.status);
  const body=await response.text();
  if(body.length>50000)throw Error('PROVIDER_FEED_TOO_BIG');
  const parsed=validateProviderDiscovery(JSON.parse(body),now);
  cache={at:now,data:parsed};return parsed;
 }catch{
  const unavailable={status:'UNAVAILABLE',sources:{cloudflare:{status:'UNAVAILABLE'},
    supabase:{status:'UNAVAILABLE'}},engine_candidates_count:0,candidate_links:[],
   runtime_activity_verified:false,profiles_running_verified:0,semantics:'Provider inventory unavailable, no statuses inferred'};
  cache={at:now,data:unavailable};return unavailable;
 }
}
export function resetProviderCacheForTests(){cache=null}
