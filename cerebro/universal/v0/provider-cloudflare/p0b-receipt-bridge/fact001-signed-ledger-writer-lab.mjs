/** FACT-001 LAB: fail-closed bridge from a separately verified provider readback
 * to one immutable signed D1 receipt. Requires private Worker key and D1 binding.
 * This module performs NO provider mutations. OFF by default at caller.
 * HMAC is issued by CEREBRO, not by Cloudflare. It must be independently
 * verified by an authorized reader before claiming end-to-end attestation.
 */
import {validateFact001ProviderReadbackV0} from './fact001-provider-receipt-bridge.mjs';
import {signFact001LabReceiptV0,verifyFact001LabReceiptV0} from './fact001-receipt-signature-lab.mjs';
const POLICY_VERSION='FACT001-P0B-LAB-V1';
const SIGNER_ID='FACT001-LAB-KEY-V1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMN_NAMES=[
 'receipt_id','job_id','request_id','run_id','idempotency_key',
 'company_id','engine_id','environment','version','operation',
 'resource_name','policy_version','provider','provider_version_id',
 'message_digest','signer_key_id','signature_hex','signature_scheme',
 'signature_is_provider_native','readback_status','source',
 'signed_runtime_receipt_verified','prod_promotion_allowed','observed_at_ms'
];
const QUERY='INSERT INTO fact001_provider_receipts_lab_v0 ('+COLUMN_NAMES.join(',')+
 ') SELECT '+COLUMN_NAMES.map(()=>'?').join(',')+
 " FROM fact001_cf_command_jobs_v1 j WHERE j.id=? AND j.state='COMPLETED' AND j.attempts=1"+
 " AND j.request_id=? AND j.idempotency_key=? AND j.company_id='fenix-capital'"+
 " AND j.engine_id='FACT-001' AND j.environment='LAB'"+
 " AND EXISTS (SELECT 1 FROM fact001_cf_command_events_v1 e WHERE e.job_id=j.id"+
 " AND e.event='JOB_FINISHED' AND e.state='COMPLETED')"+
 ' ON CONFLICT(job_id) DO NOTHING RETURNING receipt_id,job_id,message_digest,signature_hex';
const READ='SELECT receipt_id,job_id,request_id,run_id,idempotency_key,company_id,engine_id,environment,version,operation,resource_name,policy_version,provider,provider_version_id,message_digest,signer_key_id,signature_hex,signature_scheme,signature_is_provider_native,readback_status,source,signed_runtime_receipt_verified,prod_promotion_allowed,observed_at_ms FROM fact001_provider_receipts_lab_v0 WHERE job_id=?1';
const fail=reason=>Object.freeze({status:'NOT_CERTIFIED',reason,durable:false,prod_promotion_allowed:false});
export function decodeFact001SignerSecretV0(value){
 if(typeof value!=='string'||!(/^[0-9a-f]{64}$/.test(value)||/^[0-9a-f]{128}$/.test(value)))return null;
 return Uint8Array.from(value.match(/.{2}/g).map(x=>parseInt(x,16)));
}
export async function persistFact001SignedLedgerReceiptLabV0({
 db,job,event,ownership,provider,readback,observed_at_ms,
 signingKey,idFactory=()=>crypto.randomUUID()
}={}){
 const match=validateFact001ProviderReadbackV0({job,event,ownership,provider,readback,observed_at_ms});
 if(match.status!=='READBACK_MATCHED_UNATTESTED')return fail(match.reason||'PROVIDER_PROOF_MISSING');
 if(!db||typeof db.prepare!=='function'||!(signingKey instanceof Uint8Array)||
    ![32,64].includes(signingKey.length)||typeof idFactory!=='function')
  return fail('PRIVATE_SIGNER_OR_D1_MISSING');
 let receipt;
 try{
  const receipt_id=idFactory(),run_id=idFactory();
  if(!UUID.test(receipt_id)||!UUID.test(run_id)||receipt_id===run_id)return fail('RECEIPT_ID_INVALID');
  receipt={receipt_id,run_id,job_id:job.id,request_id:job.request_id,
   idempotency_key:job.idempotency_key,company_id:job.company_id,
   engine_id:job.engine_id,environment:job.environment,version:job.version,
   operation:job.operation,resource_name:job.resource_name,
   policy_version:POLICY_VERSION,provider:'CLOUDFLARE_WORKERS',
   provider_version_id:ownership.current_version_id||null,
   readback_status:'READBACK_MATCHED_UNATTESTED',
   observed_at_ms,signer_key_id:SIGNER_ID};
  const e=await signFact001LabReceiptV0({receipt,signingKey});
  if(!await verifyFact001LabReceiptV0({envelope:e,signingKey}))
   return fail('LOCAL_SIGNER_SELF_CHECK_FAILED');
  const dbValues={...receipt,message_digest:e.message_digest,signature_hex:e.signature_hex,
   signature_scheme:e.signature_scheme,signature_is_provider_native:0,
   source:'FACT001_RUNNER_LAB',signed_runtime_receipt_verified:0,
   prod_promotion_allowed:0};
  const values=COLUMN_NAMES.map(k=>dbValues[k]);
  const inserted=await db.prepare(QUERY).bind(...values,job.id,job.request_id,job.idempotency_key).first();
  const read=await db.prepare(READ).bind(job.id).first();
  if(!read||read.job_id!==job.id||read.signature_scheme!=='HMAC-SHA256-LAB-V0'||
      read.source!=='FACT001_RUNNER_LAB'||read.prod_promotion_allowed!==0||
      read.signed_runtime_receipt_verified!==0||read.message_digest!==e.message_digest||
      read.signature_hex!==e.signature_hex||read.receipt_id!==e.receipt.receipt_id||
      read.run_id!==e.receipt.run_id||!inserted||inserted.receipt_id!==e.receipt.receipt_id)
   return fail('DURABLE_READBACK_OR_IDEMPOTENCY_BLOCKED');
  return Object.freeze({status:'DURABLE_LAB_RECEIPT_UNATTESTED',
   receipt_id:e.receipt.receipt_id,run_id:e.receipt.run_id,job_id:job.id,
   provider_readback_matched:true,durable:true,
   runtime_hmac_signed:true,external_signature_verified:false,
   provider_native_signature:false,prod_promotion_allowed:false});
 }catch{return fail('LEDGER_WRITE_OR_SIGNER_FAILED');}
}
