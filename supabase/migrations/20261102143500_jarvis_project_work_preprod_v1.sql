-- JARVIS Work + Project Hub V1 · PREPROD only
-- Additive: no existing App/CRM/Browser table is changed.

create table if not exists public.jarvis_project_overlay_v1 (
  company_id text not null,
  engine_id text not null default 'CONSOLE-001',
  environment text not null default 'PREPROD',
  version text not null default 'v1',
  project_id text not null,
  is_user_created boolean not null default false,
  title text,
  objective text,
  status text,
  owner text,
  editors jsonb,
  autonomy_state text,
  subprojects jsonb,
  dependencies jsonb,
  audit_refs jsonb,
  source text not null default 'JARVIS_PROJECT_HUB_V1',
  sort_order integer,
  created_by text not null default 'CARLOS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, environment, version, project_id),
  constraint jarvis_project_overlay_v1_environment_ck check (environment = 'PREPROD'),
  constraint jarvis_project_overlay_v1_title_ck check (title is null or length(btrim(title)) between 1 and 160),
  constraint jarvis_project_overlay_v1_status_ck check (status is null or status in ('HECHO','EXISTENTE','PARCIAL','DEFINIDO','PLANIFICADO','POR_AUDITAR'))
);

create index if not exists jarvis_project_overlay_v1_updated_idx
  on public.jarvis_project_overlay_v1(company_id, environment, version, updated_at desc);

alter table public.jarvis_project_overlay_v1 enable row level security;
revoke all on table public.jarvis_project_overlay_v1 from public, anon, authenticated;
grant select, insert, update on table public.jarvis_project_overlay_v1 to service_role;

comment on table public.jarvis_project_overlay_v1 is
  'JARVIS Project Hub PREPROD overlays and user-created project metadata. Canonical registry remains authoritative; no PROD execution data or secrets.';

create table if not exists public.jarvis_project_revision_v1 (
  revision_id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null,
  environment text not null,
  version text not null,
  project_id text not null,
  actor text not null,
  event_type text not null,
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now(),
  constraint jarvis_project_revision_v1_environment_ck check (environment = 'PREPROD'),
  constraint jarvis_project_revision_v1_event_ck check (event_type in ('CREATED','IMPORTED','RENAMED','UPDATED'))
);

create index if not exists jarvis_project_revision_v1_project_idx
  on public.jarvis_project_revision_v1(company_id, environment, version, project_id, created_at desc);

alter table public.jarvis_project_revision_v1 enable row level security;
revoke all on table public.jarvis_project_revision_v1 from public, anon, authenticated;
grant select, insert on table public.jarvis_project_revision_v1 to service_role;

comment on table public.jarvis_project_revision_v1 is
  'Append-only audit history for JARVIS Project Hub PREPROD metadata changes.';

create table if not exists public.jarvis_work_job_v1 (
  job_id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null,
  environment text not null,
  version text not null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'QUEUED',
  priority integer not null default 100,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  timeout_ms integer not null default 30000,
  idempotency_key text not null,
  correlation_id text not null,
  next_attempt_at timestamptz not null default now(),
  worker_id text,
  lease_id uuid,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  checkpoint jsonb,
  result_summary jsonb,
  error_code text,
  error_detail text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint jarvis_work_job_v1_environment_ck check (environment = 'PREPROD'),
  constraint jarvis_work_job_v1_status_ck check (status in ('QUEUED','RUNNING','RETRY_WAIT','SUCCEEDED','DEAD_LETTER','CANCELLED')),
  constraint jarvis_work_job_v1_attempts_ck check (attempts >= 0 and max_attempts between 1 and 20),
  constraint jarvis_work_job_v1_timeout_ck check (timeout_ms between 1000 and 3600000),
  unique (company_id, engine_id, environment, version, idempotency_key)
);

create index if not exists jarvis_work_job_v1_claim_idx
  on public.jarvis_work_job_v1(environment, status, next_attempt_at, priority, created_at);
create index if not exists jarvis_work_job_v1_context_idx
  on public.jarvis_work_job_v1(company_id, engine_id, environment, version, created_at desc);

alter table public.jarvis_work_job_v1 enable row level security;
revoke all on table public.jarvis_work_job_v1 from public, anon, authenticated;
grant select, insert, update on table public.jarvis_work_job_v1 to service_role;

comment on table public.jarvis_work_job_v1 is
  'JARVIS Work PREPROD durable remote queue. Separate from Browser queues; service-role only; no secrets in payload.';

create or replace function public.jarvis_work_lease_v1(
  p_worker_id text,
  p_company_id text default 'fenix',
  p_environment text default 'PREPROD',
  p_lease_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.jarvis_work_job_v1%rowtype;
begin
  if p_environment <> 'PREPROD' then raise exception 'PREPROD_ONLY'; end if;
  if p_worker_id is null or btrim(p_worker_id) = '' then raise exception 'WORKER_REQUIRED'; end if;
  with picked as (
    select job_id from public.jarvis_work_job_v1
    where company_id = p_company_id
      and environment = p_environment
      and status in ('QUEUED','RETRY_WAIT')
      and next_attempt_at <= now()
    order by priority asc, created_at asc, job_id asc
    for update skip locked
    limit 1
  )
  update public.jarvis_work_job_v1 j
  set status='RUNNING', attempts=j.attempts+1, worker_id=p_worker_id,
      lease_id=gen_random_uuid(), lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,3600))),
      heartbeat_at=now(), started_at=coalesce(j.started_at,now()), updated_at=now()
  from picked where j.job_id=picked.job_id returning j.* into r;
  if r.job_id is null then return jsonb_build_object('ok',true,'job',null); end if;
  return jsonb_build_object('ok',true,'job',to_jsonb(r));
