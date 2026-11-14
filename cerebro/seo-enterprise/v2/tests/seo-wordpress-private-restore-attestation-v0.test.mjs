import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
 validatePrivateWordpressRestoreReceipt as verify
} from '../runtime/seo-wordpress-private-restore-attestation-v0.mjs';
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const pem=publicKey.export({format:'pem',type:'spki'});
const pin=crypto.createHash('sha256').update(publicKey.export({format:'der',type:'spki'})).digest('hex');
const now=new Date('2026-11-06T19:00:00.000Z');
const payload={
 schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
 environment:'PRIVATE_ISOLATED_RESTORE',site:'fenixcapital.es',version:'0.1.0',
 snapshot:{origin:'HOSTINGER_HYPANEL_OWNER_DOWNLOAD',
  captured_at:'2026-11-05T10:00:00Z',
  files_sha256:'a'.repeat(64),database_sha256:'b'.repeat(64),
  files_bytes:200000,database_bytes:20000,archives_encrypted_at_rest:true},
 restore:{finished_at:'2026-11-06T12:00:00Z',
  database_restored_from_snapshot:true,website_files_restored_from_snapshot:true,
  wordpress_core_verified:true,active_plugins_verified:true,
  theme_verified:true,uploads_verified:true,database_post_and_page_counts_reconciled:true,
  private_http_smoke_passed:true,rollback_to_original_isolated_state_tested:true,
  network_egress_blocked:true,outbound_email_blocked:true,
  external_cron_blocked:true,admin_access_private_only:true},
 evidence:{backup_files_checksum_matches:true,database_checksum_matches:true,
  private_runner_identity:'CEREBRO-RESTORE-PRIVATE-TEST01',
  run_id:'test-run-0001',recorded_log_redacted:true,receipt_contains_no_pii:true},
 provider_cost:{new_subscription_added:false,paid_image_api_calls:0},
 production:{app_modified:false,crm_modified:false,wordpress_prod_modified:false,
  dns_modified:false,publish_authorized:false,wordpress_prod_restore_performed:false}
};
const sign=p=>({payload:p,
 signature_base64:crypto.sign(null,Buffer.from(JSON.stringify(p)),privateKey).toString('base64')});
const read=p=>verify({
 signed_receipt:sign(p),trusted_public_key_pem:pem,trusted_public_key_sha256:pin,now
});
test('signed complete private WordPress restore would validate without authorizing PROD',()=>{
 const r=read(payload);
 assert.equal(r.status,'SIGNED_PRIVATE_REAL_WORDPRESS_RESTORE_EVIDENCE_VERIFIED');
 assert.equal(r.actual_private_restore_evidence_authenticated,true);
 assert.equal(r.autonomous_production_ready,false);
 assert.equal(r.wordpress_writes,0);
 assert.equal(r.publish_authorized,false);
 assert.equal(r.owner_exact_sha_approval,false);
});
test('signed synthetic test cannot inject fake public approval, edits or paid-provider usage',()=>{
 for(const [section,key,value] of [
  ['restore','website_files_restored_from_snapshot',false],
  ['restore','uploads_verified',false],['restore','network_egress_blocked',false],
  ['restore','rollback_to_original_isolated_state_tested',false],
  ['snapshot','archives_encrypted_at_rest',false],
  ['evidence','database_checksum_matches',false],
  ['provider_cost','new_subscription_added',true],
  ['provider_cost','paid_image_api_calls',1],
  ['production','wordpress_prod_modified',true],
  ['production','publish_authorized',true]
 ]){
  const p=structuredClone(payload);p[section][key]=value;
  assert.throws(()=>read(p),/SEO_PRIVATE_RESTORE_/);
 }
});
test('attacker cannot self-sign with arbitrary key, alter payload or spoof a pinned identity',()=>{
 const signed=sign(payload);
 assert.throws(()=>verify({signed_receipt:signed,trusted_public_key_pem:pem,
  trusted_public_key_sha256:'0'.repeat(64),now}),/TRUST_ROOT_PIN_MISMATCH/);
 const other=crypto.generateKeyPairSync('ed25519');
 const wrong=other.publicKey.export({format:'pem',type:'spki'});
 assert.throws(()=>verify({signed_receipt:signed,trusted_public_key_pem:wrong,
  trusted_public_key_sha256:crypto.createHash('sha256').update(
   other.publicKey.export({format:'der',type:'spki'})).digest('hex'),now}),/SIGNATURE_INVALID/);
 const changed=structuredClone(signed);changed.payload.snapshot.database_sha256='d'.repeat(64);
 assert.throws(()=>verify({signed_receipt:changed,trusted_public_key_pem:pem,
  trusted_public_key_sha256:pin,now}),/SIGNATURE_INVALID/);
 assert.throws(()=>verify({signed_receipt:signed,now}),/PINNED_TRUST_ROOT_MISSING/);
});
test('stale snapshots, reversed timestamps and unknown fields are blocked',()=>{
 let p=structuredClone(payload);p.restore.finished_at='2026-10-01T00:00:00Z';
 assert.throws(()=>read(p),/TIME_ORDER_OR_STALE/);
 p=structuredClone(payload);p.snapshot.captured_at='2026-11-07T00:00:00Z';
 assert.throws(()=>read(p),/TIME_ORDER_OR_STALE/);
 p=structuredClone(payload);p.fake_completed=true;
 assert.throws(()=>read(p),/CONTRACT_FIELDS/);
 p=structuredClone(payload);p.restore={...p.restore,unknown:true};
 assert.throws(()=>read(p),/CONTRACT_FIELDS/);
});
test('restore flags validated by key, not JSON field order',()=>{
 const p=structuredClone(payload);
 p.restore={admin_access_private_only:false,...p.restore};
 p.restore.admin_access_private_only=false;
 assert.throws(()=>read(p),/INCOMPLETE_PRIVATE_RESTORE/);
});
