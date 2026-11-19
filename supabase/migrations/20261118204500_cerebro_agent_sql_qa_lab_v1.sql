-- CEREBRO LAB: isolated deterministic QA-001 worker, entirely PostgreSQL.
-- No App/CRM tables or production objects are changed. No new subscription.
create schema if not exists cerebro_lab;
revoke all on schema cerebro_lab from public, anon, authenticated, service_role;

create table if not exists cerebro_lab.qa_signing_key_v1 (
 id smallint primary key check (id=1),
 secret bytea not null check (octet_length(secret)=32)
);
revoke all on cerebro_lab.qa_signing_key_v1 from public, anon, authenticated, service_role;
insert into cerebro_lab.qa_signing_key_v1(id,secret)
 select 1, extensions.gen_random_bytes(32)
 where not exists (select 1 from cerebro_lab.qa_signing_key_v1 where id=1);

create table if not exists public.cerebro_agent_sql_qa_receipt_lab_v1 (
 receipt_id uuid primary key,
 company_id text not null check (company_id='fenix'),
 engine_id text not null check (engine_id='QA-001'),
 environment text not null check (environment='LAB'),
 version text not null check (version='1.0.0'),
 agent_role_id text not null check (agent_role_id='ENG-QA'),
 subagent_role_id text null check (subagent_role_id is null),
 source text not null check (source='SUPABASE_PGCRON'),
 executor_id text not null check (executor_id='cerebro_lab.run_agent_qa_v1'),
 observed_at timestamptz not null,
 status text not null check (status in ('SUCCEEDED','FAILED')),
 tests jsonb not null check (jsonb_typeof(tests)='object'),
 tests_passed integer not null check (tests_passed between 0 and 6),
 tests_total integer not null check (tests_total=6),
 signature_hex text not null check (signature_hex ~ '^[a-f0-9]{64}$'),
 prod_execution_enabled boolean not null default false check (prod_execution_enabled=false),
 customer_data_touched boolean not null default false check (customer_data_touched=false),
 additional_subscription_eur integer not null default 0 check (additional_subscription_eur=0)
);
alter table public.cerebro_agent_sql_qa_receipt_lab_v1 enable row level security;
revoke all on public.cerebro_agent_sql_qa_receipt_lab_v1 from public, anon, authenticated, service_role;
grant select on public.cerebro_agent_sql_qa_receipt_lab_v1 to service_role;
create index if not exists cerebro_agent_sql_qa_lab_date_idx
 on public.cerebro_agent_sql_qa_receipt_lab_v1(observed_at desc);

create or replace function cerebro_lab.run_agent_qa_v1()
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,pg_temp
as $fn$
declare
 t jsonb;
 passes integer;
 state text;
 rid uuid:=pg_catalog.gen_random_uuid();
 stamp timestamptz:=pg_catalog.clock_timestamp();
 material text;
 sig text;
 key_bytes bytea;
begin
 -- Only metadata and isolation assertions; never query customer rows.
 t:=pg_catalog.jsonb_build_object(
  'jarvis_job_source_exists',pg_catalog.to_regclass('public.jarvis_work_job_v1') is not null,
  'browser_job_source_exists',pg_catalog.to_regclass('public.cerebro_browser_job_v2') is not null,
  'existing_github_receipt_table_exists',pg_catalog.to_regclass('public.cerebro_agent_execution_receipt_lab_v1') is not null,
  'qa_receipt_rls_enabled',(select c.relrowsecurity from pg_catalog.pg_class c where c.oid='public.cerebro_agent_sql_qa_receipt_lab_v1'::pg_catalog.regclass),
  'anonymous_cannot_read_qa_receipts',not pg_catalog.has_table_privilege('anon','public.cerebro_agent_sql_qa_receipt_lab_v1','select'),
  'authenticated_cannot_read_private_signer',not pg_catalog.has_schema_privilege('authenticated','cerebro_lab','usage')
 );
 select count(*)::integer into passes from pg_catalog.jsonb_each_text(t) as x where x.value='true';
 state:=case when passes=6 then 'SUCCEEDED' else 'FAILED' end;
 select k.secret into key_bytes from cerebro_lab.qa_signing_key_v1 k where k.id=1;
 if pg_catalog.octet_length(key_bytes)<>32 or key_bytes is null then
  raise exception 'LAB_QA_SIGNING_KEY_UNAVAILABLE';
 end if;
 material:=pg_catalog.concat_ws('|','fenix','QA-001','LAB','1.0.0','ENG-QA',
   'SUPABASE_PGCRON','cerebro_lab.run_agent_qa_v1',rid::text,stamp::text,state,
   passes::text,'6',t::text);
 sig:=pg_catalog.encode(extensions.hmac(pg_catalog.convert_to(material,'UTF8'),key_bytes,'sha256'),'hex');
 insert into public.cerebro_agent_sql_qa_receipt_lab_v1
 (receipt_id,company_id,engine_id,environment,version,agent_role_id,subagent_role_id,
  source,executor_id,observed_at,status,tests,tests_passed,tests_total,signature_hex)
 values(rid,'fenix','QA-001','LAB','1.0.0','ENG-QA',null,
  'SUPABASE_PGCRON','cerebro_lab.run_agent_qa_v1',stamp,state,t,passes,6,sig);
 return pg_catalog.jsonb_build_object('status',state,'receipt_id',rid,
  'observed_at',stamp,'tests_passed',passes,'tests_total',6,
  'company_id','fenix','engine_id','QA-001','environment','LAB',
  'agent_role_id','ENG-QA','durable',true,'customer_data_touched',false,
  'prod_execution_enabled',false);
