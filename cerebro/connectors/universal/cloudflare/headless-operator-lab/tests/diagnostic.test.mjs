import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnose,CF_ACCOUNT,PROBE_ID} from '../diagnostic.mjs';
test('fixed Cloudflare account and diagnostic ID',()=>{
 assert.equal(CF_ACCOUNT,'e39a57e1ac42650ca5a6d5307cf0ac8e');
 assert.equal(PROBE_ID,'FACT001-CF-TOKEN-READONLY-20261111-001');
});
test('missing D1 refuses without fetch',async()=>{
 assert.deepEqual(await diagnose({},1000,()=>{throw Error('SHOULD_NOT_CALL');}),{status:'RUNTIME_DENIED'});
});
test('missing queue cannot call upstream even when a token exists',async()=>{
 let calls=0;
 const db={prepare(){return{bind(){return{first:async()=>null}}}}};
 const result=await diagnose({RECOVERY_DB:db,CF_WORKERS_TOKEN:'dummy-valid-format-not-real-123'},1000,()=>{calls++;});
 assert.equal(result.status,'NO_QUEUED_PROBE');assert.equal(calls,0);
});
test('no write methods or raw response content',()=>{
 const code=readFileSync(new URL('../diagnostic.mjs',import.meta.url),'utf8');
 assert.ok(code.includes("method:'GET'"));
 assert.ok(!code.includes("method:'POST'"));
 assert.ok(!code.includes("method:'DELETE'"));
 assert.ok(!code.includes("method:'PUT'"));
 assert.ok(!code.includes('console.log'));
 assert.ok(!code.includes('response.text('));
 assert.ok(!code.includes('response.json('));
 assert.ok(code.includes("state='QUEUED' AND attempts=0"));
 assert.ok(code.includes("return new Response('Not Found',{status:404"));
});
