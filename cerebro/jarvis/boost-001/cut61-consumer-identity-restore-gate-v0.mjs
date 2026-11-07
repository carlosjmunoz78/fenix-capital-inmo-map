/**
 * CUT61 · DB consumer audit and PROD safety gate. Offline and fail-closed.
 * Physical proof is supplied by separately authenticated systems, never
 * inferred from metadata flags, workflow success, or synthetic green states.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha=b=>createHash('sha256').update(b).digest('hex');
export const CUT61_REQUIREMENTS=Object.freeze({
 project:'cluhljgonannaafpmblx',company:'fenix',
 environment:'LAB',observed_date:'2026-11-07',
 protectedTables:Object.freeze([
  'cerebro_company_engine_state_preprod',
  'cerebro_company_onboarding_preprod',
  'cerebro_company_registry_preprod',
  'cerebro_lrn001_continuation_preprod',
  'cerebro_marketing_crm_bootstrap_run_preprod'
 ]),
 directRoutineCount:17,foreignKeyCount:10,
 expectedFunctions:Object.freeze([
  'cerebro_bootstrap_tier_record_preprod',
  'cerebro_bootstrap_tier_status_preprod',
  'cerebro_company_engine_states_get_preprod',
  'cerebro_company_onboarding_get_preprod',
  'cerebro_company_onboarding_start_preprod',
  'cerebro_company_register_preprod',
  'cerebro_company_registry_get_preprod',
  'cerebro_company_tenant_boundary_check_preprod',
  'cerebro_final_onboarding_record_preprod',
  'cerebro_final_onboarding_status_preprod',
  'cerebro_lrn001_record_preprod',
  'cerebro_lrn001_status_preprod',
  'cerebro_marketing_crm_bootstrap_record_preprod',
  'cerebro_marketing_crm_bootstrap_status_preprod',
  'cerebro_post_scan_audit_record_preprod',
  'cerebro_post_scan_parallel_status_preprod',
  'cerebro_scan001_record_success_preprod'
 ])
});
const fail=code=>{throw Error('CUT61_CATALOG_FAIL_CLOSED:'+code)};
const block=(code,details={})=>Object.freeze({
 status:'BLOCKED',code,
 owner_approval_needed:true,write_authorized:false,
 company_onboarding_authorized:false,
 learning_ingest_authorized:false,prod_authorized:false,
 physical_restore_verified:false,...details
});
export function validateLiveCatalogSnapshot(s){
 const c=CUT61_REQUIREMENTS;
 if(!s||s.schema!=='cerebro.cut61.consumer.identity.readonly.observation.v1'||
  s.target_project_ref!==c.project||s.company_id!==c.company||
  s.environment!==c.environment||s.observed_date!==c.observed_date||
  s.source!=='LIVE_SUPABASE_MCP_SQL_CATALOG_READONLY'||
  s.production_authorized!==false||s.supabase_write_performed!==false)
  fail('INVALID_SCOPE_OR_AUTHORITY');
 const db=s.live_database_state;
 if(!db||!Array.isArray(db.functions)||!Array.isArray(db.foreign_keys)||
  !Array.isArray(db.protected_tables)||!Array.isArray(db.b3_control))
  fail('CATALOG_MISSING');
 if(db.functions.length!==c.directRoutineCount||db.foreign_keys.length!==c.foreignKeyCount||
  db.protected_tables.length!==c.protectedTables.length||
  s.direct_db_routine_consumers_total!==c.directRoutineCount||
  s.foreign_key_edges_total!==c.foreignKeyCount)
  fail('CONSUMER_GRAPH_CHANGED');
 const functions=db.functions.map(x=>x.routine);
 if(new Set(functions).size!==c.expectedFunctions.length ||
  c.expectedFunctions.some(f=>!functions.includes(f)) ||
  db.functions.some(x=>!x.registry&&!x.onboarding&&!x.engines&&!x.marketing&&!x.lrn))
  fail('MISSING_OR_FABRICATED_RPC_CONSUMER');
 const names=db.protected_tables.map(x=>x.name);
 if(new Set(names).size!==5||c.protectedTables.some(t=>!names.includes(t))||
  db.protected_tables.some(t=>t.rls!==true||Number(t.policy_count)!==0))
  fail('TABLE_RLS_OR_ACCESS_POLICY_DRIFT');
 const fkeys=db.foreign_keys;
 if(new Set(fkeys.map(x=>x.name)).size!==10||
  fkeys.some(x=>!x.child||!x.parent||!x.name)||
  !fkeys.some(x=>x.child==='cerebro_company_onboarding_preprod'&&x.parent==='cerebro_company_registry_preprod')||
  !fkeys.some(x=>x.child==='cerebro_company_engine_state_preprod'&&x.parent==='cerebro_company_onboarding_preprod')||
  !fkeys.some(x=>x.child==='cerebro_lrn001_continuation_preprod'&&x.parent==='cerebro_company_onboarding_preprod')||
  !fkeys.some(x=>x.child==='cerebro_marketing_crm_bootstrap_run_preprod'&&x.parent==='cerebro_company_onboarding_preprod'))
  fail('FOREIGN_KEY_CHAIN_UNVERIFIED');
 if(['company_registry_count','onboarding_count','engine_rows_count','marketing_receipts_count','learning_receipts_count'].some(f=>db[f]!==0))
  fail('TARGET_STATE_CHANGED');
 if(db.b3_owner_grants_count!==0||db.b3_control.length!==1||
  db.b3_control[0].company_id!=='fenix'||db.b3_control[0].environment!=='PROD'||
  db.b3_control[0].engine_id!=='JARVIS-B3-001'||
  db.b3_control[0].enabled!==false||db.b3_control[0].kill_switch!==true)
  fail('LIVE_B3_STATE_DRIFT');
 if(s.backup_snapshot_retrieved!==false||s.physical_restore_performed!==false||
  s.owner_b2_b3_physical_e2e_passed!==false||
  s.source_repo_code_consumers_exhaustively_verified!==false||
  s.owner_current_browser_canary_authenticated!==false||s.cloudflare_cut30_changed!==false)
  fail('EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
 return Object.freeze({
  db_consumers_inventory_present:true,
  app_crm_source_consumers_inventory_complete:false,
  direct_sql_functions:db.functions.length,
  foreign_keys:fkeys.length,
  rls_protected_tables:db.protected_tables.length,
  physical_restore_verified:false,
  physical_backup_available_verified:false,
  owner_b2_b3_physical_e2e_passed:false,
  b3_grants:0,b3_enabled:false,kill_switch:true,
  prod_write_eligible:false
 });
}
export function physicalCut61Gate(catalog,evidence){
 const checked=validateLiveCatalogSnapshot(catalog);
 if(!evidence||evidence.source!=='EXTERNAL_INDEPENDENT_PHYSICAL_E2E')
   return block('NO_INDEPENDENT_PHYSICAL_ACCEPTANCE',{audited:checked});
 const needed=[
  'verified_backup_source_and_restore_receipt',
  'app_crm_code_consumers_inventory_signed',
  'read_only_old_new_contract_comparison_verified',
  'physical_owner_access_current_session',
  'b2_device_enrollment_and_revocation_tested',
  'b3_scoped_owner_grant_with_expiry_verified',
  'cloudflare_cut32_owner_anonymous_access_enforcement_verified',
  'separate_secure_release_change_approved'
 ];
 const missing=needed.filter(k=>evidence[k]!==true);
 if(missing.length)return block('BACKUP_CONSUMER_AND_OWNER_GATES_MISSING',{missing,audited:checked});
 // Even hypothetical true flags cannot authorize application writes directly.
 return block('RELEASE_TRIBUNAL_PRODUCTION_GATE_NOT_EVALUATED',{audited:checked});
}
export function cut61Report(snapshot,sourceBytes){
 const metadata=validateLiveCatalogSnapshot(snapshot);
 return Object.freeze({
  schema:'cerebro.cut61.consumer.identity.restore.readonly.report.v1',
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',
  version:'CUT61-v0.1',
  original_catalog_sha256:sha(sourceBytes||Buffer.from(JSON.stringify(snapshot))),
  observed_date:'2026-11-07',
  inventory_scope:'POSTGRES_ROUTINES_AND_FKS_ONLY',
  verified_database_dependencies:metadata.direct_sql_functions+metadata.foreign_keys,
  db_functions_verified:metadata.direct_sql_functions,
  foreign_keys_verified:metadata.foreign_keys,
  rls_tables_verified:metadata.rls_protected_tables,
  app_crm_client_consumers_exhaustively_inventoried:false,
  source_project_cross_migration_approved:false,
  backup_documented:false,physical_restore_verified:false,
  cloudflare_owner_live_access_proven_in_this_cut:false,
  b2_owner_device_enrolled:false,b3_grants_found:0,b3_enabled:false,b3_kill_switch:true,
  current_browser_access_challenge:'LOGIN_REQUIRED',
  physical_restore_receipts:0,
  prod_workflows_run:0,mutating_db_requests:0,
  app_crm_modified:false,original_cut30_modified:false,
  new_paid_ai_calls:0,
  readiness:physicalCut61Gate(snapshot,null)
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4)throw Error('INPUT_AND_OUTPUT_REQUIRED');
 const file=fs.readFileSync(process.argv[2]);
 const report=cut61Report(JSON.parse(file),file);
 fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({status:report.readiness.status,reason:report.readiness.code,
  routines:report.db_functions_verified,fks:report.foreign_keys_verified,
  owner_e2e_verified:false,db_writes:report.mutating_db_requests}));
}
