import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const workerPath=new URL('./provider-cloudflare/canary/worker.mjs',import.meta.url);
const source=readFileSync(workerPath,'utf8');
test('Cloudflare control canary has no side effects or reachable HTTP routes',async()=>{
 const mod=await import(pathToFileURL(workerPath.pathname));
 assert.equal(typeof mod.default.fetch,'function');
 const r=await mod.default.fetch(new Request('https://invalid.test/private'));
 assert.equal(r.status,404);
 assert.equal(await r.text(),'Not Found');
 assert.equal(typeof mod.default.scheduled,'function');
 const logs=[],old=console.log;
 try{
  console.log=(...a)=>logs.push(a);
  await mod.default.scheduled({cron:'*/30 * * * *',scheduledTime:1794750000000});
 }finally{console.log=old}
 assert.equal(logs.length,1);
 assert.match(logs[0][0],/CF_LAB_CANARY_SCHEDULE_RECEIVED/);
 const payload=JSON.parse(logs[0][1]);
 assert.equal(payload.engine_id,'LAB-CF-CANARY-001');
 assert.equal(payload.external_actions,0);
 assert.doesNotMatch(source,/\bfetch\s*\(|\bconnect\s*\(|\.put\s*\(|\.delete\s*\(|\.insert\s*\(|import\s+.*from\s+['"]https?:/);
 assert.doesNotMatch(source,/AUTH|TOKEN|PASSWORD|credential|secrets|HUMAN_REQUIRED/);
});
test('canary code immutable by design; script itself never enables cron',()=>{
 assert.doesNotMatch(source,/triggers|crons\s*:|scheduled\s*:/);
 assert.match(source,/LAB-CF-CANARY-001/);
});
