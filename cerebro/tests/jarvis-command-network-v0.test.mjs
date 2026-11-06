import test from 'node:test';
import assert from 'node:assert/strict';
import { CerebroGatewayV0 } from '../console/gateway.mjs';
import { ActionGatewayV1 } from '../gateway/action-gateway-v1.mjs';
import {
 inspectJarvisCommandNetworkV0,bindJarvisCommandNetworkV0
} from '../console/jarvis-command-network-v0.mjs';

const trusted={target_id:'FACT-001',target_type:'ENGINE',company_id:'fenix',
 capability:'fact001.unit-safe-read',evidence_ref:'TEST_ONLY_LOCAL_HANDLER',
 environment:'PREPROD',prod_authorized:false,trading_access:false,
 additional_cost_eur:0,permission:'EXECUTE_PREPROD',risk:'LOW'};
const setup=({verified_targets=[],verifyOwner=async()=>false}={})=>{
 const consoleGateway=new CerebroGatewayV0();
 const actionGateway=new ActionGatewayV1();
 const binding=bindJarvisCommandNetworkV0({consoleGateway,actionGateway,verified_targets,verifyOwner});
 consoleGateway.createSession({session_id:'unit-session',company_id:'fenix'});
 return {consoleGateway,actionGateway,binding};
};
const run=(gateway,command,payload={})=>gateway.execute({session_id:'unit-session',command,payload});

