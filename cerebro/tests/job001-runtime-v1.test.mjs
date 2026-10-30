import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JobRuntimeV1} from '../runtime/job001-runtime-v1.mjs';

test('JOB-001 persists, deduplicates, leases and resumes',()=>{
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'job001-')),'ledger.json');
 let r=new JobRuntimeV1({ledgerFile:file});
 const a=r.enqueue({name:'A',companyId:'zeus',engineId:'JOB-001',environment:'PREPROD',version:'jarvis-mission-job001-v1',payload:{x:1},idempotencyKey:'same'});
 const b=r.enqueue({name:'A',companyId:'zeus',engineId:'JOB-001',environment:'PREPROD',version:'jarvis-mission-job001-v1',payload:{x:1},idempotencyKey:'same'});
 assert.equal(a.accepted,true);assert.equal(b.duplicate,true);assert.equal(a.job.job_id,b.job.job_id);
 const lease=r.leaseJob({workerId:'w1',companyId:'zeus',environment:'PREPROD',engineId:'JOB-001',version:'jarvis-mission-job001-v1'});
 assert.equal(lease.status,'LEASED');
 r.completeJob({jobId:lease.job_id,workerId:'w1',result:{evidence:['ok']}});
 r=new JobRuntimeV1({ledgerFile:file});
 assert.equal(r.getJob(a.job.job_id).status,'SUCCEEDED');
 assert.equal(r.summary().total,1);
});

test('JOB-001 fails closed outside PREPROD / trading',()=>{
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'job001-')),'ledger.json');
 const r=new JobRuntimeV1({ledgerFile:file});
 assert.throws(()=>r.enqueue({name:'x',companyId:'zeus',environment:'PROD',idempotencyKey:'x'}),/PREPROD_ONLY/);
 assert.throws(()=>r.enqueue({name:'x',companyId:'zeus',engineId:'TRADING-LAB',environment:'PREPROD',idempotencyKey:'y'}),/TRADING_DENIED/);
});
