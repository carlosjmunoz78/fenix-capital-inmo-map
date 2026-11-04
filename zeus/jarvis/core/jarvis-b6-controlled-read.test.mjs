import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJarvisB6ControlledRead} from './jarvis-b6-controlled-read.mjs';
import {createJarvisB6CapabilityPreflight} from './jarvis-b6-capability-preflight.mjs';

const base={token:'server-opaque-token',companyId:'fenix',environment:'LAB',
  sessionId:'session-1',missionId:'mission-1',capability:'GITHUB_FILE_READ',idempotencyKey:'idem-1'};
const id='jarvis-b6-allowlisted-github-read';
const digest='a'.repeat(64);
function rig({enabled=true,company='fenix',roles=['OWNER_ROOT'],companies=['fenix'],
  grant='ALLOW',grantExecution='ALLOW',auditOk=true,privacy='INTERNAL',adapterCost=0,
  adapterScope='fenix',adapterOperation='READ',supportsRead=true,
  connectorThrows=false,verifierOk=true,completionOk=true,planTamper=null,
  failJournal=false,rateReadFail=false}={}){
 const calls=[];
 const memory=new Map();
 const identityProvider={verify:async()=>{calls.push('identity');return {ownerId:'owner-1',
   sessionId:'session-1',roles,authorizedCompanies:companies};}};
 const policy={authorize:async x=>{calls.push(['policy',x.actionName]);
   return{decision:x.actionName==='JARVIS_CAPABILITY_EXECUTE_READ'?grantExecution:grant};}};
 const capabilityRegistry={list:async()=>[{id,companyId:company,environment:'LAB',
   capability:base.capability,route:'API',isolation:'TENANT',enabled:true,estimatedEuro:0,
   dataBoundary:'LOCAL_PRIVATE',supportsRollback:false}]};
 const audit={append:async x=>{calls.push(['audit',x]);return auditOk;}};
 const preflightOriginal=createJarvisB6CapabilityPreflight({identityProvider,registry:capabilityRegistry,policy,audit});
 const preflight={plan:async x=>{const p=await preflightOriginal.plan(x);
   return planTamper?{...p,...planTamper}:p;}};
 const journal={
  claim:async s=>{calls.push('claim');const key=[s.ownerId,s.companyId,s.environment,s.missionId,s.capability,s.connectorId,s.idempotencyKey].join('|');
   if(!memory.has(key)){memory.set(key,{state:'CLAIMED',fingerprint:s.fingerprint});return{state:'CLAIMED'};}
   const old=memory.get(key);
   if(old.fingerprint!==s.fingerprint)return{state:'CONFLICT'};
   if(old.state==='COMPLETE')return{state:'ALREADY_COMPLETED',fingerprint:s.fingerprint,
    evidenceHash:old.evidenceHash,companyId:s.companyId,environment:s.environment,ownerId:s.ownerId};
   return{state:'IN_PROGRESS'};
  },
  complete:async s=>{calls.push('complete');if(!completionOk)return false;
   const key=[s.ownerId,s.companyId,s.environment,s.missionId,s.capability,s.connectorId,s.idempotencyKey].join('|');
   memory.set(key,{state:'COMPLETE',fingerprint:s.fingerprint,evidenceHash:s.evidenceHash});return true;
  },
  fail:async s=>{calls.push('failed');if(failJournal)throw Error('journal unavailable');return true;}
 };
 const adapter={id,companyId:adapterScope,environment:'LAB',capability:base.capability,
   route:'API',operation:adapterOperation,estimatedEuro:adapterCost,sideEffectFree:supportsRead,
   dataBoundary:'LOCAL_PRIVATE',read:async()=>{calls.push('adapter-read');
    if(connectorThrows)throw Error('downstream untrusted error containing secret');
    return{body:'public fixture',digest};
   }};
 const connectorRegistry={resolve:async()=>{calls.push('resolve');return adapter;}};
 const resultVerifier={verify:async()=>{calls.push('verify');if(rateReadFail)throw Error('verifier unavailable');
   return{verified:verifierOk,evidenceHash:digest,summary:'Approved synthetic GitHub proof'};}};
 const controlStore={get:async()=>{calls.push('control');return{enabled,killSwitch:!enabled};}};
 const engine=createJarvisB6ControlledRead({identityProvider,controlStore,preflight,policy,
   journal,connectorRegistry,resultVerifier,audit});
 return {engine,calls,memory};
}
test('B6 first guarded read genuinely invokes selected adapter and returns evidence',async()=>{
 const {engine,calls}=rig();const r=await engine.executeRead(base);
 assert.equal(r.state,'EXECUTED_VERIFIED_READ');assert.equal(r.executed,true);
 assert.equal(r.adapterInvoked,true);assert.equal(r.spentEuro,0);assert.equal(r.evidenceHash,digest);
 assert.equal(calls.filter(x=>x==='adapter-read').length,1);
 assert.equal(calls.filter(x=>x==='complete').length,1);
 assert.deepEqual(calls.filter(Array.isArray).filter(x=>x[0]==='policy').map(x=>x[1]),
  ['JARVIS_CAPABILITY_DISCOVER','JARVIS_CAPABILITY_EXECUTE_READ']);
});
test('B6 same owner and idempotency key reuses verified receipt without second read',async()=>{
 const {engine,calls}=rig();
 assert.equal((await engine.executeRead(base)).state,'EXECUTED_VERIFIED_READ');
 const second=await engine.executeRead(base);
 assert.equal(second.state,'ALREADY_COMPLETED_VERIFIED');assert.equal(second.executed,false);
 assert.equal(calls.filter(x=>x==='adapter-read').length,1);
});
test('B6 same key cannot be reused with changed request privacy',async()=>{
 const {engine,calls}=rig();
 await engine.executeRead(base);
 const second=await engine.executeRead({...base,privacy:'CONFIDENTIAL'});
 assert.equal(second.reason,'IDEMPOTENCY_CONFLICT');
 assert.equal(calls.filter(x=>x==='adapter-read').length,1);
});
test('B6 key isolated between distinct missions',async()=>{
 const {engine,calls}=rig();await engine.executeRead(base);
 assert.equal((await engine.executeRead({...base,missionId:'mission-2'})).state,'EXECUTED_VERIFIED_READ');
 assert.equal(calls.filter(x=>x==='adapter-read').length,2);
});
test('B6 refuses PROD even with consent, grant and a positive client flag',async()=>{
 const {engine,calls}=rig();
 const r=await engine.executeRead({...base,environment:'PROD',featureEnabled:true});
 assert.equal(r.reason,'PROD_NOT_CERTIFIED');assert.deepEqual(calls,[]);
});
test('B6 refuses other environment even if synthetic preflight supports it',async()=>{
 const {engine,calls}=rig();
 assert.equal((await engine.executeRead({...base,environment:'PREPROD'})).reason,'REQUEST_INVALID');
 assert.deepEqual(calls,[]);
});
test('B6 no control denies before B2 or connector resolution',async()=>{
 const {engine,calls}=rig({enabled:false});
 assert.equal((await engine.executeRead(base)).reason,'B6_LOCKED');assert.deepEqual(calls,['control']);
});
test('B6 never executes mutations, including fake rollback and idempotency',async()=>{
 const {engine,calls}=rig();
 assert.equal((await engine.executeRead({...base,operation:'MUTATION',rollbackRef:'undo-1'})).reason,'REQUEST_INVALID');
 assert.deepEqual(calls,[]);
});
test('B6 denies cross-company owner before capability discovery',async()=>{
 const {engine,calls}=rig({companies:['aion']});
 assert.equal((await engine.executeRead(base)).reason,'OWNER_SCOPE_DENIED');
 assert.equal(calls.some(x=>x==='adapter-read'),false);
});
test('B6 cannot treat a string masquerading as an owner role list as authorization',async()=>{
 const {engine}=rig({roles:'FAKE_OWNER_ROOT'});
 assert.equal((await engine.executeRead(base)).reason,'OWNER_SCOPE_DENIED');
});
test('B6 cannot treat a string masquerading as a company list as authorization',async()=>{
 const {engine}=rig({companies:'other-fenix'});
 assert.equal((await engine.executeRead(base)).reason,'OWNER_SCOPE_DENIED');
});
test('B6 B3 discovery denial prevents connector resolution',async()=>{
 const {engine,calls}=rig({grant:'DENY'});
 assert.equal((await engine.executeRead(base)).reason,'PREFLIGHT_DENIED_OR_INVALID');
 assert.equal(calls.some(x=>x==='resolve'),false);
});
test('B6 second B3 execution grant is mandatory, not inferred from discovery grant',async()=>{
 const {engine,calls}=rig({grantExecution:'DENY'});
 assert.equal((await engine.executeRead(base)).reason,'B3_EXECUTION_DENIED');
 assert.equal(calls.some(x=>x==='resolve'),false);
});
test('B6 rejects unknown paid connectors even if preflight selected an approved candidate',async()=>{
 const {engine,calls}=rig({adapterCost:.001});
 assert.equal((await engine.executeRead(base)).reason,'CONNECTOR_CONTRACT_INVALID');
 assert.equal(calls.some(x=>x==='adapter-read'),false);
});
test('B6 rejects cross-tenant connector even with approved preflight',async()=>{
 const {engine,calls}=rig({adapterScope:'aion'});
 assert.equal((await engine.executeRead(base)).reason,'CONNECTOR_CONTRACT_INVALID');
 assert.equal(calls.some(x=>x==='adapter-read'),false);
});
test('B6 rejects mutated operation flag on trusted connector',async()=>{
 const {engine,calls}=rig({adapterOperation:'MUTATION'});
 assert.equal((await engine.executeRead(base)).reason,'CONNECTOR_CONTRACT_INVALID');
 assert.equal(calls.some(x=>x==='adapter-read'),false);
});
test('B6 connector must prove it is read-only',async()=>{
 const {engine,calls}=rig({supportsRead:false});
 assert.equal((await engine.executeRead(base)).reason,'CONNECTOR_CONTRACT_INVALID');
 assert.equal(calls.some(x=>x==='adapter-read'),false);
});
test('B6 arbitrary client-supplied commands never passed to connector',async()=>{
 const {engine,calls}=rig();
 const r=await engine.executeRead({...base,script:'rm -rf /',url:'https://untrusted.invalid',accessToken:'fake'});
 assert.equal(r.state,'EXECUTED_VERIFIED_READ');
 assert.equal(calls.filter(x=>x==='adapter-read').length,1);
});
test('B6 rejects forged preflight that requests execution',async()=>{
 const {engine,calls}=rig({planTamper:{executed:true}});
 assert.equal((await engine.executeRead(base)).reason,'PREFLIGHT_DENIED_OR_INVALID');
 assert.equal(calls.some(x=>x==='adapter-read'),false);
});
test('B6 rejects missing independent verification and never marks success',async()=>{
 const {engine,calls}=rig({verifierOk:false});
 const r=await engine.executeRead(base);
 assert.equal(r.reason,'RESULT_NOT_VERIFIED');assert.equal(r.adapterInvoked,true);
 assert.equal(calls.includes('failed'),true);assert.equal(calls.includes('complete'),false);
});
test('B6 catches verifier outages and records evidence as failed',async()=>{
 const {engine,calls}=rig({rateReadFail:true});
 const r=await engine.executeRead(base);
 assert.equal(r.reason,'INDEPENDENT_VERIFIER_UNAVAILABLE');assert.equal(calls.includes('failed'),true);
});
test('B6 connector failure never leaks any raw downstream secret in response',async()=>{
 const {engine,calls}=rig({connectorThrows:true});
 const r=await engine.executeRead(base);
 assert.equal(r.reason,'CONNECTOR_READ_FAILED');assert.equal(r.adapterInvoked,true);
 assert.equal(JSON.stringify(r).includes('secret'),false);assert.equal(calls.includes('failed'),true);
});
test('B6 missing completion audit refuses success',async()=>{
 const {engine,calls}=rig({auditOk:false});
 const r=await engine.executeRead(base);
 assert.equal(r.reason,'PREFLIGHT_DENIED_OR_INVALID');assert.equal(calls.includes('adapter-read'),false);
});
test('B6 incomplete journal does not claim success despite verified read',async()=>{
 const {engine}=rig({completionOk:false});
 const r=await engine.executeRead(base);
 assert.equal(r.reason,'JOURNAL_COMPLETION_UNAVAILABLE');assert.equal(r.adapterInvoked,true);
});
test('B6 critical journal failure is surfaced rather than retried',async()=>{
 const {engine}=rig({verifierOk:false,failJournal:true});
 const r=await engine.executeRead(base);
 assert.equal(r.reason,'JOURNAL_FAILURE_UNRECORDED');assert.equal(r.adapterInvoked,true);
});
test('B6 audit contains only metadata, never bearer, raw connector content or client shell command',async()=>{
 const {engine,calls}=rig();await engine.executeRead({...base,token:'super-secret-token',script:'destroy all'});
 const meta=JSON.stringify(calls.filter(x=>Array.isArray(x)&&x[0]==='audit'));
 assert.equal(meta.includes('super-secret-token'),false);
 assert.equal(meta.includes('public fixture'),false);
 assert.equal(meta.includes('destroy all'),false);
});
test('B6 invalid company and idempotency payloads fail before trusted dependencies',async()=>{
 const {engine,calls}=rig();
 assert.equal((await engine.executeRead({...base,companyId:'*'})).reason,'REQUEST_INVALID');
 assert.equal((await engine.executeRead({...base,idempotencyKey:'invalid id with spaces'})).reason,'REQUEST_INVALID');
 assert.deepEqual(calls,[]);
});
