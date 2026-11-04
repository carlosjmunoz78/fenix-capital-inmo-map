import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB8CommitmentTracker} from './jarvis-b8-commitments.mjs';
const commitment=(companyId='fenix',id='followup-1',more={})=>({companyId,commitmentId:id,
 type:'INTERNAL_FOLLOW_UP',responsibleActorId:'staff-synthetic',projectId:'synthetic-project',
 sourceEvidenceRefs:['synthetic-evidence-01'],nextActionRef:'next-internal-review',
 counterpartyAccepted:false,economicCommitmentEuro:0,externalAction:false,
 dueAt:'2026-12-01T12:00:00Z',...more});
function rig(opt={}){
 const data=opt.data||new Map(),calls=[];
 const ports={
  identityProvider:{verify:async t=>{calls.push('identity');return t==='opaque'?
   {ownerId:'owner-1',roles:opt.roles||['OWNER_ROOT'],authorizedCompanies:opt.companies||['fenix','aion']}:{}};},
  companyRegistry:{resolve:async p=>{calls.push('company');
   return {companyId:opt.fakeRegistry?'other':p.companyId,environment:'LAB',status:'ACTIVE',verified:true};}},
  policy:{authorize:async ()=>{calls.push('policy');return {decision:opt.deny?'DENY':'ALLOW'};}},
  supervisor:{inspect:async ()=>{calls.push('supervisor');return {enabled:!opt.kill,killSwitch:!!opt.kill,revoked:false,halted:false,costEuro:0};}},
  audit:{append:async ()=>{calls.push('audit');return !opt.auditFail;}},
  store:{
   putIfAbsent:async p=>{calls.push('write');
    if(opt.storeFail)throw Error('STORE_DOWN');
    const key=p.companyId+'|'+p.ownerId+'|'+p.commitmentId;
    const old=data.get(key);
    if(old)return {state:old.fingerprint===p.fingerprint?'ALREADY_EXISTS':'CONFLICT',
     companyId:p.companyId,commitmentId:p.commitmentId,fingerprint:old.fingerprint};
    data.set(key,{record:p.record,fingerprint:p.fingerprint});
    return {state:'CREATED',companyId:p.companyId,commitmentId:p.commitmentId,fingerprint:p.fingerprint};
   },
   list:async p=>{calls.push('list');
    if(opt.storeFail)throw Error('STORE_DOWN');
    if(opt.injectCrossTenant)return [{...commitment('aion','leak'),ownerId:'owner-1',environment:'LAB',
     status:'INTERNAL_TRACKING'}];
    return [...data.entries()].filter(([k])=>k.startsWith(p.companyId+'|'+p.ownerId+'|'))
     .map(([,v])=>v.record);
   }
  }
 };
 return {service:createJarvisB8CommitmentTracker(ports),data,calls};
}
test('persistent store contract tracks internal commitment and returns only metadata',async()=>{
 const x=rig(),r=await x.service.track({token:'opaque',commitment:commitment()});
 assert.equal(r.state,'LAB_INTERNAL_TRACKED');assert.equal(x.data.size,1);
 assert.equal(r.thirdPartyCommitment,false);assert.equal(r.spentEuro,0);
 assert.equal(Object.hasOwn(r,'nextActionRef'),false);
});
test('two companies have separate persistent scopes',async()=>{
 const x=rig();
 await x.service.track({token:'opaque',commitment:commitment('fenix','a')});
 await x.service.track({token:'opaque',commitment:commitment('aion','b')});
 const f=await x.service.list({token:'opaque',companyId:'fenix'});
 const a=await x.service.list({token:'opaque',companyId:'aion'});
 assert.equal(f.count,1);assert.equal(a.count,1);
 assert.equal(f.commitments[0].commitmentId,'a');
 assert.equal(a.commitments[0].commitmentId,'b');
});
test('idempotent replay across rebuilt tracker instances',async()=>{
 const data=new Map(),a=rig({data}),b=rig({data});
 assert.equal((await a.service.track({token:'opaque',commitment:commitment()})).replayed,false);
 assert.equal((await b.service.track({token:'opaque',commitment:commitment()})).replayed,true);
 assert.equal(data.size,1);
});
test('conflicting same-key commitment rejected',async()=>{
 const x=rig();await x.service.track({token:'opaque',commitment:commitment()});
 const r=await x.service.track({token:'opaque',commitment:commitment('fenix','followup-1',{nextActionRef:'different-action'})});
 assert.equal(r.reason,'DURABLE_RECEIPT_UNVERIFIED_OR_CONFLICT');assert.equal(x.data.size,1);
});
test('nonowner cannot read or write commitments',async()=>{
 const x=rig({roles:['USER']});
 assert.equal((await x.service.track({token:'opaque',commitment:commitment()})).state,'DENY');
 assert.equal((await x.service.list({token:'opaque',companyId:'fenix'})).state,'DENY');
 assert.equal(x.calls.includes('write'),false);
});
test('unapproved company cannot be accessed',async()=>{
 const x=rig({companies:['fenix']});
 assert.equal((await x.service.track({token:'opaque',commitment:commitment('aion')})).state,'DENY');
 assert.equal((await x.service.list({token:'opaque',companyId:'aion'})).state,'DENY');
});
test('registry substitution denied',async()=>{
 const x=rig({fakeRegistry:true}),r=await x.service.track({token:'opaque',commitment:commitment()});
 assert.equal(r.reason,'TENANT_POLICY_OR_SUPERVISOR_DENIED');
});
test('B3 denial and supervisor kill stop store writes',async()=>{
 for(const opt of [{deny:true},{kill:true}]){
  const x=rig(opt);
  assert.equal((await x.service.track({token:'opaque',commitment:commitment()})).state,'DENY');
  assert.equal(x.calls.includes('write'),false);
 }
});
test('external promise, payment, or action never converted into internal commitment',async()=>{
 for(const c of [
  commitment('fenix','a',{counterpartyAccepted:true}),
  commitment('fenix','b',{economicCommitmentEuro:1}),
  commitment('fenix','c',{externalAction:true}),
  commitment('fenix','d',{type:'SIGNED_CONTRACT'}),
  commitment('fenix','e',{sourceEvidenceRefs:[]})
 ]){
  const x=rig();const r=await x.service.track({token:'opaque',commitment:c});
  assert.equal(r.reason,'EXTERNAL_COMMITMENT_OR_CONTRACT_INVALID');
  assert.equal(x.calls.includes('write'),false);
 }
});
test('malformed deadline rejects without inserting a record',async()=>{
 const x=rig();const r=await x.service.track({token:'opaque',commitment:commitment('fenix','a',{dueAt:'tomorrow'})});
 assert.equal(r.state,'DENY');assert.equal(x.data.size,0);
});
test('fail-closed audit unavailability before writing',async()=>{
 const x=rig({auditFail:true}),r=await x.service.track({token:'opaque',commitment:commitment()});
 assert.equal(r.reason,'AUDIT_UNAVAILABLE');assert.equal(x.calls.includes('write'),false);
});
test('durable store outage blocks without reporting successful commitment',async()=>{
 const x=rig({storeFail:true}),r=await x.service.track({token:'opaque',commitment:commitment()});
 assert.equal(r.reason,'DURABLE_STORE_UNAVAILABLE');
});
test('injected cross-company record triggers hard privacy denial',async()=>{
 const x=rig({injectCrossTenant:true}),r=await x.service.list({token:'opaque',companyId:'fenix'});
 assert.equal(r.reason,'CROSS_TENANT_OR_INVALID_RECORD');
});
test('real PROD cannot be used for ledger writing or reading',async()=>{
 const x=rig();
 assert.equal((await x.service.track({token:'opaque',commitment:commitment(),environment:'PROD'})).reason,'PROD_NOT_CERTIFIED');
 assert.equal((await x.service.list({token:'opaque',companyId:'fenix',environment:'PROD'})).reason,'PROD_NOT_CERTIFIED');
 assert.equal(x.calls.length,0);
});
test('records never claim external acceptance even when source contains text',async()=>{
 const x=rig();
 const r=await x.service.track({token:'opaque',commitment:commitment('fenix','msg',
  {nextActionRef:'review-not-send'})});
 assert.equal(r.state,'LAB_INTERNAL_TRACKED');assert.equal(x.data.size,1);
 assert.equal([...x.data.values()][0].record.counterpartyAccepted,false);
});
