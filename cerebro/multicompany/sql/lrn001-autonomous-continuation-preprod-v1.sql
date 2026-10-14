-- CEREBRO LRN-001 multi-company autonomous continuation PREPROD V1
-- Lightweight control-plane receipts only. No raw learning/customer payloads, canonical knowledge, PROD writes or Trading data.

create table if not exists public.cerebro_lrn001_continuation_preprod (
  receipt_id bigint generated always as identity primary key,
  company_id text not null references public.cerebro_company_onboarding_preprod(company_id),
  engine_id text not null default 'LRN-001' check (engine_id='LRN-001'),
  environment text not null default 'PREPROD' check (environment='PREPROD'),
  version text not null check (btrim(version)<>''),
  evidence_at timestamptz not null,
  event_count integer not null check (event_count>0 and event_count<=100),
  event_digest text not null check (event_digest ~ '^[0-9a-f]{64}$'),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  result_sha256 text not null check (result_sha256 ~ '^[0-9a-f]{64}$'),
  continuation_state text not null check (continuation_state in ('PENDING_CONTROLLED_EVALUATION','PREPROD_CONTINUATION_ELIGIBLE','REJECTED_BY_HARD_GATES','REJECTED_NOT_NEW_BETTER','REJECTED_SCORE_REGRESSION','HUMAN_REQUIRED')),
  old_score numeric(12,6) null,
  new_score numeric(12,6) null,
  hard_gates_green boolean not null default false,
  tribunal_verdict text null check (tribunal_verdict is null or tribunal_verdict in ('NEW_BETTER','OLD_BETTER','EQUIVALENT','REJECTED','HOLD')),
  evaluation_ref text null,
  tribunal_ref text null,
  rollback_ref text null,
  human_required_code text null check (human_required_code is null or human_required_code in ('LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST')),
  canonical_knowledge_write_authorized boolean not null default false check (canonical_knowledge_write_authorized=false),
  publish_authorized boolean not null default false check (publish_authorized=false),
  lrn_idempotency_key text not null unique check (btrim(lrn_idempotency_key)<>''),
  recorded_by text not null check (btrim(recorded_by)<>''),
  prod_authorized boolean not null default false check (prod_authorized=false),
  prod_write_authorized boolean not null default false check (prod_write_authorized=false),
  trading_access boolean not null default false check (trading_access=false),
  additional_cost_eur numeric(12,2) not null default 0 check (additional_cost_eur=0),
  created_at timestamptz not null default now()
);
create index if not exists cerebro_lrn001_company_evidence_idx on public.cerebro_lrn001_continuation_preprod(company_id,evidence_at desc);
alter table public.cerebro_lrn001_continuation_preprod enable row level security;
revoke all on table public.cerebro_lrn001_continuation_preprod from public, anon, authenticated;
grant all on table public.cerebro_lrn001_continuation_preprod to service_role;

