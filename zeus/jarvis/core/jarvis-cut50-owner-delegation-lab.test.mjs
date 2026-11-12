import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createHmac} from 'node:crypto';
import {createJarvisB2DeviceSessionGate} from './jarvis-b2-device-session-gate.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
import {createJarvisOwnerDelegationLabV0} from './jarvis-cut50-owner-delegation-lab.mjs';
import {ActionGatewayV1} from '../../../cerebro/gateway/action-gateway-v1.mjs';
import {createJarvisCerebroRegistryReaderV0} from '../../../cerebro/console/jarvis-cerebro-registry-reader-v0.mjs';
import {JARVIS_DELEGATION_GATES} from '../../../cerebro/console/jarvis-capability-delegation-v0.mjs';
import {budgetDecision} from '../../../cerebro/router/execution-model-router.mjs';

const HOST='https://jarvis.lab.invalid',ORIGIN='https://lab-client.example.invalid';
const UUID='11111111-2222-4333-8444-555555555555';
const OWNER='zeus-owner-1',EMAIL='synthetic.owner@example.invalid';
const AUD='abcdef0123456789abcdef0123456789';
const COOKIE='A'.repeat(43),SECRET='cb'.repeat(32);
const CAP='fact.test-budget',HANDLER='route001.budget-read';
const GATE='JARVIS_DELEGATE:'+CAP;
const man=()=>({capability_id:CAP,target_id:'ROUTE-001',target_type:'ENGINE',
 company_id:'fenix',version:'1.0.0',handler_name:HANDLER,
 evidence_ref:'trusted-test-only:ROUTE-001.budgetDecision',environment:'PREPROD',
 release_state:'APPROVED_PREPROD',prod_authorized:false,prod_write_authorized:false,
 trading_access:false,additional_cost_eur:0,server_attested:true,
 permission:'EXECUTE_PREPROD',risk:'LOW',
 gates:Object.fromEntries(JARVIS_DELEGATION_GATES.map(k=>[k,true]))});
