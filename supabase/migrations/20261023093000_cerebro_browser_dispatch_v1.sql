create or replace function public.cerebro_browser_payload_has_secret_key_v1(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare k text; v jsonb;
begin
  if p_value is null then return false; end if;
  if jsonb_typeof(p_value) = 'object' then
    for k, v in select * from jsonb_each(p_value) loop
      if lower(k) = any(array['password','passwd','secret','secret_value','token','access_token','refresh_token','id_token','cookie','cookies','storage_state','storagestate','session_bundle','sessionbundle','authorization']) then return true; end if;
      if public.cerebro_browser_payload_has_secret_key_v1(v) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v in select value from jsonb_array_elements(p_value) loop
      if public.cerebro_browser_payload_has_secret_key_v1(v) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

create table if not exists public.cerebro_browser_job_v1 (
  job_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  company_id text not null,
  engine_id text not null,
  department_id text not null,
  environment text not null check (environment in ('LAB','PREPROD','PROD')),
  version text not null default 'v1',
  mode text not null check (mode in ('OBSERVE','MUTATE')),
  identity_id text,
  account_id text,
  credential_ref_id text,
  target_url text not null,
  commands jsonb not null check (jsonb_typeof(commands)='array' and jsonb_array_length(commands)>0),
  authority jsonb not null default '{}'::jsonb,
  status text not null default 'QUEUED' check (status in ('QUEUED','LEASED','SUCCEEDED','FAILED','HOLD')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_id uuid,
  leased_by text,
  lease_expires_at timestamptz,
  result_summary jsonb,
  error_code text,
  audit_id text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint cerebro_browser_job_v1_no_secret_commands check (not public.cerebro_browser_payload_has_secret_key_v1(commands)),
  constraint cerebro_browser_job_v1_no_secret_authority check (not public.cerebro_browser_payload_has_secret_key_v1(authority)),
  constraint cerebro_browser_job_v1_no_secret_result check (result_summary is null or not public.cerebro_browser_payload_has_secret_key_v1(result_summary))
);
comment on table public.cerebro_browser_job_v1 is 'CEREBRO Browser 1 lightweight dispatch receipts/jobs. Never stores raw credentials, cookies, session bundles or browser-heavy evidence.';
alter table public.cerebro_browser_job_v1 enable row level security;
revoke all on public.cerebro_browser_job_v1 from anon, authenticated;
grant select, insert, update on public.cerebro_browser_job_v1 to service_role;
create index if not exists cerebro_browser_job_v1_status_created_idx on public.cerebro_browser_job_v1(status, created_at);
create index if not exists cerebro_browser_job_v1_lease_expiry_idx on public.cerebro_browser_job_v1(lease_expires_at) where status='LEASED';

create table if not exists public.cerebro_credential_binding_v1 (
  credential_ref_id text primary key,
  company_id text not null,
  identity_id text not null,
  account_id text not null,
  provider text not null,
  vault_secret_name text not null unique,
  allowed_environments text[] not null default '{}',
  allowed_origins text[] not null default '{}',
  allowed_capabilities text[] not null default '{}',
  active boolean not null default true,
  rotation_state text not null default 'POR_AUDITAR',
  revocation_state text not null default 'ACTIVE_OWNER_CONTROLLED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.cerebro_credential_binding_v1 is 'Alias-only binding from CEREBRO identity/account to Supabase Vault secret name. Contains no secret values.';
alter table public.cerebro_credential_binding_v1 enable row level security;
revoke all on public.cerebro_credential_binding_v1 from anon, authenticated;
grant select, insert, update on public.cerebro_credential_binding_v1 to service_role;

create or replace function public.cerebro_browser_enqueue_v1(
  p_idempotency_key text,p_company_id text,p_engine_id text,p_department_id text,p_environment text,p_version text,p_mode text,
  p_identity_id text,p_account_id text,p_credential_ref_id text,p_target_url text,p_commands jsonb,p_authority jsonb,p_audit_id text,p_created_by text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_row public.cerebro_browser_job_v1%rowtype;
begin
  if public.cerebro_browser_payload_has_secret_key_v1(p_commands) or public.cerebro_browser_payload_has_secret_key_v1(coalesce(p_authority,'{}'::jsonb)) then raise exception 'RAW_SECRET_FIELD_FORBIDDEN'; end if;
  insert into public.cerebro_browser_job_v1(idempotency_key,company_id,engine_id,department_id,environment,version,mode,identity_id,account_id,credential_ref_id,target_url,commands,authority,audit_id,created_by)
  values(p_idempotency_key,p_company_id,p_engine_id,p_department_id,p_environment,coalesce(nullif(p_version,''),'v1'),p_mode,nullif(p_identity_id,''),nullif(p_account_id,''),nullif(p_credential_ref_id,''),p_target_url,p_commands,coalesce(p_authority,'{}'::jsonb),p_audit_id,p_created_by)
  on conflict (idempotency_key) do nothing;
  select * into v_row from public.cerebro_browser_job_v1 where idempotency_key=p_idempotency_key;
  return jsonb_build_object('ok',true,'job_id',v_row.job_id,'status',v_row.status);
end;
$$;

create or replace function public.cerebro_browser_lease_v1(p_worker_id text, p_lease_seconds integer default 300)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_job public.cerebro_browser_job_v1%rowtype; v_lease uuid := gen_random_uuid();
begin
  if p_lease_seconds < 30 or p_lease_seconds > 1800 then raise exception 'INVALID_LEASE_SECONDS'; end if;
  with candidate as (
    select job_id from public.cerebro_browser_job_v1
    where status='QUEUED' or (status='LEASED' and lease_expires_at < now())
    order by created_at for update skip locked limit 1
  )
  update public.cerebro_browser_job_v1 j set status='LEASED',lease_id=v_lease,leased_by=p_worker_id,lease_expires_at=now()+make_interval(secs=>p_lease_seconds),attempt_count=j.attempt_count+1,updated_at=now(),error_code=null
  from candidate c where j.job_id=c.job_id returning j.* into v_job;
  if v_job.job_id is null then return jsonb_build_object('ok',true,'job',null); end if;
  return jsonb_build_object('ok',true,'job',to_jsonb(v_job));
end;
$$;

create or replace function public.cerebro_browser_complete_v1(p_job_id uuid,p_lease_id uuid,p_status text,p_result_summary jsonb default null,p_error_code text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if p_status not in ('SUCCEEDED','FAILED','HOLD') then raise exception 'INVALID_COMPLETION_STATUS'; end if;
  if p_result_summary is not null and public.cerebro_browser_payload_has_secret_key_v1(p_result_summary) then raise exception 'RAW_SECRET_FIELD_FORBIDDEN'; end if;
  update public.cerebro_browser_job_v1 set status=p_status,result_summary=p_result_summary,error_code=nullif(p_error_code,''),completed_at=now(),updated_at=now(),lease_expires_at=null
  where job_id=p_job_id and lease_id=p_lease_id and status='LEASED';
  get diagnostics v_count = row_count;
  if v_count <> 1 then return jsonb_build_object('ok',false,'error','LEASE_MISMATCH'); end if;
  return jsonb_build_object('ok',true,'job_id',p_job_id,'status',p_status);
end;
$$;

create or replace function public.cerebro_browser_credential_presence_v1(p_credential_ref_id text,p_company_id text,p_environment text,p_origin text,p_capability text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_binding public.cerebro_credential_binding_v1%rowtype; v_exists boolean := false;
begin
  select * into v_binding from public.cerebro_credential_binding_v1 where credential_ref_id=p_credential_ref_id and active=true;
  if v_binding.credential_ref_id is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_BINDING_NOT_FOUND'); end if;
  if v_binding.company_id <> p_company_id then return jsonb_build_object('ok',false,'error','CROSS_COMPANY_CREDENTIAL_DENIED'); end if;
  if not (p_environment = any(v_binding.allowed_environments)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_ENVIRONMENT_DENIED'); end if;
  if cardinality(v_binding.allowed_origins)>0 and not (p_origin = any(v_binding.allowed_origins)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_ORIGIN_DENIED'); end if;
  if cardinality(v_binding.allowed_capabilities)>0 and not (p_capability = any(v_binding.allowed_capabilities)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_CAPABILITY_DENIED'); end if;
  select exists(select 1 from vault.secrets where name=v_binding.vault_secret_name) into v_exists;
  return jsonb_build_object('ok',v_exists,'available',v_exists,'credential_ref_id',v_binding.credential_ref_id,'identity_id',v_binding.identity_id,'account_id',v_binding.account_id,'provider',v_binding.provider,'secret_material_exposed',false);
end;
$$;

revoke all on function public.cerebro_browser_enqueue_v1(text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_lease_v1(text,integer) from public, anon, authenticated;
revoke all on function public.cerebro_browser_complete_v1(uuid,uuid,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_credential_presence_v1(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.cerebro_browser_enqueue_v1(text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb,text,text) to service_role;
grant execute on function public.cerebro_browser_lease_v1(text,integer) to service_role;
grant execute on function public.cerebro_browser_complete_v1(uuid,uuid,text,jsonb,text) to service_role;
grant execute on function public.cerebro_browser_credential_presence_v1(text,text,text,text,text) to service_role;