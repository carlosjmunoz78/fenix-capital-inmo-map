import test from 'node:test';
import assert from 'node:assert/strict';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {bindJarvisCapabilityDelegationV0,JARVIS_DELEGATION_GATES} from '../console/jarvis-capability-delegation-v0.mjs';

const baseCatalog=()=>({
 source:'CEREBRO_CANONICAL_REGISTRY',revision:'initial-179',
 engine_ids:['FACT-001','ROUTE-001','JOB-001','CONSOLE-001'],
 roles:[{role_id:'ENG-QA',state:'FULL_SAFE_PREPROD',reports_to_state:'UNRESOLVED'}],
 learned_capabilities:[{capability_id:'new.skill',target_id:'NEW-001',state:'LEARNED_CANDIDATE'}]
});
const gates=()=>Object.fromEntries(JARVIS_DELEGATION_GATES.map(g=>[g,true]));
const makeRelease=(overrides={})=>({
 capability_id:'new.skill',target_type:'ENGINE',target_id:'NEW-001',
 company_id:'fenix',version:'1.0.0',handler_name:'new.engine.safe-action',
 evidence_ref:'trusted-server:test-only',environment:'PREPROD',
 release_state:'APPROVED_PREPROD',prod_authorized:false,prod_write_authorized:false,
 trading_access:false,additional_cost_eur:0,server_attested:true,
 permission:'EXECUTE_PREPROD',risk:'LOW',gates:gates(),...overrides
});
const harness=({catalog=baseCatalog(),manifests=[],owner=true}={})=>{
 const consoleGateway=new CerebroGatewayV0();
 const actionGateway=new ActionGatewayV1();
 const source={catalog,manifests,owner};
 const result=bindJarvisCapabilityDelegationV0({
  consoleGateway,actionGateway,
  readCanonicalCatalogue:async()=>source.catalog,
  readReleaseManifests:async()=>source.manifests,
  verifyOwner:async()=>source.owner
 });
 consoleGateway.createSession({session_id:'test',company_id:'fenix'});
 const call=(command,payload={})=>consoleGateway.execute({session_id:'test',command,payload});
 return {consoleGateway,actionGateway,source,result,call};
};

