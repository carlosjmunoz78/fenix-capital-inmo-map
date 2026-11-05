import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';

const good=()=>({ownerId:'zeus-owner-001',sessionId:'session-a',
 roles:['OWNER_ROOT'],authorizedCompanies:['fenix']});
const req={token:'valid-owner-jwt-synthetic',companyId:'fenix',
 environment:'LAB',actionName:'STATUS'};
function make(principal,{failAudit=false}={}){
 const calls={verify:0,control:0,grant:0,catalog:0,audit:0};
 const svc=createJarvisB3DecisionService({
  identityProvider:{verify:async()=>{calls.verify++;return principal}},
  controlStore:{get:async()=>{calls.control++;return{enabled:true,killSwitch:false}}},
  grantStore:{find:async()=>{calls.grant++;return{
   grantId:'grant-001',ownerId:'zeus-owner-001',companyId:'fenix',environment:'LAB',
   actions:['STATUS'],active:true,revoked:false,expiresAt:Date.now()+60000,
   maxCost:0,allowMutations:false}}},
  actionCatalog:{get:async()=>{calls.catalog++;return{name:'STATUS',mutating:false,estimatedCost:0}}},
  auditStore:{append:async event=>{calls.audit++;assert.equal(JSON.stringify(event).includes(req.token),false);return!failAudit}}
 });
 return {svc,calls};
}
for(const [label,p] of [
 ['string roles impersonation',{...good(),roles:'OWNER_ROOT'}],
 ['string companies impersonation',{...good(),authorizedCompanies:'fenix'}],
 ['array-like roles',{...good(),roles:{includes:()=>true}}],
 ['array-like companies',{...good(),authorizedCompanies:{includes:()=>true}}],
 ['missing verified session',{...good(),sessionId:''}],
 ['malformed verified session',{...good(),sessionId:'../../'}],
 ['missing owner',{...good(),ownerId:''}],
 ['tenant mismatched',{...good(),authorizedCompanies:['aion']}],
 ['no OWNER_ROOT',{...good(),roles:['VIEWER']}],
 ['unverified identity',null]
]){
 test('B3 first rejects malformed principal before reading permissions: '+label,async()=>{
  const {svc,calls}=make(p);
  const o=await svc.authorize(req);
  assert.equal(o.decision,'DENY');
  assert.equal(calls.control,0);
  assert.equal(calls.grant,0);
  assert.equal(calls.catalog,0);
  assert.equal(calls.audit,1);
 });
}
for(const [label,token] of [
 ['object token',{}],['empty token',''],['oversize token','A'.repeat(8193)]
]){
 test('B3 rejects '+label+' before verify/audit',async()=>{
  const {svc,calls}=make(good());
  const result=await svc.authorize({...req,token});
  assert.equal(result.decision,'DENY');
  assert.equal(result.reason,'REQUEST_INVALID');
  assert.equal(calls.verify,0);assert.equal(calls.grant,0);
 });
}
test('valid owner still passes existing B3 scoped contract',async()=>{
 const {svc,calls}=make(good());
 const o=await svc.authorize(req);
 assert.equal(o.decision,'ALLOW');
 assert.equal(calls.control,1);assert.equal(calls.grant,1);
 assert.equal(calls.catalog,1);assert.equal(calls.audit,1);
});
test('audit fail always denies valid owner',async()=>{
 const {svc}=make(good(),{failAudit:true});
 assert.deepEqual(await svc.authorize(req),{decision:'DENY',reason:'AUDIT_UNAVAILABLE'});
});