test('CUT49 inventory enumerates all 179 engines, 11 roles and five real console declarations without claiming connectivity',()=>{
 const i=inspectJarvisCommandNetworkV0();
 assert.equal(i.canonical_engine_count,179);
 assert.equal(i.engines.length,179);
 assert.equal(new Set(i.engines.map(x=>x.target_id)).size,179);
 assert.equal(i.gateway_declared_engine_count,5);
 assert.equal(i.legacy_binding_evidence_count,9);
 assert.equal(i.role_profile_count,11);
 assert.equal(i.roles.filter(x=>x.state==='PLAN_ONLY').length,1);
 assert.equal(i.roles.filter(x=>x.reports_to_state==='RESOLVED').length,0);
 assert.equal(i.engines.filter(x=>x.live_executable_verified).length,0);
 assert.equal(i.roles.filter(x=>x.live_executable_verified).length,0);
 assert.equal(i.full_universal_execution_verified,false);
 assert.equal(i.prod_authorized,false);
 assert.equal(i.trading_access,false);
});
test('CUT49 empty trusted target registry proves read-only catalog but cannot execute a single engine',async()=>{
 const {consoleGateway,binding}=setup();
 assert.equal(binding.command_targets_explicitly_bound,0);
 const info=await run(consoleGateway,'jarvis.network.inspect');
 assert.equal(info.status,'CATALOG_ONLY');
 assert.equal(info.canonical_engine_count,179);
 assert.equal(info.role_profile_count,11);
 assert.equal(info.command_targets_explicitly_bound,0);
 const target=await run(consoleGateway,'jarvis.network.inspect',{target_id:'FACT-001'});
 assert.equal(target.target.gateway_declared,false);
 assert.equal(target.physically_bound_for_this_session,false);
 const command=await run(consoleGateway,'jarvis.network.dispatch',
  {target_id:'FACT-001',idempotency_key:'safe-1',parameters:{text:'inspect'}});
 assert.equal(command.status,'TARGET_NOT_CONNECTED');
 assert.equal(command.executed,false);
});
test('CUT49 unsupported, missing and Trading targets never reach registered handlers',async()=>{
 const {consoleGateway}=setup();
 for(const target_id of ['LAB-TRD','TRD-001','UNKNOWN-123']){
  const r=await run(consoleGateway,'jarvis.network.dispatch',
   {target_id,idempotency_key:'no',parameters:{}});
  assert.equal(r.executed,false);
  assert.notEqual(r.status,'ACTION_EXECUTED');
 }
});
test('CUT49 role profiles cannot be used as agent commands until reporting and runtime are verified',()=>{
 const {consoleGateway,actionGateway}=setup();
 for(const id of ['AGT-SALES-EXECUTIVE','ENG-ARCHITECT']){
  assert.throws(()=>bindJarvisCommandNetworkV0({
   consoleGateway,actionGateway,verifyOwner:async()=>true,
   verified_targets:[{...trusted,target_id:id,target_type:'ROLE'}]
  }),/ROLE_NOT_ROUTABLE_WITHOUT_REPORTING_EVIDENCE/);
 }
});
test('CUT49 independent owner verifier and Action Gateway both required for an actual PREPROD command',async()=>{
 let executions=0, ownerVerified=false;
 const {consoleGateway,actionGateway}=setup({
  verified_targets:[trusted],verifyOwner:async()=>ownerVerified
 });
 actionGateway.registerCapability('fact001.unit-safe-read',async({context,payload})=>{
  executions++;
  assert.equal(context.environment,'PREPROD');
  assert.equal(context.company_id,'fenix');
  return {data:payload.label};
 });
 const payload={target_id:'FACT-001',idempotency_key:'once-001',parameters:{label:'test-only'}};
 const denied=await run(consoleGateway,'jarvis.network.dispatch',payload);
 assert.equal(denied.status,'AUTH_REQUIRED');assert.equal(executions,0);
 ownerVerified=true;
 const first=await run(consoleGateway,'jarvis.network.dispatch',payload);
 assert.equal(first.status,'ACTION_EXECUTED');assert.equal(first.executed,true);
 assert.equal(first.result.data,'test-only');assert.equal(executions,1);
 const second=await run(consoleGateway,'jarvis.network.dispatch',payload);
 assert.equal(second.status,'ACTION_EXECUTED');assert.equal(executions,1);
 assert.equal(actionGateway.auditLog().at(-1).type,'ACTION_REPLAYED');
});
test('CUT49 never lets a chat payload authorize PROD, Trading, cost or cross-company execution',async()=>{
 let executions=0;
 const {consoleGateway,actionGateway}=setup({verified_targets:[trusted],verifyOwner:async()=>true});
 actionGateway.registerCapability(trusted.capability,async()=>{executions++;return {ok:true}});
 const base={target_id:'FACT-001',idempotency_key:'safe-id',parameters:{word:'hello'}};
 const cost=await run(consoleGateway,'jarvis.network.dispatch',
  {...base,estimated_additional_cost_eur:1});
 assert.equal(cost.status,'HUMAN_REQUIRED');assert.equal(cost.reason,'MONEY_LIMIT');
 assert.equal(executions,0);
 const unknown=await run(consoleGateway,'jarvis.network.dispatch',{...base,target_id:'CRM-001'});
 assert.equal(unknown.status,'TARGET_NOT_CONNECTED');assert.equal(executions,0);
 assert.throws(()=>bindJarvisCommandNetworkV0({
  consoleGateway,actionGateway,verifyOwner:async()=>true,
  verified_targets:[{...trusted,target_id:'LAB-TRD'}]
 }),/TARGET_INVALID_OR_ISOLATED/);
 assert.throws(()=>bindJarvisCommandNetworkV0({
  consoleGateway,actionGateway,verifyOwner:async()=>true,
  verified_targets:[{...trusted,environment:'PROD'}]
 }),/VERIFIED_BINDING_POLICY_REJECTED/);
 const otherGateway=new CerebroGatewayV0();
 const otherAction=new ActionGatewayV1();
 bindJarvisCommandNetworkV0({consoleGateway:otherGateway,actionGateway:otherAction,
  verified_targets:[trusted],verifyOwner:async()=>true});
 otherGateway.createSession({session_id:'unit-session',company_id:'otra_empresa'});
 const cross=await run(otherGateway,'jarvis.network.dispatch',base);
 assert.equal(cross.status,'POLICY_CONFLICT');assert.equal(executions,0);
});
test('CUT49 target policy HIGH_RISK or signature is not downgraded by a client-supplied flag',async()=>{
 const consoleGateway=new CerebroGatewayV0(),actionGateway=new ActionGatewayV1();
 let executions=0;
 actionGateway.registerCapability(trusted.capability,async()=>{executions++;return {ok:true}});
 bindJarvisCommandNetworkV0({consoleGateway,actionGateway,
  verified_targets:[{...trusted,risk:'HIGH'}],verifyOwner:async()=>true});
 consoleGateway.createSession({session_id:'unit-session',company_id:'fenix'});
 const r=await run(consoleGateway,'jarvis.network.dispatch',{target_id:'FACT-001',
  idempotency_key:'high',parameters:{},risk:'LOW',authorized:true});
 assert.equal(r.status,'HUMAN_REQUIRED');
 assert.equal(r.reason,'HIGH_RISK');assert.equal(executions,0);
});
test('CUT49 owner verification cannot be provided by the client payload',async()=>{
 const {consoleGateway}=setup({verified_targets:[trusted],verifyOwner:async()=>false});
 const r=await run(consoleGateway,'jarvis.network.dispatch',{target_id:'FACT-001',
  idempotency_key:'fake-owner',parameters:{},authorized:true,role:'CARLOS-ADMIN'});
 assert.equal(r.status,'AUTH_REQUIRED');assert.equal(r.executed,false);
});
