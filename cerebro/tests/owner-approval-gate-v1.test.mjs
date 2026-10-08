import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOwnerAuthorization,buildOwnerDecisionAuditEvent,consumeOneTimeAuthorization} from '../communication/owner-approval-gate.mjs';

const request={approval_id:'APR-20261008-ABCDEF12',scope_fingerprint:'SCOPE-12345678',technical_id:'candidate-1',stage:'PREPROD_PROMOTION_REVIEW'};
const state={
  decisions:[{...request,decision:'AUTHORIZED',decided_at:'2026-10-08T08:00:00Z'}],
  standing_authorizations:{},
  consumed_authorizations:[]
};

test('exact owner decision authorizes only exact request',()=>{
  const ok=evaluateOwnerAuthorization({communicationState:state,request});
  assert.equal(ok.authorized,true);
  assert.equal(ok.source,'OWNER_EMAIL_EXACT_COMMAND');
  assert.equal(ok.policy_changed,false);
  const wrong=evaluateOwnerAuthorization({communicationState:state,request:{...request,stage:'OTHER_STAGE'}});
  assert.equal(wrong.authorized,false);
});

test('active standing authorization authorizes exact scope but not a different scope',()=>{
  const standing={...state,decisions:[],standing_authorizations:{'SCOPE-12345678':{status:'ACTIVE',exact_scope_only:true,approval_id:'APR-OLD'}}};
  const ok=evaluateOwnerAuthorization({communicationState:standing,request});
  assert.equal(ok.authorized,true);
  assert.equal(ok.source,'STANDING_AUTHORIZATION');
  const no=evaluateOwnerAuthorization({communicationState:standing,request:{...request,scope_fingerprint:'SCOPE-99999999'}});
  assert.equal(no.authorized,false);
});

test('audit event follows console owner decision contract semantics',()=>{
  const auth=evaluateOwnerAuthorization({communicationState:state,request});
  const event=buildOwnerDecisionAuditEvent({request,authorization:auth});
  assert.equal(event.contract_id,'CONSOLE-OWNER-DECISION-V1');
  assert.equal(event.decision_type,'human_decision');
  assert.equal(event.confirmation_semantics,'EXPLICIT_YES_TO_CURRENT_EXACT_PROPOSAL');
  assert.equal(event.scope_change_invalidates_confirmation,true);
});

test('one-time authorization is consumed once and cannot be replayed',()=>{
  const first=consumeOneTimeAuthorization(state,{...request,execution_id:'exec-1'});
  assert.equal(first.consumed,true);
  const second=consumeOneTimeAuthorization(first.state,{...request,execution_id:'exec-2'});
  assert.equal(second.consumed,false);
  assert.equal(second.authorization.reason,'ONE_TIME_AUTHORIZATION_ALREADY_CONSUMED');
});
