/**
 * CUT60 · Existing 2-step company registry/onboarding safety gate.
 *
 * Read-only snapshot of the actual Supabase schema and RPC signatures.
 * Does NOT invoke registration, onboard, LRN or Marketing/CRM record APIs.
 * Explicitly separate three BOOTSTRAP_ASSUMED_GREEN from physical evidence.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const REGISTRY_CONTRACT=Object.freeze({
 company_id:'fenix',project_ref:'cluhljgonannaafpmblx',
 required_rpc_sequence:Object.freeze([
  'public.cerebro_company_register_preprod',
  'public.cerebro_company_onboarding_start_preprod',
  'public.cerebro_marketing_crm_bootstrap_record_preprod',
  'public.cerebro_lrn001_record_preprod'
 ]),
 relations:Object.freeze([
  ['cerebro_company_registry_preprod','ROOT'],
  ['cerebro_company_onboarding_preprod','cerebro_company_registry_preprod'],
  ['cerebro_company_engine_state_preprod','cerebro_company_onboarding_preprod'],
  ['cerebro_marketing_crm_bootstrap_run_preprod','cerebro_company_onboarding_preprod'],
  ['cerebro_lrn001_continuation_preprod','cerebro_company_onboarding_preprod']
 ]),
 stage_count:17,
 initial_green_by_scaffold:Object.freeze(['TENANT-001','COMP-REG-001','COMP-ONB-001']),
 authorized_new_paid_spend_eur:0
});
const deny=(reason,fields={})=>Object.freeze({
 verdict:'NO_GO',reason,
 stage:'READ_ONLY_REGISTRY_ASSESSMENT',authority:'NO_WRITE',
 company_registry_write:false,onboarding_write:false,lrn_write:false,
 production_promotion:false,app_crm_modified:false,
 ...fields
});
export function evaluateCompanyOnboardingReadiness(input){
 const c=REGISTRY_CONTRACT;
 if(!input||input.source!=='SUPABASE_MCP_METADATA_READONLY_2026-11-07'||
  input.project_ref!==c.project_ref||input.company_id!==c.company_id)
  return deny('WRONG_TENANT_OR_UNVERIFIED_BACKEND');
 if(input.rls_enabled_for_all_five!==true ||
    input.grants?.anon_execute!==false ||
    input.grants?.authenticated_execute!==false ||
    input.grants?.service_role_execute!==true ||
    input.rpc_definer_owner_auth_e2e_verified!==false)
  return deny('RPC_AUTH_AND_RLS_NEED_OWNER_E2E');
 if(input.relationships_match!==true||
    input.registry_onboarding_idempotency_unique!==true||
    input.onboarding_writes_17_engine_states!==true||
    input.initial_scaffold_green_count!==3)
  return deny('MISMATCH_IN_REAL_ONBOARDING_CONTRACT');
 if(input.registered_company_rows!==0||input.onboarding_rows!==0||
    input.registered_engine_rows!==0||input.marketing_crm_receipts!==0||
    input.lrn_receipts!==0)
  return deny('SOURCE_SNAPSHOT_CHANGED_REAUDIT_REQUIRED');
 // A real backup is NOT an SQL SELECT snapshot and must have a proved restore.
 if(input.physical_backup_snapshot_verified!==true||
    input.restore_test_verified!==true||
    input.consumer_dependency_inventory_complete!==true||
    input.current_owner_b2b3_e2e_verified!==true||
    input.no_collision_with_app_crm_verified!==true||
    input.registry_company_profile_contract_verified!==true)
  return deny('BACKUP_RESTORE_DEPENDENCY_IDENTITY_GATES_PENDING',{
    missing:[
      ['physical_backup_snapshot_verified',input.physical_backup_snapshot_verified],
      ['restore_test_verified',input.restore_test_verified],
      ['consumer_dependency_inventory_complete',input.consumer_dependency_inventory_complete],
      ['current_owner_b2b3_e2e_verified',input.current_owner_b2b3_e2e_verified],
      ['no_collision_with_app_crm_verified',input.no_collision_with_app_crm_verified],
      ['registry_company_profile_contract_verified',input.registry_company_profile_contract_verified]
    ].filter(([,v])=>v!==true).map(([x])=>x)
  });
 // Even with hypothetical green flags, this gate does not permit mutations.
 return deny('REQUIRES_GOVERNED_CHANGE_REQUEST_AND_PHYSICAL_ACCEPTANCE',{
   prerequisites_read_only_met:true,physical_motor_green_verified:0
 });
}
export function observedCut60RegistryAssessment(){
 const input={
   source:'SUPABASE_MCP_METADATA_READONLY_2026-11-07',
   project_ref:'cluhljgonannaafpmblx',company_id:'fenix',
   registered_company_rows:0,onboarding_rows:0,registered_engine_rows:0,
   marketing_crm_receipts:0,lrn_receipts:0,
   rls_enabled_for_all_five:true,
   grants:{anon_execute:false,authenticated_execute:false,service_role_execute:true},
   rpc_definer_owner_auth_e2e_verified:false,
   relationships_match:true,registry_onboarding_idempotency_unique:true,
   onboarding_writes_17_engine_states:true,initial_scaffold_green_count:3,
   physical_backup_snapshot_verified:false,restore_test_verified:false,
   consumer_dependency_inventory_complete:false,current_owner_b2b3_e2e_verified:false,
   no_collision_with_app_crm_verified:false,registry_company_profile_contract_verified:false
 };
 const result=evaluateCompanyOnboardingReadiness(input);
 return {
   schema:'cerebro.jarvis.cut60.company.registry.readonly.gate.v1',
   company_id:'fenix',environment:'LAB',version:'CUT60-v0.1.0',
   observation_date:'2026-11-07',
   target_project_ref:'cluhljgonannaafpmblx',
   existing_database_mutator_functions:REGISTRY_CONTRACT.required_rpc_sequence,
   target_relations:REGISTRY_CONTRACT.relations,
   initial_scaffold_green_count:3,
   physical_green_count:0,
   initial_green_are_runtime_certified:false,
   app_preprod_reactivated:false,
   ready_to_register:false,
   ready_to_ingest_lrn:false,
   source_metadata_observed_only:true,
   current_observed_counts:{
     registry:input.registered_company_rows,onboarding:input.onboarding_rows,
     engines:input.registered_engine_rows,
     marketing_crm:input.marketing_crm_receipts,lrn:input.lrn_receipts
   },
   gate:result,mutating_rpc_calls:0,supabase_writes:0,
   additional_paid_ai_calls:0,new_subscriptions:0
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=observedCut60RegistryAssessment();
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({verdict:result.gate.verdict,reason:result.gate.reason,
  mutator_calls:0,db_writes:0,physical_green_count:0}));
}
