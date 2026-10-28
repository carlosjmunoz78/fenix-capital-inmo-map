create table if not exists public.cerebro_job001_telemetry_preprod (
  company_id text not null,
  engine_id text not null,
  environment text not null check (environment = 'PREPROD'),
  device_id text not null,
  version text not null,
  schema_version text not null default '1.0.0',
  state_type text not null default 'CEREBRO_JOB001_SUPERVISOR_TELEMETRY_V1' check (state_type = 'CEREBRO_JOB001_SUPERVISOR_TELEMETRY_V1'),
  updated_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > updated_at),
  status text not null,
  useful_work jsonb not null check (jsonb_typeof(useful_work) = 'object'),
  dynamic_concurrency jsonb not null check (jsonb_typeof(dynamic_concurrency) = 'object'),
  browser_ok boolean not null default false,
  browser_readiness text not null default 'UNOBSERVED' check (browser_readiness in ('READY','DEGRADED','UNOBSERVED')),
  work_pump_mode text,
  kill_switch_present boolean not null default false,
  prod_authorized boolean not null default false check (prod_authorized = false),
  prod_write_authorized boolean not null default false check (prod_write_authorized = false),
  trading_access boolean not null default false check (trading_access = false),
  primary key (company_id, engine_id, environment, device_id)
);

create index if not exists cerebro_job001_telemetry_preprod_expires_at_idx
  on public.cerebro_job001_telemetry_preprod (expires_at);

alter table public.cerebro_job001_telemetry_preprod enable row level security;

revoke all on table public.cerebro_job001_telemetry_preprod from anon;
revoke all on table public.cerebro_job001_telemetry_preprod from authenticated;
revoke truncate, references, trigger on table public.cerebro_job001_telemetry_preprod from service_role;
grant select, insert, update, delete on table public.cerebro_job001_telemetry_preprod to service_role;

drop policy if exists cerebro_job001_telemetry_company_read on public.cerebro_job001_telemetry_preprod;
create policy cerebro_job001_telemetry_company_read
  on public.cerebro_job001_telemetry_preprod
  for select
  to authenticated
  using (
    environment = 'PREPROD'
    and company_id = coalesce((select auth.jwt() -> 'app_metadata' ->> 'company_id'), '')
    and trading_access = false
    and prod_authorized = false
    and prod_write_authorized = false
  );

comment on table public.cerebro_job001_telemetry_preprod is
  'JOB-001 sanitized latest-only PREPROD telemetry. Server-side only. No payloads, prompts, journals, tokens, cookies, storage state or arbitrary filesystem data.';
