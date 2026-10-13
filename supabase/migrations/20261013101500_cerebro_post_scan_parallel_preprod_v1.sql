-- CEREBRO post-SCAN parallel durable execution V1
-- Logical engines: KW-001, WAUD-001, SOCAUD-001, LOCALP-001.
-- Shared runtime/state, no four independent servers. PREPROD only, service-role only, zero additional cost.
-- Raw pages/social/local/keyword evidence remains outside Supabase; only hashes/counts/decision metadata are stored.

create table if not exists public.cerebro_post_scan_audit_run_preprod (
  run_id bigint generated always as identity primary key,
  company_id text not null references public.cerebro_company_onboarding_preprod(company_id),
  engine_id text not null check (engine_id in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001')),
  environment text not null default 'PREPROD' check (environment='PREPROD'),
  version text not null check (btrim(version)<>''),
  evidence_at timestamptz not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  result_sha256 text not null check (result_sha256 ~ '^[0-9a-f]{64}$'),
  item_count integer not null default 0 check (item_count>=0),
  finding_count integer not null default 0 check (finding_count>=0),
  human_required_code text null check (human_required_code is null or human_required_code in (
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  )),
  read_only boolean not null default true check (read_only=true),
  audit_idempotency_key text not null unique check (btrim(audit_idempotency_key)<>''),
  recorded_by text not null check (btrim(recorded_by)<>''),
  prod_authorized boolean not null default false check (prod_authorized=false),
  prod_write_authorized boolean not null default false check (prod_write_authorized=false),
  trading_access boolean not null default false check (trading_access=false),
  additional_cost_eur numeric(12,2) not null default 0 check (additional_cost_eur=0),
  created_at timestamptz not null default now()
);

create index if not exists cerebro_post_scan_audit_run_company_engine_idx
  on public.cerebro_post_scan_audit_run_preprod(company_id,engine_id,evidence_at desc);

alter table public.cerebro_post_scan_audit_run_preprod enable row level security;
revoke all on table public.cerebro_post_scan_audit_run_preprod from public, anon, authenticated;
grant all on table public.cerebro_post_scan_audit_run_preprod to service_role;

create or replace function public.cerebro_post_scan_audit_record_preprod(
  p_company_id text,
  p_engine_id text,
  p_version text,
  p_evidence_at timestamptz,
  p_evidence_sha256 text,
  p_result_sha256 text,
  p_item_count integer,
  p_finding_count integer,
  p_human_required_code text,
  p_idempotency_key text,
  p_recorded_by text
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_engine_id text:=upper(btrim(coalesce(p_engine_id,'')));
  v_human text:=nullif(upper(btrim(coalesce(p_human_required_code,''))), '');
  v_state public.cerebro_company_engine_state_preprod%rowtype;
  v_existing public.cerebro_post_scan_audit_run_preprod%rowtype;
  v_inserted public.cerebro_post_scan_audit_run_preprod%rowtype;
  v_kw text; v_waud text; v_socaud text; v_localp text;
  v_all_green boolean:=false;
  v_next_ready jsonb:='[]'::jsonb;
begin
  if p_company_id is null or btrim(p_company_id)='' then return jsonb_build_object('ok',false,'status',400,'error','invalid_company_id'); end if;
  if v_engine_id not in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001') then return jsonb_build_object('ok',false,'status',400,'error','invalid_engine_id'); end if;
  if p_version is null or btrim(p_version)='' then return jsonb_build_object('ok',false,'status',400,'error','invalid_version'); end if;
  if p_evidence_at is null then return jsonb_build_object('ok',false,'status',400,'error','evidence_at_required'); end if;
  if lower(btrim(coalesce(p_evidence_sha256,''))) !~ '^[0-9a-f]{64}$' or lower(btrim(coalesce(p_result_sha256,''))) !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'status',400,'error','invalid_result_hash'); end if;
  if coalesce(p_item_count,-1)<0 or coalesce(p_finding_count,-1)<0 then return jsonb_build_object('ok',false,'status',400,'error','invalid_counts'); end if;
  if v_human is not null and v_human not in ('LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST') then return jsonb_build_object('ok',false,'status',400,'error','invalid_human_required_code'); end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' then return jsonb_build_object('ok',false,'status',400,'error','idempotency_key_required'); end if;
  if p_recorded_by is null or btrim(p_recorded_by)='' then return jsonb_build_object('ok',false,'status',400,'error','recorded_by_required'); end if;

  select * into v_existing from public.cerebro_post_scan_audit_run_preprod where audit_idempotency_key=btrim(p_idempotency_key);
  if found then
    if v_existing.company_id<>btrim(p_company_id) or v_existing.engine_id<>v_engine_id then return jsonb_build_object('ok',false,'status',409,'error','idempotency_scope_conflict'); end if;
    return jsonb_build_object('ok',true,'status',200,'idempotent',true,'run',to_jsonb(v_existing),'human_required',v_existing.human_required_code,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0);
  end if;

  select * into v_state
  from public.cerebro_company_engine_state_preprod
  where company_id=btrim(p_company_id) and engine_id=v_engine_id
  for update;
  if not found then return jsonb_build_object('ok',false,'status',409,'error','engine_state_missing','next_gate','SCAN_001_DURABLE_EXECUTION_REQUIRED','human_required',false); end if;
  if v_state.environment<>'PREPROD' or v_state.state not in ('READY','GREEN','HUMAN_REQUIRED') or v_state.prod_authorized or v_state.prod_write_authorized or v_state.trading_access or v_state.additional_cost_eur<>0 then
    return jsonb_build_object('ok',false,'status',409,'error','engine_precondition_failed','engine_id',v_engine_id,'current_state',v_state.state,'human_required','POLICY_CONFLICT','prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0);
  end if;

  insert into public.cerebro_post_scan_audit_run_preprod(
    company_id,engine_id,environment,version,evidence_at,evidence_sha256,result_sha256,item_count,finding_count,human_required_code,
    read_only,audit_idempotency_key,recorded_by,prod_authorized,prod_write_authorized,trading_access,additional_cost_eur
  ) values (
    btrim(p_company_id),v_engine_id,'PREPROD',btrim(p_version),p_evidence_at,lower(btrim(p_evidence_sha256)),lower(btrim(p_result_sha256)),
    p_item_count,p_finding_count,v_human,true,btrim(p_idempotency_key),left(btrim(p_recorded_by),200),false,false,false,0
  ) returning * into v_inserted;

  if v_human is null then
    update public.cerebro_company_engine_state_preprod
    set state='GREEN',human_required_reason=null,evidence_sha256=v_inserted.evidence_sha256,updated_at=now()
    where company_id=v_inserted.company_id and engine_id=v_engine_id;
  else
    update public.cerebro_company_engine_state_preprod
    set state='HUMAN_REQUIRED',human_required_reason=v_human,evidence_sha256=v_inserted.evidence_sha256,updated_at=now()
    where company_id=v_inserted.company_id and engine_id=v_engine_id;
  end if;

  select state into v_kw from public.cerebro_company_engine_state_preprod where company_id=v_inserted.company_id and engine_id='KW-001';
  select state into v_waud from public.cerebro_company_engine_state_preprod where company_id=v_inserted.company_id and engine_id='WAUD-001';
  select state into v_socaud from public.cerebro_company_engine_state_preprod where company_id=v_inserted.company_id and engine_id='SOCAUD-001';
  select state into v_localp from public.cerebro_company_engine_state_preprod where company_id=v_inserted.company_id and engine_id='LOCALP-001';

  if v_kw='GREEN' and v_waud='GREEN' then
    update public.cerebro_company_engine_state_preprod set state='READY',updated_at=now()
    where company_id=v_inserted.company_id and engine_id='SEOBOOT-001' and state='BLOCKED';
  end if;
  if v_socaud='GREEN' then
    update public.cerebro_company_engine_state_preprod set state='READY',updated_at=now()
    where company_id=v_inserted.company_id and engine_id='SOCBOOT-001' and state='BLOCKED';
  end if;
  v_all_green:=(v_kw='GREEN' and v_waud='GREEN' and v_socaud='GREEN' and v_localp='GREEN');
  if v_all_green then
    update public.cerebro_company_engine_state_preprod set state='READY',updated_at=now()
    where company_id=v_inserted.company_id and engine_id='KBOOT-001' and state='BLOCKED';
  end if;

  select coalesce(jsonb_agg(engine_id order by stage),'[]'::jsonb) into v_next_ready
  from public.cerebro_company_engine_state_preprod
  where company_id=v_inserted.company_id and state='READY';

  return jsonb_build_object(
    'ok',true,'status',case when v_human is null then 201 else 202 end,'idempotent',false,'run',to_jsonb(v_inserted),
    'engine_state',case when v_human is null then 'GREEN' else 'HUMAN_REQUIRED' end,
    'parallel_states',jsonb_build_object('KW-001',v_kw,'WAUD-001',v_waud,'SOCAUD-001',v_socaud,'LOCALP-001',v_localp),
    'all_parallel_green',v_all_green,'next_ready',v_next_ready,
    'next_gate',case when v_all_green then 'BOOTSTRAP_TIER_DURABLE_EXECUTION_REQUIRED' else 'POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED' end,
    'human_required',v_human,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

create or replace function public.cerebro_post_scan_parallel_status_preprod(
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
  v_states jsonb;
  v_runs jsonb;
  v_all_green boolean;
begin
  v_guard:=public.cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id);
  if coalesce((v_guard->>'allowed')::boolean,false) is not true then return v_guard; end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.stage),'[]'::jsonb) into v_states
  from public.cerebro_company_engine_state_preprod s
  where s.company_id=btrim(p_target_company_id) and s.engine_id in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001','KBOOT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','ENGACT-001');
  select coalesce(jsonb_agg(to_jsonb(r) order by r.run_id),'[]'::jsonb) into v_runs
  from public.cerebro_post_scan_audit_run_preprod r where r.company_id=btrim(p_target_company_id);
  select count(*)=4 into v_all_green from public.cerebro_company_engine_state_preprod
  where company_id=btrim(p_target_company_id) and engine_id in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001') and state='GREEN';
  return jsonb_build_object(
    'ok',true,'status',200,'company_id',btrim(p_target_company_id),'all_parallel_green',v_all_green,
    'states',v_states,'runs',v_runs,
    'next_gate',case when v_all_green then 'BOOTSTRAP_TIER_DURABLE_EXECUTION_REQUIRED' else 'POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED' end,
    'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0
  );
end;
$$;

revoke all on function public.cerebro_post_scan_audit_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_post_scan_parallel_status_preprod(text,text) from public, anon, authenticated;
grant execute on function public.cerebro_post_scan_audit_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text) to service_role;
grant execute on function public.cerebro_post_scan_parallel_status_preprod(text,text) to service_role;

comment on table public.cerebro_post_scan_audit_run_preprod is 'Shared lightweight PREPROD receipts for KW/WAUD/SOCAUD/LOCALP. Raw evidence stays outside Supabase.';
comment on function public.cerebro_post_scan_audit_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text) is 'Records one governed post-SCAN engine result; unlocks canonical bootstrap dependencies only when their prerequisites are GREEN.';
