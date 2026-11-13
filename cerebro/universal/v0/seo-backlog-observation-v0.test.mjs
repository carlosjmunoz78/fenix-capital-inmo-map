import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('./preprod-job001-reader/seo-backlog-observation-v0.sql',import.meta.url),'utf8');
test('SEO backlog observation is fixed legacy FENIX_CAPITAL tenant only and never probes staging',()=>{
 for(const p of ["company_id='FENIX_CAPITAL'","environment='PREPROD'","engine_id='SEO-001'",
  'public.seo_cerebro_expansion_jobs_preprod','public.seo_cerebro_supervisor_preprod',
  "'staging_status','SUSPENDED_BY_OWNER_NO_PROBE'","'staging_probe_performed',false",
  "'seo_dispatch_authorized',false","'downstream_publication_verified',false"])assert.ok(src.includes(p),'missing '+p);
 for(const p of [/http:\/\/|https:\/\//i,/\b(update|delete|truncate|insert)\s+(into|from)?\s*public\./i,/cron\.schedule\s*\(/i,/fetch\s*\(/i])assert.equal(p.test(src),false,String(p));
});
test('SEO SQL observer has private definer and public service-role-only invoker',()=>{
 assert.match(src,/create function cerebro_lab_private\.seo_backlog_observe_v0\(\)[\s\S]*?security definer set search_path=''/);
 assert.match(src,/create function public\.cerebro_operativa_seo_backlog_summary_lab_v0\(\)[\s\S]*?security invoker set search_path=''/);
 assert.ok(src.includes('revoke all on function public.cerebro_operativa_seo_backlog_summary_lab_v0() from public,anon,authenticated;'));
 assert.ok(src.includes('grant execute on function public.cerebro_operativa_seo_backlog_summary_lab_v0() to service_role;'));
});
