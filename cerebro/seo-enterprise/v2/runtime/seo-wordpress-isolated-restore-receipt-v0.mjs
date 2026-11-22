/**
 * Validate physical, ephemeral MariaDB fixture backup/restore receipt.
 * NEVER equate a synthetic drill with a real WordPress PROD restore.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const deny=s=>{throw Error('SEO_WP_RESTORE_'+s)};
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function validateSeoWordpressFixtureRestoreReceipt({receipt,backup_bytes=null}={}){
 if(receipt?.company_id!=='fenix'||receipt?.engine_id!=='SEO-001'||
  receipt?.environment!=='ISOLATED_EPHEMERAL_LAB'||
  receipt?.status!=='SYNTHETIC_MARIADB_PHYSICAL_BACKUP_RESTORE_PASS'||
  receipt?.based_on_real_wordpress_database!==false||
  receipt?.real_production_snapshot_imported!==false||
  receipt?.wordpress_core_full_schema_tested!==false||
  receipt?.plugins_restored!==false||receipt?.media_restored!==false||
  receipt?.production_credentials_injected!==false||
  receipt?.real_prod_restored!==false||receipt?.wordpress_live_writes!==0||
  receipt?.wordpress_live_restores!==0||receipt?.real_prod_wp_restore_gate_passed!==false||
  receipt?.production_release_authorized!==false||
  receipt?.model_calls!==0||receipt?.paid_provider_calls!==0||
  receipt?.restore_attempts!==2||receipt?.restored_exactly!==true||
  receipt?.draft_fixture_rows!==2||receipt?.published_fixture_rows!==1||
  receipt?.network!=='none'||!Array.isArray(receipt?.schema_tables)||
  receipt.schema_tables.join('|')!=='wp_posts|wp_postmeta'||
  !['backup_sha256','baseline_sha256','restored_sha256',
    'meta_before_sha256','meta_after_sha256'].every(k=>hex(receipt[k]))||
  receipt.baseline_sha256!==receipt.restored_sha256||
  receipt.meta_before_sha256!==receipt.meta_after_sha256||
  !Number.isInteger(receipt.backup_bytes)||receipt.backup_bytes<100)
  deny('UNVERIFIED_OR_UNSAFE_FIXTURE_RECEIPT');
 if(backup_bytes!==null){
  if(!Buffer.isBuffer(backup_bytes)||backup_bytes.length!==receipt.backup_bytes||
   crypto.createHash('sha256').update(backup_bytes).digest('hex')!==receipt.backup_sha256)
   deny('BACKUP_BYTES_DO_NOT_MATCH_RECEIPT');
 }
 return Object.freeze({
  status:'ISOLATED_FIXTURE_RESTORE_EVIDENCE_VERIFIED_PROD_HOLD',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  synthetic_fixture_restore_verified:true,
  real_wordpress_full_backup_verified:false,
  real_prod_backup_imported_to_isolated_environment:false,
  full_wp_core_schema_and_plugins_verified:false,
  live_draft_authorized:false,prod_wordpress_restore_tested:false,
  publish_authorized:false,wordpress_writes:0
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const folder=process.argv[2];
 if(!folder||!path.isAbsolute(folder))deny('FOLDER');
 const receipt=JSON.parse(fs.readFileSync(path.join(folder,'receipt.json'),'utf8'));
 const backup=fs.readFileSync(path.join(folder,'fixture-backup.sql'));
 process.stdout.write(JSON.stringify(validateSeoWordpressFixtureRestoreReceipt({receipt,backup_bytes:backup}))+'\n');
}
