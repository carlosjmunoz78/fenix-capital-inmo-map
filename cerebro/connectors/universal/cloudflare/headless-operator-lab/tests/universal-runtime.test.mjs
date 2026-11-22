import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCOPE,OPS,MAX_JOBS_PER_TICK,PREFIX,tick} from '../universal-runtime.mjs';
test('scope deterministic, low-cost, fixed four operations',()=>{
 assert.deepEqual(SCOPE,{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
 assert.equal(MAX_JOBS_PER_TICK,1);
 assert.equal(PREFIX,'cerebro-fact001-managed-lab-');
 assert.deepEqual([...OPS],['worker.create_private','worker.update_private','worker.rollback_private','worker.delete_private']);
});
test('no secrets/DB -> deny without execution',async()=>{
 assert.equal((await tick({})).status,'RUNTIME_DENIED');
 assert.equal((await tick({RECOVERY_DB:{},CF_WORKERS_TOKEN:'short'})).status,'RUNTIME_DENIED');
 assert.equal((await tick({RECOVERY_DB:{},CF_WORKERS_TOKEN:'long_credential_credential_long'},Infinity)).status,'RUNTIME_DENIED');
});
test('empty queue -> no provider access',async()=>{
 let selects=0;
 const db={prepare(sql){selects++;return{bind(){return{first:async()=>null}}}}};
 const x=await tick({RECOVERY_DB:db,CF_WORKERS_TOKEN:'a'.repeat(28)},123456);
 assert.equal(x.status,'IDLE');assert.equal(selects,1);
});
test('fail-closed immutable code and ownership gates',()=>{
 const s=readFileSync(new URL('../universal-runtime.mjs',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../universal-schema.sql',import.meta.url),'utf8');
 assert.ok(s.includes('assertJob(job)'));
 assert.ok(s.includes("import {d1Tick} from './d1-adapter.mjs'"));
 assert.ok(s.includes('d1Tick(env,controller.scheduledTime)'));
 assert.ok(s.includes("import {vercelTick} from './vercel-adapter.mjs'"));
 assert.ok(s.includes('vercelTick(env,controller.scheduledTime)'));
 assert.ok(s.includes("import {pagesTick} from './pages-adapter.mjs'"));
 assert.ok(s.includes('Promise.allSettled([tick(env,controller.scheduledTime),pagesTick(env,controller.scheduledTime),d1Tick(env,controller.scheduledTime),vercelTick(env,controller.scheduledTime)])'));
 assert.ok(s.includes("await requireOwned(db,name,['V2'])"));
 assert.ok(s.includes("await requireOwned(db,name,['V1','V2','ROLLED_BACK'])"));
 assert.ok(s.includes("if(await owned(db,name))throw Error('TARGET_EXISTS')"));
 assert.ok(s.includes("redirect:'manual'"));
 assert.ok(s.includes("sub.result?.enabled!==false"));
 assert.ok(s.includes("env.CF_WORKERS_TOKEN.length<24"));
 assert.ok(s.includes("async fetch(){return new Response('Not Found',{status:404"));
 assert.ok(!s.includes('console.log('));
 assert.ok(!s.includes('eval('));
 assert.ok(sql.includes("CHECK(environment='LAB')"));
 assert.ok(sql.includes('UNIQUE'));
 assert.ok(sql.includes("CHECK(max_cost_eur=0)"));
 assert.ok(sql.includes("submitted_by IN"));
 assert.ok(sql.includes("state='QUEUED'")===false); // generic state via constraints
});
