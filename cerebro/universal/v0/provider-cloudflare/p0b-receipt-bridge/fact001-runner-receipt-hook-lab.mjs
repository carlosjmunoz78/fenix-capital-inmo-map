/** FACT-001 receipt hook. Existing Worker continues its original scheduler and
 * capabilities. This hook is a NO-OP unless LAB feature flag is exactly true.
 * No retries and no mutations of Cloudflare provider resources.
 */
import {observeFact001CloudflareWorkerLabV0} from './fact001-provider-readback-lab.mjs';
import {decodeFact001SignerSecretV0,persistFact001SignedLedgerReceiptLabV0} from './fact001-signed-ledger-writer-lab.mjs';
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const JOB_ID=/^[A-Za-z0-9_-]{8,128}$/;
const blocked=reason=>({status:'NOT_CERTIFIED',reason,prod_promotion_allowed:false});
const JOB_SQL='SELECT id,company_id,engine_id,environment,version,operation,resource_name,request_id,idempotency_key,max_cost_eur,state,attempts,created_at_ms,updated_at_ms FROM fact001_cf_command_jobs_v1 WHERE id=?1';
const EVENT_SQL="SELECT job_id,event,state,phase,error_code,recorded_at_ms FROM fact001_cf_command_events_v1 WHERE job_id=?1 AND event='JOB_FINISHED'";
const OWNER_SQL='SELECT name,state,v1_version_id,v2_version_id,current_version_id,company_id,engine_id,environment,version,created_by_request FROM fact001_cf_owned_workers_v1 WHERE name=?1';
export async function emitFact001ReceiptIfEnabledLabV0({
 env,jobId,fetchImpl=fetch,clock=Date.now
}={}){
 if(env?.FACT001_RECEIPTS_ENABLED!=='true')return {status:'OFF',prod_promotion_allowed:false};
 if(!JOB_ID.test(jobId||'')||!env?.RECOVERY_DB||!env.CF_WORKERS_TOKEN||
    typeof fetchImpl!=='function'||typeof clock!=='function')
  return blocked('RUNTIME_BINDING_OR_JOB_INVALID');
 const signer=decodeFact001SignerSecretV0(env.FACT001_RECEIPT_SIGNING_KEY_HEX);
 if(!signer)return blocked('SIGNER_SECRET_MISSING');
 try{
  const db=env.RECOVERY_DB;
  const job=await db.prepare(JOB_SQL).bind(jobId).first();
  if(!job||Object.entries(SCOPE).some(([k,v])=>job[k]!==v)||
    job.state!=='COMPLETED'||job.attempts!==1||job.max_cost_eur!==0)
   return blocked('JOB_SCOPE_OR_TERMINAL_STATE_INVALID');
  const eventRows=await db.prepare(EVENT_SQL).bind(jobId).all();
  if(!Array.isArray(eventRows?.results)||eventRows.results.length!==1)
   return blocked('TERMINAL_EVENT_NOT_UNIQUE');
  const event=eventRows.results[0];
  const ownership=await db.prepare(OWNER_SQL).bind(job.resource_name).first();
  if(!ownership)return blocked('OWNERSHIP_MISSING');
  const observed=await observeFact001CloudflareWorkerLabV0({
   token:env.CF_WORKERS_TOKEN,name:job.resource_name,
   operation:job.operation,fetchImpl,clock
  });
  if(observed.status!=='PROVIDER_READBACK')return blocked(observed.reason||'PROVIDER_READBACK_MISSING');
  const receipt=await persistFact001SignedLedgerReceiptLabV0({
   db,job,event,ownership,provider:observed.provider,readback:observed.readback,
   observed_at_ms:observed.observed_at_ms,signingKey:signer
  });
  return receipt;
 }catch{return blocked('PRIVATE_LAB_LEDGER_OR_PROVIDER_UNAVAILABLE')}
 finally{signer.fill(0)}
}
