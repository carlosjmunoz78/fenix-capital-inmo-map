import test from 'node:test';
import assert from 'node:assert/strict';
import {planAuto001Patch} from '../platform/auto001-preprod-patch-planner-v0.mjs';
import {applyAppAuthShellRoleMain} from '../platform/patch-transforms/app-auth-shell-role-main-v0.mjs';

const sourceMap={
 state_type:'CEREBRO_QA_SOURCE_MAPPING_STATE_V0',company_id:'fenix',
 safety:{prod_write:false,customer_data:false,trading:false,additional_subscription_eur:0},
 mappings:[{repair_id:'r1',case_id:'c1',owner_engine:'HCI-001',target:'APP:qa-mobile-chromium',dimension:'accessibility_semantics',execution_authority:{prod_write_authorized:false},resolution:{status:'SOURCE_HINT_VERIFIED',repository:'carlosjmunoz78/fenix-capital-inmo-map',file_hints:['src/App.tsx']}}]
};

const pendingSource='A <div className="auth-shell"> one </div> B <div className="auth-shell"> two </div>';
const appliedSource='A <div className="auth-shell" role="main"> one </div> B <div className="auth-shell" role="main"> two </div>';

test('AUTO-001 plans only the certified APP accessibility transform when source shape is ready',()=>{
 const plan=planAuto001Patch(sourceMap,{baseSha:'abc123',sourceText:pendingSource});
 assert.equal(plan.status,'PATCH_PLAN_READY');
 assert.equal(plan.transform_id,'APP_AUTH_SHELL_ROLE_MAIN_V0');
 assert.deepEqual(plan.allowed_files,['src/App.tsx']);
 assert.equal(plan.max_files_changed,1);
 assert.equal(plan.auto_merge,false);
 assert.equal(plan.prod_write_authorized,false);
 assert.equal(plan.additional_cost_eur,0);
});

test('AUTO-001 certified mapping selection is deterministic across equivalent mapping permutations',()=>{
 const a=structuredClone(sourceMap.mappings[0]);
 Object.assign(a,{repair_id:'r-a',case_id:'c-a',target:'APP:qa-mobile-alpha'});
 const z=structuredClone(sourceMap.mappings[0]);
 Object.assign(z,{repair_id:'r-z',case_id:'c-z',target:'APP:qa-mobile-zeta'});
 const first=structuredClone(sourceMap);first.mappings=[z,a];
 const second=structuredClone(sourceMap);second.mappings=[a,z];
 const planOne=planAuto001Patch(first,{baseSha:'abc123',sourceText:pendingSource});
 const planTwo=planAuto001Patch(second,{baseSha:'abc123',sourceText:pendingSource});
 assert.equal(planOne.status,'PATCH_PLAN_READY');
 assert.equal(planTwo.status,'PATCH_PLAN_READY');
 assert.equal(planOne.source_repair_id,'r-a');
 assert.equal(planTwo.source_repair_id,'r-a');
 assert.equal(planOne.plan_id,planTwo.plan_id);
});

test('AUTO-001 fails closed when no certified transform matches',()=>{
 const other=structuredClone(sourceMap);other.mappings[0].dimension='mobile_usability';
 const plan=planAuto001Patch(other,{baseSha:'abc123',sourceText:pendingSource});
 assert.equal(plan.status,'NO_ELIGIBLE_PATCH');
 assert.equal(plan.execute,false);
 assert.equal(plan.reason,'NO_CERTIFIED_TRANSFORM_MATCH');
});

test('AUTO-001 treats an already-satisfied certified transform as a healthy no-op',()=>{
 const plan=planAuto001Patch(sourceMap,{baseSha:'abc123',sourceText:appliedSource});
 assert.equal(plan.status,'NO_ELIGIBLE_PATCH');
 assert.equal(plan.execute,false);
 assert.equal(plan.reason,'CERTIFIED_TRANSFORM_ALREADY_SATISFIED');
 assert.equal(plan.source_state.applied,2);
 assert.equal(plan.prod_write_authorized,false);
 assert.equal(plan.additional_cost_eur,0);
});

test('AUTO-001 fails closed instead of mutating an unknown source shape',()=>{
 const plan=planAuto001Patch(sourceMap,{baseSha:'abc123',sourceText:'<div className="auth-shell">'});
 assert.equal(plan.status,'NO_ELIGIBLE_PATCH');
 assert.equal(plan.reason,'CERTIFIED_TRANSFORM_SOURCE_SHAPE_NOT_PROVEN');
 assert.equal(plan.execute,false);
});

test('certified transform adds role main only to the two known auth shells',()=>{
 const result=applyAppAuthShellRoleMain(pendingSource);
 assert.equal(result.status,'PATCH_APPLIED');
 assert.equal(result.replacements,2);
 assert.equal((result.content.match(/role="main"/g)||[]).length,2);
 assert.notEqual(result.before_sha256,result.after_sha256);
 const rerun=applyAppAuthShellRoleMain(result.content);
 assert.equal(rerun.status,'ALREADY_APPLIED');
 assert.equal(rerun.replacements,0);
});

test('certified transform rejects unknown partial shapes',()=>{
 assert.throws(()=>applyAppAuthShellRoleMain('<div className="auth-shell">'),/UNSAFE_AUTH_SHELL_SHAPE/);
});
