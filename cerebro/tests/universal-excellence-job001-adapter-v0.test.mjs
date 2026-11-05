import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {guardedEnqueueLab} from '../governance/universal-excellence-job001-adapter-v0.mjs';
import {recordUniversalAssessment} from '../governance/universal-excellence-lab-v0.mjs';
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
const m=Object.fromEntries(['quality','truthfulness','safety','reliability','business_impact','efficiency','learning','independence'].map(x=>[x,20]));
test('repeated failures block a durable JOB-001 task without modifying shared runtime',t=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'merit-adapter-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const merit=path.join(d,'merit.v8'),jobs=path.join(d,'jobs.v8');
 for(let n=1;n<=3;n++)recordUniversalAssessment({file_path:merit,evidence:{
 ...ctx,environment:'LAB',subject_class:'AGENT',subject_actor_id:'AGENT_BAD',
 mission_id:'MISSION_'+n,evaluator_actor_id:'INDEPENDENT_A',judge_actor_id:'INDEPENDENT_B',
 meta_evaluator_actor_id:'INDEPENDENT_C',evidence_ref:'fixture:proof_'+n,
 evidence_independently_checked:true,judge_independently_checked:true,
 meta_evaluator_independently_checked:true,metrics:m}});
 const rt=new DurableJobRuntimeV1({file_path:jobs});
 const blocked=guardedEnqueueLab({job_runtime:rt,merit_ledger_path:merit,
 actor_id:'AGENT_BAD',context:ctx,task_name:'LAB_READONLY',payload:{synthetic:true}});
 assert.equal(blocked.job_created,false);
 assert.equal(blocked.gate.state,'SUSPENDED_LAB');
 assert.equal(rt.listForContext(ctx).length,0);
 assert.throws(()=>guardedEnqueueLab({job_runtime:rt,merit_ledger_path:merit,
 actor_id:'AGENT_BAD',context:{...ctx,environment:'PROD'},task_name:'LAB_READONLY'}),/MERIT_JOB001_PREPROD_ONLY/);
});