end $$;

create or replace function public.jarvis_work_heartbeat_v1(
  p_job_id uuid,p_lease_id uuid,p_worker_id text,p_extend_seconds integer default 300
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare r public.jarvis_work_job_v1%rowtype;
begin
  update public.jarvis_work_job_v1 set heartbeat_at=now(),lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_extend_seconds,3600))),updated_at=now()
  where job_id=p_job_id and environment='PREPROD' and status='RUNNING' and lease_id=p_lease_id and worker_id=p_worker_id and lease_expires_at>now()
  returning * into r;
  if r.job_id is null then raise exception 'LEASE_NOT_OWNED'; end if;
  return to_jsonb(r);
end $$;

create or replace function public.jarvis_work_checkpoint_v1(
  p_job_id uuid,p_lease_id uuid,p_worker_id text,p_checkpoint jsonb
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare r public.jarvis_work_job_v1%rowtype;
begin
  update public.jarvis_work_job_v1 set checkpoint=coalesce(p_checkpoint,'{}'::jsonb),heartbeat_at=now(),updated_at=now()
  where job_id=p_job_id and environment='PREPROD' and status='RUNNING' and lease_id=p_lease_id and worker_id=p_worker_id and lease_expires_at>now()
  returning * into r;
  if r.job_id is null then raise exception 'LEASE_NOT_OWNED'; end if;
  return to_jsonb(r);
end $$;

create or replace function public.jarvis_work_complete_v1(
  p_job_id uuid,p_lease_id uuid,p_worker_id text,p_result_summary jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare r public.jarvis_work_job_v1%rowtype;
begin
  update public.jarvis_work_job_v1 set status='SUCCEEDED',result_summary=coalesce(p_result_summary,'{}'::jsonb),error_code=null,error_detail=null,completed_at=now(),lease_id=null,lease_expires_at=null,heartbeat_at=null,updated_at=now()
  where job_id=p_job_id and environment='PREPROD' and status='RUNNING' and lease_id=p_lease_id and worker_id=p_worker_id and lease_expires_at>now()
  returning * into r;
  if r.job_id is null then raise exception 'LEASE_NOT_OWNED'; end if;
  return to_jsonb(r);
end $$;

create or replace function public.jarvis_work_fail_v1(
  p_job_id uuid,p_lease_id uuid,p_worker_id text,p_error_code text,p_error_detail text default null,p_retryable boolean default true
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare r public.jarvis_work_job_v1%rowtype; target text; delay_seconds integer;
begin
  select * into r from public.jarvis_work_job_v1 where job_id=p_job_id and environment='PREPROD' and status='RUNNING' and lease_id=p_lease_id and worker_id=p_worker_id and lease_expires_at>now() for update;
  if r.job_id is null then raise exception 'LEASE_NOT_OWNED'; end if;
  target:=case when p_retryable and r.attempts<r.max_attempts then 'RETRY_WAIT' else 'DEAD_LETTER' end;
  delay_seconds:=least(300,greatest(1,(2^greatest(r.attempts-1,0))::integer));
  update public.jarvis_work_job_v1 set status=target,error_code=left(coalesce(p_error_code,'FAILED'),160),error_detail=left(coalesce(p_error_detail,''),4000),next_attempt_at=case when target='RETRY_WAIT' then now()+make_interval(secs=>delay_seconds) else next_attempt_at end,completed_at=case when target='DEAD_LETTER' then now() else null end,lease_id=null,lease_expires_at=null,heartbeat_at=null,worker_id=null,updated_at=now() where job_id=p_job_id returning * into r;
  return to_jsonb(r);
end $$;

create or replace function public.jarvis_work_cancel_v1(p_job_id uuid,p_reason text default 'CANCELLED_BY_OWNER') returns jsonb
language plpgsql security definer set search_path=public
as $$
declare r public.jarvis_work_job_v1%rowtype;
begin
  update public.jarvis_work_job_v1 set status='CANCELLED',cancel_reason=left(coalesce(p_reason,'CANCELLED_BY_OWNER'),500),completed_at=now(),lease_id=null,lease_expires_at=null,heartbeat_at=null,worker_id=null,updated_at=now()
  where job_id=p_job_id and environment='PREPROD' and status not in ('SUCCEEDED','DEAD_LETTER','CANCELLED') returning * into r;
  if r.job_id is null then select * into r from public.jarvis_work_job_v1 where job_id=p_job_id; end if;
  return case when r.job_id is null then jsonb_build_object('ok',false,'error','JOB_NOT_FOUND') else to_jsonb(r) end;
end $$;

revoke all on function public.jarvis_work_lease_v1(text,text,text,integer) from public, anon, authenticated;
revoke all on function public.jarvis_work_heartbeat_v1(uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.jarvis_work_checkpoint_v1(uuid,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.jarvis_work_complete_v1(uuid,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.jarvis_work_fail_v1(uuid,uuid,text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.jarvis_work_cancel_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.jarvis_work_lease_v1(text,text,text,integer) to service_role;
grant execute on function public.jarvis_work_heartbeat_v1(uuid,uuid,text,integer) to service_role;
grant execute on function public.jarvis_work_checkpoint_v1(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.jarvis_work_complete_v1(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.jarvis_work_fail_v1(uuid,uuid,text,text,text,boolean) to service_role;
grant execute on function public.jarvis_work_cancel_v1(uuid,text) to service_role;
