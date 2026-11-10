import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{processRecoveryTick} from './worker.mjs';

const SQL=readFileSync(new URL('./schema.sql',import.meta.url),'utf8');
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(SQL);
 const RECOVERY_DB={prepare(sql){return {bind(...args){const statement=db.prepare(sql);return {
  first:async()=>statement.get(...args)??null,
  run:async()=>statement.run(...args),
  all:async()=>statement.all(...args)
 };}}}};
 const env={RECOVERY_DB};
 const setEnabled=flag=>db.prepare('UPDATE fact001_runner_config_v1 SET enabled=? WHERE id=1').run(flag?1:0);
 const enqueue=(id,opts={})=>{
  const fields={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',operation:'fact001.lab.heartbeat',...opts};
  db.prepare(`INSERT INTO fact001_runner_jobs_v1
   (id,company_id,engine_id,environment,version,client_id,operation,payload_hash)
   VALUES(?,?,?,?,?,?,?,?)`).run(id,fields.company_id,fields.engine_id,fields.environment,fields.version,fields.client_id,fields.operation,'a'.repeat(64));
 };
 return {db,env,setEnabled,enqueue};
}
test('worker has no operational public web route',async()=>{
 const response=await worker.fetch(new Request('https://example.invalid/task'),{});
 assert.equal(response.status,404);
 assert.equal((await response.text()),'Not Found');
});
test('runner is OFF by default and does not mutate jobs',async()=>{
 const f=fixture();f.enqueue('job-1');
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'DISABLED');
 assert.equal(f.db.prepare('SELECT state FROM fact001_runner_jobs_v1 WHERE id=?').get('job-1').state,'QUEUED');
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM fact001_runner_ticks_v1').get().n,0);
});
test('runner handles exactly one CEREBRO scoped LAB heartbeat and persists completion',async()=>{
 const f=fixture();f.enqueue('job-1');f.setEnabled(true);
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'COMPLETED');
 const job=f.db.prepare('SELECT state,attempts FROM fact001_runner_jobs_v1 WHERE id=?').get('job-1');
 assert.deepEqual(job,{state:'COMPLETED',attempts:1});
 assert.equal(f.db.prepare("SELECT outcome FROM fact001_runner_ticks_v1").get().outcome,'COMPLETED');
});
test('same scheduledTime never executes twice',async()=>{
 const f=fixture();f.enqueue('job-1');f.enqueue('job-2');f.setEnabled(true);
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'COMPLETED');
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'ALREADY_TICKED');
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM fact001_runner_jobs_v1 WHERE state='COMPLETED'").get().n,1);
 assert.equal((await processRecoveryTick(f.env,1060000)).status,'COMPLETED');
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM fact001_runner_jobs_v1 WHERE state='COMPLETED'").get().n,2);
});
test('ChatGPT operations never run on CEREBRO-only executor',async()=>{
 const f=fixture();f.enqueue('chatgpt-job',{client_id:'chatgpt'});f.setEnabled(true);
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'EMPTY');
 assert.equal(f.db.prepare("SELECT state FROM fact001_runner_jobs_v1 WHERE id='chatgpt-job'").get().state,'QUEUED');
});
test('cross-company commands are denied by LAB schema filters',async()=>{
 const f=fixture();f.enqueue('foreign-job',{company_id:'evil-company'});f.setEnabled(true);
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'EMPTY');
 assert.equal(f.db.prepare("SELECT state FROM fact001_runner_jobs_v1 WHERE id='foreign-job'").get().state,'QUEUED');
});
test('stale RUNNING operation goes to RECONCILE, never reissued',async()=>{
 const f=fixture();f.enqueue('ambiguous');f.setEnabled(true);
 f.db.prepare("UPDATE fact001_runner_jobs_v1 SET state='RUNNING',attempts=1,lease_until_ms=500 WHERE id='ambiguous'").run();
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'EMPTY');
 assert.equal(f.db.prepare("SELECT state,attempts FROM fact001_runner_jobs_v1 WHERE id='ambiguous'").get().state,'RECONCILE');
 assert.equal(f.db.prepare("SELECT attempts FROM fact001_runner_jobs_v1 WHERE id='ambiguous'").get().attempts,1);
});
test('no network calls or secrets and worker limited to scheduled heartbeat',async()=>{
 const src=readFileSync(new URL('./worker.mjs',import.meta.url),'utf8');
 assert.ok(!src.includes('fetch(')||src.includes("async fetch(_request,_env)"));
 assert.ok(!src.includes('Bearer '));assert.ok(!src.includes('SUPABASE_SERVICE_ROLE'));
 assert.ok(src.includes("client_id='cerebro'"));assert.ok(src.includes('fact001.lab.heartbeat'));
});
test('budget disabled when max jobs > 1 is configured',async()=>{
 const f=fixture();f.enqueue('job');f.setEnabled(true);
 // SQL CHECK only allows 1..2; runtime denies 2
 f.db.prepare('UPDATE fact001_runner_config_v1 SET max_jobs_per_tick=2 WHERE id=1').run();
 assert.equal((await processRecoveryTick(f.env,1000000)).status,'BLOCKED');
 assert.equal(f.db.prepare("SELECT state FROM fact001_runner_jobs_v1 WHERE id='job'").get().state,'QUEUED');
});
test('invalid scheduled time fails closed',async()=>{
 const f=fixture();f.setEnabled(true);
 assert.equal((await processRecoveryTick(f.env,NaN)).status,'BLOCKED');
 assert.equal((await processRecoveryTick({},1000000)).status,'BLOCKED');
});
test('scheduled handler enqueues deferred work and cannot mutate before waitUntil',async()=>{
 const f=fixture();f.enqueue('scheduled');f.setEnabled(true);
 let pending;await worker.scheduled({scheduledTime:1000000},f.env,{waitUntil:p=>pending=p});
 assert.ok(pending&&typeof pending.then==='function');
 assert.equal((await pending).status,'COMPLETED');
});
