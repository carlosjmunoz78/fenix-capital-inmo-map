-- Representative PREPROD fixture for RLS-001.
-- Reproduces only the audited security boundary: owner, roles, grants,
-- SECURITY DEFINER RPC access and the three affected tables.
-- It intentionally contains no production data and cannot mutate PROD.

create schema if not exists fenix_prod;

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create table fenix_prod.special_cases (
  id bigint generated always as identity primary key,
  case_code text not null unique,
  payload jsonb not null default '{}'::jsonb
);

create table fenix_prod.special_case_people (
  id bigint generated always as identity primary key,
  case_code text not null,
  person_name text not null
);

create table fenix_prod.expediente_stage_history (
  id bigint generated always as identity primary key,
  expediente_code text not null,
  stage text not null
);

revoke all on schema fenix_prod from public, anon, authenticated;
revoke all on all tables in schema fenix_prod from public, anon, authenticated;
grant usage on schema fenix_prod to service_role;
grant select, insert on fenix_prod.expediente_stage_history to service_role;

insert into fenix_prod.special_cases(case_code,payload) values ('CASE-RLS-001','{"fixture":true}');
insert into fenix_prod.special_case_people(case_code,person_name) values ('CASE-RLS-001','Fixture Person');
insert into fenix_prod.expediente_stage_history(expediente_code,stage) values ('EXP-RLS-001','Entrada');

create or replace function fenix_prod.fenix_prod_special_case_list_server()
returns integer
language sql
security definer
set search_path = fenix_prod, pg_temp
as $$ select count(*)::integer from fenix_prod.special_cases $$;

create or replace function fenix_prod.fenix_prod_special_case_people_count_server()
returns integer
language sql
security definer
set search_path = fenix_prod, pg_temp
as $$ select count(*)::integer from fenix_prod.special_case_people $$;

create or replace function fenix_prod.fenix_prod_exp_stage_count_server()
returns integer
language sql
security definer
set search_path = fenix_prod, pg_temp
as $$ select count(*)::integer from fenix_prod.expediente_stage_history $$;

revoke all on function fenix_prod.fenix_prod_special_case_list_server() from public, anon, authenticated;
revoke all on function fenix_prod.fenix_prod_special_case_people_count_server() from public, anon, authenticated;
revoke all on function fenix_prod.fenix_prod_exp_stage_count_server() from public, anon, authenticated;
grant execute on function fenix_prod.fenix_prod_special_case_list_server() to service_role;
grant execute on function fenix_prod.fenix_prod_special_case_people_count_server() to service_role;
grant execute on function fenix_prod.fenix_prod_exp_stage_count_server() to service_role;
