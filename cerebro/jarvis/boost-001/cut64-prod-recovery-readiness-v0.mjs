/**
 * CUT64 · Real anonymous owner denial + Supabase backup clone preflight.
 * Offline judgement over read-only live observations. This code can NEVER
 * register tenants, restore a DB, grant B3, enable CUT32 or write to PROD.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const veto=why=>{throw Error('CUT64_FAIL_CLOSED:'+why);}
const critical=['JARVIS_WORK_OWNER_HEALTH','JARVIS_GIT_OWNER_HEALTH','CUT30_EXISTING_ACCESS_OWNER_CHECK_READONLY'];
export function verifyCut64Observation(o){
 if(!o||o.schema!=='jarvis.cut64.prod.recovery.owner.readonly.observation.v1'||
  o.company_id!=='fenix'||o.engine_id!=='JARVIS'||o.environment!=='LAB'||
  o.observed_date!=='2026-11-07'||o.source_independent_actions?.anonymous_get_run_id!==42397967804||
  o.source_independent_actions.conclusion!=='success'||
  o.source_independent_actions.unit_tests_pass!==6)
  veto('SCOPE_OR_RUN_ID');
 const p=o.source_independent_actions;
 if(p.authenticated_owner_e2e_verified!==false||
  p.b2_device_enrollment_verified!==false||p.b3_owner_grant_verified!==false||
  !Array.isArray(p.endpoints)||p.endpoints.length!==3||
  new Set(p.endpoints.map(x=>x.id)).size!==3)
  veto('OWNER_E2E_FALSE_POSITIVE');
 for(let i=0;i<3;i++){
  const t=p.endpoints[i];
  if(t.id!==critical[i]||t.status!==[403,403,302][i]||
   t.conclusion!==['ANONYMOUS_REQUEST_DENIED_BY_SOME_LAYER',
    'ANONYMOUS_REQUEST_DENIED_BY_SOME_LAYER',
    'CLOUDFLARE_ACCESS_LOGIN_CHALLENGE_PRESENT'][i])veto('ANONYMOUS_PROBE_CHANGED');
 }
 const db=o.supabase_live;
 if(db?.project_ref!=='cluhljgonannaafpmblx'||db.database_bytes!==49769619||
   db.public_tables!==38||db.public_functions!==259||db.user_triggers!==37||
   JSON.stringify(db.extnames?.slice().sort())!==JSON.stringify(['pg_cron','pg_net'])||
   db.pg_cron_jobs_total!==2||db.pg_cron_jobs_active!==2||
   db.pg_cron_jobs_inactive!==0||db.storage_bucket_count!==3||
   db.fenix_company_registry_rows!==0||db.fenix_onboarding_rows!==0||
   db.fenix_engine_rows!==0||db.b3_owner_grants_rows!==0||
   db.b3_enabled!==false||db.b3_kill_switch!==true||
   db.sql_method!=='SELECT_ONLY'||db.sql_writes!==0)
  veto('PROJECT_LIVE_DB_OBSERVATION_DRIFT');
 const b=o.backup,s=o.security;
 if(b?.physical_entries_visible!==8||
  b.latest_visible_utc!=='2026-11-07T02:59:58Z'||
  b.existing_backup_bytes_independently_inspected!==false||
  b.complete_db_storage_backup_verified!==false||
  b.source_prod_restore_independent_target_tested!==false||
  b.new_project_technical_clone_unstarted!==true||
  b.clone_has_potential_extra_compute_cost!==true||
  b.clone_may_restart_external_cron_net_jobs!==true||
  b.cloning_cost_eur_measured!==false||
  b.side_effect_inventory_complete!==false||
  s?.prod_db_writes!==0||s.app_crm_writes!==0||
  s.cloudflare_policy_changes!==0||s.cut30_original_worker_changes!==0||
  s.worker_cut32_current_public_exposure_revalidated_in_this_cut!==false||
  s.paid_deepseek_api_calls!==0||s.new_subscriptions!==0||
  s.owner_e2e_owner_authenticated!==false||
  s.prod_authorized!==false||s.physical_production_release_verified!==false)
  veto('BACKUP_OR_SECURITY_AUTHORITIES_MISSTATED');
 return {
  schema:'jarvis.cut64.owner.recovery.fail.closed.gate.v1',
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',version:'CUT64-v0.1',
  owner_anonymous_denial_observed:true,
  original_worker_access_login_challenge_observed:true,
  authenticated_owner_e2e_verified:false,
  b2_enrolled:false,b3_enabled:false,kill_switch:true,
  daily_physical_backups_visible:8,latest_backup_utc:b.latest_visible_utc,
  source_live_pg_cron_active_jobs:db.pg_cron_jobs_active,
  source_live_pg_net_installed:db.extnames.includes('pg_net'),
  source_storage_buckets:db.storage_bucket_count,
  physical_prod_backup_restored_in_independent_target:false,
  clone_cost_verified_and_approved:false,
  cron_net_external_side_effects_isolated:false,
  storage_object_recovery_verified:false,
  owner_new_worker_cut32_access_verified:false,
  full_app_crm_e2e_compatibility_verified:false,
  prod_write_authorized:false,
  registry_ingest_authorized:false,
  lrn_ingest_authorized:false,
  clone_restore_authorized:false,
  autonomous_promotion_authorized:false,
  gate:'NO_GO_PHYSICAL_OWNER_AND_ISOLATED_BACKUP_RESTORE_PENDING',
  next:'CUT65_OWNER_AUTH_INTERACTIVE_AND_ZERO_COST_SAFE_BACKUP_OPTION'
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3)throw Error('SNAPSHOT_REPORT_REQUIRED');
 const original=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const r=verifyCut64Observation(original);
 console.log(JSON.stringify({gate:r.gate,anonymous_denied:r.owner_anonymous_denial_observed,
  active_cron:r.source_live_pg_cron_active_jobs,restore_auth:r.clone_restore_authorized,
  prod_write:r.prod_write_authorized}));
}
