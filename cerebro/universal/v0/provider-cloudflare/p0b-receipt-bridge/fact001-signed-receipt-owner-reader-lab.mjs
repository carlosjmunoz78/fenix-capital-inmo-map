/** CEREBRO OPERATIVA LAB · signed receipt OWNER server-side audit reader.
 * Injected D1 and private signing key; never send either to the browser.
 * HMAC integrity is NOT provider-native attestation, canonical company registry,
 * authorization to perform actions, or permission to promote a motor to PROD.
 * This reader does not make network calls or mutate any data.
 */
import {verifyFact001LabReceiptV0} from './fact001-receipt-signature-lab.mjs';

const SCOPED={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const JOB_ID=/^[A-Za-z0-9_-]{8,128}$/;
const HEX=/^[0-9a-f]{64}$/;
const OPS={
 'worker.create_private':'CREATED_V1_PRIVATE',
 'worker.update_private':'UPDATED_V2_PRIVATE',
 'worker.rollback_private':'ROLLED_BACK_V1_PRIVATE',
 'worker.delete_private':'OWNED_WORKER_REMOVED'
};
const columns=[
 'receipt_id','job_id','request_id','run_id','idempotency_key',
 'company_id','engine_id','environment','version','operation',
 'resource_name','policy_version','provider','provider_version_id',
 'message_digest','signer_key_id','signature_hex','signature_scheme',
 'signature_is_provider_native','readback_status','source',
 'signed_runtime_receipt_verified','prod_promotion_allowed','observed_at_ms'
];
const RECEIPT_QUERY='SELECT '+columns.join(',')+' FROM fact001_provider_receipts_lab_v0 WHERE job_id=?1';
const JOB_QUERY='SELECT id,company_id,engine_id,environment,version,operation,resource_name,request_id,idempotency_key,state,attempts,max_cost_eur,created_at_ms,updated_at_ms FROM fact001_cf_command_jobs_v1 WHERE id=?1';
const EVENT_QUERY="SELECT job_id,event,state,phase,error_code,recorded_at_ms FROM fact001_cf_command_events_v1 WHERE job_id=?1 AND event='JOB_FINISHED'";
const PUBLIC_FIELDS=[
 'receipt_id','run_id','job_id','request_id','company_id','engine_id','environment',
 'operation','resource_name','observed_at_ms','policy_version'
];
const denied=(reason)=>Object.freeze({
 status:'NOT_CERTIFIED',reason,receipt_found:false,
 signed_hmac_integrity_verified:false,independent_provider_attestation:false,
 canonical_company_registry_mapping_verified:false,
 signed_runtime_receipt_verified:false,prod_promotion_allowed:false
});
const goodScope=(row)=>row&&Object.entries(SCOPED).every(([field,v])=>row[field]===v);
const timestamp=(v)=>Number.isSafeInteger(v)&&v>0;
export async function readFact001SignedReceiptOwnerLabV0({
 db,jobId,signingKey,verifyOwnerSession,sessionToken
}={}){
 // Server must inject createFenixOwnerContextResolverV0. A client-supplied
 // ownerContext is NOT an authentication proof and is never accepted.
 if(typeof verifyOwnerSession!=='function'||typeof sessionToken!=='string'||
    sessionToken.length<20||sessionToken.length>8192||/\\s/.test(sessionToken))
  return denied('OWNER_SESSION_VERIFIER_MISSING');
 let ownerContext;
 try{ownerContext=await verifyOwnerSession(sessionToken)}
 catch{return denied('OWNER_SESSION_VERIFICATION_FAILED');}
 if(ownerContext?.auth_source!=='SERVER_VERIFIED_FENIX_CONTEXT'||
    ownerContext?.actor_id!=='CARLOS-ADMIN'||
    !Array.isArray(ownerContext?.company_ids)||
    !ownerContext.company_ids.includes('fenix')||
    !Array.isArray(ownerContext?.scopes)||
    !ownerContext.scopes.includes('cerebro:audit:read'))
  return denied('OWNER_SERVER_CONTEXT_NOT_VERIFIED');
 if(!JOB_ID.test(jobId||'')||typeof db?.prepare!=='function'||
    !(signingKey instanceof Uint8Array)||![32,64].includes(signingKey.length))
  return denied('OWNER_READER_SCOPE_OR_SECRET_MISSING');
 try{
  const [receipt,job]=await Promise.all([
   db.prepare(RECEIPT_QUERY).bind(jobId).first(),
   db.prepare(JOB_QUERY).bind(jobId).first()
  ]);
  if(!receipt)return denied('NO_DURABLE_SIGNED_RECEIPT');
  if(!goodScope(job)||!goodScope(receipt)||job.id!==jobId||
    job.state!=='COMPLETED'||job.attempts!==1||job.max_cost_eur!==0||
    receipt.job_id!==job.id||receipt.request_id!==job.request_id||
    receipt.idempotency_key!==job.idempotency_key||
    receipt.operation!==job.operation||receipt.resource_name!==job.resource_name||
    receipt.source!=='FACT001_RUNNER_LAB'||receipt.readback_status!=='READBACK_MATCHED_UNATTESTED'||
    receipt.signed_runtime_receipt_verified!==0||receipt.prod_promotion_allowed!==0||
    receipt.signature_is_provider_native!==0||
    receipt.signature_scheme!=='HMAC-SHA256-LAB-V0'||
    !HEX.test(receipt.message_digest||'')||!HEX.test(receipt.signature_hex||''))
   return denied('RECEIPT_OR_JOB_CONTRACT_INVALID');
  const ev=await db.prepare(EVENT_QUERY).bind(jobId).all();
  const events=ev?.results;
  if(!Array.isArray(events)||events.length!==1||!Object.hasOwn(OPS,job.operation)||
    events[0].job_id!==job.id||events[0].state!=='COMPLETED'||
    events[0].phase!==OPS[job.operation]||events[0].error_code!==null||
    !timestamp(events[0].recorded_at_ms)||!timestamp(receipt.observed_at_ms)||
    receipt.observed_at_ms<events[0].recorded_at_ms)
   return denied('TERMINAL_EVENT_NOT_VERIFIED');
  const payload=Object.fromEntries(PUBLIC_FIELDS.concat([
   'idempotency_key','version','provider','provider_version_id',
   'readback_status','signer_key_id'
  ]).map(k=>[k,receipt[k]]));
  const verified=await verifyFact001LabReceiptV0({
   envelope:{receipt:payload,message_digest:receipt.message_digest,
    signature_hex:receipt.signature_hex,signature_scheme:receipt.signature_scheme,
    signature_is_provider_native:false},signingKey
  });
  if(!verified)return denied('SIGNATURE_OR_DIGEST_INVALID');
  // Strict output: never include key, MAC or raw provider payload in the API response.
  return Object.freeze({
   status:'HMAC_VALID_LAB_ONLY',receipt_found:true,
   ...Object.fromEntries(PUBLIC_FIELDS.map(k=>[k,receipt[k]])),
   signed_hmac_integrity_verified:true,
   independent_provider_attestation:false,
   canonical_company_registry_mapping_verified:false,
   signed_runtime_receipt_verified:false,
   prod_promotion_allowed:false,
   evidence_age:'HISTORICAL_LEDGER_RECORD_NOT_REALTIME_PROVIDER_CHECK'
  });
 }catch{return denied('LAB_D1_READ_OR_CRYPTO_UNAVAILABLE')}
}
