// FACT001 read-only credential diagnostic. Do not log, expose, or return secrets.
// Deploy temporarily as its own version, inheriting BOTH existing bindings in strict mode.
// This version never performs Worker create/update/delete.
export const PROBE_ID='FACT001-CF-TOKEN-READONLY-20261111-001';
export const CF_ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const URL='https://api.cloudflare.com/client/v4/accounts/'+CF_ACCOUNT+'/workers/scripts';
export async function diagnose(env,time=Date.now(),fetchFn=fetch){
 if(!env?.RECOVERY_DB||!Number.isSafeInteger(time))return{status:'RUNTIME_DENIED'};
 const db=env.RECOVERY_DB;
 const mark=await db.prepare("UPDATE fact001_cf_token_probe_20261111 SET state='RUNNING',attempts=1 WHERE id=?1 AND state='QUEUED' AND attempts=0 RETURNING id").bind(PROBE_ID).first();
 if(!mark)return {status:'NO_QUEUED_PROBE'};
 let httpCode=0,code='UNKNOWN';
 const credential=env.CF_WORKERS_TOKEN;
 if(typeof credential!=='string'||credential.length<24)code='MISSING_OR_MALFORMED_CREDENTIAL';
 else try {
   const response=await fetchFn(URL,{method:'GET',headers:{Authorization:'Bearer '+credential,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(14000)});
   httpCode=response.status;
   code=response.status===200?'CLOUDFARE_READ_HTTP_200':response.status===401?'TOKEN_REJECTED_401':response.status===403?'PERMISSION_DENIED_403':response.status===429?'RATE_LIMIT_429':'UPSTREAM_HTTP_'+response.status;
 }catch(e){
   const msg=e instanceof Error?e.name:'';
   code=msg==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_FETCH_FAILED';
 }
 const state=code==='CLOUDFARE_READ_HTTP_200'?'VERIFIED':'DENIED';
 const result=await db.prepare("UPDATE fact001_cf_token_probe_20261111 SET state=?2,code=?3,http_status=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING state,attempts").bind(PROBE_ID,state,code,httpCode,time).first();
 if(!result)throw Error('PROBE_AUDIT_NOT_PERSISTED');
 return {status:result.state,attempts:result.attempts}; 
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});},
 async scheduled(controller,env,ctx){ctx.waitUntil(diagnose(env,controller.scheduledTime));}
};
