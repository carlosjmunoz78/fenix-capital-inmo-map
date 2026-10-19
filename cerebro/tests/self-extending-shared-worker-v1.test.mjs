import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildLegacy184SelfExtendingDispatchBatch} from '../runtime/universal-skill-legacy184-self-extending-reopen-v0.mjs';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {
  createTribunalVerifyAndResume,
  normalizeSelfExtendingBindings,
  runSelfExtendingSharedWorkerIteration,
  SELF_EXTENDING_SHARED_WORKER_V1_CONTRACT
} from '../runtime/self-extending-shared-worker-v1.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-selfext-shared-'));}
function bindingFor(job,{old=0.40,next=0.85}={}){
  return {
    capability_id:job.resolution.capability_id,
    state:'FULL_SAFE_PREPROD',
    strategies:['REUSE_INTERNAL'],
    evidence_ref:`evidence:${job.resolution.capability_id}`,
    validation:{
      metric:'acceptance_score',direction:'higher',old,new:next,judge_id:'EVA-001',candidate_actor_id:job.candidate_id,
      evidence_refs:[`evidence:${job.resolution.capability_id}`]
    },
    recovery:{backup_ref:'backup:selfext:test',rollback_ref:'rollback:selfext:test',rebuild_ref:'rebuild:selfext:test'}
  };
}

test('exact legacy dispatch -> durable runtime -> shared worker -> resolver -> verify/resume -> Tribunal chain reaches RESUMED_GREEN',async()=>{
  const root=temp();
  try{
    const batch=buildLegacy184SelfExtendingDispatchBatch({company_id:'fenix'});
    assert.ok(batch.jobs.length>0);
    const first=batch.jobs[0];
    const result=await runSelfExtendingSharedWorkerIteration({company_root:root,company_id:'fenix',bindings:[bindingFor(first)],max_rounds:1,now_ms:1700000000000});
    assert.equal(result.status,'PREPROD_ITERATION_COMPLETE');
    assert.equal(result.dispatch.requested,batch.jobs.length);
    assert.equal(result.dispatch.accepted_count,batch.jobs.length);
    assert.equal(result.outcomes.length,1);
    assert.equal(result.outcomes[0].status,'SUCCEEDED');
    assert.equal(result.outcomes[0].job.result.status,'RESUMED_GREEN');
    assert.equal(result.outcomes[0].job.result.resume_result.tribunal.decision,'PASS');
    assert.equal(result.outcomes[0].job.result.job001_resume,'VERIFIED_AND_RESUMED');
    assert.equal(result.outcomes[0].job.result.prod_authorized,false);
    assert.equal(result.outcomes[0].job.result.additional_cost_eur,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('durable journal survives runtime recreation and idempotent redispatch',async()=>{
  const root=temp();
  try{
    const batch=buildLegacy184SelfExtendingDispatchBatch({company_id:'fenix'});
    const first=batch.jobs[0];
    const firstRun=await runSelfExtendingSharedWorkerIteration({company_root:root,company_id:'fenix',bindings:[bindingFor(first)],max_rounds:1,now_ms:1700000000000});
    const runtime=new DurableJobRuntimeV1({file_path:path.join(root,'job001-self-extending.v1.journal'),environment:'PREPROD'});
    const context={company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0'};
    const persisted=runtime.listForContext(context);
    assert.equal(persisted.length,batch.jobs.length);
    assert.equal(persisted.filter((job)=>job.status==='SUCCEEDED').length,1);
    assert.equal(persisted.find((job)=>job.status==='SUCCEEDED').result.status,'RESUMED_GREEN');
    const secondRun=await runSelfExtendingSharedWorkerIteration({company_root:root,company_id:'fenix',bindings:[bindingFor(first)],max_rounds:1,now_ms:1700000001000});
    assert.equal(secondRun.dispatch.accepted_count,0);
    assert.equal(secondRun.dispatch.duplicate_count,batch.jobs.length);
    assert.equal(firstRun.batch_hash,secondRun.batch_hash);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Tribunal blocks a binding that degrades the predefined metric',async()=>{
  const batch=buildLegacy184SelfExtendingDispatchBatch({company_id:'fenix'});
  const first=batch.jobs[0];
  const bad=normalizeSelfExtendingBindings([bindingFor(first,{old:0.90,next:0.20})])[0];
  const verify=createTribunalVerifyAndResume();
  const result=await verify({resolution:first.resolution,selected:{binding:bad,evidence_ref:bad.evidence_ref}});
  assert.equal(result.status,'HOLD');
  assert.match(result.reason,/TRIBUNAL_FAIL:candidate_degraded/);
  assert.equal(result.prod_authorized,false);
});

test('binding contract refuses fake green without independent evidence/recovery',()=>{
  const batch=buildLegacy184SelfExtendingDispatchBatch({company_id:'fenix'});
  const first=batch.jobs[0];
  const raw=bindingFor(first);
  assert.throws(()=>normalizeSelfExtendingBindings([{...raw,evidence_ref:''}]),/evidence_ref/);
  assert.throws(()=>normalizeSelfExtendingBindings([{...raw,validation:{...raw.validation,judge_id:raw.validation.candidate_actor_id}}]),/judge must be independent/);
  assert.throws(()=>normalizeSelfExtendingBindings([{...raw,recovery:{...raw.recovery,rollback_ref:''}}]),/rollback_ref/);
  assert.deepEqual(SELF_EXTENDING_SHARED_WORKER_V1_CONTRACT.chain,[
    'buildLegacy184SelfExtendingDispatchBatch','enqueueSelfExtendingDispatchBatch','DurableJobRuntimeV1','DurableWorkerRunnerV1','self-extending-capability-resolver-v0','verify_and_resume','evaluation-tribunal'
  ]);
  assert.equal(SELF_EXTENDING_SHARED_WORKER_V1_CONTRACT.new_server_required,false);
  assert.equal(SELF_EXTENDING_SHARED_WORKER_V1_CONTRACT.prod_authorized,false);
});
