-- CEREBRO LAB: reusable lightweight certification-gate supervisor, no GH Actions.
-- Independent from App/CRM PROD, no writes to legacy job tables.
create table if not exists cerebro_lab.cert_supervisor_secret_v1(
  id smallint primary key check(id=1),
  secret bytea not null check(octet_length(secret)=32)
);
revoke all on cerebro_lab.cert_supervisor_secret_v1 from public,anon,authenticated,service_role;
insert into cerebro_lab.cert_supervisor_secret_v1(id,secret)
 select 1,extensions.gen_random_bytes(32)
 where not exists(select 1 from cerebro_lab.cert_supervisor_secret_v1 where id=1);

create table if not exists cerebro_lab.cert_supervisor_history_v1(
  receipt_id uuid primary key,
  company_id text not null default 'fenix' check(company_id='fenix'),
  environment text not null default 'LAB' check(environment='LAB'),
  component_id text not null default 'CERT_SUPERVISOR_LAB_V1'
    check(component_id='CERT_SUPERVISOR_LAB_V1'),
  version text not null default '1.0.0' check(version='1.0.0'),
  observed_at timestamptz not null,
  gate_snapshot jsonb not null check(jsonb_typeof(gate_snapshot)='object'),
  health text not null check(health in ('EVIDENCE_OK_NOT_CERTIFIED','GATE_HOLD')),
  signature_hex text not null check(signature_hex ~ '^[a-f0-9]{64}$'),
  prod_execution_enabled boolean not null default false check(prod_execution_enabled=false),
  external_actions_executed boolean not null default false check(external_actions_executed=false)
);
alter table cerebro_lab.cert_supervisor_history_v1 enable row level security;
revoke all on cerebro_lab.cert_supervisor_history_v1 from public,anon,authenticated,service_role;
create index if not exists cert_supervisor_history_lab_recent_v1
 on cerebro_lab.cert_supervisor_history_v1(observed_at desc);

create or replace function cerebro_lab.run_cert_supervisor_v1()
returns jsonb
language plpgsql security invoker
set search_path=pg_catalog,pg_temp
as $fn$
declare
 snapshot jsonb;
 receipt uuid:=pg_catalog.gen_random_uuid();
 observed timestamptz:=pg_catalog.clock_timestamp();
 health text;
 signing bytea;
 signature text;
 material text;
begin
 snapshot:=public.cerebro_lab_certification_gates_v1();
 health:=case when snapshot->>'status'='OK' and
  snapshot->>'global_autonomy_certified'='false' and
  snapshot->>'prod_execution_enabled'='false'
  then 'EVIDENCE_OK_NOT_CERTIFIED' else 'GATE_HOLD' end;
 select k.secret into signing from cerebro_lab.cert_supervisor_secret_v1 k where k.id=1;
 if signing is null or pg_catalog.octet_length(signing)<>32 then
  raise exception 'CERT_SUPERVISOR_PRIVATE_SIGNER_MISSING';
 end if;
 material:='CEREBRO_CERT_SUPERVISOR_V1|'||receipt::text||'|'||observed::text||
  '|fenix|LAB|CERT_SUPERVISOR_LAB_V1|1.0.0|'||health||'|'||snapshot::text;
 signature:=pg_catalog.encode(extensions.hmac(pg_catalog.convert_to(material,'UTF8'),signing,'sha256'),'hex');
 insert into cerebro_lab.cert_supervisor_history_v1(
  receipt_id,company_id,environment,component_id,version,observed_at,gate_snapshot,
  health,signature_hex,prod_execution_enabled,external_actions_executed)
 values(receipt,'fenix','LAB','CERT_SUPERVISOR_LAB_V1','1.0.0',observed,snapshot,
   health,signature,false,false);
 return pg_catalog.jsonb_build_object('status','PERSISTED','receipt_id',receipt,
  'observed_at',observed,'health',health,'signed',true,'history_write_only',true,
  'global_autonomy_certified',false,'prod_execution_enabled',false);
end;
$fn$;
revoke all on function cerebro_lab.run_cert_supervisor_v1() from public,anon,authenticated,service_role;
grant execute on function cerebro_lab.run_cert_supervisor_v1() to postgres;

create or replace function public.cerebro_lab_cert_supervisor_observe_v1()
returns jsonb
language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $fn$
declare
 latest cerebro_lab.cert_supervisor_history_v1%rowtype;
 key_bytes bytea;
 material text;
 expected text;
 signed_ok boolean;
 total bigint;
begin
 select count(*) into total from cerebro_lab.cert_supervisor_history_v1;
 select * into latest from cerebro_lab.cert_supervisor_history_v1
 order by observed_at desc limit 1;
 if not found then
  return pg_catalog.jsonb_build_object('status','NO_RUNS','company_id','fenix',
   'environment','LAB','history_count',0,'signed',false,'global_autonomy_certified',false);
 end if;
 select k.secret into key_bytes from cerebro_lab.cert_supervisor_secret_v1 k where k.id=1;
 material:='CEREBRO_CERT_SUPERVISOR_V1|'||latest.receipt_id::text||'|'||
  latest.observed_at::text||'|fenix|LAB|CERT_SUPERVISOR_LAB_V1|1.0.0|'||
  latest.health||'|'||latest.gate_snapshot::text;
 expected:=pg_catalog.encode(extensions.hmac(pg_catalog.convert_to(material,'UTF8'),key_bytes,'sha256'),'hex');
 signed_ok:=coalesce(pg_catalog.length(expected)=64 and expected=latest.signature_hex,false);
 return pg_catalog.jsonb_build_object(
  'status',case when signed_ok then 'OK' else 'INTEGRITY_FAILURE' end,
  'source','CEREBRO_CERT_SUPERVISOR_DURABLE_LAB_V1',
  'company_id','fenix','environment','LAB',
  'receipt_id',latest.receipt_id,'observed_at',latest.observed_at,
  'health',latest.health,'signed',signed_ok,
  'history_count',total,'recent',latest.observed_at>now()-interval '1 hour',
  'gate_count',pg_catalog.jsonb_array_length(latest.gate_snapshot->'evidence_categories'),
  'global_autonomy_certified',false,
  'excellence_certified',false,
  'prod_execution_enabled',false,
  'cost_measured',false);
end;
$fn$;
revoke all on function public.cerebro_lab_cert_supervisor_observe_v1() from public,anon,authenticated;
grant execute on function public.cerebro_lab_cert_supervisor_observe_v1() to service_role;
comment on function public.cerebro_lab_cert_supervisor_observe_v1() is
 'Owner-only via Edge: verifies durable private HMAC watchdog receipts; no engine promotion.';

-- Rollback once snapshot exported:
-- select cron.unschedule('cerebro-cert-supervisor-lab-v1');
-- drop function public.cerebro_lab_cert_supervisor_observe_v1();
-- drop function cerebro_lab.run_cert_supervisor_v1();
-- drop table cerebro_lab.cert_supervisor_history_v1;
-- drop table cerebro_lab.cert_supervisor_secret_v1;
