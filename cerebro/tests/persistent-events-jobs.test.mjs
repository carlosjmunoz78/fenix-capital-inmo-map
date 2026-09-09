import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PersistentEventBus, PersistentJobQueue, AtomicV8Journal, createPersistentRuntimeIO, PERSISTENT_RUNTIME_V0_CONTRACT } from '../runtime/persistent-runtime.mjs';

const ctx=(company_id='co-a',engine_id='EVT-001')=>({company_id,engine_id,environment:'PREPROD',version:'0.1.0'});
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-persist-'));

test('persistent runtime contract is PREPROD-only, local and zero-additional-cost',()=>{
  assert.equal(PERSISTENT_RUNTIME_V0_CONTRACT.environment,'PREPROD');
  assert.equal(PERSISTENT_RUNTIME_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(PERSISTENT_RUNTIME_V0_CONTRACT.supabase_required,false);
  assert.equal(PERSISTENT_RUNTIME_V0_CONTRACT.autonomous_prod,false);
  assert.deepEqual(PERSISTENT_RUNTIME_V0_CONTRACT.engines,['EVT-001','JOB-001']);
  assert.throws(()=>createPersistentRuntimeIO({directory:tmp(),environment:'PROD'}),/PREPROD/);
});

test('EVT-001 survives process-style restart and preserves idempotency',()=>{
  const dir=tmp(),file=path.join(dir,'events.v8journal');
  let bus=new PersistentEventBus({file_path:file});
  const first=bus.publish({type:'CUSTOMER_UPDATED',payload:{id:1},context:ctx(),idempotency_key:'evt-1'});
  assert.equal(first.accepted,true);
  assert.equal(bus.listForCompany('co-a').length,1);
  bus=new PersistentEventBus({file_path:file});
  assert.equal(bus.listForCompany('co-a').length,1);
  const retry=bus.publish({type:'CUSTOMER_UPDATED',payload:{id:999},context:ctx(),idempotency_key:'evt-1'});
  assert.equal(retry.accepted,false);
  assert.equal(retry.duplicate,true);
  assert.equal(bus.listForCompany('co-a').length,1);
});

test('EVT-001 keeps tenants isolated after restart',()=>{
  const file=path.join(tmp(),'events.v8journal');
  let bus=new PersistentEventBus({file_path:file});
  bus.publish({type:'X',context:ctx('co-a'),idempotency_key:'a'});
  bus.publish({type:'X',context:ctx('co-b'),idempotency_key:'b'});
  bus=new PersistentEventBus({file_path:file});
  assert.equal(bus.listForCompany('co-a').length,1);
  assert.equal(bus.listForCompany('co-b').length,1);
});

test('JOB-001 survives restart through queued, running, retry and success states',()=>{
  const file=path.join(tmp(),'jobs.v8journal');
  let jobs=new PersistentJobQueue({file_path:file});
  const enqueued=jobs.enqueue({name:'sync-crm',context:ctx('co-a','JOB-001'),payload:{customer_id:'c1'},max_attempts:2,idempotency_key:'job-1'});
  assert.equal(enqueued.accepted,true);
  jobs=new PersistentJobQueue({file_path:file});
  const claimed=jobs.claim('co-a');
  assert.equal(claimed.status,'RUNNING');
  assert.equal(claimed.attempts,1);
  const retry=jobs.fail(claimed.job_id,'co-a',new Error('transient'));
  assert.equal(retry.status,'QUEUED');
  jobs=new PersistentJobQueue({file_path:file});
  const claimedAgain=jobs.claim('co-a');
  assert.equal(claimedAgain.attempts,2);
  const done=jobs.complete(claimedAgain.job_id,'co-a',{ok:true});
  assert.equal(done.status,'SUCCEEDED');
  jobs=new PersistentJobQueue({file_path:file});
  assert.equal(jobs.claim('co-a'),null);
  const duplicate=jobs.enqueue({name:'sync-crm',context:ctx('co-a','JOB-001'),payload:{customer_id:'changed'},max_attempts:99,idempotency_key:'job-1'});
  assert.equal(duplicate.accepted,false);
  assert.equal(duplicate.duplicate,true);
});

test('JOB-001 company and full-context claims remain isolated after persistence',()=>{
  const file=path.join(tmp(),'jobs.v8journal');
  let jobs=new PersistentJobQueue({file_path:file});
  jobs.enqueue({name:'a',context:ctx('co-a','JOB-001'),idempotency_key:'a'});
  jobs.enqueue({name:'b',context:ctx('co-b','JOB-001'),idempotency_key:'b'});
  jobs=new PersistentJobQueue({file_path:file});
  const a=jobs.claimContext(ctx('co-a','JOB-001'));
  assert.equal(a.context.company_id,'co-a');
  const b=jobs.claim('co-b');
  assert.equal(b.context.company_id,'co-b');
  assert.throws(()=>jobs.complete(a.job_id,'co-b',{}),/not found for company/);
});

test('journal detects corruption and kind mismatch fail-closed',()=>{
  const dir=tmp(),file=path.join(dir,'state.v8journal');
  const evt=new AtomicV8Journal({file_path:file,kind:'EVT-001'});
  evt.commit([{op:'publish',input:{type:'X',context:ctx(),idempotency_key:'x'}}]);
  assert.throws(()=>new AtomicV8Journal({file_path:file,kind:'JOB-001'}).load(),/kind mismatch/);
  const bytes=fs.readFileSync(file);bytes[Math.floor(bytes.length/2)]^=0xff;fs.writeFileSync(file,bytes);
  assert.throws(()=>evt.load(),/cannot be decoded|checksum mismatch/);
});

test('factory helper creates separate EVT/JOB journals outside Supabase',()=>{
  const dir=tmp(),io=createPersistentRuntimeIO({directory:dir});
  io.events.publish({type:'X',context:ctx(),idempotency_key:'x'});
  io.jobs.enqueue({name:'Y',context:ctx('co-a','JOB-001'),idempotency_key:'y'});
  assert.equal(fs.existsSync(path.join(dir,'evt-001.v8journal')),true);
  assert.equal(fs.existsSync(path.join(dir,'job-001.v8journal')),true);
});
