import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('./preprod-job001-reader/rpc-observation-v0.sql',import.meta.url),'utf8');
test('read-only JOB001 cumulative RPC stats, no query text or external output',()=>{
 assert.match(src,/extensions\.pg_stat_statements s/);
 assert.match(src,/extensions\.pg_stat_statements_info/);
 assert.match(src,/s\.query ilike '%cerebro_job001_dispatch_preprod%'/);
 assert.match(src,/where s\.query like 'WITH pgrst_source AS \(%'/);
 for(const p of ["'rpc_calls_since_reset'","'hostinger_origin_verified',false","'runtime_execution_verified',false","'downstream_effect_verified',false"])assert.ok(src.includes(p));
 for(const forbidden of [/cron\.schedule\s*\(/i,/\bupdate\b[^;]*\bcron\.job\b/i,/\bdelete\s+from/i,/\bexecute\s+format/i,/pg_stat_statements_reset/i,/service_role_key/i,/select\s+s\.query\b/i])assert.equal(forbidden.test(src),false,String(forbidden));
});
test('RPC stats policy: only service role, no public security definer',()=>{
 assert.ok(src.includes('security definer set search_path='));
 assert.match(src,/create function public\.cerebro_operativa_job001_rpc_observation_lab_v0\(\)[\s\S]*?security invoker/);
 assert.ok(src.includes('revoke all on function public.cerebro_operativa_job001_rpc_observation_lab_v0() from public,anon,authenticated;'));
 assert.ok(src.includes('grant execute on function public.cerebro_operativa_job001_rpc_observation_lab_v0() to service_role;'));
});
