import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOwnerAuthorization,buildOwnerDecisionAuditEvent,consumeOneTimeAuthorization} from '../communication/owner-approval-gate.mjs';

const request={approval_id:'APR-20261008-ABCDEF12',scope_fingerprint:'SCOPE-12345678',technical_id:'candidate-1',stage:'PREPROD_PROMOTION_REVIEW'};
const authorizedAction={...request,status:'AUTHORIZED_WAITING_EXECUTION',source:'OWNER_EMAIL_EXACT_COMMAND',one_time:true,authorized_at:'2026-10-08T08:00:00Z'};
const state={
  decisions:[{...request,decision:'AUTHORIZED',decided_at:'2026-10-08T08:00:00Z'}],
  authorized_actions:{[request.approval_id]:authorizedAction},
  standing_authorizations:{},
  consumed_authorizations:[],
  pending:{[request.approval_id]:{...authorizedAction}}
};

test('exact persistent authorized action authorizes only the exact request',()=>{
  const ok=evaluateOwnerAuthorization({communicationState:state,request});
  assert.equal(ok.authorized,true);
  assert.equal(ok.source,'OWNER_EMAIL_EXACT_COMMAND');
  assert.equal(ok.policy_changed,false);
  const wrong=evaluateOwnerAuthorization({communicationState:state,request:{...request,stage:'OTHER_STAGE'}});
  assert.equal(wrong.authorized,false);
});

test('a historical decision alone does not authorize execution',()=>{
  const historical={decisions:state.decisions,authorized_actions:{},standing_authorizations:{}};
  const result=evaluateOwnerAuthorization({communicationState:historical,request});
  assert.equal(result.authorized,false);
  assert.equal(result.reason,'NO_MATCHING_OWNER_AUTHORIZATION');
});

test('active standing authorization requires exact scope and registered execution binding',()=>{
  const binding='SKILL_AUTONOMY_READONLY_V1';
  const standing={decisions:[],authorized_actions:{},standing_authorizations:{'SCOPE-12345678':{status:'ACTIVE',exact_scope_only:true,approval_id:'APR-OLD',execution_binding:binding}}};
  const ok=evaluateOwnerAuthorization({communicationState:standing,request:{...request,execution_binding:binding}});
  assert.equal(ok.authorized,true);
  assert.equal(ok.source,'STANDING_AUTHORIZATION');
  const noBinding=evaluateOwnerAuthorization({communicationState:standing,request});
  assert.equal(noBinding.authorized,false);
  const wrongBinding=evaluateOwnerAuthorization({communicationState:standing,request:{...request,execution_binding:'OTHER'}});
  assert.equal(wrongBinding.authorized,false);
  const wrongScope=evaluateOwnerAuthorization({communicationState:standing,request:{...request,scope_fingerprint:'SCOPE-99999999',execution_binding:binding}});
  assert.equal(wrongScope.authorized,false);
});

test('audit event follows console owner decision contract semantics',()=>{
  const auth=evaluateOwnerAuthorization({communicationState:state,request});
  const event=buildOwnerDecisionAuditEvent({request,authorization:auth});
  assert.equal(event.contract_id,'CONSOLE-OWNER-DECISION-V1');
  assert.equal(event.decision_type,'human_decision');
  assert.equal(event.confirmation_semantics,'EXPLICIT_YES_TO_CURRENT_EXACT_PROPOSAL');
  assert.equal(event.scope_change_invalidates_confirmation,true);
  assert.equal(event.permanent_policy_change,false);
});

test('one-time authorization is consumed once and cannot be replayed',()=>{
  const first=consumeOneTimeAuthorization(state,{...request,execution_id:'exec-1'});
  assert.equal(first.consumed,true);
  assert.equal(first.state.authorized_actions[request.approval_id].status,'CONSUMED');
  assert.equal(first.state.pending[request.approval_id],undefined);
  const second=consumeOneTimeAuthorization(first.state,{...request,execution_id:'exec-2'});
  assert.equal(second.consumed,false);
  assert.equal(second.authorization.reason,'NO_MATCHING_OWNER_AUTHORIZATION');
});