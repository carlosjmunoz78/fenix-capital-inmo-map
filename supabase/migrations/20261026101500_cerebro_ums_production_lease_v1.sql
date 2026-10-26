-- CEREBRO UMS premium production queue isolation V1
-- Additive PREPROD-first change. Keeps the existing creative queue/table and
-- prevents the legacy programmatic renderer from leasing UMS premium orders.

create or replace function public.cerebro_creative_lease_v1(
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_now timestamptz := now();
  v_lease uuid := gen_random_uuid();
  v_row public.cerebro_creative_job_v1;
begin
  if nullif(trim(p_worker_id),'') is null then
    raise exception 'CREATIVE_WORKER_ID_REQUIRED';
  end if;

  with candidate as (
    select job_id
    from public.cerebro_creative_job_v1
    where (
      status='QUEUED'
      or (status='LEASED' and lease_expires_at < v_now)
    )
      and attempt_count < max_attempts
      -- UMS premium production is deliberately excluded from the legacy
      -- HTML/Chromium/FFmpeg renderer. A dedicated UMS worker must lease it.
      and not (
        engine_id='UMS-001'
        and coalesce(request->>'kind','')='cerebro.ums.production_order.v1'
      )
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  )
  update public.cerebro_creative_job_v1 j
  set status='LEASED',
      lease_id=v_lease,
      lease_owner=p_worker_id,
      lease_expires_at=v_now + make_interval(secs => least(greatest(coalesce(p_lease_seconds,300),60),900)),
      attempt_count=j.attempt_count+1,
      updated_at=v_now
  from candidate c
  where j.job_id=c.job_id
  returning j.* into v_row;

  if v_row.job_id is null then
    return jsonb_build_object('ok',true,'job',null);
  end if;

  return jsonb_build_object('ok',true,'job',jsonb_build_object(
    'job_id',v_row.job_id,
    'lease_id',v_row.lease_id,
    'company_id',v_row.company_id,
    'engine_id',v_row.engine_id,
    'department_id',v_row.department_id,
    'environment',v_row.environment,
    'version',v_row.version,
    'channel',v_row.channel,
    'output_type',v_row.output_type,
    'request',v_row.request,
    'audit_id',v_row.audit_id,
    'attempt_count',v_row.attempt_count,
    'max_attempts',v_row.max_attempts
  ));
end;
$function$;

create or replace function public.cerebro_ums_production_lease_v1(
  p_worker_id text,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_now timestamptz := now();
  v_lease uuid := gen_random_uuid();
  v_row public.cerebro_creative_job_v1;
begin
  if nullif(trim(p_worker_id),'') is null then
    raise exception 'UMS_WORKER_ID_REQUIRED';
  end if;

  with candidate as (
    select job_id
    from public.cerebro_creative_job_v1
    where (
      status='QUEUED'
      or (status='LEASED' and lease_expires_at < v_now)
    )
      and attempt_count < max_attempts
      and engine_id='UMS-001'
      and environment='PREPROD'
      and coalesce(request->>'kind','')='cerebro.ums.production_order.v1'
      and upper(coalesce(request->>'quality_profile','')) in ('PREMIUM_GENERAL','PREMIUM_SOCIAL','PREMIUM_BRAND')
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  )
  update public.cerebro_creative_job_v1 j
  set status='LEASED',
      lease_id=v_lease,
      lease_owner=p_worker_id,
      lease_expires_at=v_now + make_interval(secs => least(greatest(coalesce(p_lease_seconds,600),120),900)),
      attempt_count=j.attempt_count+1,
      updated_at=v_now
  from candidate c
  where j.job_id=c.job_id
  returning j.* into v_row;

  if v_row.job_id is null then
    return jsonb_build_object('ok',true,'job',null);
  end if;

  return jsonb_build_object('ok',true,'job',jsonb_build_object(
    'job_id',v_row.job_id,
    'lease_id',v_row.lease_id,
    'company_id',v_row.company_id,
    'engine_id',v_row.engine_id,
    'department_id',v_row.department_id,
    'environment',v_row.environment,
    'version',v_row.version,
    'channel',v_row.channel,
    'output_type',v_row.output_type,
    'request',v_row.request,
    'audit_id',v_row.audit_id,
    'attempt_count',v_row.attempt_count,
    'max_attempts',v_row.max_attempts
  ));
end;
$function$;

revoke all on function public.cerebro_ums_production_lease_v1(text,integer) from public;
revoke all on function public.cerebro_ums_production_lease_v1(text,integer) from anon;
revoke all on function public.cerebro_ums_production_lease_v1(text,integer) from authenticated;
grant execute on function public.cerebro_ums_production_lease_v1(text,integer) to service_role;

comment on function public.cerebro_ums_production_lease_v1(text,integer)
is 'PREPROD-only filtered lease for CEREBRO UMS premium production orders; legacy creative renderer cannot consume these jobs.';
