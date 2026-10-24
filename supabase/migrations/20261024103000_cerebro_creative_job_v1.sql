create table if not exists public.cerebro_creative_job_v1 (
  job_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  company_id text not null,
  engine_id text not null,
  department_id text not null default 'creative',
  environment text not null check (environment in ('PREPROD','PROD')),
  version text not null default 'v1',
  channel text not null,
  output_type text not null,
  request jsonb not null default '{}'::jsonb,
  status text not null default 'QUEUED' check (status in ('QUEUED','LEASED','SUCCEEDED','FAILED','HOLD','CANCELLED')),
  priority integer not null default 50 check (priority between 0 and 100),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 2 check (max_attempts between 1 and 3),
  lease_id uuid,
  lease_owner text,
  lease_expires_at timestamptz,
  result_summary jsonb,
  artifact_manifest jsonb,
  error_code text,
  audit_id text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists cerebro_creative_job_v1_queue_idx
  on public.cerebro_creative_job_v1 (status, priority desc, created_at asc);
create index if not exists cerebro_creative_job_v1_company_idx
  on public.cerebro_creative_job_v1 (company_id, environment, created_at desc);

alter table public.cerebro_creative_job_v1 enable row level security;
revoke all on table public.cerebro_creative_job_v1 from public, anon, authenticated;
grant all on table public.cerebro_creative_job_v1 to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'cerebro-creative-assets',
  'cerebro-creative-assets',
  false,
  52428800,
  array['image/png','image/jpeg','image/webp','application/pdf','video/mp4']::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.cerebro_creative_enqueue_v1(p_request jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_idempotency text := nullif(trim(p_request->>'idempotency_key'),'');
  v_company text := nullif(trim(p_request->>'company_id'),'');
  v_engine text := nullif(trim(p_request->>'engine_id'),'');
  v_department text := coalesce(nullif(trim(p_request->>'department_id'),''),'creative');
  v_environment text := upper(coalesce(nullif(trim(p_request->>'environment'),''),'PREPROD'));
  v_version text := coalesce(nullif(trim(p_request->>'version'),''),'v1');
  v_channel text := upper(coalesce(nullif(trim(p_request->>'channel'),''),'MARKETING'));
  v_output text := upper(coalesce(nullif(trim(p_request->>'output_type'),''),'STATIC_POST'));
  v_audit text := nullif(trim(p_request->>'audit_id'),'');
  v_created_by text := nullif(trim(p_request->>'created_by'),'');
  v_priority integer := least(greatest(coalesce((p_request->>'priority')::integer,50),0),100);
  v_max_attempts integer := least(greatest(coalesce((p_request->>'max_attempts')::integer,2),1),3);
  v_expected_cost numeric := coalesce((p_request->>'expected_cost_eur')::numeric,0);
  v_row public.cerebro_creative_job_v1;
begin
  if v_idempotency is null or v_company is null or v_engine is null or v_audit is null or v_created_by is null then
    raise exception 'CREATIVE_JOB_SCOPE_REQUIRED';
  end if;
  if v_environment not in ('PREPROD','PROD') then raise exception 'CREATIVE_JOB_ENVIRONMENT_DENIED'; end if;
  if v_expected_cost <> 0 then raise exception 'CREATIVE_JOB_MONEY_LIMIT'; end if;
  if lower(coalesce(p_request->>'publish_requested','false')) = 'true' then raise exception 'CREATIVE_JOB_PUBLISH_AUTHORITY_DENIED'; end if;
  if p_request::text ~* '"(password|secret|access_token|refresh_token|api_key|apikey|private_key|dni|nie|nif|iban)"[[:space:]]*:' then
    raise exception 'CREATIVE_JOB_RAW_SECRET_OR_PII_DENIED';
  end if;
  if jsonb_typeof(coalesce(p_request->'creative_payload','{}'::jsonb)) <> 'object' then raise exception 'CREATIVE_JOB_PAYLOAD_INVALID'; end if;

  insert into public.cerebro_creative_job_v1(
    idempotency_key,company_id,engine_id,department_id,environment,version,channel,output_type,
    request,status,priority,max_attempts,audit_id,created_by
  ) values (
    v_idempotency,v_company,v_engine,v_department,v_environment,v_version,v_channel,v_output,
    p_request,'QUEUED',v_priority,v_max_attempts,v_audit,v_created_by
  )
  on conflict (idempotency_key) do update set updated_at=public.cerebro_creative_job_v1.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'ok',true,'job_id',v_row.job_id,'status',v_row.status,'company_id',v_row.company_id,
    'engine_id',v_row.engine_id,'environment',v_row.environment,'channel',v_row.channel,
    'output_type',v_row.output_type,'expected_cost_eur',0,'publish_authorized',false
  );
end;
$function$;

create or replace function public.cerebro_creative_lease_v1(p_worker_id text, p_lease_seconds integer default 300)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_now timestamptz := now();
  v_lease uuid := gen_random_uuid();
  v_row public.cerebro_creative_job_v1;
begin
  if nullif(trim(p_worker_id),'') is null then raise exception 'CREATIVE_WORKER_ID_REQUIRED'; end if;
  with candidate as (
    select job_id
    from public.cerebro_creative_job_v1
    where (
      status='QUEUED'
      or (status='LEASED' and lease_expires_at < v_now)
    )
      and attempt_count < max_attempts
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  )
  update public.cerebro_creative_job_v1 j
  set status='LEASED', lease_id=v_lease, lease_owner=p_worker_id,
      lease_expires_at=v_now + make_interval(secs => least(greatest(coalesce(p_lease_seconds,300),60),900)),
      attempt_count=j.attempt_count+1, updated_at=v_now
  from candidate c
  where j.job_id=c.job_id
  returning j.* into v_row;

  if v_row.job_id is null then return jsonb_build_object('ok',true,'job',null); end if;
  return jsonb_build_object('ok',true,'job',jsonb_build_object(
    'job_id',v_row.job_id,'lease_id',v_row.lease_id,'company_id',v_row.company_id,'engine_id',v_row.engine_id,
    'department_id',v_row.department_id,'environment',v_row.environment,'version',v_row.version,
    'channel',v_row.channel,'output_type',v_row.output_type,'request',v_row.request,'audit_id',v_row.audit_id,
    'attempt_count',v_row.attempt_count,'max_attempts',v_row.max_attempts
  ));
end;
$function$;

create or replace function public.cerebro_creative_complete_v1(
  p_job_id uuid,
  p_lease_id uuid,
  p_worker_id text,
  p_status text,
  p_result_summary jsonb default null,
  p_artifact_manifest jsonb default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_status text := upper(coalesce(p_status,''));
  v_count integer;
begin
  if v_status not in ('SUCCEEDED','FAILED','HOLD') then raise exception 'CREATIVE_COMPLETE_STATUS_DENIED'; end if;
  update public.cerebro_creative_job_v1
  set status=v_status,
      result_summary=p_result_summary,
      artifact_manifest=p_artifact_manifest,
      error_code=nullif(left(coalesce(p_error_code,''),240),''),
      completed_at=now(),updated_at=now(),
      lease_id=null,lease_owner=null,lease_expires_at=null
  where job_id=p_job_id and status='LEASED' and lease_id=p_lease_id and lease_owner=p_worker_id;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'CREATIVE_JOB_LEASE_MISMATCH'; end if;
  return jsonb_build_object('ok',true,'job_id',p_job_id,'status',v_status);
end;
$function$;

revoke all on function public.cerebro_creative_enqueue_v1(jsonb) from public, anon, authenticated;
revoke all on function public.cerebro_creative_lease_v1(text,integer) from public, anon, authenticated;
revoke all on function public.cerebro_creative_complete_v1(uuid,uuid,text,text,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.cerebro_creative_enqueue_v1(jsonb) to service_role;
grant execute on function public.cerebro_creative_lease_v1(text,integer) to service_role;
grant execute on function public.cerebro_creative_complete_v1(uuid,uuid,text,text,jsonb,jsonb,text) to service_role;
