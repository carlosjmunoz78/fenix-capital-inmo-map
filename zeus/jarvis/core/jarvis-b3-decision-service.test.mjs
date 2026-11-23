import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
const known={ownerId:'zeus-owner-001',sessionId:'session-a',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
const action={name:'STATUS',estimatedCost:0,mutating:false};
const grant={grantId:'grant-001',ownerId:'zeus-owner-001',companyId:'fenix',environment:'LAB',active:true,revoked:false,actions:['STATUS'],expiresAt:Date.now()+60000,maxCost:0,allowMutations:false};
const make=(opts={})=>{
 const events=[];
 const providers={
 identityProvider:{verify:async token=>token==='real-session'?known:null},
 controlStore:{get:async()=>({enabled:true,killSwitch:false})},
 grantStore:{find:async()=>grant},
 actionCatalog:{get:async()=>action},
 auditStore:{append:async event=>{events.push(event);return true}},
 ...opts
 };
 return {svc:createJarvisB3DecisionService(providers),events};
};
const request={token:'real-session',companyId:'fenix',environment:'LAB',actionName:'STATUS'};
test('B3 owner with scoped action and trustworthy audit is authorized',async()=>{
 const {svc,events}=make();
 const r=await svc.authorize(request);
 assert.equal(r.decision,'ALLOW');assert.equal(events.length,1);
 assert.equal(events[0].allowed,true);assert.equal(JSON.stringify(events).includes('real-session'),false);
});
test('B3 does not authorize when unbound, revoked, expired or wrong company',async()=>{
 for(const opts of [
  {identityProvider:{verify:async()=>null}},
  {grantStore:{find:async()=>({...grant,revoked:true})}},
  {grantStore:{find:async()=>({...grant,expiresAt:0})}},
  {controlStore:{get:async()=>({enabled:false,killSwitch:true})}},
  {controlStore:{get:async()=>{throw Error('db unavailable')}}},
  {actionCatalog:{get:async()=>null}}
 ]){
  const {svc}=make(opts);assert.notEqual((await svc.authorize(request)).decision,'ALLOW');
 }
 assert.notEqual((await make().svc.authorize({...request,companyId:'aion'})).decision,'ALLOW');
});
test('B3 audit failures block even legitimate owner action',async()=>{
 for(const auditStore of [{append:async()=>false},{append:async()=>{throw Error('db down')}}]){
  const {svc}=make({auditStore});assert.deepEqual(await svc.authorize(request),{decision:'DENY',reason:'AUDIT_UNAVAILABLE'});
 }
});
test('B3 cannot trust caller-supplied grant or action risk flags',async()=>{
 const {svc}=make();
 const r=await svc.authorize({...request,grant:{...grant,allowMutations:true},action:{name:'STATUS',estimatedCost:0,mutating:false}});
 assert.equal(r.decision,'ALLOW');
 const evil=make({actionCatalog:{get:async()=>({name:'DELETE',estimatedCost:0,mutating:true})}});
 assert.equal((await evil.svc.authorize(request)).decision,'DENY');
});
