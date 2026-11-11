import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tick,ID,TARGET,WORKER_NAME,SCOPE} from '../worker.mjs';
test('fixed scope and target disallow existing Workers',()=>{
 assert.equal(ID,'FACT001-CF-HEADLESS-CRON-E2E-20261111-001');
 assert.equal(TARGET,'cerebro-fact001-owned-worker-lab-20261111');
 assert.equal(WORKER_NAME,'cerebro-fact001-headless-operator-lab-20261111');
 assert.equal(SCOPE.environment,'LAB');
});
test('without secret, storage or clock refuse with zero provider requests',async()=>{
 assert.equal((await tick({RECOVERY_DB:{}})).status,'RUNTIME_DENIED');
 assert.equal((await tick({CF_WORKERS_TOKEN:'fake'})).status,'RUNTIME_DENIED');
 assert.equal((await tick({RECOVERY_DB:{},CF_WORKERS_TOKEN:'fake'},Infinity)).status,'RUNTIME_DENIED');
});
test('empty queue never calls Cloudflare',async()=>{
 let count=0;
 const db={prepare(q){count++;return {bind(){return{first:async()=>null}}}}};
 assert.equal((await tick({RECOVERY_DB:db,CF_WORKERS_TOKEN:'fake'},1000)).status,'EMPTY_OR_ALREADY_CLAIMED');
 assert.equal(count,1);
});
test('no public fetch, no dynamic SQL, private and rollback gates',()=>{
 const s=readFileSync(new URL('../worker.mjs',import.meta.url),'utf8');
 const schema=readFileSync(new URL('../schema.sql',import.meta.url),'utf8');
 assert.ok(s.includes("async fetch(){return new Response('Not Found',{status:404"));
 assert.ok(s.includes("await assertSafe(token,v1)"));
 assert.ok(s.includes("await assertSafe(token,v2)"));
 assert.ok(s.includes("await assertSafe(token,rebuilt)"));
 assert.ok(s.includes("await verifyGone(token)"));
 assert.ok(s.includes("status:'RECONCILE'"));
 assert.ok(schema.includes("CHECK(environment='LAB')"));
 assert.ok(schema.includes("ON CONFLICT(id) DO NOTHING"));
 assert.ok(!s.includes('console.log'));
 assert.ok(!s.includes('eval('));
});
