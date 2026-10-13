-- CEREBRO SCAN-001 durable PREPROD persistence V1
-- Lightweight control-plane receipt only. Raw page bodies, URLs, social profiles and heavy evidence remain outside Supabase.
-- Requires durable COMP-ONB state from 20261013083000. Service-role only; no PROD/Trading authority.

create table if not exists public.cerebro_scan001_run_preprod (
  run_id bigint generated always as identity primary key,
  company_id text not null references public.cerebro_company_onboarding_preprod(company_id),
  engine_id text not null default 'SCAN-001' check (engine_id='SCAN-001'),
  environment text not null default 'PREPROD' check (environment='PREPROD'),
  version text not null check (btrim(version)<>''),
  domain text not null check (domain ~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'),
  evidence_at timestamptz not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  result_sha256 text not null check (result_sha256 ~ '^[0-9a-f]{64}$'),
  root_status integer not null check (root_status between 100 and 599),
  robots_available boolean not null,
  sitemap_available boolean not null,
  technology_count integer not null check (technology_count>=0),
  social_network_count integer not null check (social_network_count>=0),
  internal_link_count integer not null check (internal_link_count>=0),
  external_link_count integer not null check (external_link_count>=0),
  read_only boolean not null default true check (read_only=true),
  scan_idempotency_key text not null unique check (btrim(scan_idempotency_key)<>''),
  recorded_by text not null check (btrim(recorded_by)<>''),
  prod_authorized boolean not null default false check (prod_authorized=false),
  prod_write_authorized boolean not null default false check (prod_write_authorized=false),
  trading_access boolean not null default false check (trading_access=false),
  additional_cost_eur numeric(12,2) not null default 0 check (additional_cost_eur=0),
  created_at timestamptz not null default now()
);

create index if not exists cerebro_scan001_run_preprod_company_evidence_idx
  on public.cerebro_scan001_run_preprod(company_id,evidence_at desc);

alter table public.cerebro_scan001_run_preprod enable row level security;
revoke all on table public.cerebro_scan001_run_preprod from public, anon, authenticated;
grant all on table public.cerebro_scan001_run_preprod to service_role;

create or replace function public.cerebro_scan001_record_success_preprod(
  p_company_id text,
  p_version text,
  p_domain text,
  p_evidence_at timestamptz,
  p_evidence_sha256 text,
  p_result_sha256 text,
  p_root_status integer,
  p_robots_available boolean,
  p_sitemap_available boolean,
  p_technology_count integer,
  p_social_network_count integer,
  p_internal_link_count integer,
  p_external_link_count integer,
  p_idempotency_key text,
  p_recorded_by text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_state public.cerebro_company_engine_state_preprod%rowtype;
  v_existing public.cerebro_scan001_run_preprod%rowtype;
  v_inserted public.cerebro_scan001_run_preprod%rowtype;
  v_domain text:=lower(btrim(coalesce(p_domain,'')));
begin
  if p_company_id is null or btrim(p_company_id)='' then return jsonb_build_object('ok',false,'status',400,'error','invalid_company_id'); end if;
  if p_version is null or btrim(p_version)='' then return jsonb_build_object('ok',false,'status',400,'error','invalid_version'); end if;
  if v_domain !~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then return jsonb_build_object('ok',false,'status',400,'error','invalid_public_domain'); end if;
  if p_evidence_at is null then return jsonb_build_object('ok',false,'status',400,'error','evidence_at_required'); end if;
  if lower(btrim(coalesce(p_evidence_sha256,''))) !~ '^[0-9a-f]{64}$' or lower(btrim(coalesce(p_result_sha256,''))) !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'status',400,'error','invalid_scan_hash'); end if;
  if p_root_status is null or p_root_status<100 or p_root_status>599 then return jsonb_build_object('ok',false,'status',400,'error','invalid_root_status'); end if;
  if coalesce(p_technology_count,-1)<0 or coalesce(p_social_network_count,-1)<0 or coalesce(p_internal_link_count,-1)<0 or coalesce(p_external_link_count,-1)<0 then return jsonb_build_object('ok',false,'status',400,'error','invalid_scan_counts'); end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' then return jsonb_build_object('ok',false,'status',400,'error','idempotency_key_required'); end if;
  if p_recorded_by is null or btrim(p_recorded_by)='' then return jsonb_build_object('ok',false,'status',400,'error','recorded_by_required'); end if;

  select * into v_existing from public.cerebro_scan001_run_preprod where scan_idempotency_key=btrim(p_idempotency_key);
  if found then
    if v_existing.company_id<>btrim(p_company_id) then return jsonb_build_object('ok',false,'status',409,'error','idempotency_scope_conflict'); end if;
    return jsonb_build_object(
      'ok',true,'status',200,'idempotent',true,'scan',to_jsonb(v_existing),
      'next_ready',jsonb_build_array('KW-001','WAUD-001','SOCAUD-001','LOCALP-001'),
      'next_gate','POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED',
      'human_required',false,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
    );
  end if;

  select * into v_state
  from public.cerebro_company_engine_state_preprod
  where company_id=btrim(p_company_id) and engine_id='SCAN-001'
  for update;
  if not found then
    return jsonb_build_object('ok',false,'status',409,'error','scan_engine_state_missing','next_gate','COMP_ONB_DURABLE_EXECUTION_REQUIRED','human_required',false);
  end if;
  if v_state.environment<>'PREPROD' or v_state.state not in ('READY','GREEN') or v_state.prod_authorized or v_state.prod_write_authorized or v_state.trading_access or v_state.additional_cost_eur<>0 then
    return jsonb_build_object(
      'ok',false,'status',409,'error','scan_engine_precondition_failed','current_state',v_state.state,
      'human_required','POLICY_CONFLICT','prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
    );
  end if;

  insert into public.cerebro_scan001_run_preprod(
    company_id,engine_id,environment,version,domain,evidence_at,evidence_sha256,result_sha256,root_status,
    robots_available,sitemap_available,technology_count,social_network_count,internal_link_count,external_link_count,
    read_only,scan_idempotency_key,recorded_by,prod_authorized,prod_write_authorized,trading_access,additional_cost_eur
  ) values (
    btrim(p_company_id),'SCAN-001','PREPROD',btrim(p_version),v_domain,p_evidence_at,
    lower(btrim(p_evidence_sha256)),lower(btrim(p_result_sha256)),p_root_status,
    p_robots_available,p_sitemap_available,p_technology_count,p_social_network_count,p_internal_link_count,p_external_link_count,
    true,btrim(p_idempotency_key),left(btrim(p_recorded_by),200),false,false,false,0
  ) returning * into v_inserted;

  update public.cerebro_company_engine_state_preprod
  set state='GREEN',evidence_sha256=v_inserted.evidence_sha256,updated_at=now()
  where company_id=v_inserted.company_id and engine_id='SCAN-001' and state in ('READY','GREEN');

  update public.cerebro_company_engine_state_preprod
  set state='READY',updated_at=now()
  where company_id=v_inserted.company_id
    and engine_id in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001')
    and state='BLOCKED';

  return jsonb_build_object(
    'ok',true,'status',201,'idempotent',false,'scan',to_jsonb(v_inserted),
    'green_engines',jsonb_build_array('TENANT-001','COMP-REG-001','COMP-ONB-001','SCAN-001'),
    'next_ready',jsonb_build_array('KW-001','WAUD-001','SOCAUD-001','LOCALP-001'),
    'next_gate','POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED',
    'human_required',false,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

create or replace function public.cerebro_scan001_latest_get_preprod(
  p_request_company_id text,
  p_target_company_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_guard jsonb;
  v_scan public.cerebro_scan001_run_preprod%rowtype;
begin
  v_guard:=public.cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id);
  if coalesce((v_guard->>'allowed')::boolean,false) is not true then return v_guard; end if;
  select * into v_scan from public.cerebro_scan001_run_preprod where company_id=btrim(p_target_company_id) order by evidence_at desc,run_id desc limit 1;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','scan_not_found'); end if;
  return jsonb_build_object(
    'ok',true,'status',200,'scan',to_jsonb(v_scan),
    'next_ready',jsonb_build_array('KW-001','WAUD-001','SOCAUD-001','LOCALP-001'),
    'next_gate','POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED',
    'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

revoke all on function public.cerebro_scan001_record_success_preprod(text,text,text,timestamptz,text,text,integer,boolean,boolean,integer,integer,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_scan001_latest_get_preprod(text,text) from public, anon, authenticated;
grant execute on function public.cerebro_scan001_record_success_preprod(text,text,text,timestamptz,text,text,integer,boolean,boolean,integer,integer,integer,integer,text,text) to service_role;
grant execute on function public.cerebro_scan001_latest_get_preprod(text,text) to service_role;

comment on table public.cerebro_scan001_run_preprod is 'Lightweight PREPROD SCAN-001 receipts only. Raw scan evidence remains outside Supabase.';
comment on function public.cerebro_scan001_record_success_preprod(text,text,text,timestamptz,text,text,integer,boolean,boolean,integer,integer,integer,integer,text,text) is 'Records one read-only SCAN-001 result and unlocks the four canonical post-scan engines without executing them.';
