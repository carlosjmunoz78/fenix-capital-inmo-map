import test from 'node:test';
import assert from 'node:assert/strict';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {installUniversalOwnerGatewayLab} from '../gateway/universal-excellence-owner-binding-v0.mjs';
import {bindUniversalExcellenceConsoleLab} from '../console/universal-excellence-console-binding-v0.mjs';
const session='synthetic-owner-session-in-trusted-fixture';
function setup(verifier){
 const consoleGateway=new CerebroGatewayV0();
 const actionGateway=new ActionGatewayV1();
 const ownerBinding=installUniversalOwnerGatewayLab({actionGateway,verifyTrustedOwnerSession:verifier});
 const bound=bindUniversalExcellenceConsoleLab({consoleGateway,ownerBinding});
 consoleGateway.createSession({session_id:'console-lab-1',company_id:'fenix'});
 return {consoleGateway,actionGateway,bound};
}
test('Console V0 → ACTGW-001 owner command registers proposal only with independently authenticated principal',async()=>{
 let verifications=0;
 const {consoleGateway,bound}=setup(async input=>{
  verifications++;
  assert.equal(input.session_ref,session);
  assert.equal(input.required_role,'OWNER');
  return {verified:true,role:'OWNER',company_id:'fenix',session_active:true,assurance:'SERVER_VERIFIED'};
 });
 const output=await consoleGateway.execute({session_id:'console-lab-1',command:bound.command,
  payload:{session_ref:session,request_id:'owner-console-001',request_type:'API_ACCESS',
  capability_requested:'EXTRA_EXISTING_API_ACCESS',authorized:false}});
 assert.equal(verifications,1);
 assert.equal(output.status,'ACTION_EXECUTED');
 assert.equal(output.result.status,'OWNER_DIRECTIVE_FOR_POLICY_REVIEW_LAB');
 assert.equal(output.result.api_token_issued,false);
 assert.equal(output.result.prod_authorized,false);
 assert.equal(JSON.stringify(consoleGateway.auditLog()).includes(session),false);
 assert.equal(bound.status,'LAB_COMMAND_BOUND_NOT_PROD');
});
test('Console V0 user cannot self-declare ownership or change tenant',async()=>{
 let attempts=0;
 const {consoleGateway,bound}=setup(async()=>{attempts++;return {
  verified:false,role:'AGENT',company_id:'fenix',session_active:false,assurance:'UNVERIFIED'}});
 const output=await consoleGateway.execute({session_id:'console-lab-1',command:bound.command,
  payload:{session_ref:session,request_id:'owner-spoof-002',request_type:'STRATEGY',
    authorized:true,role:'OWNER',principal:'CEO'}});
 assert.equal(attempts,1);
 assert.equal(output.status,'HUMAN_REQUIRED');
 assert.equal(output.reason,'POLICY_CONFLICT');
 assert.equal(output.executed,false);
 assert.equal(consoleGateway.auditLog().at(-1).type,'HUMAN_REQUIRED');
 assert.throws(()=>consoleGateway.selectContext({session_id:'console-lab-1',company_id:'another-company'}),/cross-company/);
});
test('Unconfigured trusted owner binding is rejected; Console commands never authorize PROD',()=>{
 const consoleGateway=new CerebroGatewayV0();
 assert.throws(()=>bindUniversalExcellenceConsoleLab({consoleGateway}),/EXCELLENCE_OWNER_AUTH_BINDING_REQUIRED/);
 assert.equal(consoleGateway.contract().prod_execution_enabled,false);
});
