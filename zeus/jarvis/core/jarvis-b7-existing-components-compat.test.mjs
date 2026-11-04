/** JARVIS B7 compatibility evidence with existing CEREBRO FACT/JOB/SUP/JDG.
 * OLD modules are PREPROD-only. This test compares their pure contracts with
 * B7 LAB subset; it does NOT activate or import their state into PROD.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DynamicDagPlannerV1} from '../../../cerebro/runtime/dynamic-dag-planner-v1.mjs';
import {DurableJobRuntimeV1} from '../../../cerebro/runtime/durable-job-runtime-v1.mjs';
import {CerebroContinuousSupervisorV0} from '../../../cerebro/runtime/cerebro-continuous-supervisor-v0.mjs';
import {technicalSpecialistRegistry} from '../../../cerebro/runtime/cerebro-technical-specialists-v1.mjs';
import {tribunalDecision} from '../../../cerebro/runtime/evaluation-tribunal.mjs';
import {createJarvisB7Orchestrator} from './jarvis-b7-orchestrator.mjs';
const H='b'.repeat(64);
const legacyContext={company_id:'fenix',engine_id:'ORCH-001',environment:'PREPROD',version:'0.1.0'};
const tasks=[{task_id:'a',name:'read a',context:legacyContext,depends_on:[]},
 {task_id:'b',name:'read b',context:legacyContext,depends_on:['a']},
 {task_id:'c',name:'read c',context:legacyContext,depends_on:[]}];
function rig(fail=''){
 const calls=[];
 const B7=createJarvisB7Orchestrator({
  catalog:{resolve:async ({companyId,capability})=>({companyId,environment:'LAB',
   specialistId:'reader',engineId:'CAPA-001',version:'0.1.0',capability,mode:'B6_CONTROLLED_READ',
   operation:'READ',enabled:true,mutating:false,canDelegate:false,estimatedEuro:0,
   permissions:['JARVIS_CAPABILITY_EXECUTE_READ']})},
  policy:{authorize:async()=>({decision:'ALLOW'})},
  b6Executor:{executeRead:async ({missionId})=>{calls.push(missionId.split('/').pop());
   return fail && missionId.endsWith('/'+fail)?{state:'DENY',spentEuro:0}:
    {state:'EXECUTED_VERIFIED_READ',evidenceHash:H,spentEuro:0};}},
  supervisor:{inspect:async()=>({enabled:true,killSwitch:false,revoked:false,halted:false,costEuro:0})},
  tribunal:{verify:async()=>({decision:'ACCEPT',verified:true,verifierId:'judge-1',evidenceHash:H})},
  audit:{append:async()=>true}
 });
 const mission={ownerId:'owner-1',companyId:'fenix',sessionId:'session-1',missionId:'b7-old-new',
  engineId:'ORCH-001',environment:'LAB',version:'0.1.0',maxEuro:0,maxParallel:2,timeoutMs:5000,
  tasks:tasks.map(t=>({taskId:t.task_id,capability:'GITHUB_FILE_READ',operation:'READ',
    idempotencyKey:'k-'+t.task_id,dependsOn:[...t.depends_on],depth:0}))};
 return {B7,calls,mission};
}
test('OLD PREPROD DAG and B7 LAB wrapper select same dependency layers',async()=>{
 const old=new DynamicDagPlannerV1({dag_id:'b7-read-parity',tasks,environment:'PREPROD'});
 assert.deepEqual(new Set(old.plan().ready.map(t=>t.task_id)),new Set(['a','c']));
 assert.deepEqual(old.plan({completed_task_ids:['a','c']}).ready.map(t=>t.task_id),['b']);
 const x=rig(),out=await x.B7.executeMission({mission:x.mission,token:'opaque'});
 assert.equal(out.state,'LAB_ACCEPTED');
 assert.deepEqual(new Set(x.calls.slice(0,2)),new Set(['a','c']));
 assert.deepEqual(x.calls.slice(2),['b']);
});
test('OLD DAG failure propagation agrees with B7 LAB fail closed',async()=>{
 const old=new DynamicDagPlannerV1({dag_id:'b7-fail-parity',tasks,environment:'PREPROD'});
 assert.equal(old.plan({failed_task_ids:['a']}).blocked.find(x=>x.task.task_id==='b').reason,'DEPENDENCY_FAILED');
 const x=rig('a'),out=await x.B7.executeMission({mission:x.mission,token:'opaque'});
 assert.equal(out.state,'LAB_PARTIAL');
 assert.equal(out.results.find(x=>x.taskId==='b').reason,'DEPENDENCY_FAILED');
 assert.equal(x.calls.includes('b'),false);
});
test('existing JOB-001 and Supervisor PREPROD must never be silently run as LAB',()=>{
 assert.throws(()=>new DurableJobRuntimeV1({file_path:'/tmp/not-opened',environment:'LAB'}),/PREPROD/i);
 assert.throws(()=>new CerebroContinuousSupervisorV0({
  job_runtime:null,worker:null,contexts:[],environment:'LAB'}),/PREPROD/i);
});
test('FACT-001 specialist aliases reused: no new independent agents as servers',()=>{
 const reg=technicalSpecialistRegistry();
 assert.equal(reg.engine_id,'FACT-001');assert.equal(reg.new_engine_required,false);
 assert.equal(reg.environment,'PREPROD');
 for(const alias of ['ARQUITECTO','CODE','SYSTEMS','MATH','DATA','SECURITY','QA','INTEGRATOR'])
  assert.equal(reg.specialists.some(s=>s.alias===alias),true);
});
test('existing evaluator/tribunal code rejects self-certification',()=>{
 const old=tribunalDecision({evaluation:{delta:1},judge_id:'worker-1',candidate_actor_id:'worker-1'});
 assert.equal(old.decision,'FAIL');assert.equal(old.prod_authorized,false);
});
