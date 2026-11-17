import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vercelTick,VERCEL_SCOPE} from '../vercel-adapter.mjs';
import {validateOrder} from '../vercel/policy.mjs';
test('Verifies fixed Vercel provider scope',()=>{
 assert.equal(VERCEL_SCOPE.environment,'LAB');
 assert.equal(VERCEL_SCOPE.version,'0.1.0');
});
test('Missing independent Vercel secret does not claim anything',async()=>{
 let calls=0;const db={prepare(){calls++;throw Error('NOT_ALLOWED')}};
 assert.equal((await vercelTick({RECOVERY_DB:db},123)).status,'VERCEL_SECRET_NOT_CONFIGURED');
 assert.equal((await vercelTick({RECOVERY_DB:db,VERCEL_API_TOKEN:'short'},123)).status,'VERCEL_SECRET_NOT_CONFIGURED');
 assert.equal(calls,0);
});
test('Empty queue never calls provider',async()=>{
 let calls=0;const db={prepare(){calls++;return{bind(){return{first:async()=>null}}}}};
 const out=await vercelTick({RECOVERY_DB:db,VERCEL_API_TOKEN:'A'.repeat(36)},123);
 assert.equal(out.status,'IDLE');assert.equal(calls,1);
});
test('Only fixed team+project SSO and 0EUR policy, no secrets in logs',()=>{
 const src=readFileSync(new URL('../vercel-adapter.mjs',import.meta.url),'utf8');
 const op=readFileSync(new URL('../vercel/operator.mjs',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../vercel-schema.sql',import.meta.url),'utf8');
 assert.ok(src.includes('if(typeof token!=='));
 assert.ok(src.includes('executeOrder(order,token)'));
 assert.ok(op.includes('VERCEL_SSO_NO_DEPLOYMENT_GATE'));
 assert.ok(op.includes("redirect:'manual'"));
 assert.ok(!src.includes('console.log('));
 assert.ok(!op.includes('console.log('));
 assert.ok(!op.includes("method:'DELETE'"));
 assert.ok(sql.includes("CHECK(environment='LAB')"));
 assert.ok(sql.includes("CHECK(max_cost_eur=0)"));
 assert.ok(sql.includes("CHECK(team_id='team_qnh6u1Ofy2WPp0MGEKlyMA50')"));
 assert.ok(sql.includes("CHECK(project_id='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu')"));
});
