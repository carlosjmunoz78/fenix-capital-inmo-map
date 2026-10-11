import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAppAuthShellRoleMain} from '../platform/patch-transforms/app-auth-shell-role-main-v0.mjs';
import {validateCertifiedRepair} from '../qa/auto001-repair-validator-v0.mjs';
import {judgeAuto001Repair} from '../governance/auto001-repair-tribunal-v0.mjs';

const base='A <div className="auth-shell"> one </div> B <div className="auth-shell"> two </div>';
const candidate=applyAppAuthShellRoleMain(base).content;

test('QA proves measured OLD vs NEW improvement plus exact rebuild and rollback',()=>{
 const state=validateCertifiedRepair({baseSource:base,candidateSource:candidate,baseSha:'base',headSha:'head'});
 assert.equal(state.status,'VALIDATION_GREEN');
 assert.deepEqual(state.old_vs_new,{metric:'public_auth_main_landmarks',measurement:'CONTROLLED_SOURCE_OLD_VS_NEW',old:0,new:2,expected_direction:'HIGHER',improved:true});
 assert.equal(state.regression.passed,true);
 assert.equal(state.rebuild.passed,true);
 assert.equal(state.rollback.passed,true);
 assert.equal(state.promotion_authorized,false);
});

test('QA rejects any candidate that is not the exact certified rebuild',()=>{
 const state=validateCertifiedRepair({baseSource:base,candidateSource:candidate+' extra'});
 assert.equal(state.status,'VALIDATION_RED');
 assert.equal(state.rebuild.passed,false);
});

test('independent tribunal approves PREPROD evidence but never merge or PROD',()=>{
 const validation=validateCertifiedRepair({baseSource:base,candidateSource:candidate});
 const verdict=judgeAuto001Repair({validation,build_green:true,targeted_tests_green:true,diff_files:1,diff_line_delta:2});
 assert.equal(verdict.status,'APPROVE_PREPROD_PATCH');
 assert.equal(verdict.approved,true);
 assert.equal(verdict.authority.merge_authorized,false);
 assert.equal(verdict.authority.prod_write_authorized,false);
 assert.equal(verdict.next_gate,'GOVERNED_LOW_RISK_PROMOTION_POLICY');
});

test('tribunal fails closed if any mandatory proof is missing',()=>{
 const validation=validateCertifiedRepair({baseSource:base,candidateSource:candidate});
 const verdict=judgeAuto001Repair({validation,build_green:false,targeted_tests_green:true,diff_files:1,diff_line_delta:2});
 assert.equal(verdict.status,'REJECT_PREPROD_PATCH');
 assert.ok(verdict.reasons.includes('BUILD_RED'));
});
