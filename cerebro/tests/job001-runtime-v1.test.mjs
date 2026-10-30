import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JobRuntimeV1} from '../runtime/job001-runtime-v1.mjs';

test('JOB-001 persists, deduplicates, leases and resumes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'job001-'));
 const file=path.join(dir,'ledger.json');
 let r=new JobRuntimeV1({ledgerFile:file});
 const a=r.enqueue({name:'A',companyId:'zeus',engineId:'ORCH-001',environment:'PREPROD',version:'MISSION-JARVIS-001',payload:{x:1},idempotencyKey:'same'});
 const b=r.enqueue({name:'A',companyId:'zeus',engineId:'ORCH-001',environment:'PREPROD',version:'MISSION-JARVIS-001',payload:{x:1},idempotencyKey:'same'});
 assert.equal(a.job_id,b.job_id);
 const lease=r.leaseJob({workerId:'w1',companyId:'zeus',environment:'PREPROD',engineId:'ORCH-001'});
 assert.equal(lease.status,'LEASED');
 r.completeJob({jobId:lease.job_id,workerId:'w1',result:{evidence:['ok']}});
 r=new JobRuntimeV1({ledgerFile:file});
 assert.equal(r.getJob(a.job_id).status,'SUCCEEDED');
 assert.equal(r.summary().total,1);
});

test('JOB-001 fails closed outside PREPROD / trading',()=>{
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'job001-')),'ledger.json');
 const r=new JobRuntimeV1({ledgerFile:file});
 assert.throws(()=>r.enqueue({name:'x',companyId:'zeus',environment:'PROD',idempotencyKey:'x'}),/PREPROD_ONLY/);
 assert.throws(()=>r.enqueue({name:'x',companyId:'zeus',engineId:'TRADING-LAB',environment:'PREPROD',idempotencyKey:'y'}),/TRADING_DENIED/);
});
