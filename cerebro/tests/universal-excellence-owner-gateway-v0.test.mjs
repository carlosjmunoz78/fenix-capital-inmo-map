import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {installUniversalOwnerGatewayLab} from '../gateway/universal-excellence-owner-binding-v0.mjs';
const ctx={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'};
const good=()=>({verified:true,company_id:'fenix',role:'OWNER',session_active:true,assurance:'SERVER_VERIFIED'});
const session='synthetic-session-ref-only-in-memory';
test('ACTGW-001 LAB-only owner proposal verifies identity from trusted bootstrap and never grants privileges',async()=>{
 const gateway=new ActionGatewayV1();
 let calls=0;
 const binding=installUniversalOwnerGatewayLab({actionGateway:gateway,
  verifyTrustedOwnerSession:async ({session_ref,company_id,required_role})=>{
   calls++;assert.equal(session_ref,session);assert.equal(company_id,'fenix');assert.equal(required_role,'OWNER');return good();
  }});
 const result=await binding.request({session_ref:session,request_id:'owner-test-0001',
  request_type:'API_ACCESS',capability_requested:'EXTRA_EXISTING_API_ACCESS'});
 assert.equal(calls,1);
 assert.equal(result.status,'ACTION_EXECUTED');
 assert.equal(result.result.status,'OWNER_DIRECTIVE_FOR_POLICY_REVIEW_LAB');
 assert.equal(result.result.api_token_issued,false);
 assert.equal(result.result.permissions_changed,false);
 assert.equal(result.result.prod_authorized,false);
 assert.equal(result.result.award_applied,false);
 assert.equal(result.result.replacement_executed,false);
 assert.equal(JSON.stringify(result).includes(session),false);
 assert.equal(JSON.stringify(gateway.auditLog()).includes(session),false);
 assert.equal(binding.iam_connected_in_production,false);
});
test('owner claims from untrusted payload cannot call registered gateway capability directly',async()=>{
 const gateway=new ActionGatewayV1();
 const binding=installUniversalOwnerGatewayLab({actionGateway:gateway,
  verifyTrustedOwnerSession:async()=>good()});
 const bypass=await gateway.execute({context:ctx,authorized:true,
   capability:binding.capability,idempotency_key:'bypass-1',risk:'LOW',
   payload:{owner:true,owner_id:'OWNER',ticket:'fake-not-verified',request_digest:'arbitrary'}});
 assert.equal(bypass.status,'HUMAN_REQUIRED');
 assert.equal(bypass.executed,false);
 assert.equal(bypass.reason,'POLICY_CONFLICT');
});
test('owner without session or with fake identity, cross-company and failed verifier is denied',async()=>{
 const gateway=new ActionGatewayV1();
 let calls=0;
 const binding=installUniversalOwnerGatewayLab({actionGateway:gateway,
  verifyTrustedOwnerSession:async()=>{calls++;return {verified:true,company_id:'fenix',role:'AGENT',session_active:true,assurance:'SERVER_VERIFIED'};}});
 const noSession=await binding.request({session_ref:'',request_id:'missing-1',request_type:'STRATEGY'});
 assert.equal(noSession.status,'HUMAN_REQUIRED');
 assert.equal(calls,0);
 const spoof=await binding.request({session_ref:session,request_id:'role-spoof-1',request_type:'STRATEGY'});
 assert.equal(spoof.status,'HUMAN_REQUIRED');
 assert.equal(spoof.executed,false);
 assert.equal(calls,1);
 const another=await binding.request({session_ref:session,company_id:'other',request_id:'tenant-1',request_type:'STRATEGY'});
 assert.equal(another.status,'HUMAN_REQUIRED');
 assert.equal(another.executed,false);
 assert.equal(gateway.auditLog().length,0);
});
test('reward requires scoped catalog, never automatically publishes or provisions APIs',async()=>{
 const gateway=new ActionGatewayV1();
 const binding=installUniversalOwnerGatewayLab({actionGateway:gateway,
  verifyTrustedOwnerSession:async()=>good()});
 const denied=await binding.request({session_ref:session,request_id:'reward-bad-01',
  request_type:'REWARD_PRIVILEGE',capability_requested:'WRITE_PROD'});
 assert.equal(denied.status,'HUMAN_REQUIRED');
 const valid=await binding.request({session_ref:session,request_id:'reward-good-01',
  request_type:'REWARD_PRIVILEGE',capability_requested:'HIGHER_JOB_PRIORITY_LIMIT'});
 assert.equal(valid.result.status,'OWNER_DIRECTIVE_FOR_POLICY_REVIEW_LAB');
 assert.equal(valid.result.external_writes,0);
 assert.equal(valid.result.additional_eur,0);
 const replay=await binding.request({session_ref:session,request_id:'reward-good-01',
  request_type:'REWARD_PRIVILEGE',capability_requested:'HIGHER_JOB_PRIORITY_LIMIT'});
 assert.equal(replay.status,'HUMAN_REQUIRED');
 assert.equal(replay.reason,'POLICY_CONFLICT');
});
test('adapter requires independently supplied trusted verifier and protected PREPROD action gateway',()=>{
 assert.throws(()=>installUniversalOwnerGatewayLab({actionGateway:new ActionGatewayV1()}),/TRUSTED_OWNER_VERIFIER_REQUIRED/);
 assert.throws(()=>installUniversalOwnerGatewayLab({verifyTrustedOwnerSession:async()=>good()}),/OWNER_GATEWAY_REQUIRED/);
});
