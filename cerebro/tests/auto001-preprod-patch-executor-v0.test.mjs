import test from 'node:test';
import assert from 'node:assert/strict';
import {planAuto001Patch} from '../platform/auto001-preprod-patch-planner-v0.mjs';
import {applyAppAuthShellRoleMain} from '../platform/patch-transforms/app-auth-shell-role-main-v0.mjs';

const sourceMap={
 state_type:'CEREBRO_QA_SOURCE_MAPPING_STATE_V0',company_id:'fenix',
 safety:{prod_write:false,customer_data:false,trading:false,additional_subscription_eur:0},
 mappings:[{repair_id:'r1',case_id:'c1',owner_engine:'HCI-001',target:'APP:qa-mobile-chromium',dimension:'accessibility_semantics',execution_authority:{prod_write_authorized:false},resolution:{status:'SOURCE_HINT_VERIFIED',repository:'carlosjmunoz78/fenix-capital-inmo-map',file_hints:['src/App.tsx']}}]
};

test('AUTO-001 plans only the certified APP accessibility transform',()=>{
 const plan=planAuto001Patch(sourceMap,{baseSha:'abc123'});
 assert.equal(plan.status,'PATCH_PLAN_READY');
 assert.equal(plan.transform_id,'APP_AUTH_SHELL_ROLE_MAIN_V0');
 assert.deepEqual(plan.allowed_files,['src/App.tsx']);
 assert.equal(plan.max_files_changed,1);
 assert.equal(plan.auto_merge,false);
 assert.equal(plan.prod_write_authorized,false);
 assert.equal(plan.additional_cost_eur,0);
});

test('AUTO-001 fails closed when no certified transform matches',()=>{
 const other=structuredClone(sourceMap);other.mappings[0].dimension='mobile_usability';
 const plan=planAuto001Patch(other,{baseSha:'abc123'});
 assert.equal(plan.status,'NO_ELIGIBLE_PATCH');
 assert.equal(plan.execute,false);
 assert.equal(plan.reason,'NO_CERTIFIED_TRANSFORM_MATCH');
});

test('certified transform adds role main only to the two known auth shells',()=>{
 const before='A <div className="auth-shell"> one </div> B <div className="auth-shell"> two </div>';
 const result=applyAppAuthShellRoleMain(before);
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
