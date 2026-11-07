import test from 'node:test';
import assert from 'node:assert/strict';
import {CUT58_LRN_CONTRACT,assessLrnPhysicalGate,buildObservedCut58Snapshot,verifyObservedCut58} from './cut58-lrn-physical-gate-v0.mjs';
const source=()=>buildObservedCut58Snapshot();
const registered=()=>({...source(),rpc_status:{ok:true,company_id:'fenix',full_17_engine_preprod_green:false}});
test('CUT58 exact existing Supabase RPC is read-only and no migration assumed',()=>{
 const c=CUT58_LRN_CONTRACT;
 assert.equal(c.production_project_ref,'cluhljgonannaafpmblx');
 assert.equal(c.legacy_project_ref,'hnqlnvakzaywtafeiybt');
 assert.equal(c.existing_status_rpc,'public.cerebro_lrn001_status_preprod');
 assert.equal(c.recording_authorized,false);
 assert.equal(c.prod_write_authorized,false);
});
test('current observed physical state denies enrollment and missing company',()=>{
 const state=verifyObservedCut58();
 assert.equal(state.state.code,'COMPANY_NOT_REGISTERED');
 assert.equal(state.observed.green_engine_count,0);
 assert.equal(state.safe_write_requests_issued,0);
 assert.equal(state.prod_mutations,0);
 assert.equal(state.paid_api_requests,0);
});
test('wrong environment, tenant, project and user-provided sources fail closed',()=>{
 assert.equal(assessLrnPhysicalGate(undefined).code,'NO_TRUSTED_BACKEND_EVIDENCE');
 assert.equal(assessLrnPhysicalGate({...source(),company_id:'competitor'}).code,'UNTRUSTED_SOURCE_OR_TENANT_SCOPE');
 assert.equal(assessLrnPhysicalGate({...source(),source:'CLIENT_JSON'}).code,'UNTRUSTED_SOURCE_OR_TENANT_SCOPE');
 assert.equal(assessLrnPhysicalGate({...source(),project_ref:'hnqlnvakzaywtafeiybt'}).code,'DIFFERENT_SUPABASE_PROJECT_NOT_MIGRATABLE_BY_ASSERTION');
});
test('11, 16 or 18 greens cannot pass exact 17 gate',()=>{
 for(const count of [0,11,16,18]){
  const r=assessLrnPhysicalGate({...registered(),green_engine_count:count});
  assert.equal(r.code,'ALL_17_PREPROD_MOTORS_NOT_VERIFIED',String(count));
  assert.equal(r.write_authorized,false);
 }
});
test('RLS and role grants must match existing protected RPC',()=>{
 for(const changes of [
   {rls_enabled:false},
   {role_grants:{anon_execute:true,authenticated_execute:false,service_role_execute:true}},
   {role_grants:{anon_execute:false,authenticated_execute:true,service_role_execute:true}},
   {role_grants:{anon_execute:false,authenticated_execute:false,service_role_execute:false}},
 ]){
  const r=assessLrnPhysicalGate({...registered(),green_engine_count:17,...changes});
  assert.equal(r.code,'EXISTING_AUTH_OR_RLS_GUARD_UNVERIFIED');
 }
});
test('even 17 green cannot authorize write without independent tribunal, owner and rollback',()=>{
 const r=assessLrnPhysicalGate({...registered(),green_engine_count:17});
 assert.equal(r.code,'INDEPENDENT_TRIBUNAL_IDENTITY_ROLLBACK_AND_COST_GATES_PENDING');
 assert.equal(r.write_authorized,false);
});
test('full simulated gate still gives NO production write permission, requires real release',()=>{
 const r=assessLrnPhysicalGate({...registered(),green_engine_count:17,
  candidate_external_tribunal_approved:true,
  backup_restore_e2e_verified:true,
  owner_identity_b2b3_e2e_verified:true,
  cost_reconciled:true
 });
 assert.equal(r.status,'READ_ONLY_GATES_PRESENT_NOT_WRITE_APPROVED');
 assert.equal(r.write_authorized,false);
 assert.equal(r.prod_authorized,false);
 assert.equal(r.integration_verified,false);
});
