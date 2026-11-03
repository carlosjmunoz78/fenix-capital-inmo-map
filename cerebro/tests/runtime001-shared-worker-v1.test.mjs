import test from 'node:test';
import assert from 'node:assert/strict';
import {Runtime001SharedWorkerV1,RUNTIME001_SHARED_WORKER_V1_CONTRACT} from '../runtime/runtime001-shared-worker-v1.mjs';

const CONTEXT=Object.freeze({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'});

function fixture({throwOnce=false}={}){
  const rows=[];const completed=new Map();const audit=[];let executeCalls=0;let shouldThrow=throwOnce;
  const jobs=[{job_id:'j1',idempotency_key:'idem-1',...CONTEXT,attempt:1,payload:{value:7}}];
  const ledger={
    leaseNext({context}){const job=jobs.shift();if(!job)return null;assert.equal(context.company_id,job.company_id);return structuredClone(job);},
    heartbeat({job_id}){rows.push(['heartbeat',job_id]);},
    succeed({job_id,idempotency_key,result}){if(completed.has(idempotency_key))return {deduplicated:true};completed.set(idempotency_key,result);rows.push(['succeed',job_id]);return {deduplicated:false};},
    fail({job_id}){rows.push(['fail',job_id]);if(shouldThrow){shouldThrow=false;jobs.push({job_id:'j1-retry',idempotency_key:'idem-1',...CONTEXT,attempt:2,payload:{value:7}});return {retryable:true};}return {retryable:false};},
    recoverExpired(){return {recovered:2};},
  };
  const engine_resolver={async resolve(){return {async execute({payload}){executeCalls+=1;if(shouldThrow)throw new Error('controlled');return {answer:payload.value*2};}};}};
  const policy={async authorize(){return {allowed:true};}};
  const auditAdapter={append(event){audit.push(structuredClone(event));}};
  return {worker:new Runtime001SharedWorkerV1({ledger,engine_resolver,policy,audit:auditAdapter,clock:()=> '2026-11-03T15:00:00.000Z'}),rows,audit,get executeCalls(){return executeCalls;}};
}

test('contract reuses existing JOB ledger and denies PROD/trading',()=>{
  assert.equal(RUNTIME001_SHARED_WORKER_V1_CONTRACT.reuses_existing_job_ledger,true);
  assert.equal(RUNTIME001_SHARED_WORKER_V1_CONTRACT.creates_second_queue,false);
  assert.equal(RUNTIME001_SHARED_WORKER_V1_CONTRACT.creates_second_scheduler,false);
  assert.equal(RUNTIME001_SHARED_WORKER_V1_CONTRACT.prod_target_exposed,false);
  assert.equal(RUNTIME001_SHARED_WORKER_V1_CONTRACT.trading_access,false);
});

test('executes one governed PREPROD job with audit',async()=>{
  const f=fixture();
  const out=await f.worker.runOnce({context:CONTEXT});
  assert.equal(out.status,'SUCCEEDED');
  assert.deepEqual(out.result,{answer:14});
  assert.equal(out.prod_authorized,false);
  assert.equal(f.executeCalls,1);
  assert.deepEqual(f.rows,[['heartbeat','j1'],['succeed','j1']]);
  assert.ok(f.audit.some(x=>x.type==='RUNTIME001_JOB_SUCCEEDED'));
});

test('recovers expired leases without a second queue',()=>{
  const f=fixture();
  const out=f.worker.recover({context:CONTEXT,lease_timeout_ms:60_000});
  assert.equal(out.recovered,2);
  assert.equal(out.trading_access,false);
  assert.ok(f.audit.some(x=>x.type==='RUNTIME001_RECOVERY'));
});

test('controlled failure goes RETRY_WAIT and can recover',async()=>{
  const f=fixture({throwOnce:true});
  const first=await f.worker.runOnce({context:CONTEXT});
  const second=await f.worker.runOnce({context:CONTEXT});
  assert.equal(first.status,'RETRY_WAIT');
  assert.equal(second.status,'SUCCEEDED');
  assert.equal(f.executeCalls,2);
});

test('PROD and LAB-TRD are denied before leasing',async()=>{
  const f=fixture();
  await assert.rejects(()=>f.worker.runOnce({context:{...CONTEXT,environment:'PROD'}}),/PROD_TARGET_NOT_AUTHORIZED/);
  await assert.rejects(()=>f.worker.runOnce({context:{...CONTEXT,engine_id:'LAB-TRD'}}),/TRADING_ISOLATION_DENIED/);
  assert.equal(f.executeCalls,0);
});

test('policy denial performs no job execution',async()=>{
  const f=fixture();
  const worker=new Runtime001SharedWorkerV1({
    ledger:{leaseNext(){throw new Error('must not lease');},heartbeat(){},succeed(){},fail(){},recoverExpired(){return {recovered:0};}},
    engine_resolver:{async resolve(){return {async execute(){throw new Error('must not execute');}};}},
    policy:{async authorize(){return {allowed:false,reason:'scope'};}},
    audit:{append(){}},
  });
  const out=await worker.runOnce({context:CONTEXT});
  assert.equal(out.status,'POLICY_DENIED');
});
