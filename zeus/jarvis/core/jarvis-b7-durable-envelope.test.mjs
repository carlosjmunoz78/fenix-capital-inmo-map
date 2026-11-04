import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB7DurableMissionEnvelope} from './jarvis-b7-durable-envelope.mjs';
const H='a'.repeat(64);
const mission=()=>({companyId:'fenix',ownerId:'owner-1',sessionId:'session-1',
 missionId:'mission-1',engineId:'ORCH-001',environment:'LAB',version:'0.1.0',
 maxEuro:0,maxParallel:2,timeoutMs:10000,tasks:[{
 taskId:'a',capability:'GITHUB_FILE_READ',dependsOn:[],depth:0,idempotencyKey:'idem-a',operation:'READ'
 }]});
function rig(options={},stored=new Map()){
 const calls=[];let n=0;
 const params={identityProvider:{verify:async()=>({ownerId:options.impersonate?'someone-else':'owner-1',
  sessionId:'session-1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']})},
  policy:{authorize:async()=>({decision:options.revokeGrant?'DENY':'ALLOW'})},
  supervisor:{inspect:async()=>({enabled:!options.stop,killSwitch:!!options.stop,revoked:false,halted:false})},
  journal:{
   claim:async s=>{calls.push('claim');const key=[s.ownerId,s.companyId,s.missionId,s.idempotencyKey].join('|');
    const old=stored.get(key);
    if(!old){stored.set(key,{state:'IN_PROGRESS',fingerprint:s.fingerprint,scope:{...s}});
     return {state:'CLAIMED'};}
    if(old.fingerprint!==s.fingerprint)return {state:'CONFLICT'};
    if(old.state==='COMPLETED')return {state:'ALREADY_COMPLETED',...old.scope,evidenceHash:old.evidenceHash};
    if(old.state==='FAILED')return {state:'DENY'};
    return {state:'IN_PROGRESS'};},
   complete:async s=>{calls.push('complete');if(options.missingCommit)return false;
    const key=[s.ownerId,s.companyId,s.missionId,s.idempotencyKey].join('|');
    stored.set(key,{state:'COMPLETED',scope:{...s},fingerprint:s.fingerprint,evidenceHash:s.evidenceHash});
    return true;},
   fail:async s=>{calls.push('fail');const key=[s.ownerId,s.companyId,s.missionId,s.idempotencyKey].join('|');
    stored.set(key,{state:'FAILED',fingerprint:s.fingerprint});return true;}
  },
  orchestrator:{executeMission:async ({mission:m})=>{n++;calls.push('execute');
   if(options.fail)throw Error('error');
   if(options.badEvidence)return {state:'LAB_ACCEPTED',accepted:1,total:1,spentEuro:0,results:[{state:'ACCEPTED'}]};
   if(options.partial)return {state:'LAB_PARTIAL',accepted:0,total:1,spentEuro:0,results:[]};
   return {state:'LAB_ACCEPTED',accepted:m.tasks.length,total:m.tasks.length,spentEuro:0,
    planFingerprint:H,results:m.tasks.map(t=>({taskId:t.taskId,state:'ACCEPTED',evidenceHash:H,
     specialistId:'worker-1',engineId:'CAPA-001'}))};}},
  audit:{append:async()=>!options.auditFail}
 };
 return{envelope:createJarvisB7DurableMissionEnvelope(params),stored,calls,get count(){return n;}};
}
const run=x=>x.envelope.execute({mission:mission(),missionKey:'m-key',token:'opaque'});
test('first mission commits verified SHA256 receipt',async()=>{
 const x=rig(),r=await run(x);assert.equal(r.state,'LAB_ACCEPTED_DURABLE');
 assert.equal(r.taskCount,1);assert.match(r.evidenceHash,/^[0-9a-f]{64}$/);
 assert.deepEqual(x.calls,['claim','execute','complete']);
});
test('reconnected independent worker recovers mission without replaying B6',async()=>{
 const shared=new Map(),x=rig({},shared),a=await run(x),y=rig({},shared),b=await run(y);
 assert.equal(a.state,'LAB_ACCEPTED_DURABLE');assert.equal(b.state,'ALREADY_COMPLETED_VERIFIED');
 assert.equal(b.evidenceHash,a.evidenceHash);assert.equal(y.count,0);
});
test('concurrent workers race atomically: at most one execute',async()=>{
 const shared=new Map(),x=rig({},shared),y=rig({},shared);
 const [a,b]=await Promise.all([run(x),run(y)]);
 assert.equal([a,b].filter(r=>r.state==='LAB_ACCEPTED_DURABLE').length,1);
 assert.equal(x.count+y.count,1);
});
test('crash/connection failure before complete remains locked and not autoretried',async()=>{
 const shared=new Map(),x=rig({},shared);
 const m=mission();shared.set('owner-1|fenix|mission-1|m-key',{state:'IN_PROGRESS',
  fingerprint:'placeholder'});
 const r=await run(x);assert.equal(r.reason,'MISSION_FINGERPRINT_CONFLICT');assert.equal(x.count,0);
});
test('in-progress claimed same fingerprint stops new execution',async()=>{
 const shared=new Map(),x=rig({missingCommit:true},shared),a=await run(x);
 assert.equal(a.reason,'MISSION_COMPLETION_UNCERTAIN');const y=rig({},shared);
 const b=await run(y);assert.equal(b.reason,'MISSION_IN_PROGRESS_STOPPED');
 assert.equal(y.count,0);
});
test('changed mission with same idempotency key never executes again',async()=>{
 const shared=new Map(),x=rig({},shared);await run(x);
 const y=rig({},shared),m=mission();m.tasks[0].idempotencyKey='changed';
 const r=await y.envelope.execute({mission:m,missionKey:'m-key',token:'opaque'});
 assert.equal(r.reason,'MISSION_FINGERPRINT_CONFLICT');assert.equal(y.count,0);
});
test('failed subordinate task records terminal failure, no automatic restart',async()=>{
 const shared=new Map(),x=rig({partial:true},shared);
 assert.equal((await run(x)).reason,'MISSION_NOT_FULLY_VERIFIED');
 const y=rig({},shared);assert.equal((await run(y)).reason,'MISSION_CLAIM_REJECTED');assert.equal(y.count,0);
});
test('unverified task evidence prevents journal completion',async()=>{
 const x=rig({badEvidence:true});const r=await run(x);
 assert.equal(r.reason,'MISSION_NOT_FULLY_VERIFIED');assert.deepEqual(x.calls,['claim','execute','fail']);
});
test('real B2 mismatch is denied before claiming even with valid token string',async()=>{
 const x=rig({impersonate:true}),r=await run(x);
 assert.equal(r.reason,'OWNER_SCOPE_DENIED');assert.equal(x.calls.length,0);
});
test('denied delegation grant does not touch persistent mission journal',async()=>{
 const x=rig({revokeGrant:true});assert.equal((await run(x)).reason,'B3_COORDINATE_DENIED');
 assert.deepEqual(x.calls,[]);
});
test('supervisor stop blocks claim',async()=>{
 const x=rig({stop:true});assert.equal((await run(x)).reason,'SUPERVISOR_STOP');assert.deepEqual(x.calls,[]);
});
test('audit unavailable before claim blocks operation',async()=>{
 const x=rig({auditFail:true});assert.equal((await run(x)).reason,'AUDIT_UNAVAILABLE');assert.deepEqual(x.calls,[]);
});
test('PROD is strictly forbidden before inspecting ports',async()=>{
 const x=rig(),m=mission();m.environment='PROD';const r=await x.envelope.execute({
  mission:m,missionKey:'m-key',token:'opaque'});
 assert.equal(r.reason,'PROD_NOT_CERTIFIED');assert.deepEqual(x.calls,[]);
});
test('new instance cannot cross company in authenticated owner scope',async()=>{
 const x=rig(),m=mission();m.companyId='aion';const r=await x.envelope.execute({
  mission:m,missionKey:'m-key',token:'opaque'});
 assert.equal(r.reason,'OWNER_SCOPE_DENIED');assert.equal(x.count,0);
});
test('mandatory mission key and payload cost deny before journal',async()=>{
 const x=rig(),m=mission();m.maxEuro=1;
 assert.equal((await x.envelope.execute({mission:m,missionKey:'m-key',token:'opaque'})).reason,'MISSION_INVALID');
 assert.equal((await x.envelope.execute({mission:mission(),token:'opaque'})).reason,'MISSION_INVALID');
 assert.equal(x.count,0);
});
