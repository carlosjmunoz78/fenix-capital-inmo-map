import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import composite from '../recovery-wrapper.mjs';
const dir=new URL('../',import.meta.url);
test('old recovery Worker is exactly preserved in composite upload',()=>{
 const actual=readFileSync(new URL('legacy-recovery.mjs',dir),'utf8');
 const canonical=readFileSync(new URL('../../../cloudflare/recovery-runner-lab/worker.mjs',dir),'utf8');
 assert.equal(actual,canonical);
 assert.match(actual,/processRecoveryTick/);
 assert.match(actual,/fact001\.lab\.heartbeat/);
});
test('recovery is executed as before when P5 is switched off; no additional database or URL needed',async()=>{
 const calls=[],promises=[];
 const db={prepare(sql){calls.push(sql);return {first:async()=>({enabled:0,max_jobs_per_tick:1})};}};
 const env={RECOVERY_DB:db,P5_ENABLED:'false'};
 const ctx={waitUntil(p){promises.push(p);}};
 const request=new Request('https://example.org/');
 const r=await composite.fetch(request,env,ctx);
 assert.equal(r.status,404);
 composite.scheduled({scheduledTime:Date.UTC(2026,10,12,10,0)},env,ctx);
 assert.equal(promises.length,2);
 await Promise.all(promises);
 assert.equal(calls.length,1);
 assert.match(calls[0],/fact001_runner_config_v1/);
});
