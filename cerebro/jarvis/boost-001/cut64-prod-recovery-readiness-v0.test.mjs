import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyCut64Observation} from './cut64-prod-recovery-readiness-v0.mjs';

const f=path.join(path.dirname(fileURLToPath(import.meta.url)),'cut64-prod-recovery-owner-readonly-observation-20261107.json');
const base=()=>JSON.parse(fs.readFileSync(f,'utf8'));
const change=cb=>{const o=base();cb(o);return o};
const rejection=(cb,code)=>assert.throws(()=>verifyCut64Observation(change(cb)),new RegExp(code));

test('CUT64 observed 403, 403, Cloudflare 302, while authenticated B2/B3 are unproven',()=>{
 const r=verifyCut64Observation(base());
 assert.equal(r.owner_anonymous_denial_observed,true);
 assert.equal(r.original_worker_access_login_challenge_observed,true);
 assert.equal(r.authenticated_owner_e2e_verified,false);
 assert.equal(r.b2_enrolled,false);
 assert.equal(r.b3_enabled,false);
 assert.equal(r.kill_switch,true);
 assert.equal(r.prod_write_authorized,false);
 assert.equal(r.autonomous_promotion_authorized,false);
});
test('restore clone denied despite 8 physical backups because physical restore and cost are unproven',()=>{
 const r=verifyCut64Observation(base());
 assert.equal(r.daily_physical_backups_visible,8);
 assert.equal(r.source_live_pg_cron_active_jobs,2);
 assert.equal(r.source_live_pg_net_installed,true);
 assert.equal(r.source_storage_buckets,3);
 assert.equal(r.clone_cost_verified_and_approved,false);
 assert.equal(r.cron_net_external_side_effects_isolated,false);
 assert.equal(r.storage_object_recovery_verified,false);
 assert.equal(r.physical_prod_backup_restored_in_independent_target,false);
 assert.equal(r.clone_restore_authorized,false);
 assert.equal(r.registry_ingest_authorized,false);
 assert.equal(r.lrn_ingest_authorized,false);
});
test('rejects false positive owner canary or changed HTTP status and missing tokens',()=>{
 rejection(o=>o.source_independent_actions.authenticated_owner_e2e_verified=true,'OWNER_E2E_FALSE_POSITIVE');
 rejection(o=>o.source_independent_actions.b3_owner_grant_verified=true,'OWNER_E2E_FALSE_POSITIVE');
 rejection(o=>o.source_independent_actions.endpoints[0].status=200,'ANONYMOUS_PROBE_CHANGED');
 rejection(o=>o.source_independent_actions.endpoints[2].status=200,'ANONYMOUS_PROBE_CHANGED');
 rejection(o=>o.source_independent_actions.anonymous_get_run_id=1,'SCOPE_OR_RUN_ID');
});
test('rejects misreporting active cron, pg_net, storage, B3 and database lineage',()=>{
 rejection(o=>o.supabase_live.pg_cron_jobs_active=0,'PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 rejection(o=>o.supabase_live.extnames=[],'PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 rejection(o=>o.supabase_live.storage_bucket_count=0,'PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 rejection(o=>o.supabase_live.project_ref='hnqlnvakzaywtafeiybt','PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 rejection(o=>o.supabase_live.b3_enabled=true,'PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 rejection(o=>o.supabase_live.sql_writes=1,'PROJECT_LIVE_DB_OBSERVATION_DRIFT');
});
test('rejects forged restore proof, paid subscription and production approvals',()=>{
 rejection(o=>o.backup.source_prod_restore_independent_target_tested=true,'BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
 rejection(o=>o.backup.side_effect_inventory_complete=true,'BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
 rejection(o=>o.backup.cloning_cost_eur_measured=true,'BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
 rejection(o=>o.security.new_subscriptions=1,'BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
 rejection(o=>o.security.prod_authorized=true,'BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
 rejection(o=>o.security.worker_cut32_current_public_exposure_revalidated_in_this_cut=true,'BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
});
test('project identity and all mutation authorizations remain fail-closed',()=>{
 rejection(o=>o.company_id='other','SCOPE_OR_RUN_ID');
 rejection(o=>o.supabase_live.fenix_company_registry_rows=1,'PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 const r=verifyCut64Observation(base());
 assert.equal(r.gate,'NO_GO_PHYSICAL_OWNER_AND_ISOLATED_BACKUP_RESTORE_PENDING');
 assert.equal(r.owner_new_worker_cut32_access_verified,false);
 assert.equal(r.full_app_crm_e2e_compatibility_verified,false);
});
