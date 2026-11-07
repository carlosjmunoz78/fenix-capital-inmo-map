import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTRY_CONTRACT,evaluateCompanyOnboardingReadiness,observedCut60RegistryAssessment} from './cut60-company-onboarding-readiness-v0.mjs';
const status=()=>({
 source:'SUPABASE_MCP_METADATA_READONLY_2026-11-07',
 project_ref:'cluhljgonannaafpmblx',company_id:'fenix',
 rls_enabled_for_all_five:true,
 grants:{anon_execute:false,authenticated_execute:false,service_role_execute:true},
 rpc_definer_owner_auth_e2e_verified:false,relationships_match:true,
 registry_onboarding_idempotency_unique:true,
 onboarding_writes_17_engine_states:true,initial_scaffold_green_count:3,
 registered_company_rows:0,onboarding_rows:0,registered_engine_rows:0,
 marketing_crm_receipts:0,lrn_receipts:0,
 physical_backup_snapshot_verified:false,restore_test_verified:false,
 consumer_dependency_inventory_complete:false,current_owner_b2b3_e2e_verified:false,
 no_collision_with_app_crm_verified:false,registry_company_profile_contract_verified:false
});
test('CUT60 current PROD registry is BLOCKED despite available schemas and RPCs',()=>{
 const r=observedCut60RegistryAssessment();
 assert.equal(r.gate.verdict,'NO_GO');
 assert.equal(r.gate.reason,'BACKUP_RESTORE_DEPENDENCY_IDENTITY_GATES_PENDING');
 assert.equal(r.initial_scaffold_green_count,3);
 assert.equal(r.initial_green_are_runtime_certified,false);
 assert.equal(r.physical_green_count,0);
 assert.equal(r.ready_to_ingest_lrn,false);
 assert.equal(r.mutating_rpc_calls,0);
 assert.equal(r.supabase_writes,0);
 assert.equal(r.app_preprod_reactivated,false);
});
test('exact FK chain and mutation functions do not create a direct LRN release route',()=>{
 assert.deepEqual(REGISTRY_CONTRACT.relations[0],['cerebro_company_registry_preprod','ROOT']);
 assert.equal(REGISTRY_CONTRACT.relations.length,5);
 assert.deepEqual(REGISTRY_CONTRACT.initial_green_by_scaffold,['TENANT-001','COMP-REG-001','COMP-ONB-001']);
 assert.equal(REGISTRY_CONTRACT.required_rpc_sequence.length,4);
});
test('tenant, namespace, auth and RLS mismatch fail closed',()=>{
 const s=status();
 assert.equal(evaluateCompanyOnboardingReadiness({...s,company_id:'other'}).reason,'WRONG_TENANT_OR_UNVERIFIED_BACKEND');
 assert.equal(evaluateCompanyOnboardingReadiness({...s,project_ref:'hnqlnvakzaywtafeiybt'}).reason,'WRONG_TENANT_OR_UNVERIFIED_BACKEND');
 assert.equal(evaluateCompanyOnboardingReadiness({...s,rls_enabled_for_all_five:false}).reason,'RPC_AUTH_AND_RLS_NEED_OWNER_E2E');
 assert.equal(evaluateCompanyOnboardingReadiness({...s,grants:{...s.grants,anon_execute:true}}).reason,'RPC_AUTH_AND_RLS_NEED_OWNER_E2E');
});
test('any changed destination state requires new source read rather than blind replay',()=>{
 const s=status();
 for(const field of ['registered_company_rows','onboarding_rows','registered_engine_rows','marketing_crm_receipts','lrn_receipts'])
  assert.equal(evaluateCompanyOnboardingReadiness({...s,[field]:1}).reason,'SOURCE_SNAPSHOT_CHANGED_REAUDIT_REQUIRED',field);
});
test('onboarding initial metadata GREEN is not physical acceptance and must be exact',()=>{
 const s=status();
 assert.equal(evaluateCompanyOnboardingReadiness({...s,initial_scaffold_green_count:17}).reason,'MISMATCH_IN_REAL_ONBOARDING_CONTRACT');
 assert.equal(evaluateCompanyOnboardingReadiness({...s,onboarding_writes_17_engine_states:false}).reason,'MISMATCH_IN_REAL_ONBOARDING_CONTRACT');
});
test('backup and rollback and owner identity all must pass for a guarded preflight',()=>{
 const s=status();
 const r=evaluateCompanyOnboardingReadiness(s);
 assert.deepEqual(r.missing.sort(),[
  'physical_backup_snapshot_verified','restore_test_verified',
  'consumer_dependency_inventory_complete','current_owner_b2b3_e2e_verified',
  'no_collision_with_app_crm_verified','registry_company_profile_contract_verified'
 ].sort());
 assert.equal(r.company_registry_write,false);
 assert.equal(r.onboarding_write,false);
});
test('even fully simulated green prerequisites cannot silently grant a PROD write',()=>{
 const s=status();
 for(const k of ['physical_backup_snapshot_verified','restore_test_verified',
  'consumer_dependency_inventory_complete','current_owner_b2b3_e2e_verified',
  'no_collision_with_app_crm_verified','registry_company_profile_contract_verified'])
  s[k]=true;
 const r=evaluateCompanyOnboardingReadiness(s);
 assert.equal(r.verdict,'NO_GO');
 assert.equal(r.reason,'REQUIRES_GOVERNED_CHANGE_REQUEST_AND_PHYSICAL_ACCEPTANCE');
 assert.equal(r.company_registry_write,false);
 assert.equal(r.onboarding_write,false);
 assert.equal(r.lrn_write,false);
 assert.equal(r.production_promotion,false);
});
