/**
 * SEO-001: cryptographically validate a private full-WordPress recovery receipt.
 *
 * No backup bytes are accepted. No network, WordPress or secrets API used.
 * Ed25519 public key MUST be pinned outside the receipt by the trusted
 * CEREBRO identity/vault. A self-supplied key never grants release.
 * This is a verifier of signed assertions, NOT proof that restore happened
 * unless a trusted independent runner really performed its checks.
 */
import crypto from 'node:crypto';
const reject=s=>{throw Error('SEO_PRIVATE_RESTORE_'+s)};
const SHA=/^[a-f0-9]{64}$/;
const REQ=['schema_version','company_id','engine_id','environment','site','version',
 'snapshot','restore','evidence','provider_cost','production'];
function exact(o,fields){
 if(!o||Array.isArray(o)||typeof o!=='object'||
  Object.keys(o).sort().join('|')!==[...fields].sort().join('|'))
  reject('CONTRACT_FIELDS');
}
export function validatePrivateWordpressRestoreReceipt({
 signed_receipt, trusted_public_key_pem, trusted_public_key_sha256,
 now=new Date()
}={}){
 if(!signed_receipt||typeof signed_receipt!=='object'||
  !trusted_public_key_pem||!SHA.test(trusted_public_key_sha256||''))
  reject('PINNED_TRUST_ROOT_MISSING');
 exact(signed_receipt,['payload','signature_base64']);
 const {payload,signature_base64}=signed_receipt;
 exact(payload,REQ);
 if(payload.schema_version!=='1.0.0'||payload.company_id!=='fenix'||
  payload.engine_id!=='SEO-001'||payload.environment!=='PRIVATE_ISOLATED_RESTORE'||
  payload.site!=='fenixcapital.es'||payload.version!=='0.1.0')
  reject('WRONG_SCOPE');
 exact(payload.snapshot,['origin','captured_at','files_sha256',
  'database_sha256','files_bytes','database_bytes','archives_encrypted_at_rest']);
 if(payload.snapshot.origin!=='HOSTINGER_HYPANEL_OWNER_DOWNLOAD'||
  !SHA.test(payload.snapshot.files_sha256)||!SHA.test(payload.snapshot.database_sha256)||
  !Number.isSafeInteger(payload.snapshot.files_bytes)||payload.snapshot.files_bytes<1024||
  !Number.isSafeInteger(payload.snapshot.database_bytes)||payload.snapshot.database_bytes<1024||
  payload.snapshot.archives_encrypted_at_rest!==true)
  reject('UNVERIFIED_REAL_BACKUP_SOURCE');
 exact(payload.restore,['finished_at','database_restored_from_snapshot',
  'website_files_restored_from_snapshot','wordpress_core_verified',
  'active_plugins_verified','theme_verified','uploads_verified',
  'database_post_and_page_counts_reconciled','private_http_smoke_passed',
  'rollback_to_original_isolated_state_tested','network_egress_blocked',
  'outbound_email_blocked','external_cron_blocked','admin_access_private_only']);
 if(Object.entries(payload.restore).some(([k,v])=>k!=='finished_at'&&v!==true))
  reject('INCOMPLETE_PRIVATE_RESTORE');
 exact(payload.evidence,['backup_files_checksum_matches',
  'database_checksum_matches','private_runner_identity','run_id',
  'recorded_log_redacted','receipt_contains_no_pii']);
 if(payload.evidence.backup_files_checksum_matches!==true||
  payload.evidence.database_checksum_matches!==true||
  payload.evidence.recorded_log_redacted!==true||
  payload.evidence.receipt_contains_no_pii!==true||
  !/^CEREBRO-RESTORE-PRIVATE-[A-Z0-9_-]{4,60}$/.test(payload.evidence.private_runner_identity)||
  !/^[0-9a-z-]{8,90}$/.test(payload.evidence.run_id))
  reject('PROVENANCE_INCOMPLETE');
 exact(payload.provider_cost,['new_subscription_added','paid_image_api_calls']);
 if(payload.provider_cost.new_subscription_added!==false||
  payload.provider_cost.paid_image_api_calls!==0)reject('COST_SCOPE');
 exact(payload.production,['app_modified','crm_modified','wordpress_prod_modified',
  'dns_modified','publish_authorized','wordpress_prod_restore_performed']);
 if(Object.values(payload.production).some(x=>x!==false))
  reject('PRODUCTION_SCOPE');
 const captured=Date.parse(payload.snapshot.captured_at),
  finished=Date.parse(payload.restore.finished_at),nowMs=new Date(now).getTime();
 if(!Number.isFinite(captured)||!Number.isFinite(finished)||!Number.isFinite(nowMs)||
  captured>finished||finished>nowMs+5*60*1000||
  nowMs-finished>7*24*60*60*1000||
  finished-captured>7*24*60*60*1000)
  reject('TIME_ORDER_OR_STALE');
 let pub;
 try{pub=crypto.createPublicKey(trusted_public_key_pem)}
 catch{reject('BAD_TRUST_ROOT')}
 if(pub.asymmetricKeyType!=='ed25519')reject('ED25519_REQUIRED');
 const der=pub.export({type:'spki',format:'der'});
 const pin=crypto.createHash('sha256').update(der).digest('hex');
 if(pin!==trusted_public_key_sha256)reject('TRUST_ROOT_PIN_MISMATCH');
 if(typeof signature_base64!=='string'||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(signature_base64))
  reject('SIGNATURE_ENCODING');
 const signature=Buffer.from(signature_base64,'base64');
 if(signature.length!==64||!crypto.verify(null,Buffer.from(JSON.stringify(payload)),pub,signature))
  reject('SIGNATURE_INVALID_OR_CONTENT_TAMPERED');
 // Even genuine technical restoration evidence never authorizes production.
 return Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  status:'SIGNED_PRIVATE_REAL_WORDPRESS_RESTORE_EVIDENCE_VERIFIED',
  trusted_identity_pin_sha256:pin,
  backup_files_sha256:payload.snapshot.files_sha256,
  backup_database_sha256:payload.snapshot.database_sha256,
  snapshot_captured_at:payload.snapshot.captured_at,
  isolated_restore_finished_at:payload.restore.finished_at,
  actual_private_restore_evidence_authenticated:true,
  requires_independent_human_review_of_runner_and_logs:true,
  requires_latest_inventory_and_wordpress_draft_iam:true,
  requires_ums_photos_rights_and_semantic_qa:true,
  owner_exact_sha_approval:false,
  production_wordpress_changes:0,wordpress_writes:0,
  publish_authorized:false,autonomous_production_ready:false
 });
}
