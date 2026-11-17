import {test} from 'node:test';
import assert from 'node:assert/strict';
import source,{readCanaryControl,canaryScheduleDecision} from './worker.control-v0.mjs';
test('Cloudflare canary is inert and PAUSED by default if binding absent/malformed',()=>{
 for(const env of [undefined,{}, {CONTROL_PAUSED:'TRUE'}, {CONTROL_PAUSED:'0'}, {CONTROL_PAUSED:0}]) {
  const s=readCanaryControl(env);
  assert.equal(s.paused,true);assert.equal(s.external_actions_enabled,false);
  assert.equal(s.autonomous_scheduler_connected,false);
  assert.equal(canaryScheduleDecision({cron:'*/5 * * * *',scheduledTime:1},env).accepted,false);
 }
});
test('Only literal false temporarily resumes internal flag; never does external work',()=>{
 const paused=canaryScheduleDecision({cron:'*/5 * * * *',scheduledTime:1711111111111},{CONTROL_PAUSED:'true'});
 const resumed=canaryScheduleDecision({cron:'*/5 * * * *',scheduledTime:1711111111111},{CONTROL_PAUSED:'false'});
 assert.equal(paused.status,'PAUSED');assert.equal(resumed.status,'INERT_CONTROL_ON');
 assert.equal(resumed.accepted,true);assert.equal(resumed.work_units,0);
 assert.equal(resumed.external_actions_enabled,false);
 assert.equal(canaryScheduleDecision({}, {CONTROL_PAUSED:'false'}).accepted,false);
 assert.equal(canaryScheduleDecision({cron:'xx',scheduledTime:'junk'}, {CONTROL_PAUSED:'false'}).accepted,false);
});
test('Inert Cloudflare canary has no public route, no secrets and cannot publish',async()=>{
 const r=await source.fetch(new Request('https://internal.invalid/'));
 assert.equal(r.status,404);assert.equal(await r.text(),'Not Found');
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('./worker.control-v0.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/fetch\s*\(\s*['"`]|\.send\(|\.prepare\(|DB\.|CLOUDFLARE_API_TOKEN|BUFFER_API_KEY|groq\.com/i);
 assert.match(src,/CONTROL_PAUSED/);
});
