/** One-shot LAB-only Cloudflare API permission diagnostic.
 * Uses only the existing private CF_WORKERS_TOKEN and four allowlisted GET URLs.
 * Writes status codes to isolated LAB D1. No response bodies, secrets, headers or PII.
 * OFF by default; requires explicit probe flag and receipt emission disabled.
 */
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const ZONE='a00ec81375b4acb02f9bd6e0fd64942f';
const SCRIPT='cerebro-fact001-headless-operator-lab-20261111';
const ID='FACT001-P0B-PERMISSION-PROBE-20261116';
const ENDPOINTS=[
 '/accounts/'+ACCOUNT+'/workers/scripts?per_page=1',
 '/zones/'+ZONE+'/workers/routes',
 '/accounts/'+ACCOUNT+'/workers/domains',
 '/accounts/'+ACCOUNT+'/workers/scripts/'+SCRIPT+'/settings'
];
const STATUS_KEYS=['scripts_http','routes_http','domains_http','settings_http'];
export async function runFact001P0BPermissionProbeLabV0({env,fetchImpl=fetch,now=Date.now}={}){
 if(env?.FACT001_P0B_SCOPE_PROBE_ENABLED!=='true'||env?.FACT001_RECEIPTS_ENABLED!=='false')
  return {status:'OFF',provider_actions:0};
 if(typeof env.CF_WORKERS_TOKEN!=='string'||env.CF_WORKERS_TOKEN.length<24||
   typeof env.RECOVERY_DB?.prepare!=='function'||typeof fetchImpl!=='function'||typeof now!=='function')
  return {status:'BLOCKED_PRIVATE_BINDINGS',provider_actions:0};
 let started=false;
 try{
  const stamp=now();
  if(!Number.isSafeInteger(stamp)||stamp<=0)return {status:'BLOCKED_CLOCK',provider_actions:0};
  const ins=await env.RECOVERY_DB.prepare(
   "INSERT INTO fact001_p0b_permission_probe_lab_v0(id,state,started_at_ms) VALUES(?1,'STARTED',?2) "+
   "ON CONFLICT(id) DO NOTHING RETURNING id"
  ).bind(ID,stamp).first();
  if(ins?.id!==ID)return {status:'ALREADY_ATTEMPTED',provider_actions:0};
  started=true;
  const results=[];
  for(const path of ENDPOINTS){
   try{
    const response=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{
     method:'GET',headers:{Authorization:'Bearer '+env.CF_WORKERS_TOKEN,Accept:'application/json'},
     redirect:'manual',signal:AbortSignal.timeout(9000)});
    results.push(Number.isInteger(response?.status)&&response.status>=100&&response.status<=599?response.status:0);
   }catch{results.push(0);}
  }
  const done=await env.RECOVERY_DB.prepare(
   "UPDATE fact001_p0b_permission_probe_lab_v0 SET state='COMPLETE',scripts_http=?2,routes_http=?3,"+
   "domains_http=?4,settings_http=?5,finished_at_ms=?6 WHERE id=?1 AND state='STARTED' "+
   "RETURNING state"
  ).bind(ID,...results,now()).first();
  return {status:done?.state==='COMPLETE'?'PROBE_DONE_PRIVATE':'PROBE_PERSISTENCE_FAILED',
   provider_actions:0,provider_get_requests:4,logged_only_http_codes:true};
 }catch{
  return {status:started?'PROBE_FAILED_AFTER_START':'PROBE_FAILED_BEFORE_START',
   provider_actions:0,provider_get_requests:started?4:0};
 }
}
