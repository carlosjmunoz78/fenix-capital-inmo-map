import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledP5} from '../worker.mjs';
function f(){
 const statements=[],updates=[];
 const env={P5_ENABLED:'true',RECOVERY_DB:{prepare(sql){return{bind(...args){return{async first(){statements.push(sql);if(sql.startsWith('SELECT'))return{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',enabled:1,max_daily_jobs:1};if(sql.startsWith('INSERT'))return{request_id:'FACT001-P5-20261112'};if(sql.startsWith('UPDATE')){updates.push({sql,args});return{request_id:args[0]};}throw Error('unexpected sql');}}}}}}};
 return {env,statements,updates};
}
test('outbound failure marks only own QUEUED row RECONCILE, with no retry',async()=>{
 const x=f();let calls=0;
 const result=await scheduledP5(x.env,Date.UTC(2026,10,12),async()=>{calls++;throw Error('network failure')});
 assert.equal(result.status,'RECONCILE');assert.equal(result.reason,'DISPATCH_UNVERIFIED');
 assert.equal(calls,1);assert.equal(x.updates.length,1);assert.match(x.updates[0].sql,/state='QUEUED' AND attempts=0/);assert.equal(x.updates[0].args[1],'DISPATCH_UNVERIFIED');
});
test('HTTP 503 preserves fail-closed audit',async()=>{
 const x=f();const result=await scheduledP5(x.env,Date.UTC(2026,10,12),async()=>new Response(null,{status:503}));
 assert.equal(result.reason,'DISPATCH_HTTP_503');assert.equal(x.updates[0].args[1],'DISPATCH_HTTP_503');
});