end;
$fn$;
revoke all on function cerebro_lab.run_agent_qa_v1() from public,anon,authenticated,service_role;
grant execute on function cerebro_lab.run_agent_qa_v1() to postgres;

create or replace function public.cerebro_lab_qa_observe_v1()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,pg_temp
as $fn$
declare
 r record;
 key_bytes bytea;
 material text;
 sig_valid boolean:=false;
 runs_count bigint;
begin
 select count(*) into runs_count from public.cerebro_agent_sql_qa_receipt_lab_v1;
 select * into r from public.cerebro_agent_sql_qa_receipt_lab_v1 order by observed_at desc limit 1;
 if not found then
  return pg_catalog.jsonb_build_object('status','WAITING_FOR_REAL_EXECUTION',
    'source','SUPABASE_PGCRON_QA_LAB_V1','company_id','fenix','environment','LAB',
    'engine_id','QA-001','agent_role_id','ENG-QA','runs_count',0,
    'physical_execution_evidenced',false,'signature_verified',false,
    'operational_autonomy_certified',false,'excellence_certified',false);
 end if;
 select k.secret into key_bytes from cerebro_lab.qa_signing_key_v1 k where k.id=1;
 material:=pg_catalog.concat_ws('|',r.company_id,r.engine_id,r.environment,r.version,
   r.agent_role_id,r.source,r.executor_id,r.receipt_id::text,r.observed_at::text,
   r.status,r.tests_passed::text,r.tests_total::text,r.tests::text);
 sig_valid:=coalesce(pg_catalog.encode(extensions.hmac(
     pg_catalog.convert_to(material,'UTF8'),key_bytes,'sha256'),'hex')=r.signature_hex,false);
 return pg_catalog.jsonb_build_object(
   'status',case when sig_valid then 'OK' else 'INTEGRITY_FAILURE' end,
   'source','SUPABASE_PGCRON_QA_LAB_V1',
   'company_id',r.company_id,'engine_id',r.engine_id,
   'environment',r.environment,'version',r.version,
   'agent_role_id',r.agent_role_id,'receipt_id',r.receipt_id,
   'observed_at',r.observed_at,'execution_status',r.status,
   'tests',r.tests,'tests_passed',r.tests_passed,'tests_total',r.tests_total,
   'runs_count',runs_count,'signature_verified',sig_valid,
   'physical_execution_evidenced',sig_valid,
   'recent',r.observed_at>pg_catalog.now()-interval '30 minutes',
   'operational_autonomy_certified',false,'excellence_certified',false,
   'prod_execution_enabled',false,'customer_data_touched',false);
end;
$fn$;
revoke all on function public.cerebro_lab_qa_observe_v1() from public,anon,authenticated;
grant execute on function public.cerebro_lab_qa_observe_v1() to service_role;
comment on function public.cerebro_lab_qa_observe_v1() is
 'Service-role-only read of isolated LAB QA execution proof; no secret output, no customer data.';
-- Rollback after exporting evidence:
-- select cron.unschedule('cerebro-agent-qa-001-lab-v1');
-- drop function public.cerebro_lab_qa_observe_v1();
-- drop function cerebro_lab.run_agent_qa_v1();
-- drop table public.cerebro_agent_sql_qa_receipt_lab_v1;
-- drop schema cerebro_lab cascade;
