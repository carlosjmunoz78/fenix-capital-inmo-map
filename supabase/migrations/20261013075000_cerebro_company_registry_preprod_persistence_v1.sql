-- CEREBRO durable Company Registry PREPROD persistence V1
-- Additive-only PREPROD control-plane state for COMP-REG-001 / TENANT-001.
-- No App/CRM tables are changed. No customer profile payload is persisted: only profile_sha256.
-- Service-role only. Cross-company access is fail-closed. PROD/Trading authority remains false.

create table if not exists public.cerebro_company_registry_preprod (
  company_id text primary key
    check (company_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$'),
  environment text not null default 'PREPROD'
    check (environment = 'PREPROD'),
  version text not null
    check (btrim(version) <> ''),
  state text not null default 'REGISTERED_PREPROD'
    check (state = 'REGISTERED_PREPROD'),
  profile_sha256 text null
    check (profile_sha256 is null or profile_sha256 ~ '^[0-9a-f]{64}$'),
  tenant_boundary text not null default 'DENY_CROSS_COMPANY'
    check (tenant_boundary = 'DENY_CROSS_COMPANY'),
  prod_authorized boolean not null default false
    check (prod_authorized = false),
  prod_write_authorized boolean not null default false
    check (prod_write_authorized = false),
  trading_access boolean not null default false
    check (trading_access = false),
  additional_cost_eur numeric(12,2) not null default 0
    check (additional_cost_eur = 0),
  registration_idempotency_key text not null unique
    check (btrim(registration_idempotency_key) <> ''),
  registered_by text not null
    check (btrim(registered_by) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cerebro_company_registry_preprod enable row level security;
revoke all on table public.cerebro_company_registry_preprod from public, anon, authenticated;
grant all on table public.cerebro_company_registry_preprod to service_role;

create table if not exists public.cerebro_company_registry_history_preprod (
  event_id bigint generated always as identity primary key,
  company_id text not null references public.cerebro_company_registry_preprod(company_id),
  event_type text not null check (event_type = 'REGISTERED'),
  environment text not null check (environment = 'PREPROD'),
  version text not null check (btrim(version) <> ''),
  profile_sha256 text null check (profile_sha256 is null or profile_sha256 ~ '^[0-9a-f]{64}$'),
  tenant_boundary text not null check (tenant_boundary = 'DENY_CROSS_COMPANY'),
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  changed_by text not null check (btrim(changed_by) <> ''),
  prod_authorized boolean not null default false check (prod_authorized = false),
  prod_write_authorized boolean not null default false check (prod_write_authorized = false),
  trading_access boolean not null default false check (trading_access = false),
  additional_cost_eur numeric(12,2) not null default 0 check (additional_cost_eur = 0),
  changed_at timestamptz not null default now()
);

alter table public.cerebro_company_registry_history_preprod enable row level security;
revoke all on table public.cerebro_company_registry_history_preprod from public, anon, authenticated;
grant all on table public.cerebro_company_registry_history_preprod to service_role;

create or replace function public.cerebro_company_register_preprod(
  p_company_id text,
  p_version text,
  p_profile_sha256 text,
  p_idempotency_key text,
  p_registered_by text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.cerebro_company_registry_preprod%rowtype;
  v_history public.cerebro_company_registry_history_preprod%rowtype;
  v_profile_sha256 text := nullif(lower(btrim(coalesce(p_profile_sha256,''))), '');
begin
  if p_company_id is null or btrim(p_company_id) !~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_company_id');
  end if;
  if p_version is null or btrim(p_version) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_version');
  end if;
  if v_profile_sha256 is not null and v_profile_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_profile_sha256');
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','idempotency_key_required');
  end if;
  if p_registered_by is null or btrim(p_registered_by) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','registered_by_required');
  end if;

  select * into v_history
  from public.cerebro_company_registry_history_preprod
  where idempotency_key = p_idempotency_key;

  if found then
    if v_history.company_id <> btrim(p_company_id) then
      return jsonb_build_object('ok',false,'status',409,'error','idempotency_scope_conflict');
    end if;
    select * into v_existing
    from public.cerebro_company_registry_preprod
    where company_id = btrim(p_company_id);
    return jsonb_build_object(
      'ok',true,'status',200,'idempotent',true,'company',to_jsonb(v_existing),
      'next_gate','COMP_ONB_DURABLE_EXECUTION_REQUIRED',
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  select * into v_existing
  from public.cerebro_company_registry_preprod
  where company_id = btrim(p_company_id)
  for update;

  if found then
    return jsonb_build_object(
      'ok',false,'status',409,'error','company_already_registered',
      'company_id',v_existing.company_id,
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  insert into public.cerebro_company_registry_preprod(
    company_id,environment,version,state,profile_sha256,tenant_boundary,
    prod_authorized,prod_write_authorized,trading_access,additional_cost_eur,
    registration_idempotency_key,registered_by
  ) values (
    btrim(p_company_id),'PREPROD',btrim(p_version),'REGISTERED_PREPROD',v_profile_sha256,'DENY_CROSS_COMPANY',
    false,false,false,0,btrim(p_idempotency_key),left(btrim(p_registered_by),200)
  ) returning * into v_existing;

  insert into public.cerebro_company_registry_history_preprod(
    company_id,event_type,environment,version,profile_sha256,tenant_boundary,
    idempotency_key,changed_by,prod_authorized,prod_write_authorized,trading_access,additional_cost_eur
  ) values (
    v_existing.company_id,'REGISTERED','PREPROD',v_existing.version,v_existing.profile_sha256,'DENY_CROSS_COMPANY',
    btrim(p_idempotency_key),left(btrim(p_registered_by),200),false,false,false,0
  );

  return jsonb_build_object(
    'ok',true,'status',201,'idempotent',false,'company',to_jsonb(v_existing),
    'next_gate','COMP_ONB_DURABLE_EXECUTION_REQUIRED',
    'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
    'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

create or replace function public.cerebro_company_registry_get_preprod(
  p_company_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company public.cerebro_company_registry_preprod%rowtype;
begin
  if p_company_id is null or btrim(p_company_id) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_company_id');
  end if;
  select * into v_company
  from public.cerebro_company_registry_preprod
  where company_id = btrim(p_company_id);
  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','company_not_found');
  end if;
  return jsonb_build_object(
    'ok',true,'status',200,'company',to_jsonb(v_company),
    'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

create or replace function public.cerebro_company_tenant_boundary_check_preprod(
  p_request_company_id text,
  p_target_company_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_exists boolean;
begin
  if p_request_company_id is null or btrim(p_request_company_id) = ''
     or p_target_company_id is null or btrim(p_target_company_id) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_company_scope','allowed',false);
  end if;
  if btrim(p_request_company_id) <> btrim(p_target_company_id) then
    return jsonb_build_object(
      'ok',false,'status',403,'error','cross_company_access_denied','allowed',false,
      'tenant_boundary','DENY_CROSS_COMPANY','human_required',false,
      'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
    );
  end if;
  select exists(
    select 1 from public.cerebro_company_registry_preprod where company_id=btrim(p_request_company_id)
  ) into v_exists;
  if not v_exists then
    return jsonb_build_object('ok',false,'status',404,'error','company_not_found','allowed',false);
  end if;
  return jsonb_build_object(
    'ok',true,'status',200,'allowed',true,'company_id',btrim(p_request_company_id),
    'tenant_boundary','DENY_CROSS_COMPANY','human_required',false,
    'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

revoke all on function public.cerebro_company_register_preprod(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_company_registry_get_preprod(text) from public, anon, authenticated;
revoke all on function public.cerebro_company_tenant_boundary_check_preprod(text,text) from public, anon, authenticated;
grant execute on function public.cerebro_company_register_preprod(text,text,text,text,text) to service_role;
grant execute on function public.cerebro_company_registry_get_preprod(text) to service_role;
grant execute on function public.cerebro_company_tenant_boundary_check_preprod(text,text) to service_role;

comment on table public.cerebro_company_registry_preprod is 'PREPROD-only durable Company Registry control-plane state. Stores no raw company profile/customer payload; service-role only.';
comment on table public.cerebro_company_registry_history_preprod is 'Append-only PREPROD Company Registry registration audit. Service-role only.';
comment on function public.cerebro_company_register_preprod(text,text,text,text,text) is 'Idempotent PREPROD-only COMP-REG-001 durable registration. No PROD/Trading authority.';
comment on function public.cerebro_company_tenant_boundary_check_preprod(text,text) is 'Fail-closed PREPROD tenant boundary: only same-company scope may pass.';
