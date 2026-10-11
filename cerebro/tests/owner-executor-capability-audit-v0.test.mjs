import test from 'node:test';
import assert from 'node:assert/strict';
import {auditOwnerExecutors} from '../runtime/owner-executor-capability-audit.mjs';

const registry={
 schema_version:'0.1.0',state_type:'CEREBRO_OWNER_EXECUTOR_CAPABILITY_REGISTRY_V0',company_id:'GLOBAL_OR_SCOPED',engine_id:'AUTO-001',environment:'CONTROL_PLANE',version:'0.1.0',
 policy:{evidence_required:true,unknown_means_no_authority:true,historical_branch_does_not_equal_current_runtime:true,external_assistant_capability_does_not_equal_cerebro_runtime:true,additional_subscription_eur:0},
 capabilities:[
  {engine_id:'HCI-001',classification:'OWNER_ASSISTED_NO_VERIFIED_CODE_EXECUTOR',current_main:true,code_patch_generation:false,repository_write:false,branch_creation:false,pull_request_creation:false,prod_write:false,evidence:['registry','qa-plan']},
  {engine_id:'AUTO-001',classification:'DEFINED_CURRENT_HISTORICAL_PLANNER_ONLY',current_main:false,code_patch_generation:false,repository_write:false,branch_creation:false,pull_request_creation:false,prod_write:false,evidence:['historical-plan-only']}
 ]
};
const basePlan={repair_id:'self:1',company_id:'fenix',engine_id:'SELF-001',owner_engine:'HCI-001',environment:'PREPROD',version:'0.1.0',case_id:'case-1',source:'IMPROVEMENT',action:'PREPARE_OWNER_PATCH',status:'PLAN_READY',execute:false,prod_write_authorized:false,additional_cost_eur:0};
const healing={schema_version:'0.1.0',state_type:'CEREBRO_SELF_HEALING_PLAN_BATCH_V0',company_id:'fenix',engine_id:'SELF-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',updated_at:'2026-10-11T01:00:00Z',plans:[basePlan],execution_authority:{plan_only:true,code_mutation_authorized:false,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false},safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}};

test('assisted owner is not silently upgraded into a code executor',()=>{
 const out=auditOwnerExecutors({registry,healing,now:'2026-10-11T02:00:00Z'});
 assert.equal(out.status,'SAFE_HOLD_NO_VERIFIED_CODE_EXECUTOR');
 assert.equal(out.verified_code_executors,0);
 assert.equal(out.owners_without_verified_executor,1);
 assert.equal(out.owners[0].owner_engine,'HCI-001');
 assert.equal(out.owners[0].verified_code_executor,false);
 assert.equal(out.owners[0].next_action,'KEEP_SELF001_PLAN_ONLY');
 assert.equal(out.next_gate,'AUTO001_PREPROD_PATCH_EXECUTOR_V0_DESIGN');
 assert.equal(out.authority.code_mutation_authorized,false);
 assert.equal(out.safety.additional_subscription_eur,0);
});

test('unknown owner fails closed',()=>{
 const unknown={...healing,plans:[{...basePlan,owner_engine:'UNKNOWN-001'}]};
 const out=auditOwnerExecutors({registry,healing:unknown});
 assert.equal(out.owners[0].classification,'UNKNOWN_FAIL_CLOSED');
 assert.equal(out.owners[0].verified_code_executor,false);
});

test('only current-main complete PREPROD code capability can be classified verified',()=>{
 const capable={...registry,capabilities:[...registry.capabilities,{engine_id:'APP-001',classification:'PREPROD_PATCH_EXECUTOR',current_main:true,code_patch_generation:true,repository_write:true,branch_creation:true,pull_request_creation:true,prod_write:false,evidence:['main-runtime','tests','preprod-gate']}]};
 const h={...healing,plans:[{...basePlan,owner_engine:'APP-001'}]};
 const out=auditOwnerExecutors({registry:capable,healing:h});
 assert.equal(out.status,'EXECUTOR_CAPABILITIES_VERIFIED');
 assert.equal(out.verified_code_executors,1);
 assert.equal(out.owners[0].next_action,'ROUTE_TO_VERIFIED_EXECUTOR');
 assert.equal(out.authority.prod_write_authorized,false);
});

test('registry and healing safety drift are rejected',()=>{
 assert.throws(()=>auditOwnerExecutors({registry:{...registry,policy:{...registry.policy,additional_subscription_eur:1}},healing}),/cost drift/);
 assert.throws(()=>auditOwnerExecutors({registry,healing:{...healing,safety:{...healing.safety,prod_write:true}}}),/safety drift/);
});
