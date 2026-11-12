import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {D1_SCOPE,D1_OPS,SAFE_KEY,d1Tick} from '../d1-adapter.mjs';
test('D1 fixed LAB policy, scoped key and operations',()=>{
 assert.equal(D1_SCOPE.environment,'LAB');assert.equal(D1_OPS.length,4);
 assert.equal(SAFE_KEY.test('fact001-lab-a001'),true);
 assert.equal(SAFE_KEY.test('app-fenix'),false);
});
test('no DB refuses, empty queue no queries to other data',async()=>{
 assert.equal((await d1Tick({})).status,'D1_RUNTIME_DENIED');
 let invoked=0;
 const db={prepare(sql){invoked++;assert.ok(sql.includes('fact001_cf_d1_jobs_v1'));return{bind(){return{first:async()=>null}}}}};
 assert.equal((await d1Tick({RECOVERY_DB:db},1000)).status,'IDLE');assert.equal(invoked,1);
});
test('strict SQL containment and non-destructive logical deletion',()=>{
 const code=readFileSync(new URL('../d1-adapter.mjs',import.meta.url),'utf8');
 const ddl=readFileSync(new URL('../d1-schema.sql',import.meta.url),'utf8');
 assert.ok(!/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bALTER\s+TABLE\b/i.test(code));
 assert.ok(code.includes("state='DELETED',value_tag='DELETED'"));
 assert.ok(code.includes("D1_OWNER_MISMATCH"));
 assert.ok(code.includes("checkJob(j)"));
 assert.ok(ddl.includes("CHECK(max_cost_eur=0)"));
 assert.ok(ddl.includes("CHECK(environment='LAB')"));
 assert.ok(!code.includes('console.log('));
});
