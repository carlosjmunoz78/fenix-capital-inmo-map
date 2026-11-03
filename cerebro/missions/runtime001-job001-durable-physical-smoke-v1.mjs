import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Runtime001DurableJob001LedgerAdapterV1 as Adapter} from '../runtime/runtime001-durable-job001-adapter-v1.mjs';
import {Runtime001SharedWorkerV1 as Worker} from '../runtime/runtime001-shared-worker-v1.mjs';
const ROOT=process.env.CEREBRO_RUNTIME001_TEST_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'runtime001-existing-job001-'));
const journal=path.join(ROOT,'existing-job001.v8journal');
const ctx={company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'1.0.0'};
const now=()=>Date.parse('2026-11-03T17:20:00.000Z');
const reopen=()=>new Adapter({file_path:journal,now});
const invokeChild=mode=>{
 const p=spawnSync(process.execPath,[new URL(import.meta.url).pathname,mode],{encoding:'utf8',env:{...process.env,CEREBRO_RUNTIME001_TEST_DIR:ROOT}});
 if(p.status!==0)throw Error(mode+' child failed '+p.stderr+' '+p.stdout);
 return JSON.parse(p.stdout.trim());
};
async function run(){
 fs.mkdirSync(ROOT,{recursive:true});
 const ledger=reopen();let calls=0;const audit=[];
 const input={name:'KNW001_DETERMINISTIC_PREPROD_SMOKE',context:ctx,payload:{n:7},idempotency_key:'runtime001-acceptance-job',now_ms:now()};
 const enq=ledger.enqueue(input);assert.equal(enq.accepted,true);
 assert.equal(ledger.enqueue(input).duplicate,true);
 const worker=new Worker({ledger,engine_resolver:{async resolve(){return {async execute({payload}){calls++;return {n:payload.n*2}}}}},policy:{async authorize(){return {allowed:true}}},audit:{append:e=>audit.push(e)},clock:()=>new Date(now()).toISOString()});
 const result=await worker.runOnce({context:ctx,actor:{id:'runtime001-acceptance-worker'}});
 assert.equal(result.status,'SUCCEEDED');assert.equal(result.result.n,14);assert.equal(calls,1);
 assert.ok(audit.some(x=>x.type==='RUNTIME001_JOB_SUCCEEDED'));
 const restored=invokeChild('verify');
 assert.equal(restored.status,'SUCCEEDED');assert.equal(restored.count,1);assert.equal(restored.result.n,14);
 const backup=path.join(ROOT,'backup-original.v8journal');fs.copyFileSync(journal,backup);
 const checksum=buf=>crypto.createHash('sha256').update(fs.readFileSync(buf)).digest('hex');
 const before=checksum(backup);
 const mutated=reopen();mutated.enqueue({name:'SYNTHETIC_ROLLBACK_FIXTURE',context:ctx,payload:{n:999},idempotency_key:'rollback-temp',now_ms:now()});
 assert.equal(mutated.listForContext(ctx).length,2);
 fs.copyFileSync(backup,journal);
 assert.equal(checksum(journal),before);
 const rolled=invokeChild('verify');
 assert.equal(rolled.status,'SUCCEEDED');assert.equal(rolled.count,1);
 assert.throws(()=>reopen().enqueue({name:'PROD',context:{...ctx,environment:'PROD'},idempotency_key:'forbidden'}),/CONTEXT_DENIED/);
 assert.throws(()=>reopen().enqueue({name:'TRADING',context:{...ctx,engine_id:'LAB-TRD'},idempotency_key:'forbidden-trading'}),/CONTEXT_DENIED/);
 assert.equal(reopen().listForContext({...ctx,company_id:'other-company'}).length,0);
 const summary={schema_version:'1.0.0',status:'GREEN_RUNNER_FILESYSTEM_ACCEPTANCE',engine_id:'RUNTIME-001',environment:'PREPROD',checks:{existing_job001_ledger:true,durable_same_runner_process_restart:true,worker_executes:true,job_idempotency:true,tenant_scope:true,backup_checksum:true,rollback_rebuild_same_artifact:true,prod_denied:true,trading_denied:true},limits:{permanent_external_host_verified:false,cross_host_restart_verified:false,external_telemetry_verified:false,prod_authorized:false},additional_cost_eur:0};
 fs.writeFileSync(path.join(ROOT,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
 console.log('RUNTIME001_DURABLE_ACCEPTANCE='+JSON.stringify(summary));
}
if(process.argv[2]==='verify'){
 const ledger=reopen();const jobs=ledger.listForContext(ctx);assert.equal(jobs.length,1);assert.equal(jobs[0].status,'SUCCEEDED');console.log(JSON.stringify({status:jobs[0].status,count:jobs.length,result:jobs[0].result}));
}else await run();
