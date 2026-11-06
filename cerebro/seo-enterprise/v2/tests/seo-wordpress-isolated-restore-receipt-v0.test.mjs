import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {validateSeoWordpressFixtureRestoreReceipt} from '../runtime/seo-wordpress-isolated-restore-receipt-v0.mjs';
const backup=Buffer.from('SELECT 1;\n'.repeat(20),'utf8');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const hash=h(Buffer.from('baseline content','utf8'));
const meta=h(Buffer.from('post metadata','utf8'));
const ok={
 company_id:'fenix',engine_id:'SEO-001',environment:'ISOLATED_EPHEMERAL_LAB',
 status:'SYNTHETIC_MARIADB_PHYSICAL_BACKUP_RESTORE_PASS',
 based_on_real_wordpress_database:false,real_production_snapshot_imported:false,
 wordpress_core_full_schema_tested:false,plugins_restored:false,media_restored:false,
 production_credentials_injected:false,real_prod_restored:false,
 wordpress_live_writes:0,wordpress_live_restores:0,
 real_prod_wp_restore_gate_passed:false,production_release_authorized:false,
 model_calls:0,paid_provider_calls:0,restore_attempts:2,restored_exactly:true,
 draft_fixture_rows:2,published_fixture_rows:1,network:'none',
 schema_tables:['wp_posts','wp_postmeta'],backup_sha256:h(backup),
 baseline_sha256:hash,restored_sha256:hash,meta_before_sha256:meta,meta_after_sha256:meta,
 backup_bytes:backup.length
};
test('a real byte-verified synthetic fixture receipt is acknowledged but remains PROD HOLD',()=>{
 const result=validateSeoWordpressFixtureRestoreReceipt({receipt:ok,backup_bytes:backup});
 assert.equal(result.synthetic_fixture_restore_verified,true);
 assert.equal(result.real_wordpress_full_backup_verified,false);
 assert.equal(result.live_draft_authorized,false);
 assert.equal(result.prod_wordpress_restore_tested,false);
 assert.equal(result.wordpress_writes,0);
});
test('forged production snapshot claims cannot turn synthetic fixture into approved restore',()=>{
 for(const [key,value] of [
  ['real_production_snapshot_imported',true],['based_on_real_wordpress_database',true],
  ['real_prod_wp_restore_gate_passed',true],['production_release_authorized',true],
  ['network','bridge'],['wordpress_live_writes',1],['restore_attempts',1],
  ['real_prod_restored',true],['plugins_restored',true]
 ])assert.throws(()=>validateSeoWordpressFixtureRestoreReceipt({receipt:{...ok,[key]:value},backup_bytes:backup}));
});
test('altered SQL dump or row hash makes receipt untrusted',()=>{
 assert.throws(()=>validateSeoWordpressFixtureRestoreReceipt({receipt:ok,backup_bytes:Buffer.from('bad')}));
 assert.throws(()=>validateSeoWordpressFixtureRestoreReceipt({receipt:{...ok,restored_sha256:'f'.repeat(64)},backup_bytes:backup}));
 assert.throws(()=>validateSeoWordpressFixtureRestoreReceipt({receipt:{...ok,meta_after_sha256:'f'.repeat(64)},backup_bytes:backup}));
 assert.throws(()=>validateSeoWordpressFixtureRestoreReceipt({receipt:{...ok,backup_bytes:1},backup_bytes:backup}));
});
