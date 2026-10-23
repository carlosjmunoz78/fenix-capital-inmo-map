import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const evidencePath=path.join(root,'docs','CEREBRO_BROWSER_PHASE2_EVIDENCE_2026-10-23.json');
const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
const checks=[];

function gate(name,condition,detail=''){
  const ok=Boolean(condition);
  checks.push({name,ok,detail});
  if(!ok)throw new Error(`TRIBUNAL_GATE_FAILED:${name}${detail?`:${detail}`:''}`);
}

function exists(rel){return fs.existsSync(path.join(root,rel));}

gate('schema',evidence.schema_version==='browser.phase2.evidence.v1');
gate('phase',evidence.phase==='BROWSER_1_PHASE_2');
gate('preprod_status',evidence.status==='PREPROD_GATES_GREEN_PROD_NOT_PROMOTED');

gate('phase1_preserved',evidence.phase1?.preserved===true);
gate('phase1_rollback_available',evidence.phase1?.rollback_available===true);
gate('phase1_dispatch_active',evidence.phase1?.dispatch_v1_active===true);
gate('phase1_credential_baseline',Number(evidence.phase1?.credential_baseline_run_id)===39937419272);
gate('phase1_credential_materialized',evidence.phase1?.credential_materialized===true);
gate('phase1_no_secret_logging',evidence.phase1?.secret_material_logged===false);

gate('preprod_enabled',evidence.orchestrator_v2?.preprod_enabled===true);
gate('operational_global_cap_8',Number(evidence.orchestrator_v2?.operational_global_max_concurrent)===8);
gate('company_cap_4',Number(evidence.orchestrator_v2?.default_company_max_concurrent)===4);
gate('department_cap_2',Number(evidence.orchestrator_v2?.default_department_max_concurrent)===2);
gate('one_writer_per_profile',evidence.orchestrator_v2?.one_writer_per_profile===true);
gate('prod_v2_disabled',evidence.orchestrator_v2?.prod_enabled===false);
gate('zero_incremental_cost',Number(evidence.orchestrator_v2?.incremental_cost_eur)===0);

gate('distributed_4_green',evidence.physical_capacity?.distributed_4?.status==='GREEN'&&Number(evidence.physical_capacity?.distributed_4?.successful)===4);
gate('single_host_8_green',evidence.physical_capacity?.single_host_8?.status==='GREEN'&&Number(evidence.physical_capacity?.single_host_8?.successful)===8);
gate('single_host_16_lab_green',evidence.physical_capacity?.single_host_16_lab?.status==='GREEN_LAB_CAPACITY_ONLY'&&Number(evidence.physical_capacity?.single_host_16_lab?.successful)===16);
gate('safe_cap_stays_8',Number(evidence.physical_capacity?.safe_operational_cap)===8);

gate('credential_binding_reuses_v1',evidence.credential_broker_v2?.binding_source==='V1_ALIAS_AND_SUPABASE_VAULT');
gate('no_new_secret_store',evidence.credential_broker_v2?.new_secret_store_created===false);
gate('credential_final_run_green',Number(evidence.credential_broker_v2?.final_physical_run_id)===39990778979&&evidence.credential_broker_v2?.status==='GREEN');
gate('credential_materialized_v2',evidence.credential_broker_v2?.credential_materialized===true);
gate('credential_no_secret_logging_v2',evidence.credential_broker_v2?.secret_material_logged===false);
gate('inactive_lease_denied',evidence.credential_broker_v2?.inactive_lease_denied===true);
gate('inactive_lease_no_secret',evidence.credential_broker_v2?.secret_returned_on_inactive_lease===false);
gate('credential_audit_present',Number(evidence.credential_broker_v2?.audit_rows_observed)>=2);
gate('credential_audit_no_secret',evidence.credential_broker_v2?.all_audit_rows_secret_material_logged_false===true);

gate('rollback_physical',evidence.rollback?.physical_preprod_tested===true);
gate('rollback_disabled_backpressure',evidence.rollback?.disabled_probe_backpressure==='ORCHESTRATOR_DISABLED');
gate('rollback_disabled_no_job',evidence.rollback?.disabled_probe_job===null);
gate('rollback_restored_enabled',evidence.rollback?.restored_enabled===true);
gate('rollback_restored_8_4_2',Number(evidence.rollback?.restored_global_max_concurrent)===8&&Number(evidence.rollback?.restored_company_max_concurrent)===4&&Number(evidence.rollback?.restored_department_max_concurrent)===2);
gate('rollback_no_active_jobs_before',Number(evidence.rollback?.active_jobs_before_test)===0);
gate('rollback_no_profile_leases_after',Number(evidence.rollback?.active_profile_leases_after_test)===0);

gate('old_vs_new_v1_secret_safe',evidence.old_vs_new?.v1_secret_logging===false);
gate('old_vs_new_v2_secret_safe',evidence.old_vs_new?.v2_secret_logging===false);
gate('v2_stricter_profile_validation',evidence.old_vs_new?.v2_adds_profile_lease_validation===true);
gate('v2_stricter_identity_account',evidence.old_vs_new?.v2_adds_identity_account_validation===true);
gate('v2_revocation_validation',evidence.old_vs_new?.v2_adds_revocation_validation===true);
gate('v1_vault_preserved',evidence.old_vs_new?.v2_preserves_v1_binding_and_vault===true);

gate('rebuild_source_controlled',evidence.rebuild?.source_controlled===true);
for(const rel of evidence.rebuild?.migrations??[])gate(`rebuild_exists:${rel}`,exists(rel));
gate('edge_source_exists',exists(evidence.rebuild?.edge_source));
for(const rel of evidence.rebuild?.runtime_sources??[])gate(`runtime_exists:${rel}`,exists(rel));

gate('no_prod_change_yet',evidence.backup?.prod_change_performed===false);
gate('phase1_git_snapshot',evidence.backup?.phase1_source_snapshot_preserved_in_git===true);
gate('phase1_runtime_preserved',evidence.backup?.phase1_runtime_preserved===true);
gate('v2_additive_database',evidence.backup?.phase2_database_changes_additive_only===true);
gate('no_destructive_migration',evidence.backup?.destructive_migration_used===false);
gate('prod_snapshot_required_before_promotion',evidence.backup?.prod_snapshot_required_before_future_prod_promotion===true);

gate('branch_reconciled',Number(evidence.branch_reconciliation?.behind_main_after_sync)===0);
gate('prod_not_promoted',evidence.promotion?.prod_promoted===false);
gate('phase3_not_started',evidence.promotion?.phase3_started===false);
gate('no_human_required',evidence.promotion?.human_required===null);

const result={
  ok:true,
  tribunal:'PASS',
  schema_version:'browser.phase2.tribunal.v1',
  checks:checks.length,
  failures:0,
  environment:'PREPROD',
  prod_promoted:false,
  phase3_started:false,
  incremental_cost_eur:0
};
console.log(JSON.stringify(result));
