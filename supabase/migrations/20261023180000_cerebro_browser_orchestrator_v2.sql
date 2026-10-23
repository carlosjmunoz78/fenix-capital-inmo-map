-- CEREBRO Browser 1 · Phase 2 · Orchestrated concurrent queue V2
-- Additive only: Browser 1 V1 queue/functions remain unchanged as rollback path.

create table if not exists public.cerebro_browser_orchestrator_config_v2 (
  environment text primary key check (environment in ('LAB','PREPROD','PROD')),
  enabled boolean not null default false,
  global_max_concurrent integer not null default 1 check (global_max_concurrent between 1 and 128),
  default_company_max_concurrent integer not null default 1 check (default_company_max_concurrent between 1 and 128),
  default_department_max_concurrent integer not null default 1 check (default_department_max_concurrent between 1 and 128),
  lease_seconds integer not null default 300 check (lease_seconds between 30 and 1800),
  retry_base_seconds integer not null default 5 check (retry_base_seconds between 1 and 300),
  updated_at timestamptz not null default now(),
  updated_by text not null default 'migration'
);
alter table public.cerebro_browser_orchestrator_config_v2 enable row level security;
revoke all on public.cerebro_browser_orchestrator_config_v2 from anon, authenticated;
grant select, insert, update on public.cerebro_browser_orchestrator_config_v2 to service_role;

insert into public.cerebro_browser_orchestrator_config_v2(environment,enabled,global_max_concurrent,default_company_max_concurrent,default_department_max_concurrent,lease_seconds,retry_base_seconds,updated_by)
values
  ('LAB',true,4,4,2,300,5,'phase2-v1'),
  ('PREPROD',true,4,4,2,300,5,'phase2-v1'),
  ('PROD',false,1,1,1,300,5,'phase2-v1')
on conflict (environment) do nothing;