test('CUT49 delegation: discovery is read-through and learned skill is not an execution grant',async()=>{
 const h=harness();
 assert.equal(h.result.catalogue_refresh,'ON_EACH_CALL');
 const before=await h.call('jarvis.capabilities');
 assert.equal(before.status,'DISCOVERED');
 assert.equal(before.known_engine_count,4);
 assert.equal(before.discovered_learned_capabilities,1);
 assert.equal(before.released_capabilities.length,0);
 assert.equal(before.unreleased_learning[0].state,'DISCOVERED_NOT_AUTHORIZED');
 const denied=await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'one',parameters:{hello:1}});
 assert.equal(denied.status,'CAPABILITY_NOT_RELEASED');
 assert.equal(denied.executed,false);
});
test('CUT49 delegation: FACT-001 can add new engine and skill without editing Jarvis code; release is a separate gate',async()=>{
 const h=harness();
 let executed=0;
 h.actionGateway.registerCapability('new.engine.safe-action',async({payload})=>{executed++;return {answer:payload.value}});
 // New factory discovery update: no manifest, not executable.
 h.source.catalog={...h.source.catalog,revision:'FACT-001:add-new-001',engine_ids:[...h.source.catalog.engine_ids,'NEW-001']};
 let r=await h.call('jarvis.capabilities');
 assert.equal(r.known_engine_count,5);
 assert.equal(r.unreleased_learning.length,1);
 assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'a',parameters:{value:'ready'}})).status,'CAPABILITY_NOT_RELEASED');
 assert.equal(executed,0);
 // Server-side, independently verified release record, not chat/model text.
 h.source.manifests=[makeRelease()];
 r=await h.call('jarvis.capabilities');
 assert.equal(r.released_capabilities.length,1);
 const first=await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'a',parameters:{value:'ready'}});
 assert.equal(first.status,'ACTION_EXECUTED');
 assert.equal(first.delegated,true);
 assert.equal(first.action_result.result.answer,'ready');
 assert.equal(executed,1);
 const replay=await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'a',parameters:{value:'ready'}});
 assert.equal(replay.status,'ACTION_EXECUTED');
 assert.equal(executed,1);
 assert.equal(h.actionGateway.auditLog().at(-1).type,'ACTION_REPLAYED');
 // Future revocation in CEREBRO catalogue immediately revokes Jarvis execution.
 h.source.manifests=[];
 assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'b',parameters:{value:2}})).status,'CAPABILITY_NOT_RELEASED');
 assert.equal(executed,1);
 h.source.catalog={...h.source.catalog,revision:'FACT-001:disabled',
  engine_ids:h.source.catalog.engine_ids.filter(id=>id!=='NEW-001')};
 h.source.manifests=[makeRelease()];
 assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'c',parameters:{value:3}})).status,'CAPABILITY_NOT_RELEASED');
 assert.equal(executed,1);
});
test('CUT49 delegation: all release gates required; no model self-promotion',async()=>{
 const h=harness({catalog:{...baseCatalog(),engine_ids:[...baseCatalog().engine_ids,'NEW-001']}});
 let executed=0;
 h.actionGateway.registerCapability('new.engine.safe-action',async()=>{executed++;return {ok:true}});
 for(const gate of JARVIS_DELEGATION_GATES){
  const record=makeRelease({gates:{...gates(),[gate]:false}});
  h.source.manifests=[record];
  assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',
   idempotency_key:'g-'+gate,parameters:{}})).status,'CAPABILITY_NOT_RELEASED');
 }
 for(const overrides of [
  {server_attested:false},{prod_authorized:true},{prod_write_authorized:true},
  {environment:'PROD'},{trading_access:true},{additional_cost_eur:0.01},
  {permission:'UNKNOWN'},{release_state:'CANDIDATE'}, {target_id:'LAB-TRD'}
 ]){
  h.source.manifests=[makeRelease(overrides)];
  assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',
   idempotency_key:'v-'+Object.keys(overrides)[0],parameters:{}})).status,'CAPABILITY_NOT_RELEASED');
 }
 assert.equal(executed,0);
});
test('CUT49 delegation: the independent owner check is mandatory for listing and dispatch',async()=>{
 const h=harness({catalog:{...baseCatalog(),engine_ids:[...baseCatalog().engine_ids,'NEW-001']},
  manifests:[makeRelease()],owner:false});
 assert.equal((await h.call('jarvis.capabilities')).status,'AUTH_REQUIRED');
 assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',
  idempotency_key:'nope',parameters:{},authorized:true,actor:'CARLOS-ADMIN'})).status,'AUTH_REQUIRED');
 h.source.owner=true;
 assert.equal((await h.call('jarvis.capabilities')).status,'DISCOVERED');
});
test('CUT49 delegation: explicit approval does not bypass HIGH_RISK or signature gate',async()=>{
 const h=harness({catalog:{...baseCatalog(),engine_ids:[...baseCatalog().engine_ids,'NEW-001']},
  manifests:[makeRelease({risk:'HIGH'})]});
 let executed=0;
 h.actionGateway.registerCapability('new.engine.safe-action',async()=>{executed++;return{ok:true}});
 const r=await h.call('jarvis.delegate',{capability_id:'new.skill',idempotency_key:'high',parameters:{},risk:'LOW'});
 assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.action_result.reason,'HIGH_RISK');
 assert.equal(executed,0);
});
test('CUT49 delegation: changed company is rejected even with otherwise valid release',async()=>{
 const h=harness({catalog:{...baseCatalog(),engine_ids:[...baseCatalog().engine_ids,'NEW-001']},
  manifests:[makeRelease({company_id:'otra_empresa'})]});
 const r=await h.call('jarvis.delegate',{capability_id:'new.skill',
  idempotency_key:'cross',parameters:{}});
 assert.equal(r.status,'POLICY_CONFLICT');
 assert.equal(r.reason,'CROSS_COMPANY_FORBIDDEN');
});
test('CUT49 delegation: roles are discoverable but not executable without supervisor chain',async()=>{
 const h=harness({catalog:baseCatalog(),manifests:[makeRelease({
  capability_id:'qa.review',target_id:'ENG-QA',target_type:'ROLE',
  handler_name:'qa.actual-worker',
  evidence_ref:'test:qa-only'
 })]});
 const info=await h.call('jarvis.capabilities');
 assert.equal(info.released_capabilities.length,0);
 assert.equal((await h.call('jarvis.delegate',{capability_id:'qa.review',idempotency_key:'qa1',parameters:{}})).status,'CAPABILITY_NOT_RELEASED');
});
test('CUT49 delegation: malformed or unavailable canonical release source fails closed',async()=>{
 const h=harness();
 h.source.catalog={...baseCatalog(),source:'UNVERIFIED_MODEL_OUTPUT'};
 assert.equal((await h.call('jarvis.capabilities')).status,'CATALOGUE_UNAVAILABLE');
 assert.equal((await h.call('jarvis.delegate',{capability_id:'new.skill',
  idempotency_key:'cat',parameters:{}})).status,'CATALOGUE_UNAVAILABLE');
 h.source.catalog=baseCatalog();
 h.source.manifests=null;
 assert.equal((await h.call('jarvis.capabilities')).status,'CATALOGUE_UNAVAILABLE');
});
