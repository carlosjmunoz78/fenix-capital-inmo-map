// FACT001 deterministic Vercel LAB via existing private Cloudflare runtime.
// No Vercel token -> no claim and zero Vercel requests. Secret is only read at runtime.
import {executeOrder} from './vercel/operator.mjs';
export const VERCEL_SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.1.0'});
function cleanError(e){
 const value=e instanceof Error?e.message:'';
 return /^VERCEL_HTTP_(400|401|403|404|408|409|429|500|502|503|504)$/.test(value)?value:
  ['VERCEL_LAB_SCOPE_DENIED','VERCEL_LAB_EXTRA_FIELDS_DENIED','VERCEL_SSO_NO_DEPLOYMENT_GATE','VERCEL_PROJECT_IDENTITY_DRIFT','VERCEL_UNEXPECTED_LIVE_DEPLOYMENT','VERCEL_POSTWRITE_MISMATCH','VERCEL_BASELINE_WRONG','VERCEL_SECRET_NOT_CONFIGURED'].includes(value)?value:'VERCEL_UNKNOWN_ERROR';
}
const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
export async function vercelTick(env,time=Date.now()){
 if(!env?.RECOVERY_DB||!Number.isSafeInteger(time))return{status:'VERCEL_D1_UNAVAILABLE'};
 const token=env.VERCEL_API_TOKEN;
 if(typeof token!=='string'||token.length<24||/\s/.test(token))return{status:'VERCEL_SECRET_NOT_CONFIGURED'};
 const db=env.RECOVERY_DB;
 const j=await stmt(db,
  "UPDATE fact001_vercel_jobs_v1 SET state='RUNNING',attempts=attempts+1,updated_at_ms=?1 WHERE id=(SELECT id FROM fact001_vercel_jobs_v1 WHERE state='QUEUED' AND attempts=0 ORDER BY created_at_ms,id LIMIT 1) AND state='QUEUED' AND attempts=0 RETURNING id,company_id,engine_id,environment,version,provider,team_id,project_id,project_name,operation,max_cost_eur,request_id,idempotency_key,state,attempts",time).first();
 if(!j)return{status:'IDLE'};
 let status='RECONCILE',phase='UNVERIFIED',error=null;
 try {
  if(j.state!=='RUNNING'||j.attempts!==1)throw Error('VERCEL_LAB_SCOPE_DENIED');
  const order=Object.fromEntries(['company_id','engine_id','environment','version','provider','team_id','project_id','project_name','operation','max_cost_eur','request_id','idempotency_key'].map(k=>[k,j[k]]));
  const result=await executeOrder(order,token);
  if(!['COMPLETED','VERIFIED','VERIFIED_EMPTY_LAB_DEPLOYMENTS'].includes(result.status))throw Error('VERCEL_POSTWRITE_MISMATCH');
  status='COMPLETED';phase=result.status;
 }catch(e){error=cleanError(e);}
 const done=await stmt(db,"UPDATE fact001_vercel_jobs_v1 SET state=?2,phase=?3,error_code=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING id,state,attempts",j.id,status,phase,error,time).first();
 if(done?.id!==j.id)throw Error('VERCEL_AUDIT_NOT_PERSISTED');
 await stmt(db,"INSERT INTO fact001_vercel_events_v1(job_id,state,phase,error_code,recorded_at_ms) VALUES(?1,?2,?3,?4,?5)",j.id,status,phase,error,time).run();
 return{status:done.state,attempts:done.attempts};
}