function setup({owner=true,enabled=true,release=true,grant=true,revoked=false}={}){
 const state={owner,revoked,grant,release,executions:0,audit:0,rate:true};
 const hmac=createHmac('sha256',Buffer.from(SECRET,'hex')).update(
  'jarvis-b2-device-v1\0'+OWNER+'\0'+UUID+'\0'+COOKIE).digest('hex');
 const env={JARVIS_OWNER_DELEGATION_LAB_ENABLED:enabled?'true':'false',
  JARVIS_B2_DEVICE_ENABLED:'true',JARVIS_ACCESS_AUD:AUD,
  JARVIS_OWNER_EMAIL:EMAIL,JARVIS_OWNER_ID:OWNER,JARVIS_B2_HMAC_KEY_HEX:SECRET};
 const ctx={access:{aud:AUD,getIdentity:async()=>({email:EMAIL,user_uuid:UUID})}};
 const clock=()=>Date.now();
 const deviceSessionGate=createJarvisB2DeviceSessionGate({
  environment:'LAB',enabled:true,cryptoImpl:webcrypto,clock,
  sessionStore:{get:async args=>args.ownerId===OWNER&&args.sessionHmac===hmac?
   {ownerId:OWNER,sessionHmac:hmac,environment:'LAB',role:'OWNER_ROOT',
    active:true,revoked:state.revoked,expiresAt:clock()+180000,authorizedCompanies:['fenix']}
   :null}
 });
 const identityProvider={verify:async token=>{
  const t=typeof token==='string'?token:token?.accessToken;
  if(t!=='signed-owner-session')throw Error('BAD_TOKEN');
  return {ownerId:state.owner?OWNER:'different-owner',sessionId:'test-session',
   roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
 }};
 const b3DecisionService=createJarvisB3DecisionService({
  identityProvider,controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  grantStore:{find:async({actionName})=>actionName===GATE&&state.grant?
   {grantId:'grant-1',ownerId:OWNER,companyId:'fenix',
    environment:'PREPROD',active:true,revoked:false,
    actions:[GATE],expiresAt:Date.now()+180000,maxCost:0,allowMutations:false}:null},
  actionCatalog:{get:async name=>name===GATE?
   {name:GATE,estimatedCost:0,mutating:false}:null},
  auditStore:{append:async evt=>{state.audit++;assert.ok(!JSON.stringify(evt).includes('signed-owner-session'));return true}}
 });
 const actionGateway=new ActionGatewayV1();
 actionGateway.registerCapability(HANDLER,async({context,payload})=>{
  state.executions++;assert.equal(context.company_id,'fenix');
  return budgetDecision({estimated_incremental_cost_eur:payload.estimated_incremental_cost_eur??0});
 });
 const handler=createJarvisOwnerDelegationLabV0({
  deviceSessionGate,identityProvider,b3DecisionService,actionGateway,
  readCanonicalCatalogue:createJarvisCerebroRegistryReaderV0(),
  readReleaseManifests:async()=>state.release?[man()]:[],
  rateLimiter:async()=>state.rate,
  allowedHost:HOST,allowedOrigin:ORIGIN,enabled
 });
 const call=async({
  token='signed-owner-session',cookie=COOKIE,origin=ORIGIN,
  method='POST',pathname='/__jarvis/lab/delegate',company_id='fenix',
  capability_id=CAP,bodyPatch={},customEnv=env,customCtx=ctx
 }={})=>{
  const body={company_id,command:'jarvis.delegate',capability_id,
   idempotency_key:'cut50-fixture-1',
   parameters:{estimated_incremental_cost_eur:0},...bodyPatch};
  const headers={origin,authorization:'Bearer '+token,
   'content-type':'application/json',cookie:'__Host-jarvis_b2='+cookie};
  const req=new Request(HOST+pathname,{method,headers,
   ...(method==='POST'?{body:JSON.stringify(body)}:{})});
  const response=await handler(req,customEnv,customCtx);
  return {response,data:await response.json()};
 };
 return {state,env,ctx,actionGateway,handler,call};
}
test('CUT50 disabled route rejects even signed OWNER_ROOT',async()=>{
 const h=setup({enabled:false});
 const r=await h.call();
 assert.equal(r.response.status,503);
 assert.equal(r.data.reason,'OWNER_DELEGATION_DISABLED');
 assert.equal(h.state.executions,0);
});
test('CUT50 one synthetic B2 device + scoped B3 grant + verified release dispatches to real ROUTE-001 via ACTGW',async()=>{
 const h=setup();
 const first=await h.call();
 assert.equal(first.response.status,200);
 assert.equal(first.data.status,'ACTION_EXECUTED');
 assert.equal(first.data.target_id,'ROUTE-001');
 assert.equal(first.data.action_result.result.status,'GREEN_ZERO_ADDITIONAL_COST');
 assert.equal(first.data.prod_authorized,false);
 assert.equal(h.state.executions,1);
 assert.equal(h.state.audit,1);
 const replay=await h.call();
 assert.equal(replay.response.status,200);
 assert.equal(h.state.executions,1);
 assert.equal(h.actionGateway.auditLog().at(-1).type,'ACTION_REPLAYED');
});
test('CUT50 revocation of B2 physical session blocks the next command; no implied owner from bearer',async()=>{
 const h=setup();
 assert.equal((await h.call()).response.status,200);
 h.state.revoked=true;
 const denied=await h.call({bodyPatch:{idempotency_key:'nope'}});
 assert.equal(denied.response.status,403);
 assert.equal(denied.data.reason,'B2_OR_IDENTITY_DENIED');
 assert.equal(h.state.executions,1);
});
test('CUT50 B3 grant and release manifest are distinct, both mandatory',async()=>{
 const h=setup({grant:false});
 const denied=await h.call();
 assert.equal(denied.response.status,403);
 assert.equal(denied.data.reason,'B3_GRANT_DENIED');
 assert.equal(h.state.executions,0);
 h.state.grant=true;h.state.release=false;
 const noRelease=await h.call();
 assert.equal(noRelease.response.status,403);
 assert.equal(noRelease.data.status,'CAPABILITY_NOT_RELEASED');
 assert.equal(h.state.executions,0);
 h.state.release=true;
 assert.equal((await h.call()).response.status,200);
 assert.equal(h.state.executions,1);
 h.state.release=false;
 assert.equal((await h.call({bodyPatch:{idempotency_key:'later'}})).response.status,403);
 assert.equal(h.state.executions,1);
});
test('CUT50 rejection of false owner, unknown token, altered cookie, cross company and forged client role',async()=>{
 const h=setup();
 for(const args of [{token:'attacker'},{cookie:'B'.repeat(43)},{company_id:'other'},
  {customCtx:{}},{bodyPatch:{ownerId:OWNER,role:'OWNER_ROOT',
    authorized:true,company_id:'other'}}]){
  const r=await h.call(args);
  assert.equal(r.response.status,403);
 }
 h.state.owner=false;
 assert.equal((await h.call()).response.status,403);
 assert.equal(h.state.executions,0);
});
test('CUT50 never accepts PROD, wrong origin, GET, unknown route, paid action or missing rate authorization',async()=>{
 const h=setup();
 assert.equal((await h.call({origin:'https://bad.example.invalid'})).response.status,403);
 assert.equal((await h.call({method:'GET'})).response.status,405);
 assert.equal((await h.call({pathname:'/v1/missions/x/execute'})).response.status,404);
 assert.equal((await h.call({bodyPatch:{estimated_additional_cost_eur:1}})).response.status,400);
 assert.equal((await h.call({bodyPatch:{capability_id:CAP,
   idempotency_key:'same',parameters:{estimated_incremental_cost_eur:0},
   prod_authorized:true},company_id:'other'})).response.status,403);
 h.state.rate=false;
 assert.equal((await h.call()).response.status,429);
 assert.equal(h.state.executions,0);
});
test('CUT50 no public listener, no route registration, no cloud secrets, no second runtime',()=>{
 const h=setup();
 assert.equal(typeof h.handler,'function');
 assert.equal(h.actionGateway.contract().environment,'PREPROD');
 assert.equal(h.state.executions,0);
});
