/** Append-only, strictly sanitized LAB diagnostic for failed receipt emission.
 * Never logs or stores provider tokens, request bodies, names, versions or secrets.
 * Not a business outcome, no change to terminal job state or worker ownership.
 */
const ALLOWED=new Set([
 'OBSERVATION_SCOPE_INVALID','PROVIDER_GET_OR_PERMISSION_FAILURE','PROVIDER_INVENTORY_INCOMPLETE',
 'PROVIDER_INVENTORY_SHAPE_INVALID','PROVIDER_HAS_PUBLIC_ROUTES','WORKER_STILL_PRESENT',
 'DELETED_SCRIPT_404_NOT_CONFIRMED','OBSERVATION_TIME_INVALID','WORKER_NOT_IN_ACCOUNT_INVENTORY',
 'WORKER_GET_NOT_CONFIRMED','PRIVATE_CONFIG_OR_DEPLOYMENT_NOT_VERIFIED',
 'PROVIDER_PROOF_MISSING','PRIVATE_SIGNER_OR_D1_MISSING','RECEIPT_ID_INVALID',
 'LOCAL_SIGNER_SELF_CHECK_FAILED','LEDGER_WRITE_OR_SIGNER_FAILED',
 'RUNTIME_BINDING_OR_JOB_INVALID','SIGNER_SECRET_MISSING',
 'JOB_SCOPE_OR_TERMINAL_STATE_INVALID','TERMINAL_EVENT_NOT_UNIQUE',
 'OWNERSHIP_MISSING','PRIVATE_LAB_LEDGER_OR_PROVIDER_UNAVAILABLE',
 'JOB_CONTRACT_INVALID','TERMINAL_EVENT_INVALID','READBACK_NOT_FRESH',
 'OWNERSHIP_INVALID','PROVIDER_PRIVATE_READBACK_INVALID','PROVIDER_READBACK_INVALID',
 'DELETED_ABSENCE_NOT_PROVEN','INDEPENDENT_READBACK_INVALID',
 'VERSION_READBACK_MISMATCH','DELETED_VERSION_STILL_ACTIVE',
 'DURABLE_READBACK_OR_IDEMPOTENCY_BLOCKED'
]);
export async function auditFact001ReceiptFailureLabV0({env,jobId,result,now=Date.now()}={}){
 if(env?.FACT001_RECEIPTS_ENABLED!=='true'||result?.status!=='NOT_CERTIFIED'||
    typeof jobId!=='string'||!/^FACT001-[A-Z0-9-]{15,95}$/.test(jobId)||
    !Number.isSafeInteger(now)||now<=0||typeof env?.RECOVERY_DB?.prepare!=='function')
   return {status:'SKIPPED'};
 const reason=ALLOWED.has(result.reason)?result.reason:'UNKNOWN_SANITIZED_FAILURE';
 try{
  const sql="INSERT INTO fact001_cf_command_events_v1(job_id,event,state,phase,error_code,recorded_at_ms) "+
   "SELECT ?1,'RECEIPT_DIAGNOSTIC_V0','NOT_CERTIFIED',?2,NULL,?3 "+
   "WHERE EXISTS (SELECT 1 FROM fact001_cf_command_jobs_v1 WHERE id=?1 "+
   "AND company_id='fenix-capital' AND engine_id='FACT-001' AND environment='LAB' "+
   "AND state='COMPLETED' AND attempts=1) "+
   "AND NOT EXISTS (SELECT 1 FROM fact001_cf_command_events_v1 "+
   "WHERE job_id=?1 AND event='RECEIPT_DIAGNOSTIC_V0') RETURNING event_id";
  const inserted=await env.RECOVERY_DB.prepare(sql).bind(jobId,reason,now).first();
  return {status:inserted?.event_id?'DIAGNOSTIC_RECORDED':'ALREADY_RECORDED_OR_DENIED'};
 }catch{return {status:'DIAGNOSTIC_WRITE_FAILED'};}
}
