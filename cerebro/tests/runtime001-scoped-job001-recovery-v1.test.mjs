import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Runtime001DurableJob001LedgerAdapterV1 as Adapter } from '../runtime/runtime001-durable-job001-adapter-v1.mjs';

test('scoped watchdog never mutates another tenant or engine in shared durable JOB001 journal',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-scoped-recovery-'));
 try{
  let now=1700000000000;
  const journal=path.join(dir,'shared.v8journal');
  const ledger=new Adapter({file_path:journal,now:()=>now,lease_ms:1000});
  const base={company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'v1'};
  const anotherCompany={...base,company_id:'another-company'};
  const anotherEngine={...base,engine_id:'DOC-001'};
  const contexts=[base,anotherCompany,anotherEngine];
  const ids=[];
  for(let i=0;i<contexts.length;i++){
   const enq=ledger.enqueue({name:'SYNTHETIC_QUEUED',context:contexts[i],idempotency_key:'tenant-job-'+i});
   assert.equal(enq.accepted,true);
   ids.push(enq.job.job_id);
   const leased=ledger.leaseNext({context:contexts[i],worker_id:'test-worker'});
   assert.equal(leased.job_id,ids[i]);
  }
  now+=2000;
  const result=ledger.recoverExpired({context:base});
  assert.equal(result.recovered,1);
  assert.equal(ledger.get(ids[0]).status,'RETRY_WAIT');
  assert.equal(ledger.get(ids[1]).status,'RUNNING');
  assert.equal(ledger.get(ids[2]).status,'RUNNING');
  const restored=new Adapter({file_path:journal,now:()=>now});
  assert.equal(restored.get(ids[1]).status,'RUNNING');
  assert.equal(restored.get(ids[2]).status,'RUNNING');
  assert.equal(restored.recoverExpired({context:anotherCompany}).recovered,1);
  assert.equal(restored.get(ids[1]).status,'RETRY_WAIT');
  assert.equal(restored.get(ids[2]).status,'RUNNING');
  assert.throws(()=>restored.recoverExpired({context:{...base,environment:'PROD'}}),/CONTEXT_DENIED/);
  assert.throws(()=>restored.recoverExpired({context:{...base,engine_id:'LAB-TRD'}}),/CONTEXT_DENIED/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
