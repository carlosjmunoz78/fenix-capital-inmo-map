import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const original=fs.readFileSync(new URL('./staging-suspension/original-probe-snapshot.sql',import.meta.url),'utf8');
const guarded=fs.readFileSync(new URL('./staging-suspension/blocked-probe-preprod.sql',import.meta.url),'utf8');
const parallel=fs.readFileSync(new URL('./staging-suspension/parallel-blocked-probe-lab.sql',import.meta.url),'utf8');
test('snapshotted original function proves an existing side-effectful probe, without execution',()=>{
 assert.match(original,/CREATE OR REPLACE FUNCTION public\.seo001_probe_wp_bridge_preprod\(\)/);
 assert.match(original,/net\.http_get/);
 assert.match(original,/seo_cerebro_wp_bridge_health_preprod/);
});
test('new targeted PREPROD probe denies staging and has no network, DML or job dispatch',()=>{
 assert.match(guarded,/FUNCTION public\.seo001_probe_wp_bridge_preprod\(\)/);
 for(const s of ["'BLOCKED_DEPENDENCY'","'STAGING_SUSPENDED_BY_OWNER'","'job_id',13","'side_effects',false"])assert.ok(guarded.includes(s));
 for(const bad of [/net\.http_get/i,/net\.http_post/i,/\binsert\b/i,/\bupdate\b/i,/\bdelete\b/i,/\bperform\b/i,/cron\.schedule/i,/vault\./i,/https?:\/\//i])assert.equal(bad.test(guarded),false,String(bad));
 assert.match(parallel,/FUNCTION public\.seo001_probe_wp_bridge_suspended_lab_v0\(\)/);
 assert.ok(parallel.includes("'STAGING_SUSPENDED_BY_OWNER'"));
});
