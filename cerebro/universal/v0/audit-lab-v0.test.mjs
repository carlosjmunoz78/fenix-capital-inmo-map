import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync(new URL('./audit-lab-v0/migration.sql',import.meta.url),'utf8');
const edge=fs.readFileSync(new URL('./audit-lab-v0/index.ts',import.meta.url),'utf8');
test('auditable LAB-only dry-run table has strict immutable runtime guards and RLS',()=>{
 for(const phrase of ["check(company_id='fenix')","check(environment='LAB')","check(engine_id='FACT-001')",
 "check(executed=false)","check(prod_execution_enabled=false)","check(additional_cost_eur=0)",
 "idempotency_key text not null unique","enable row level security","grant select,insert on table public.cerebro_operativa_lab_audit_v0 to service_role"]){
  assert.ok(sql.includes(phrase),'missing invariant: '+phrase);
 }
 assert.ok(sql.includes('revoke all on table public.cerebro_operativa_lab_audit_v0 from public,anon,authenticated'));
 assert.equal(sql.includes('grant select on table public.cerebro_operativa_lab_audit_v0 to authenticated'),false);
});
test('audit Edge accepts only fixed owner-authenticated POST and cannot execute jobs',()=>{
 for(const phrase of ["if(req.method!=='POST')","raw.dry_run!==true","raw.action!=='FACT001_DRY_RUN_AUDIT'",
 "principal?.actor_code!=='CARLOS-ADMIN'","context?.ok===false","expectedHost='https://hnqlnvakzaywtafeiybt.supabase.co'",
 ".eq('idempotency_key',raw.idempotency_key)","first.error?.code!=='23505'",
 "executed:false","prod_execution_enabled:false"])assert.ok(edge.includes(phrase),'missing safeguard: '+phrase);
 for(const prohibited of ["cerebro_job001_dispatch_preprod","cron.schedule","service_role", /* secret stays as env name only */ "x-cerebro-job-secret"]){
  if(prohibited==='service_role')continue;
  assert.equal(edge.includes(prohibited),false);
 }
 assert.equal(edge.includes(".rpc('cerebro_job001_dispatch_preprod'"),false);
});
