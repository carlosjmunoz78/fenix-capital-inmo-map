import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync(new URL('./preprod-job001-reader/cron-observation-v0.sql',import.meta.url),'utf8');
test('fixed preprod cron observation uses existing history only, no scheduler mutation',()=>{
 assert.match(sql,/from cron\.job as j/);
 assert.match(sql,/from cron\.job_run_details as r/);
 assert.match(sql,/where j\.jobid in \(6,22,23,25\)/);
 assert.match(sql,/where r\.jobid in \(6,22,23,25\)/);
 for(const verb of [/cron\.schedule\s*\(/,/cron\.unschedule\s*\(/,/\bupdate\s+cron\.job\b/i,/\bdelete\s+from\s+cron\.job\b/i,/\btruncate\s/i,/job\.command/i,/execute\s+format/i,/execute\s+immediate/i])assert.equal(verb.test(sql),false);
 assert.ok(sql.includes("'is_job001_hostinger_master',false"));
 assert.ok(sql.includes("'is_job001_runtime_proof',false"));
 assert.ok(sql.includes("'downstream_effect_verified',false"));
});
test('no exposed schema security definer; only service role may execute',()=>{
 assert.ok(sql.includes('create schema if not exists cerebro_lab_private;'));
 assert.match(sql,/language sql stable security definer set search_path=''/);
 assert.match(sql,/create function public\.cerebro_job001_pgcron_observation_lab_v0\(\)[\s\S]*?security invoker set search_path=''/);
 assert.ok(sql.includes('revoke all on function public.cerebro_job001_pgcron_observation_lab_v0() from public, anon, authenticated;'));
 assert.ok(sql.includes('grant execute on function public.cerebro_job001_pgcron_observation_lab_v0() to service_role;'));
 assert.ok(sql.includes('revoke all on function cerebro_lab_private.job001_pgcron_observe_v0() from public, anon, authenticated;'));
 assert.equal(sql.includes('grant execute on function public.cerebro_job001_pgcron_observation_lab_v0() to authenticated;'),false);
});