create table if not exists public.cerebro_browser_job_v2 (
  job_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  company_id text not null,
  engine_id text not null,
  department_id text not null,
  environment text not null check (environment in ('LAB','PREPROD','PROD')),
  version text not null default 'v2',
  mode text not null check (mode in ('OBSERVE','MUTATE')),
  identity_id text not null,
  account_id text not null,
  browser_profile_id text not null,
  credential_ref_id text,
  target_url text not null,
  commands jsonb not null check (jsonb_typeof(commands)='array' and jsonb_array_length(commands)>0),
  authority jsonb not null default '{}'::jsonb,
  priority integer not null default 50 check (priority between 0 and 100),
  risk text not null default 'LOW' check (risk in ('LOW','MEDIUM','HIGH')),
  capability text not null default 'browser1.observe',
  expected_cost_eur numeric(12,4) not null default 0 check (expected_cost_eur >= 0),
  timeout_seconds integer not null default 300 check (timeout_seconds between 30 and 1800),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  status text not null default 'QUEUED' check (status in ('QUEUED','LEASED','RETRY_WAIT','SUCCEEDED','FAILED','HOLD','CANCELLED','DEAD_LETTER')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  not_before timestamptz not null default now(),
  cancel_requested boolean not null default false,
  lease_id uuid,
  leased_by text,
  lease_expires_at timestamptz,
  last_heartbeat_at timestamptz,
  result_summary jsonb,
  error_code text,
  audit_id text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint cerebro_browser_job_v2_no_secret_commands check (not public.cerebro_browser_payload_has_secret_key_v1(commands)),
  constraint cerebro_browser_job_v2_no_secret_authority check (not public.cerebro_browser_payload_has_secret_key_v1(authority)),
  constraint cerebro_browser_job_v2_no_secret_result check (result_summary is null or not public.cerebro_browser_payload_has_secret_key_v1(result_summary))
);
comment on table public.cerebro_browser_job_v2 is 'Browser 1 Phase 2 orchestrated queue. Parallel to V1; V1 remains rollback. No raw secrets/session material.';
alter table public.cerebro_browser_job_v2 enable row level security;
revoke all on public.cerebro_browser_job_v2 from anon, authenticated;
grant select, insert, update on public.cerebro_browser_job_v2 to service_role;
create index if not exists cerebro_browser_job_v2_sched_idx on public.cerebro_browser_job_v2(environment,status,priority desc,not_before,created_at);
create index if not exists cerebro_browser_job_v2_scope_idx on public.cerebro_browser_job_v2(company_id,environment,browser_profile_id,status);
create index if not exists cerebro_browser_job_v2_department_idx on public.cerebro_browser_job_v2(company_id,environment,department_id,status);

create table if not exists public.cerebro_browser_profile_lease_v2 (
  scope_key text primary key,
  company_id text not null,
  environment text not null check (environment in ('LAB','PREPROD','PROD')),
  browser_profile_id text not null,
  job_id uuid not null unique references public.cerebro_browser_job_v2(job_id) on delete cascade,
  lease_id uuid not null,
  worker_id text not null,
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.cerebro_browser_profile_lease_v2 is 'Exclusive per-profile lease for Browser 1 Phase 2. Enforces one concurrent writer/worker per browser_profile_id.';
alter table public.cerebro_browser_profile_lease_v2 enable row level security;
revoke all on public.cerebro_browser_profile_lease_v2 from anon, authenticated;
grant select, insert, update, delete on public.cerebro_browser_profile_lease_v2 to service_role;
create index if not exists cerebro_browser_profile_lease_v2_expiry_idx on public.cerebro_browser_profile_lease_v2(lease_expires_at);

create table if not exists public.cerebro_browser_fairness_v2 (
  company_id text not null,
  environment text not null check (environment in ('LAB','PREPROD','PROD')),
  department_id text not null,
  last_leased_at timestamptz not null default to_timestamp(0),
  lease_count bigint not null default 0 check (lease_count >= 0),
  primary key(company_id,environment,department_id)
);
alter table public.cerebro_browser_fairness_v2 enable row level security;
revoke all on public.cerebro_browser_fairness_v2 from anon, authenticated;
grant select, insert, update on public.cerebro_browser_fairness_v2 to service_role;

create table if not exists public.cerebro_browser_worker_metric_v2 (
  metric_id uuid primary key default gen_random_uuid(),
  run_id text not null,
  worker_id text not null,
  environment text not null,
  stage_concurrency integer not null check (stage_concurrency between 1 and 128),
  job_id uuid,
  company_id text,
  department_id text,
  browser_profile_id text,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  rss_start_bytes bigint,
  rss_end_bytes bigint,
  heap_used_start_bytes bigint,
  heap_used_end_bytes bigint,
  cpu_user_micros bigint,
  cpu_system_micros bigint,
  outcome text not null,
  secret_material_logged boolean not null default false,
  incremental_cost_eur numeric(12,4) not null default 0 check (incremental_cost_eur = 0),
  created_at timestamptz not null default now()
);
alter table public.cerebro_browser_worker_metric_v2 enable row level security;
revoke all on public.cerebro_browser_worker_metric_v2 from anon, authenticated;
grant select, insert on public.cerebro_browser_worker_metric_v2 to service_role;
create index if not exists cerebro_browser_worker_metric_v2_run_idx on public.cerebro_browser_worker_metric_v2(run_id,stage_concurrency,created_at);

create or replace function public.cerebro_browser_enqueue_v2(
  p_idempotency_key text,p_company_id text,p_engine_id text,p_department_id text,p_environment text,p_version text,p_mode text,
  p_identity_id text,p_account_id text,p_browser_profile_id text,p_credential_ref_id text,p_target_url text,p_commands jsonb,p_authority jsonb,
  p_priority integer,p_risk text,p_capability text,p_expected_cost_eur numeric,p_timeout_seconds integer,p_max_attempts integer,p_audit_id text,p_created_by text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_row public.cerebro_browser_job_v2%rowtype;
begin
  if p_environment not in ('LAB','PREPROD','PROD') then raise exception 'INVALID_ENVIRONMENT'; end if;
  if p_mode not in ('OBSERVE','MUTATE') then raise exception 'INVALID_MODE'; end if;
  if p_priority < 0 or p_priority > 100 then raise exception 'INVALID_PRIORITY'; end if;
  if p_risk not in ('LOW','MEDIUM','HIGH') then raise exception 'INVALID_RISK'; end if;
  if p_risk='HIGH' then raise exception 'HIGH_RISK_NOT_AUTO_ENQUEUEABLE'; end if;
  if coalesce(p_expected_cost_eur,0) <> 0 then raise exception 'MONEY_LIMIT'; end if;
  if p_timeout_seconds < 30 or p_timeout_seconds > 1800 then raise exception 'INVALID_TIMEOUT'; end if;
  if p_max_attempts < 1 or p_max_attempts > 10 then raise exception 'INVALID_MAX_ATTEMPTS'; end if;
  if public.cerebro_browser_payload_has_secret_key_v1(p_commands) or public.cerebro_browser_payload_has_secret_key_v1(coalesce(p_authority,'{}'::jsonb)) then raise exception 'RAW_SECRET_FIELD_FORBIDDEN'; end if;
  insert into public.cerebro_browser_job_v2(
    idempotency_key,company_id,engine_id,department_id,environment,version,mode,identity_id,account_id,browser_profile_id,credential_ref_id,target_url,
    commands,authority,priority,risk,capability,expected_cost_eur,timeout_seconds,max_attempts,audit_id,created_by
  ) values(
    p_idempotency_key,p_company_id,p_engine_id,p_department_id,p_environment,coalesce(nullif(p_version,''),'v2'),p_mode,p_identity_id,p_account_id,p_browser_profile_id,
    nullif(p_credential_ref_id,''),p_target_url,p_commands,coalesce(p_authority,'{}'::jsonb),p_priority,p_risk,p_capability,coalesce(p_expected_cost_eur,0),p_timeout_seconds,p_max_attempts,p_audit_id,p_created_by
  ) on conflict (idempotency_key) do nothing;
  select * into v_row from public.cerebro_browser_job_v2 where idempotency_key=p_idempotency_key;
  return jsonb_build_object('ok',true,'job_id',v_row.job_id,'status',v_row.status,'queue','V2');
end;
$$;

create or replace function public.cerebro_browser_reap_v2(p_environment text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_retry integer:=0; v_dead integer:=0; v_ready integer:=0; v_cfg public.cerebro_browser_orchestrator_config_v2%rowtype;
begin
  select * into v_cfg from public.cerebro_browser_orchestrator_config_v2 where environment=p_environment;
  if v_cfg.environment is null then return jsonb_build_object('ok',false,'error','ORCHESTRATOR_CONFIG_NOT_FOUND'); end if;
  delete from public.cerebro_browser_profile_lease_v2 where environment=p_environment and lease_expires_at<=now();
  with expired as (
    select job_id,attempt_count,max_attempts from public.cerebro_browser_job_v2
    where environment=p_environment and status='LEASED' and lease_expires_at<=now()
    for update skip locked
  ), updated as (
    update public.cerebro_browser_job_v2 j set
      status=case when e.attempt_count>=e.max_attempts then 'DEAD_LETTER' else 'RETRY_WAIT' end,
      not_before=case when e.attempt_count>=e.max_attempts then 'infinity'::timestamptz else now()+make_interval(secs=>least(300,v_cfg.retry_base_seconds*greatest(1,(2^greatest(e.attempt_count-1,0))::integer))) end,
      lease_id=null,leased_by=null,lease_expires_at=null,last_heartbeat_at=null,error_code='LEASE_EXPIRED',updated_at=now(),
      completed_at=case when e.attempt_count>=e.max_attempts then now() else null end
    from expired e where j.job_id=e.job_id
    returning j.status
  ) select count(*) filter(where status='RETRY_WAIT'),count(*) filter(where status='DEAD_LETTER') into v_retry,v_dead from updated;
  update public.cerebro_browser_job_v2 set status='QUEUED',updated_at=now()
    where environment=p_environment and status='RETRY_WAIT' and not_before<=now() and cancel_requested=false;
  get diagnostics v_ready=row_count;
  return jsonb_build_object('ok',true,'retry_wait',v_retry,'dead_letter',v_dead,'ready',v_ready);
end;
$$;

create or replace function public.cerebro_browser_lease_v2(p_worker_id text,p_environment text,p_lease_seconds integer default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cfg public.cerebro_browser_orchestrator_config_v2%rowtype;
  v_job public.cerebro_browser_job_v2%rowtype;
  v_candidate record;
  v_lease uuid;
  v_scope text;
  v_global integer;
  v_company integer;
  v_department integer;
  v_seconds integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('cerebro_browser_orchestrator_v2:'||p_environment,0));
  select * into v_cfg from public.cerebro_browser_orchestrator_config_v2 where environment=p_environment;
  if v_cfg.environment is null then return jsonb_build_object('ok',false,'error','ORCHESTRATOR_CONFIG_NOT_FOUND'); end if;
  if v_cfg.enabled is not true then return jsonb_build_object('ok',true,'job',null,'backpressure','ORCHESTRATOR_DISABLED'); end if;
  v_seconds:=coalesce(p_lease_seconds,v_cfg.lease_seconds);
  if v_seconds<30 or v_seconds>1800 then raise exception 'INVALID_LEASE_SECONDS'; end if;
  perform public.cerebro_browser_reap_v2(p_environment);
  select count(*) into v_global from public.cerebro_browser_job_v2 where environment=p_environment and status='LEASED' and lease_expires_at>now();
  if v_global>=v_cfg.global_max_concurrent then return jsonb_build_object('ok',true,'job',null,'backpressure','GLOBAL_LIMIT'); end if;

  for v_candidate in
    select j.*,
      (select count(*) from public.cerebro_browser_job_v2 a where a.environment=j.environment and a.company_id=j.company_id and a.status='LEASED' and a.lease_expires_at>now()) as company_active,
      (select count(*) from public.cerebro_browser_job_v2 a where a.environment=j.environment and a.company_id=j.company_id and a.department_id=j.department_id and a.status='LEASED' and a.lease_expires_at>now()) as department_active,
      coalesce((select f.last_leased_at from public.cerebro_browser_fairness_v2 f where f.company_id=j.company_id and f.environment=j.environment and f.department_id=j.department_id),to_timestamp(0)) as department_last_leased
    from public.cerebro_browser_job_v2 j
    where j.environment=p_environment and j.status='QUEUED' and j.not_before<=now() and j.cancel_requested=false and j.expected_cost_eur=0 and j.risk<>'HIGH'
      and not exists(select 1 from public.cerebro_browser_profile_lease_v2 l where l.scope_key=j.company_id||'::'||j.environment||'::'||j.browser_profile_id and l.lease_expires_at>now())
    order by j.priority desc, department_active asc, department_last_leased asc, j.created_at asc
    for update of j skip locked
    limit 25
  loop
    v_company:=v_candidate.company_active; v_department:=v_candidate.department_active;
    if v_company>=v_cfg.default_company_max_concurrent or v_department>=v_cfg.default_department_max_concurrent then continue; end if;
    v_lease:=gen_random_uuid(); v_scope:=v_candidate.company_id||'::'||v_candidate.environment||'::'||v_candidate.browser_profile_id;
    begin
      insert into public.cerebro_browser_profile_lease_v2(scope_key,company_id,environment,browser_profile_id,job_id,lease_id,worker_id,lease_expires_at)
      values(v_scope,v_candidate.company_id,v_candidate.environment,v_candidate.browser_profile_id,v_candidate.job_id,v_lease,p_worker_id,now()+make_interval(secs=>v_seconds));
    exception when unique_violation then
      continue;
    end;
    update public.cerebro_browser_job_v2 set status='LEASED',lease_id=v_lease,leased_by=p_worker_id,lease_expires_at=now()+make_interval(secs=>v_seconds),
      last_heartbeat_at=now(),attempt_count=attempt_count+1,updated_at=now(),error_code=null
      where job_id=v_candidate.job_id returning * into v_job;
    insert into public.cerebro_browser_fairness_v2(company_id,environment,department_id,last_leased_at,lease_count)
      values(v_job.company_id,v_job.environment,v_job.department_id,now(),1)
      on conflict(company_id,environment,department_id) do update set last_leased_at=excluded.last_leased_at,lease_count=public.cerebro_browser_fairness_v2.lease_count+1;
    return jsonb_build_object('ok',true,'job',to_jsonb(v_job),'orchestrator',jsonb_build_object('global_active_before',v_global,'company_active_before',v_company,'department_active_before',v_department,'global_limit',v_cfg.global_max_concurrent,'company_limit',v_cfg.default_company_max_concurrent,'department_limit',v_cfg.default_department_max_concurrent));
  end loop;
  return jsonb_build_object('ok',true,'job',null,'backpressure','NO_ELIGIBLE_JOB');
end;
$$;

create or replace function public.cerebro_browser_heartbeat_v2(p_job_id uuid,p_lease_id uuid,p_worker_id text,p_extend_seconds integer default 300)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_job public.cerebro_browser_job_v2%rowtype; v_exp timestamptz;
begin
  if p_extend_seconds<30 or p_extend_seconds>1800 then raise exception 'INVALID_HEARTBEAT_SECONDS'; end if;
  select * into v_job from public.cerebro_browser_job_v2 where job_id=p_job_id and lease_id=p_lease_id and leased_by=p_worker_id and status='LEASED' and lease_expires_at>now() for update;
  if v_job.job_id is null then return jsonb_build_object('ok',false,'error','LEASE_NOT_ACTIVE'); end if;
  v_exp:=now()+make_interval(secs=>p_extend_seconds);
  update public.cerebro_browser_job_v2 set lease_expires_at=v_exp,last_heartbeat_at=now(),updated_at=now() where job_id=p_job_id;
  update public.cerebro_browser_profile_lease_v2 set lease_expires_at=v_exp,updated_at=now() where job_id=p_job_id and lease_id=p_lease_id and worker_id=p_worker_id;
  return jsonb_build_object('ok',true,'lease_expires_at',v_exp,'cancel_requested',v_job.cancel_requested);
end;
$$;

create or replace function public.cerebro_browser_cancel_v2(p_job_id uuid,p_reason text default 'CANCELLED')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_job public.cerebro_browser_job_v2%rowtype;
begin
  select * into v_job from public.cerebro_browser_job_v2 where job_id=p_job_id for update;
  if v_job.job_id is null then return jsonb_build_object('ok',false,'error','JOB_NOT_FOUND'); end if;
  if v_job.status in ('SUCCEEDED','FAILED','HOLD','CANCELLED','DEAD_LETTER') then return jsonb_build_object('ok',true,'job_id',p_job_id,'status',v_job.status,'already_terminal',true); end if;
  if v_job.status in ('QUEUED','RETRY_WAIT') then
    update public.cerebro_browser_job_v2 set cancel_requested=true,status='CANCELLED',error_code=left(coalesce(nullif(p_reason,''),'CANCELLED'),240),completed_at=now(),updated_at=now(),not_before='infinity'::timestamptz where job_id=p_job_id;
    return jsonb_build_object('ok',true,'job_id',p_job_id,'status','CANCELLED');
  end if;
  update public.cerebro_browser_job_v2 set cancel_requested=true,error_code=left(coalesce(nullif(p_reason,''),'CANCEL_REQUESTED'),240),updated_at=now() where job_id=p_job_id;
  return jsonb_build_object('ok',true,'job_id',p_job_id,'status','LEASED','cancel_requested',true);
end;
$$;

create or replace function public.cerebro_browser_complete_v2(p_job_id uuid,p_lease_id uuid,p_worker_id text,p_outcome text,p_result_summary jsonb default null,p_error_code text default null,p_retryable boolean default true)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_job public.cerebro_browser_job_v2%rowtype; v_cfg public.cerebro_browser_orchestrator_config_v2%rowtype; v_next text; v_delay integer;
begin
  if p_result_summary is not null and public.cerebro_browser_payload_has_secret_key_v1(p_result_summary) then raise exception 'RAW_SECRET_FIELD_FORBIDDEN'; end if;
  select * into v_job from public.cerebro_browser_job_v2 where job_id=p_job_id and lease_id=p_lease_id and leased_by=p_worker_id and status='LEASED' for update;
  if v_job.job_id is null then return jsonb_build_object('ok',false,'error','LEASE_MISMATCH'); end if;
  select * into v_cfg from public.cerebro_browser_orchestrator_config_v2 where environment=v_job.environment;
  delete from public.cerebro_browser_profile_lease_v2 where job_id=p_job_id and lease_id=p_lease_id and worker_id=p_worker_id;
  if v_job.cancel_requested then v_next:='CANCELLED';
  elsif upper(p_outcome)='SUCCEEDED' then v_next:='SUCCEEDED';
  elsif upper(p_outcome)='HOLD' then v_next:='HOLD';
  elsif p_retryable and v_job.attempt_count<v_job.max_attempts then v_next:='RETRY_WAIT';
  else v_next:='DEAD_LETTER'; end if;
  v_delay:=least(300,coalesce(v_cfg.retry_base_seconds,5)*greatest(1,(2^greatest(v_job.attempt_count-1,0))::integer));
  update public.cerebro_browser_job_v2 set
    status=v_next,result_summary=p_result_summary,error_code=left(nullif(p_error_code,''),240),
    not_before=case when v_next='RETRY_WAIT' then now()+make_interval(secs=>v_delay) when v_next in ('CANCELLED','DEAD_LETTER') then 'infinity'::timestamptz else not_before end,
    lease_id=null,leased_by=null,lease_expires_at=null,last_heartbeat_at=null,updated_at=now(),
    completed_at=case when v_next in ('SUCCEEDED','HOLD','CANCELLED','DEAD_LETTER') then now() else null end
    where job_id=p_job_id;
  return jsonb_build_object('ok',true,'job_id',p_job_id,'status',v_next,'attempt_count',v_job.attempt_count);
end;
$$;

create or replace function public.cerebro_browser_metrics_insert_v2(
  p_run_id text,p_worker_id text,p_environment text,p_stage_concurrency integer,p_job_id uuid,p_company_id text,p_department_id text,p_browser_profile_id text,
  p_started_at timestamptz,p_finished_at timestamptz,p_duration_ms integer,p_rss_start_bytes bigint,p_rss_end_bytes bigint,p_heap_used_start_bytes bigint,p_heap_used_end_bytes bigint,
  p_cpu_user_micros bigint,p_cpu_system_micros bigint,p_outcome text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  insert into public.cerebro_browser_worker_metric_v2(run_id,worker_id,environment,stage_concurrency,job_id,company_id,department_id,browser_profile_id,started_at,finished_at,duration_ms,rss_start_bytes,rss_end_bytes,heap_used_start_bytes,heap_used_end_bytes,cpu_user_micros,cpu_system_micros,outcome,secret_material_logged,incremental_cost_eur)
  values(p_run_id,p_worker_id,p_environment,p_stage_concurrency,p_job_id,p_company_id,p_department_id,p_browser_profile_id,p_started_at,p_finished_at,p_duration_ms,p_rss_start_bytes,p_rss_end_bytes,p_heap_used_start_bytes,p_heap_used_end_bytes,p_cpu_user_micros,p_cpu_system_micros,p_outcome,false,0)
  returning metric_id into v_id;
  return jsonb_build_object('ok',true,'metric_id',v_id);
end;
$$;

create or replace function public.cerebro_browser_status_v2(p_environment text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_cfg public.cerebro_browser_orchestrator_config_v2%rowtype; v_counts jsonb; v_profiles integer;
begin
  select * into v_cfg from public.cerebro_browser_orchestrator_config_v2 where environment=p_environment;
  select coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb) into v_counts from (select status,count(*) cnt from public.cerebro_browser_job_v2 where environment=p_environment group by status) s;
  select count(*) into v_profiles from public.cerebro_browser_profile_lease_v2 where environment=p_environment and lease_expires_at>now();
  return jsonb_build_object('ok',true,'environment',p_environment,'enabled',coalesce(v_cfg.enabled,false),'global_max_concurrent',coalesce(v_cfg.global_max_concurrent,0),'default_company_max_concurrent',coalesce(v_cfg.default_company_max_concurrent,0),'default_department_max_concurrent',coalesce(v_cfg.default_department_max_concurrent,0),'active_profiles',v_profiles,'states',v_counts,'serial_v1_rollback_preserved',true,'incremental_cost_eur',0);
end;
$$;

create or replace function public.cerebro_browser_credential_materialize_v2(p_job_id uuid,p_lease_id uuid,p_worker_id text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_job public.cerebro_browser_job_v2%rowtype;
  v_binding public.cerebro_credential_binding_v1%rowtype;
  v_origin text; v_capability text; v_secret_text text; v_payload jsonb;
begin
  select * into v_job from public.cerebro_browser_job_v2 where job_id=p_job_id and lease_id=p_lease_id and leased_by=p_worker_id and status='LEASED' and lease_expires_at>now();
  if v_job.job_id is null then return jsonb_build_object('ok',false,'error','LEASE_NOT_ACTIVE'); end if;
  if v_job.credential_ref_id is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_REF_NOT_REQUESTED'); end if;
  select * into v_binding from public.cerebro_credential_binding_v1 where credential_ref_id=v_job.credential_ref_id and active=true;
  if v_binding.credential_ref_id is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_BINDING_NOT_FOUND'); end if;
  if v_binding.company_id<>v_job.company_id then return jsonb_build_object('ok',false,'error','CROSS_COMPANY_CREDENTIAL_DENIED'); end if;
  if v_binding.identity_id<>v_job.identity_id or v_binding.account_id<>v_job.account_id then return jsonb_build_object('ok',false,'error','CREDENTIAL_IDENTITY_ACCOUNT_MISMATCH'); end if;
  if not (v_job.environment=any(v_binding.allowed_environments)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_ENVIRONMENT_DENIED'); end if;
  v_origin:=lower(substring(v_job.target_url from '^https?://[^/]+'));
  if v_origin is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_TARGET_ORIGIN_INVALID'); end if;
  if cardinality(v_binding.allowed_origins)>0 and not exists(select 1 from unnest(v_binding.allowed_origins) x where lower(x)=v_origin) then return jsonb_build_object('ok',false,'error','CREDENTIAL_ORIGIN_DENIED'); end if;
  v_capability:=case when v_job.mode='MUTATE' then 'browser1.act' else 'browser1.observe' end;
  if cardinality(v_binding.allowed_capabilities)>0 and not (v_capability=any(v_binding.allowed_capabilities)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_CAPABILITY_DENIED'); end if;
  select decrypted_secret into v_secret_text from vault.decrypted_secrets where name=v_binding.vault_secret_name limit 1;
  if v_secret_text is null then return jsonb_build_object('ok',false,'error','VAULT_SECRET_NOT_AVAILABLE'); end if;
  begin v_payload:=v_secret_text::jsonb; exception when others then return jsonb_build_object('ok',false,'error','VAULT_SECRET_PAYLOAD_INVALID'); end;
  insert into public.cerebro_credential_lease_audit_v1(job_id,credential_ref_id,company_id,environment,capability,origin,worker_id,secret_material_logged)
  values(v_job.job_id,v_binding.credential_ref_id,v_job.company_id,v_job.environment,v_capability,v_origin,p_worker_id,false);
  return jsonb_build_object('ok',true,'credential_ref_id',v_binding.credential_ref_id,'identity_id',v_binding.identity_id,'account_id',v_binding.account_id,'provider',v_binding.provider,'secret_payload',v_payload,'secret_material_logged',false);
end;
$$;

revoke all on function public.cerebro_browser_enqueue_v2(text,text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,integer,text,text,numeric,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_reap_v2(text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_lease_v2(text,text,integer) from public, anon, authenticated;
revoke all on function public.cerebro_browser_heartbeat_v2(uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.cerebro_browser_cancel_v2(uuid,text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_complete_v2(uuid,uuid,text,text,jsonb,text,boolean) from public, anon, authenticated;
revoke all on function public.cerebro_browser_metrics_insert_v2(text,text,text,integer,uuid,text,text,text,timestamptz,timestamptz,integer,bigint,bigint,bigint,bigint,bigint,bigint,text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_status_v2(text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_credential_materialize_v2(uuid,uuid,text) from public, anon, authenticated;

grant execute on function public.cerebro_browser_enqueue_v2(text,text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,integer,text,text,numeric,integer,integer,text,text) to service_role;
grant execute on function public.cerebro_browser_reap_v2(text) to service_role;
grant execute on function public.cerebro_browser_lease_v2(text,text,integer) to service_role;
grant execute on function public.cerebro_browser_heartbeat_v2(uuid,uuid,text,integer) to service_role;
grant execute on function public.cerebro_browser_cancel_v2(uuid,text) to service_role;
grant execute on function public.cerebro_browser_complete_v2(uuid,uuid,text,text,jsonb,text,boolean) to service_role;
grant execute on function public.cerebro_browser_metrics_insert_v2(text,text,text,integer,uuid,text,text,text,timestamptz,timestamptz,integer,bigint,bigint,bigint,bigint,bigint,bigint,text) to service_role;
grant execute on function public.cerebro_browser_status_v2(text) to service_role;
grant execute on function public.cerebro_browser_credential_materialize_v2(uuid,uuid,text) to service_role;
