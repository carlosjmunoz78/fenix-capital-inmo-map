import test from 'node:test';
import assert from 'node:assert/strict';
import {FenixOwnerChannelIdentityProvider} from './jarvis-fenix-channel-identity.mjs';
import {ZeusGlobalIdentityProvider} from './jarvis-global-identity.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';

function rig(overrides={}){
 const calls={claims:0,user:0,rpc:0,registry:0,control:0,grant:0,audit:0};
 const channel=new FenixOwnerChannelIdentityProvider({
  authClient:{auth:{
   getUser:async token=>{calls.user++;return token==='signed-test-jwt'
    ?{data:{user:{id:'owner-auth-uuid-1'}},error:null}
    :{data:{user:null},error:{message:'invalid'}}},
   getClaims:async token=>{calls.claims++;return token==='signed-test-jwt'
    ?{data:{claims:{sub:overrides.claimSub??'owner-auth-uuid-1',
       session_id:overrides.sessionId??'session-A'}},error:null}
    :{data:{claims:null},error:{message:'invalid'}}}
  }},
  contextClient:{rpc:async()=>{calls.rpc++;return{
   data:{ok:true,actor_code:overrides.actorCode??'CARLOS-ADMIN'},error:null
  }}},
  resolveCompanies:async()=>overrides.channelCompanies??['fenix']
 });
 const registry={resolve:async ({channel,subject})=>{
  calls.registry++;assert.equal(channel,'fenix-app');assert.equal(subject,'owner-auth-uuid-1');
  return{active:overrides.bindingActive??true,
   role:overrides.registryRole??'OWNER_ROOT',
   ownerId:'zeus-owner-1',authorizedCompanies:overrides.registeredCompanies??['fenix']}
 }};
 const principal=new ZeusGlobalIdentityProvider({channels:new Map([['fenix-app',channel]]),registry});
 const service=createJarvisB3DecisionService({
  identityProvider:{verify:async accessToken=>
   principal.verify({channel:'fenix-app',accessToken})},
  controlStore:{get:async()=>{calls.control++;return overrides.control??{enabled:true,killSwitch:false}}},
  grantStore:{find:async()=>{calls.grant++;return{
   grantId:'grant-1',ownerId:'zeus-owner-1',companyId:'fenix',
   environment:'LAB',actions:['STATUS'],active:true,
   revoked:overrides.revoked??false,expiresAt:Date.now()+60_000,
   maxCost:0,allowMutations:false}}},
  actionCatalog:{get:async()=>({name:'STATUS',mutating:false,estimatedCost:0})},
  auditStore:{append:async record=>{calls.audit++;
   assert.equal(JSON.stringify(record).includes('signed-test-jwt'),false);return true}}
 });
 return{service,calls};
}
const request={token:'signed-test-jwt',companyId:'fenix',environment:'LAB',actionName:'STATUS'};
test('B2 channel/JWT + OWNER_ROOT registry + B3 audited scoped grant allows read only',async()=>{
 const {service,calls}=rig();
 const r=await service.authorize(request);
 assert.equal(r.decision,'ALLOW');
 assert.equal(r.companyId,'fenix');
 assert.equal(calls.user,1);assert.equal(calls.claims,1);assert.equal(calls.rpc,1);
 assert.equal(calls.control,1);assert.equal(calls.grant,1);assert.equal(calls.audit,1);
});
for(const [label,overrides,changed] of [
 ['wrong JWT',{}, {token:'invalid'}],
 ['different signed subject',{claimSub:'another-user'},{}],
 ['missing signed session',{sessionId:''},{}],
 ['legacy DIR-TEST not an OWNER_ROOT',{actorCode:'DIR-TEST'},{}],
 ['inactive global binding',{bindingActive:false},{}],
 ['nonowner global role',{registryRole:'OPERATOR'},{}],
 ['tenant absent from channel',{channelCompanies:['aion']},{}],
 ['tenant absent from registry',{registeredCompanies:['aion']},{}],
 ['B3 killed',{control:{enabled:false,killSwitch:true}},{}],
 ['grant revoked',{revoked:true},{}],
 ['request cross company',{}, {companyId:'aion'}]
 ]){
 test('B2-to-B3 fail closed: '+label,async()=>{
  const {service,calls}=rig(overrides);
  const r=await service.authorize({...request,...changed});
  assert.equal(r.decision,'DENY');
  assert.equal(calls.audit,1);
  if(['wrong JWT','different signed subject','missing signed session',
   'legacy DIR-TEST not an OWNER_ROOT','inactive global binding',
   'nonowner global role','tenant absent from channel','tenant absent from registry'].includes(label)){
   assert.equal(calls.grant,0);
  }
 });
}
