import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJarvisB7Orchestrator,B7_LIMITS} from './jarvis-b7-orchestrator.mjs';
const H=createHash('sha256').update('synthetic-read').digest('hex');
const task=(taskId,dependsOn=[],extra={})=>({taskId,dependsOn,depth:0,capability:'GITHUB_FILE_READ',
 idempotencyKey:'idem-'+taskId,operation:'READ',...extra});
const M=(tasks=[task('a')],extra={})=>({companyId:'fenix',ownerId:'owner-1',sessionId:'sess-1',
 missionId:'m-1',engineId:'ORCH-001',environment:'LAB',version:'0.1.0',tasks,maxEuro:0,
 maxParallel:2,timeoutMs:10000,...extra});
function rig(opt={}){
 const log=[],receipts=opt.receipts||new Map();let active=0,peak=0;
 const ports={
  catalog:{resolve:async p=>{log.push(['catalog',p.companyId]);return {companyId:opt.crossTenant?'aion':p.companyId,
   environment:'LAB',specialistId:opt.specialistId||'worker-1',engineId:'CAPA-001',version:'0.1.0',
   capability:p.capability,mode:'B6_CONTROLLED_READ',operation:'READ',
   enabled:true,mutating:opt.mutating??false,estimatedEuro:opt.cost??0,canDelegate:false,
   permissions:['JARVIS_CAPABILITY_EXECUTE_READ']};}},
  policy:{authorize:async p=>{log.push(['policy',p.actionName]);return {decision:opt.denyGrant?'DENY':'ALLOW'};}},
  b6Executor:{executeRead:async p=>{log.push(['b6',p.missionId]);active++;peak=Math.max(peak,active);
   await new Promise(r=>setTimeout(r,1));active--;if(opt.stopAfterRead)opt.halted=true;
   if(opt.failTask&&p.missionId.endsWith('/'+opt.failTask))return {state:'DENY'};
   const key=p.companyId+'|'+p.missionId+'|'+p.idempotencyKey;
   const existed=receipts.has(key);receipts.set(key,H);
   return {state:existed?'ALREADY_COMPLETED_VERIFIED':'EXECUTED_VERIFIED_READ',
    evidenceHash:H,spentEuro:opt.badReceiptCost?1:0};}},
  supervisor:{inspect:async p=>{log.push(['supervisor',p.taskId]);return {enabled:!opt.killed,
   killSwitch:!!opt.killed,halted:!!opt.halted,revoked:!!opt.revoked,costEuro:0};}},
  tribunal:{verify:async p=>{log.push(['tribunal',p.taskId]);return {decision:opt.reject?'REJECT':'ACCEPT',
   verified:true,verifierId:opt.selfJudge?'worker-1':'judge-independent',evidenceHash:H};}},
  audit:{append:async p=>{log.push(['audit',p.eventCode]);return !opt.auditFail;}}
 };
 return {engine:createJarvisB7Orchestrator(ports),log,receipts,get peak(){return peak;}};
}
test('parallel independent tasks use shared runtime with zero cost',async()=>{
 const x=rig(),r=await x.engine.executeMission({mission:M([task('a'),task('b')]),token:'opaque'});
 assert.equal(r.state,'LAB_ACCEPTED');assert.equal(r.accepted,2);assert.equal(r.spentEuro,0);
 assert.equal(x.peak,2);assert.equal(r.results[0].evidenceHash,H);
});
test('topological dependencies enforce serial execution',async()=>{
 const x=rig(),r=await x.engine.executeMission({mission:M([task('a'),task('b',['a']),task('c',['b'])]),token:'opaque'});
 assert.equal(r.accepted,3);assert.deepEqual(x.log.filter(v=>v[0]==='b6').map(v=>v[1]),['m-1/a','m-1/b','m-1/c']);
});
test('B6 receipt replay across fresh orchestrators does not duplicate claimed job',async()=>{
 const receipts=new Map(),a=rig({receipts}),b=rig({receipts});
 await a.engine.executeMission({mission:M(),token:'opaque'});
 const result=await b.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(result.state,'LAB_ACCEPTED');assert.equal(result.results[0].replayed,true);assert.equal(receipts.size,1);
});
test('specialist failure stops dependents but preserves independent',async()=>{
 const x=rig({failTask:'a'}),r=await x.engine.executeMission({mission:M([task('a'),task('b',['a']),task('c')]),token:'opaque'});
 assert.equal(r.state,'LAB_PARTIAL');assert.equal(r.accepted,1);
 assert.equal(r.results.find(v=>v.taskId==='b').reason,'DEPENDENCY_FAILED');
 assert.equal(x.log.filter(v=>v[0]==='b6').length,2);
});
test('no self-certification by specialist',async()=>{
 const x=rig({selfJudge:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.results[0].reason,'TRIBUNAL_REJECTED');
});
test('negative independent tribunal rejects',async()=>{
 const x=rig({reject:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.state,'LAB_PARTIAL');assert.equal(r.results[0].reason,'TRIBUNAL_REJECTED');
});
test('B3 denial blocks B6 execution',async()=>{
 const x=rig({denyGrant:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.results[0].reason,'B3_DELEGATION_DENIED');
 assert.equal(x.log.some(v=>v[0]==='b6'),false);
});
test('supervisor kill before dispatch prevents B6',async()=>{
 const x=rig({killed:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.reason,'SUPERVISOR_STOP');assert.equal(x.log.some(v=>v[0]==='b6'),false);
});
test('supervisor revoked before dispatch prevents B6',async()=>{
 const x=rig({revoked:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.reason,'SUPERVISOR_STOP');assert.equal(x.log.some(v=>v[0]==='b6'),false);
});
test('revocation during in-flight READ rejects result and descendant',async()=>{
 const x=rig({stopAfterRead:true}),r=await x.engine.executeMission({mission:M([task('a'),task('b',['a'])]),token:'opaque'});
 assert.equal(r.results[0].reason,'SUPERVISOR_STOP_AFTER_READ');
 assert.equal(x.log.filter(v=>v[0]==='b6').length,1);
});
test('inter-company catalog substitution fails closed',async()=>{
 const x=rig({crossTenant:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.reason,'SPECIALIST_CONTRACT_INVALID');assert.equal(x.log.some(v=>v[0]==='b6'),false);
});
test('contract refuses mutation specialist and paid cost',async()=>{
 for(const options of [{mutating:true},{cost:.01}]){
  const x=rig(options),r=await x.engine.executeMission({mission:M(),token:'opaque'});
  assert.equal(r.reason,'SPECIALIST_CONTRACT_INVALID');assert.equal(x.log.some(v=>v[0]==='b6'),false);
 }
});
test('reject paid B6 receipt even after dispatch',async()=>{
 const x=rig({badReceiptCost:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.results[0].reason,'B6_DENIED_OR_UNVERIFIED');
});
test('hard PROD lock before any port',async()=>{
 const x=rig(),r=await x.engine.executeMission({mission:M([task('a')],{environment:'PROD'}),token:'opaque'});
 assert.equal(r.reason,'PROD_NOT_CERTIFIED');assert.equal(x.log.length,0);
});
test('client-provided script and unauthorized operation rejected without port calls',async()=>{
 const x=rig(),r=await x.engine.executeMission({mission:M([task('a',[],{script:'shell',operation:'WRITE'})]),token:'opaque'});
 assert.equal(r.reason,'TASK_INVALID');assert.equal(x.log.length,0);
});
test('duplicate ID and idempotency key rejected',async()=>{
 const x=rig(),cases=[[task('a'),task('a')],[task('a'),task('b',[],{idempotencyKey:'idem-a'})]];
 for(const tasks of cases)assert.equal((await x.engine.executeMission({mission:M(tasks),token:'opaque'})).reason,'TASK_INVALID');
 assert.equal(x.log.length,0);
});
test('DAG cycle and unknown dependency rejected',async()=>{
 const x=rig();
 assert.equal((await x.engine.executeMission({mission:M([task('a',['b']),task('b',['a'])]),token:'opaque'})).reason,'DEPENDENCY_CYCLE');
 assert.equal((await x.engine.executeMission({mission:M([task('a',['z'])]),token:'opaque'})).reason,'DEPENDENCY_INVALID');
 assert.equal(x.log.length,0);
});
test('effective depth cannot be spoofed by client claimed depth 0',async()=>{
 const x=rig(),a=Array.from({length:6},(_,i)=>task('t'+i,i?['t'+(i-1)]:[]));
 assert.equal((await x.engine.executeMission({mission:M(a),token:'opaque'})).reason,'DEPTH_EXCEEDED');
});
test('task and parallel limits prevent runaway recursion/consumption',async()=>{
 const x=rig(),big=Array.from({length:17},(_,i)=>task('t'+i));
 assert.equal((await x.engine.executeMission({mission:M(big),token:'opaque'})).reason,'MISSION_INVALID');
 assert.equal((await x.engine.executeMission({mission:M([task('a')],{maxParallel:5}),token:'opaque'})).reason,'MISSION_INVALID');
 assert.equal(B7_LIMITS.maxEuro,0);assert.equal(x.log.length,0);
});
test('audit outage blocks dispatch',async()=>{
 const x=rig({auditFail:true}),r=await x.engine.executeMission({mission:M(),token:'opaque'});
 assert.equal(r.reason,'AUDIT_UNAVAILABLE');assert.equal(x.log.some(v=>v[0]==='b6'),false);
});
test('B7 cannot impersonate another engine',async()=>{
 const x=rig(),r=await x.engine.executeMission({mission:M([task('a')],{engineId:'IAM-001'}),token:'opaque'});
 assert.equal(r.reason,'MISSION_INVALID');assert.equal(x.log.length,0);
});
test('missing auth token denies before registry',async()=>{
 const x=rig(),r=await x.engine.executeMission({mission:M()});
 assert.equal(r.reason,'AUTH_REQUIRED');assert.equal(x.log.length,0);
});
