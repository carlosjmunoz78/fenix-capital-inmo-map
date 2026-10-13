-- CEREBRO durable Company Onboarding PREPROD persistence V1
-- Closes COMP_ONB_DURABLE_EXECUTION_REQUIRED using the existing COMP-REG/TENANT durable boundary.
-- Lightweight control-plane state only: no customer payload, no credentials, no heavy logs.
-- Service-role only, PREPROD only, zero additional cost, no PROD or Trading authority.

create table if not exists public.cerebro_company_onboarding_preprod (
  company_id text primary key
    references public.cerebro_company_registry_preprod(company_id),
  run_id text not null unique
    check (btrim(run_id) <> ''),
  engine_id text not null default 'COMP-ONB-001'
    check (engine_id = 'COMP-ONB-001'),
  environment text not null default 'PREPROD'
    check (environment = 'PREPROD'),
  version text not null
    check (btrim(version) <> ''),
  state text not null default 'ONBOARDING_PREPROD_READY'
    check (state = 'ONBOARDING_PREPROD_READY'),
  profile_sha256 text null
    check (profile_sha256 is null or profile_sha256 ~ '^[0-9a-f]{64}$'),
  structural_scaffold_sha256 text not null
    check (structural_scaffold_sha256 ~ '^[0-9a-f]{64}$'),
  canonical_engine_count integer not null default 17
    check (canonical_engine_count = 17),
  next_ready_engine_id text not null default 'SCAN-001'
    check (next_ready_engine_id = 'SCAN-001'),
  tenant_boundary text not null default 'DENY_CROSS_COMPANY'
    check (tenant_boundary = 'DENY_CROSS_COMPANY'),
  downstream_auto_execute boolean not null default false
    check (downstream_auto_execute = false),
  prod_authorized boolean not null default false
    check (prod_authorized = false),
  prod_write_authorized boolean not null default false
    check (prod_write_authorized = false),
  trading_access boolean not null default false
    check (trading_access = false),
  additional_cost_eur numeric(12,2) not null default 0
    check (additional_cost_eur = 0),
  onboarding_idempotency_key text not null unique
    check (btrim(onboarding_idempotency_key) <> ''),
  started_by text not null
    check (btrim(started_by) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cerebro_company_onboarding_preprod enable row level security;
revoke all on table public.cerebro_company_onboarding_preprod from public, anon, authenticated;
grant all on table public.cerebro_company_onboarding_preprod to service_role;

create table if not exists public.cerebro_company_engine_state_preprod (
  company_id text not null
    references public.cerebro_company_onboarding_preprod(company_id),
  engine_id text not null,
  environment text not null default 'PREPROD'
    check (environment = 'PREPROD'),
  version text not null
    check (btrim(version) <> ''),
  stage integer not null
    check (stage between 0 and 16),
  dependencies text[] not null default '{}'::text[],
  state text not null
    check (state in ('BLOCKED','READY','RUNNING','GREEN','HUMAN_REQUIRED')),
  human_required_reason text null
    check (human_required_reason is null or human_required_reason in (
      'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
      'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
    )),
  evidence_sha256 text null
    check (evidence_sha256 is null or evidence_sha256 ~ '^[0-9a-f]{64}$'),
  prod_authorized boolean not null default false
    check (prod_authorized = false),
  prod_write_authorized boolean not null default false
    check (prod_write_authorized = false),
  trading_access boolean not null default false
    check (trading_access = false),
  additional_cost_eur numeric(12,2) not null default 0
    check (additional_cost_eur = 0),
  updated_at timestamptz not null default now(),
  primary key (company_id, engine_id)
);

alter table public.cerebro_company_engine_state_preprod enable row level security;
revoke all on table public.cerebro_company_engine_state_preprod from public, anon, authenticated;
grant all on table public.cerebro_company_engine_state_preprod to service_role;

create table if not exists public.cerebro_company_onboarding_history_preprod (
  event_id bigint generated always as identity primary key,
  company_id text not null
    references public.cerebro_company_onboarding_preprod(company_id),
  run_id text not null,
  event_type text not null
    check (event_type = 'ONBOARDING_STARTED'),
  environment text not null
    check (environment = 'PREPROD'),
  version text not null
    check (btrim(version) <> ''),
  structural_scaffold_sha256 text not null
    check (structural_scaffold_sha256 ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null unique
    check (btrim(idempotency_key) <> ''),
  changed_by text not null
    check (btrim(changed_by) <> ''),
  prod_authorized boolean not null default false check (prod_authorized = false),
  prod_write_authorized boolean not null default false check (prod_write_authorized = false),
  trading_access boolean not null default false check (trading_access = false),
  additional_cost_eur numeric(12,2) not null default 0 check (additional_cost_eur = 0),
  changed_at timestamptz not null default now()
);

alter table public.cerebro_company_onboarding_history_preprod enable row level security;
revoke all on table public.cerebro_company_onboarding_history_preprod from public, anon, authenticated;
grant all on table public.cerebro_company_onboarding_history_preprod to service_role;

create or replace function public.cerebro_company_onboarding_start_preprod(
  p_company_id text,
  p_version text,
  p_profile_sha256 text,
  p_structural_scaffold_sha256 text,
  p_idempotency_key text,
  p_started_by text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company public.cerebro_company_registry_preprod%rowtype;
  v_existing public.cerebro_company_onboarding_preprod%rowtype;
  v_history public.cerebro_company_onboarding_history_preprod%rowtype;
  v_profile_sha256 text := nullif(lower(btrim(coalesce(p_profile_sha256,''))), '');
  v_scaffold_sha256 text := lower(btrim(coalesce(p_structural_scaffold_sha256,'')));
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
  if v_scaffold_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_structural_scaffold_sha256');
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','idempotency_key_required');
  end if;
  if p_started_by is null or btrim(p_started_by) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','started_by_required');
  end if;

  select * into v_company
  from public.cerebro_company_registry_preprod
  where company_id = btrim(p_company_id);

  if not found then
    return jsonb_build_object(
      'ok',false,'status',409,'error','company_registry_precondition_missing',
      'next_gate','COMP_REG_DURABLE_REGISTRATION_REQUIRED',
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  if v_company.environment <> 'PREPROD' or v_company.tenant_boundary <> 'DENY_CROSS_COMPANY'
     or v_company.prod_authorized or v_company.prod_write_authorized or v_company.trading_access
     or v_company.additional_cost_eur <> 0 then
    return jsonb_build_object(
      'ok',false,'status',409,'error','company_registry_safety_precondition_failed',
      'human_required','POLICY_CONFLICT','prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  if v_company.profile_sha256 is distinct from v_profile_sha256 then
    return jsonb_build_object(
      'ok',false,'status',409,'error','profile_hash_mismatch',
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  select * into v_history
  from public.cerebro_company_onboarding_history_preprod
  where idempotency_key = btrim(p_idempotency_key);

  if found then
    if v_history.company_id <> btrim(p_company_id) then
      return jsonb_build_object('ok',false,'status',409,'error','idempotency_scope_conflict');
    end if;
    select * into v_existing
    from public.cerebro_company_onboarding_preprod
    where company_id = btrim(p_company_id);
    return jsonb_build_object(
      'ok',true,'status',200,'idempotent',true,'onboarding',to_jsonb(v_existing),
      'green_engines',jsonb_build_array('TENANT-001','COMP-REG-001','COMP-ONB-001'),
      'next_ready',jsonb_build_array('SCAN-001'),
      'next_gate','SCAN_001_DURABLE_EXECUTION_REQUIRED',
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  select * into v_existing
  from public.cerebro_company_onboarding_preprod
  where company_id = btrim(p_company_id)
  for update;

  if found then
    return jsonb_build_object(
      'ok',false,'status',409,'error','onboarding_already_started',
      'company_id',v_existing.company_id,'run_id',v_existing.run_id,
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
      'trading_access',false,'additional_cost_eur',0
    );
  end if;

  insert into public.cerebro_company_onboarding_preprod(
    company_id,run_id,engine_id,environment,version,state,profile_sha256,
    structural_scaffold_sha256,canonical_engine_count,next_ready_engine_id,
    tenant_boundary,downstream_auto_execute,prod_authorized,prod_write_authorized,
    trading_access,additional_cost_eur,onboarding_idempotency_key,started_by
  ) values (
    btrim(p_company_id),'onb-' || btrim(p_company_id) || '-v1','COMP-ONB-001','PREPROD',btrim(p_version),
    'ONBOARDING_PREPROD_READY',v_profile_sha256,v_scaffold_sha256,17,'SCAN-001',
    'DENY_CROSS_COMPANY',false,false,false,false,0,btrim(p_idempotency_key),left(btrim(p_started_by),200)
  ) returning * into v_existing;

  insert into public.cerebro_company_engine_state_preprod(
    company_id,engine_id,environment,version,stage,dependencies,state,
    prod_authorized,prod_write_authorized,trading_access,additional_cost_eur
  ) values
    (v_existing.company_id,'TENANT-001','PREPROD',v_existing.version,0,array['COMP-REG-001'],'GREEN',false,false,false,0),
    (v_existing.company_id,'COMP-REG-001','PREPROD',v_existing.version,1,array[]::text[],'GREEN',false,false,false,0),
    (v_existing.company_id,'COMP-ONB-001','PREPROD',v_existing.version,2,array['COMP-REG-001'],'GREEN',false,false,false,0),
    (v_existing.company_id,'SCAN-001','PREPROD',v_existing.version,3,array['COMP-ONB-001'],'READY',false,false,false,0),
    (v_existing.company_id,'KW-001','PREPROD',v_existing.version,4,array['SCAN-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'WAUD-001','PREPROD',v_existing.version,5,array['SCAN-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'SOCAUD-001','PREPROD',v_existing.version,6,array['SCAN-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'LOCALP-001','PREPROD',v_existing.version,7,array['SCAN-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'KBOOT-001','PREPROD',v_existing.version,8,array['KW-001','WAUD-001','SOCAUD-001','LOCALP-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'SEOBOOT-001','PREPROD',v_existing.version,9,array['KW-001','WAUD-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'SOCBOOT-001','PREPROD',v_existing.version,10,array['SOCAUD-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'MKTBOOT-001','PREPROD',v_existing.version,11,array['KBOOT-001','SEOBOOT-001','SOCBOOT-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'CRMBOOT-001','PREPROD',v_existing.version,12,array['KBOOT-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'APPBOOT-001','PREPROD',v_existing.version,13,array['KBOOT-001','CRMBOOT-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'AUTBOOT-001','PREPROD',v_existing.version,14,array['CRMBOOT-001','APPBOOT-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'TRNBOOT-001','PREPROD',v_existing.version,15,array['KBOOT-001','AUTBOOT-001'],'BLOCKED',false,false,false,0),
    (v_existing.company_id,'ENGACT-001','PREPROD',v_existing.version,16,array['TENANT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001'],'BLOCKED',false,false,false,0);

  insert into public.cerebro_company_onboarding_history_preprod(
    company_id,run_id,event_type,environment,version,structural_scaffold_sha256,
    idempotency_key,changed_by,prod_authorized,prod_write_authorized,trading_access,additional_cost_eur
  ) values (
    v_existing.company_id,v_existing.run_id,'ONBOARDING_STARTED','PREPROD',v_existing.version,
    v_existing.structural_scaffold_sha256,btrim(p_idempotency_key),left(btrim(p_started_by),200),false,false,false,0
  );

  return jsonb_build_object(
    'ok',true,'status',201,'idempotent',false,'onboarding',to_jsonb(v_existing),
    'green_engines',jsonb_build_array('TENANT-001','COMP-REG-001','COMP-ONB-001'),
    'next_ready',jsonb_build_array('SCAN-001'),
    'next_gate','SCAN_001_DURABLE_EXECUTION_REQUIRED',
    'human_required',false,'prod_authorized',false,'prod_write_authorized',false,
    'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

create or replace function public.cerebro_company_onboarding_get_preprod(
  p_request_company_id text,
  p_target_company_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_guard jsonb;
  v_onboarding public.cerebro_company_onboarding_preprod%rowtype;
begin
  v_guard := public.cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id);
  if coalesce((v_guard->>'allowed')::boolean,false) is not true then
    return v_guard;
  end if;
  select * into v_onboarding
  from public.cerebro_company_onboarding_preprod
  where company_id = btrim(p_target_company_id);
  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','onboarding_not_found');
  end if;
  return jsonb_build_object(
    'ok',true,'status',200,'onboarding',to_jsonb(v_onboarding),
    'next_gate','SCAN_001_DURABLE_EXECUTION_REQUIRED',
    'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

create or replace function public.cerebro_company_engine_states_get_preprod(
  p_request_company_id text,
  p_target_company_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_guard jsonb;
  v_states jsonb;
begin
  v_guard := public.cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id);
  if coalesce((v_guard->>'allowed')::boolean,false) is not true then
    return v_guard;
  end if;
  select jsonb_agg(to_jsonb(s) order by s.stage,s.engine_id)
  into v_states
  from public.cerebro_company_engine_state_preprod s
  where s.company_id = btrim(p_target_company_id);
  if v_states is null then
    return jsonb_build_object('ok',false,'status',404,'error','engine_state_not_found');
  end if;
  return jsonb_build_object(
    'ok',true,'status',200,'company_id',btrim(p_target_company_id),'engine_count',jsonb_array_length(v_states),
    'states',v_states,'next_ready',jsonb_build_array('SCAN-001'),
    'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

revoke all on function public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_company_onboarding_get_preprod(text,text) from public, anon, authenticated;
revoke all on function public.cerebro_company_engine_states_get_preprod(text,text) from public, anon, authenticated;
grant execute on function public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text) to service_role;
grant execute on function public.cerebro_company_onboarding_get_preprod(text,text) to service_role;
grant execute on function public.cerebro_company_engine_states_get_preprod(text,text) to service_role;

comment on table public.cerebro_company_onboarding_preprod is 'PREPROD-only durable COMP-ONB-001 control-plane state. No customer payload or credentials.';
comment on table public.cerebro_company_engine_state_preprod is 'Lightweight PREPROD per-company canonical engine state. Heavy evidence/logs remain outside Supabase.';
comment on table public.cerebro_company_onboarding_history_preprod is 'Minimal append-only PREPROD COMP-ONB-001 audit history.';
comment on function public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text) is 'Idempotent durable COMP-ONB-001 start. Initializes canonical 17-engine state and unlocks SCAN-001 only.';
