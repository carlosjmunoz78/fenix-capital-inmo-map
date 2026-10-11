import test from 'node:test';
import assert from 'node:assert/strict';
import {assessGovernedMainIntegration} from '../governance/governed-main-integration-v0.mjs';

const autoState={
  state_type:'CEREBRO_AUTO001_REPAIR_AUTONOMY_STATE_V0',
  transform_id:'APP_AUTH_SHELL_ROLE_MAIN_V0',
  branch:'cerebro/auto001-abc',
  base_sha:'base123',
  preprod_patch_validated:true,
  regression_passed:true,
  rebuild_passed:true,
  rollback_passed:true,
  tribunal_approved:true,
  tribunal_status:'APPROVE_PREPROD_PATCH',
  safety:{prod_write:false,customer_data:false,trading:false,additional_subscription_eur:0}
};
const facts={state_type:'CEREBRO_AUTO001_PR_FACTS_V0',base_ref:'main',base_sha:'base123',head_ref:'cerebro/auto001-abc',changed_files:['src/App.tsx'],line_delta:4,commit_messages:'fix(AUTO-001): certified HCI patch'};
const policy={
  state_type:'CEREBRO_QA_CERTIFIED_MAIN_INTEGRATION_POLICY_V0',
  main_integration_authorized:true,prod_deploy_authorized:false,prod_write_authorized:false,
  classes:[{class_id:'APP_HCI_AUTH_MAIN_LANDMARK_V0',transform_id:'APP_AUTH_SHELL_ROLE_MAIN_V0',head_prefix:'cerebro/auto001-',allowed_files:['src/App.tsx'],max_files_changed:1,max_line_delta:4,required_source_markers:['role="main"'],forbidden_commit_markers:['[DEPLOY_PROD]'],main_merge_authorized:true,prod_deploy_authorized:false}]
};
const source='<div className="auth-shell" role="main">';

test('certified bounded patch can integrate into main without granting PROD deploy',()=>{
  const state=assessGovernedMainIntegration({autoState,prFacts:facts,policy,sourceText:source,now:'2026-10-11T09:00:00Z'});
  assert.equal(state.status,'MAIN_INTEGRATION_READY');
  assert.equal(state.authority.main_merge_authorized,true);
  assert.equal(state.authority.prod_deploy_authorized,false);
  assert.equal(state.authority.prod_write_authorized,false);
  assert.equal(state.human_required,null);
});

test('PROD deployment marker is a hard fail-closed blocker',()=>{
  const state=assessGovernedMainIntegration({autoState,prFacts:{...facts,commit_messages:'fix: patch [DEPLOY_PROD]'},policy,sourceText:source});
  assert.equal(state.status,'HUMAN_REQUIRED');
  assert.ok(state.blockers.includes('PROD_DEPLOY_MARKER_FORBIDDEN'));
  assert.equal(state.authority.main_merge_authorized,false);
});

test('unexpected file or oversized diff cannot auto integrate',()=>{
  const fileState=assessGovernedMainIntegration({autoState,prFacts:{...facts,changed_files:['src/App.tsx','package.json']},policy,sourceText:source});
  assert.equal(fileState.status,'HUMAN_REQUIRED');
  assert.ok(fileState.blockers.includes('FILE_COUNT_OUT_OF_BOUNDS'));
  assert.ok(fileState.blockers.includes('UNAUTHORIZED_FILE_CHANGED'));
  const deltaState=assessGovernedMainIntegration({autoState,prFacts:{...facts,line_delta:5},policy,sourceText:source});
  assert.ok(deltaState.blockers.includes('LINE_DELTA_OUT_OF_BOUNDS'));
});

test('tribunal regression rollback and exact branch/base evidence remain mandatory',()=>{
  const state=assessGovernedMainIntegration({autoState:{...autoState,rollback_passed:false},prFacts:{...facts,head_ref:'cerebro/auto001-other'},policy,sourceText:source});
  assert.equal(state.status,'HUMAN_REQUIRED');
  assert.ok(state.blockers.includes('ROLLBACK_NOT_GREEN'));
  assert.ok(state.blockers.includes('HEAD_BRANCH_STATE_MISMATCH'));
});

test('uncertified transform fails closed',()=>{
  const state=assessGovernedMainIntegration({autoState:{...autoState,transform_id:'UNKNOWN_TRANSFORM'},prFacts:facts,policy,sourceText:source});
  assert.equal(state.status,'HUMAN_REQUIRED');
  assert.ok(state.blockers.includes('TRANSFORM_NOT_CERTIFIED_FOR_MAIN_INTEGRATION'));
});
