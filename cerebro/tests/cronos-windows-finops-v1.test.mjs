import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {CostLedgerV0} from '../runtime/observability-audit-finops.mjs';
import {evaluateCronosDispatch,CRONOS_CLOSURE_BUDGET} from '../runtime/cronos-zero-cost-dispatch-v1.mjs';
const ctx={company_id:'fenix',engine_id:'JOB-001',environment:'PREPROD',version:'cronos-winfix-lab'};
const route={provider:'LOCAL',execution_class:'DETERMINISTIC',environment:'LAB',approved:true,external_calls:false,inference:false};
const zero={projected_micros:0,settled_micros:0,reserved_micros:0};
function isolated(fn){const d=mkdtempSync(join(tmpdir(),'cronos-winfix-'));try{return fn(d)}finally{rmSync(d,{recursive:true,force:true})}}
test('JOB001 real journal persists, resumes in another process, deduplicates and restores backup',()=>isolated(d=>{
 const file=join(d,'job.v8');let r=new DurableJobRuntimeV1({file_path:file});const args={name:'lab.durability',context:ctx,payload:{purpose:'Windows persistence'},idempotency_key:'winfix-test',now_ms:1000};
 const job=r.enqueue(args).job;const id=job.job_id;assert.equal(r.claim({context:ctx,worker_id:'lab-worker',now_ms:1001}).job_id,id);
 r.checkpoint({job_id:id,worker_id:'lab-worker',checkpoint:{stage:'saved'},now_ms:1002});
 assert.throws(()=>r.complete({job_id:id,worker_id:'other',result:{},now_ms:1003}));
 const url=new URL('../runtime/durable-job-runtime-v1.mjs',import.meta.url).href;
 const child=spawnSync(process.execPath,['--input-type=module','-e',"import {DurableJobRuntimeV1} from "+JSON.stringify(url)+"; const r=new DurableJobRuntimeV1({file_path:process.argv[1]});console.log(JSON.stringify(r.get(process.argv[2])));",file,id],{encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout).checkpoint,{stage:'saved'});
 r.complete({job_id:id,worker_id:'lab-worker',result:{accepted:true},now_ms:1004});
 r=new DurableJobRuntimeV1({file_path:file});assert.equal(r.get(id).status,'SUCCEEDED');assert.equal(r.enqueue(args).duplicate,true);
 const backup=join(d,'backup.v8');copyFileSync(file,backup);const restored=new DurableJobRuntimeV1({file_path:backup});assert.deepEqual(restored.get(id),r.get(id));
 const corrupted=join(d,'corrupted.v8');const bytes=readFileSync(file);bytes[bytes.length-1]^=255;writeFileSync(corrupted,bytes);assert.throws(()=>new DurableJobRuntimeV1({file_path:corrupted}));
}));
test('FINOPS actual ledger records local mission at explicit zero and reopens',()=>isolated(d=>{
 const file=join(d,'finops.v8');const cost=new CostLedgerV0({file_path:file});
 assert.equal(evaluateCronosDispatch({route,...zero}).allowed,true);
 cost.record({context:{...ctx,engine_id:'CRONOS-001'},correlation_id:'LAB-WINFIX',task_id:'windows-durability',provider:'LOCAL',cost_eur:0,metadata:{classification:'NO_EXTERNAL_INFERENCE',billing_reconciled:false}});
 const reopened=new CostLedgerV0({file_path:file});assert.equal(reopened.aggregate({company_id:'fenix'}).cost_eur_micros,0);assert.equal(reopened.list().length,1);
}));
test('zero ceiling not legacy 200 or advisory 150',()=>{assert.equal(CRONOS_CLOSURE_BUDGET.authorized_incremental_eur,0);assert.equal(CRONOS_CLOSURE_BUDGET.target_eur,150);assert.equal(evaluateCronosDispatch({route,...zero,projected_micros:1}).code,'MONEY_LIMIT')});
test('unknown or invalid cost is held',()=>{for(const v of [undefined,null,NaN,-1,0.1,Infinity])assert.equal(evaluateCronosDispatch({route,...zero,projected_micros:v}).allowed,false)});
test('settled or reserved cost across agents blocks any additional dispatch',()=>{for(const k of ['settled_micros','reserved_micros'])assert.equal(evaluateCronosDispatch({route,...zero,[k]:1}).code,'MONEY_LIMIT')});
test('external free claim not enough; paid inference denied',()=>{for(const provider of ['DEEPSEEK','CLOUDFLARE','UNKNOWN'])assert.equal(evaluateCronosDispatch({route:{...route,provider,inference:true},...zero}).allowed,false)});
test('unapproved and PROD route denied',()=>{assert.equal(evaluateCronosDispatch({route:{...route,approved:false},...zero}).allowed,false);assert.equal(evaluateCronosDispatch({route:{...route,environment:'PROD'},...zero}).allowed,false)});
