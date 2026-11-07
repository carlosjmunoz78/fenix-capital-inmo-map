/**
 * CUT58 · Readiness of the *existing* LRN-001 RPC in Supabase.
 * This is a zero-network, zero-write policy gate for trusted backend
 * inspection only. It must not create company registrations, motor GREEN
 * statuses or release manifests. Never use client-supplied status in PROD.
 */
export const CUT58_LRN_CONTRACT=Object.freeze({
  company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',
  production_project_ref:'cluhljgonannaafpmblx',
  legacy_project_ref:'hnqlnvakzaywtafeiybt',
  existing_status_rpc:'public.cerebro_lrn001_status_preprod',
  existing_record_rpc:'public.cerebro_lrn001_record_preprod',
  required_engine_count:17,
  reads_allowed:true,recording_authorized:false,prod_write_authorized:false,
  autonomous_enrollment_authorized:false
});
const no=(code,details={})=>Object.freeze({
  status:'BLOCKED',code,read_only:true,write_authorized:false,
  integration_verified:false,prod_authorized:false,...details
});
export function assessLrnPhysicalGate(evidence){
 const c=CUT58_LRN_CONTRACT;
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))
   return no('NO_TRUSTED_BACKEND_EVIDENCE');
 if(evidence.source!=='TRUSTED_BACKEND_READONLY_PROBE' ||
    evidence.company_id!==c.company_id || evidence.environment!=='PREPROD')
   return no('UNTRUSTED_SOURCE_OR_TENANT_SCOPE');
 if(evidence.project_ref!==c.production_project_ref)
   return no('DIFFERENT_SUPABASE_PROJECT_NOT_MIGRATABLE_BY_ASSERTION');
 if(evidence.rpc_status?.ok!==true ||
    evidence.rpc_status?.company_id!==c.company_id) {
   if(evidence.rpc_status?.error==='company_not_found')return no('COMPANY_NOT_REGISTERED',{registered:false});
   return no('STATUS_RPC_NOT_AUTHENTICATED_OR_INVALID');
 }
 if(evidence.role_grants?.anon_execute!==false ||
    evidence.role_grants?.authenticated_execute!==false ||
    evidence.role_grants?.service_role_execute!==true ||
    evidence.rls_enabled!==true)
   return no('EXISTING_AUTH_OR_RLS_GUARD_UNVERIFIED');
 const count=evidence.green_engine_count;
 if(!Number.isInteger(count)||count!==17)
   return no('ALL_17_PREPROD_MOTORS_NOT_VERIFIED',{green_count:count,required:17});
 if(evidence.candidate_external_tribunal_approved!==true ||
    evidence.backup_restore_e2e_verified!==true ||
    evidence.owner_identity_b2b3_e2e_verified!==true ||
    evidence.cost_reconciled!==true)
   return no('INDEPENDENT_TRIBUNAL_IDENTITY_ROLLBACK_AND_COST_GATES_PENDING');
 // Intentional: status-only inspection does not confer WRITE or PROD.
 return Object.freeze({status:'READ_ONLY_GATES_PRESENT_NOT_WRITE_APPROVED',
   code:'FURTHER_GOVERNED_APPROVAL_REQUIRED',
   read_only:true,write_authorized:false,prod_authorized:false,
   integration_verified:false,release_manifest_authorized:false});
}
export function buildObservedCut58Snapshot(){
 return {
   source:'TRUSTED_BACKEND_READONLY_PROBE',
   company_id:'fenix',
   environment:'PREPROD',
   project_ref:'cluhljgonannaafpmblx',
   rpc_status:{ok:false,error:'company_not_found',status:404},
   green_engine_count:0,
   lrn_receipt_count:0,
   role_grants:{anon_execute:false,authenticated_execute:false,service_role_execute:true},
   rls_enabled:true,
   candidate_external_tribunal_approved:false,
   backup_restore_e2e_verified:false,
   owner_identity_b2b3_e2e_verified:false,
   cost_reconciled:false,
   source_project_comparison:{
     project_ref:'hnqlnvakzaywtafeiybt',registered_company_count:1,
     physical_lrn_rpc_not_found:true,green:11,ready:2,blocked:4,
     source_as_of:'2026-10-13',not_live_motor_proof:true
   },
   observation_date:'2026-11-07'
 };
}
export function verifyObservedCut58(){
 const data=buildObservedCut58Snapshot();
 return Object.freeze({schema:'jarvis.cut58.lrn.readonly.gate.v1',
  state:assessLrnPhysicalGate(data),
  observed:data,
  trusted_live_connectivity:false,
  safe_write_requests_issued:0,prod_mutations:0,paid_api_requests:0});
}
if(process.argv[1]&&import.meta.url.endsWith('/cut58-lrn-physical-gate-v0.mjs')){
 console.log(JSON.stringify(verifyObservedCut58()));
}