create or replace function public.cerebro_lrn001_record_preprod(
  p_company_id text,p_version text,p_evidence_at timestamptz,p_event_count integer,p_event_digest text,p_evidence_sha256 text,p_result_sha256 text,
  p_continuation_state text,p_old_score numeric,p_new_score numeric,p_hard_gates_green boolean,p_tribunal_verdict text,
  p_evaluation_ref text,p_tribunal_ref text,p_rollback_ref text,p_human_required_code text,p_idempotency_key text,p_recorded_by text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_company text:=btrim(coalesce(p_company_id,''));
  v_state text:=upper(btrim(coalesce(p_continuation_state,'')));
  v_verdict text:=nullif(upper(btrim(coalesce(p_tribunal_verdict,''))),'');
  v_human text:=nullif(upper(btrim(coalesce(p_human_required_code,''))),'');
  v_green_count integer:=0;
  v_existing public.cerebro_lrn001_continuation_preprod%rowtype;
  v_inserted public.cerebro_lrn001_continuation_preprod%rowtype;
  v_next_gate text;
begin
  if v_company='' then return jsonb_build_object('ok',false,'status',400,'error','invalid_company_id'); end if;
  if p_version is null or btrim(p_version)='' or p_evidence_at is null then return jsonb_build_object('ok',false,'status',400,'error','invalid_version_or_evidence_at'); end if;
  if coalesce(p_event_count,0)<1 or p_event_count>100 then return jsonb_build_object('ok',false,'status',400,'error','invalid_event_count'); end if;
  if lower(btrim(coalesce(p_event_digest,''))) !~ '^[0-9a-f]{64}$' or lower(btrim(coalesce(p_evidence_sha256,''))) !~ '^[0-9a-f]{64}$' or lower(btrim(coalesce(p_result_sha256,''))) !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'status',400,'error','invalid_hash'); end if;
  if v_state not in ('PENDING_CONTROLLED_EVALUATION','PREPROD_CONTINUATION_ELIGIBLE','REJECTED_BY_HARD_GATES','REJECTED_NOT_NEW_BETTER','REJECTED_SCORE_REGRESSION','HUMAN_REQUIRED') then return jsonb_build_object('ok',false,'status',400,'error','invalid_continuation_state'); end if;
  if v_verdict is not null and v_verdict not in ('NEW_BETTER','OLD_BETTER','EQUIVALENT','REJECTED','HOLD') then return jsonb_build_object('ok',false,'status',400,'error','invalid_tribunal_verdict'); end if;
  if v_human is not null and v_human not in ('LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST') then return jsonb_build_object('ok',false,'status',400,'error','invalid_human_required_code'); end if;
  if v_state='HUMAN_REQUIRED' and v_human is null then return jsonb_build_object('ok',false,'status',400,'error','human_required_code_required'); end if;
  if v_state<>'HUMAN_REQUIRED' and v_human is not null then return jsonb_build_object('ok',false,'status',400,'error','human_required_code_not_allowed'); end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' or p_recorded_by is null or btrim(p_recorded_by)='' then return jsonb_build_object('ok',false,'status',400,'error','idempotency_or_actor_required'); end if;

  select count(*) into v_green_count from public.cerebro_company_engine_state_preprod where company_id=v_company and environment='PREPROD' and state='GREEN' and prod_authorized=false and prod_write_authorized=false and trading_access=false and additional_cost_eur=0;
  if v_green_count<>17 then return jsonb_build_object('ok',false,'status',409,'error','full_17_engine_preprod_green_required','green_engine_count',v_green_count,'next_gate','MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED','prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0); end if;

  if v_state='PREPROD_CONTINUATION_ELIGIBLE' and (coalesce(p_hard_gates_green,false) is not true or v_verdict<>'NEW_BETTER' or p_old_score is null or p_new_score is null or p_new_score<=p_old_score or nullif(btrim(coalesce(p_evaluation_ref,'')),'') is null or nullif(btrim(coalesce(p_tribunal_ref,'')),'') is null or nullif(btrim(coalesce(p_rollback_ref,'')),'') is null) then
    return jsonb_build_object('ok',false,'status',409,'error','controlled_evaluation_evidence_required','next_gate','MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED');
  end if;

  select * into v_existing from public.cerebro_lrn001_continuation_preprod where lrn_idempotency_key=btrim(p_idempotency_key);
  if found then
    if v_existing.company_id<>v_company then return jsonb_build_object('ok',false,'status',409,'error','idempotency_scope_conflict'); end if;
    return jsonb_build_object('ok',true,'status',200,'idempotent',true,'receipt',to_jsonb(v_existing),'next_gate',case when v_existing.continuation_state='PREPROD_CONTINUATION_ELIGIBLE' then 'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED' else 'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED' end,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0);
  end if;

  insert into public.cerebro_lrn001_continuation_preprod(company_id,engine_id,environment,version,evidence_at,event_count,event_digest,evidence_sha256,result_sha256,continuation_state,old_score,new_score,hard_gates_green,tribunal_verdict,evaluation_ref,tribunal_ref,rollback_ref,human_required_code,canonical_knowledge_write_authorized,publish_authorized,lrn_idempotency_key,recorded_by,prod_authorized,prod_write_authorized,trading_access,additional_cost_eur)
  values(v_company,'LRN-001','PREPROD',btrim(p_version),p_evidence_at,p_event_count,lower(btrim(p_event_digest)),lower(btrim(p_evidence_sha256)),lower(btrim(p_result_sha256)),v_state,p_old_score,p_new_score,coalesce(p_hard_gates_green,false),v_verdict,nullif(btrim(coalesce(p_evaluation_ref,'')),''),nullif(btrim(coalesce(p_tribunal_ref,'')),''),nullif(btrim(coalesce(p_rollback_ref,'')),''),v_human,false,false,btrim(p_idempotency_key),left(btrim(p_recorded_by),200),false,false,false,0)
  returning * into v_inserted;
  v_next_gate:=case when v_state='PREPROD_CONTINUATION_ELIGIBLE' then 'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED' else 'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED' end;
  return jsonb_build_object('ok',true,'status',201,'idempotent',false,'receipt',to_jsonb(v_inserted),'full_17_engine_preprod_green',true,'next_gate',v_next_gate,'human_required',v_human,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0);
end; $$;

create or replace function public.cerebro_lrn001_status_preprod(p_request_company_id text,p_target_company_id text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_guard jsonb; v_green_count integer; v_receipts jsonb; v_eligible boolean;
begin
  v_guard:=public.cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id);
  if coalesce((v_guard->>'allowed')::boolean,false) is not true then return v_guard; end if;
  select count(*) into v_green_count from public.cerebro_company_engine_state_preprod where company_id=btrim(p_target_company_id) and environment='PREPROD' and state='GREEN';
  select coalesce(jsonb_agg(to_jsonb(r) order by r.receipt_id),'[]'::jsonb),coalesce(bool_or(r.continuation_state='PREPROD_CONTINUATION_ELIGIBLE'),false) into v_receipts,v_eligible from public.cerebro_lrn001_continuation_preprod r where r.company_id=btrim(p_target_company_id);
  return jsonb_build_object('ok',true,'status',200,'company_id',btrim(p_target_company_id),'green_engine_count',v_green_count,'full_17_engine_preprod_green',v_green_count=17,'continuation_eligible',v_eligible,'receipts',v_receipts,'next_gate',case when v_eligible then 'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED' else 'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED' end,'prod_authorized',false,'prod_write_authorized',false,'trading_access',false,'additional_cost_eur',0);
end; $$;

revoke all on function public.cerebro_lrn001_record_preprod(text,text,timestamptz,integer,text,text,text,text,numeric,numeric,boolean,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.cerebro_lrn001_status_preprod(text,text) from public, anon, authenticated;
grant execute on function public.cerebro_lrn001_record_preprod(text,text,timestamptz,integer,text,text,text,text,numeric,numeric,boolean,text,text,text,text,text,text,text) to service_role;
grant execute on function public.cerebro_lrn001_status_preprod(text,text) to service_role;
comment on table public.cerebro_lrn001_continuation_preprod is 'LRN-001 tenant-bound PREPROD continuation receipts: hashes, counts, decisions and evidence refs only; no raw learning/customer payloads.';
