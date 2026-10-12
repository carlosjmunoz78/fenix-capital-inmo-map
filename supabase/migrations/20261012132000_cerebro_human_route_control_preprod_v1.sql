-- CEREBRO Human Intelligence route control V1
-- PREPROD-only, additive, one-row transactional routing state plus append-only audit history.
-- No App/CRM tables are changed. No PROD authority is granted.

create table if not exists public.cerebro_human_route_control_preprod (
  company_id text not null,
  route_key text not null,
  mode text not null check (mode in ('OLD_100','SHADOW_NEW','CANARY_NEW','NEW_100')),
  canary_percent integer not null default 0 check (canary_percent between 0 and 100),
  serve_actor text not null check (serve_actor in ('OLD','NEW')),
  candidate_actor text not null default 'NEW' check (candidate_actor in ('OLD','NEW')),
  previous_actor text null check (previous_actor is null or previous_actor in ('OLD','NEW')),
  version bigint not null default 1 check (version > 0),
  last_reason text not null default 'bootstrap',
  last_idempotency_key text not null default 'bootstrap:v1',
  updated_by text not null default 'bootstrap',
  updated_at timestamptz not null default now(),
  primary key (company_id, route_key),
  unique (last_idempotency_key)
);

alter table public.cerebro_human_route_control_preprod enable row level security;
revoke all on table public.cerebro_human_route_control_preprod from anon, authenticated;
grant all on table public.cerebro_human_route_control_preprod to service_role;

create table if not exists public.cerebro_human_route_history_preprod (
  history_id bigint generated always as identity primary key,
  company_id text not null,
  route_key text not null,
  from_mode text null,
  to_mode text not null,
  from_actor text null,
  to_actor text not null,
  canary_percent integer not null check (canary_percent between 0 and 100),
  from_version bigint null,
  to_version bigint not null,
  reason text not null,
  idempotency_key text not null unique,
  changed_by text not null,
  changed_at timestamptz not null default now()
);

alter table public.cerebro_human_route_history_preprod enable row level security;
revoke all on table public.cerebro_human_route_history_preprod from anon, authenticated;
grant all on table public.cerebro_human_route_history_preprod to service_role;

insert into public.cerebro_human_route_control_preprod (
  company_id, route_key, mode, canary_percent, serve_actor, candidate_actor,
  previous_actor, version, last_reason, last_idempotency_key, updated_by
) values (
  'fenix','human_conversation','OLD_100',0,'OLD','NEW',null,1,
  'Initial fail-closed Human Intelligence shared PREPROD route','bootstrap:human-conversation:v1','migration'
)
on conflict (company_id, route_key) do nothing;

create or replace function public.cerebro_human_route_transition_preprod(
  p_company_id text,
  p_route_key text,
  p_expected_version bigint,
  p_mode text,
  p_canary_percent integer,
  p_reason text,
  p_idempotency_key text,
  p_changed_by text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.cerebro_human_route_control_preprod%rowtype;
  new_actor text;
  existing public.cerebro_human_route_history_preprod%rowtype;
begin
  if p_company_id is null or btrim(p_company_id) = '' or p_route_key is null or btrim(p_route_key) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_scope');
  end if;
  if p_mode not in ('OLD_100','SHADOW_NEW','CANARY_NEW','NEW_100') then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_mode');
  end if;
  if p_canary_percent < 0 or p_canary_percent > 100 then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_canary_percent');
  end if;
  if p_mode = 'OLD_100' and p_canary_percent <> 0 then
    return jsonb_build_object('ok',false,'status',400,'error','old_requires_zero_canary');
  end if;
  if p_mode = 'SHADOW_NEW' and p_canary_percent <> 0 then
    return jsonb_build_object('ok',false,'status',400,'error','shadow_requires_zero_canary');
  end if;
  if p_mode = 'CANARY_NEW' and (p_canary_percent <= 0 or p_canary_percent >= 100) then
    return jsonb_build_object('ok',false,'status',400,'error','canary_requires_1_to_99');
  end if;
  if p_mode = 'NEW_100' and p_canary_percent <> 100 then
    return jsonb_build_object('ok',false,'status',400,'error','new_requires_100_canary');
  end if;
  if p_reason is null or btrim(p_reason) = '' or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    return jsonb_build_object('ok',false,'status',400,'error','reason_and_idempotency_required');
  end if;

  select * into existing
  from public.cerebro_human_route_history_preprod
  where idempotency_key = p_idempotency_key;
  if found then
    select * into cur from public.cerebro_human_route_control_preprod
    where company_id = p_company_id and route_key = p_route_key;
    return jsonb_build_object('ok',true,'status',200,'idempotent',true,'state',to_jsonb(cur));
  end if;

  select * into cur
  from public.cerebro_human_route_control_preprod
  where company_id = p_company_id and route_key = p_route_key
  for update;
  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','route_not_found');
  end if;
  if cur.version <> p_expected_version then
    return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',cur.version);
  end if;

  new_actor := case when p_mode in ('NEW_100') then 'NEW' else 'OLD' end;

  update public.cerebro_human_route_control_preprod
  set previous_actor = cur.serve_actor,
      mode = p_mode,
      canary_percent = p_canary_percent,
      serve_actor = new_actor,
      candidate_actor = 'NEW',
      version = cur.version + 1,
      last_reason = left(p_reason,1000),
      last_idempotency_key = p_idempotency_key,
      updated_by = left(coalesce(nullif(p_changed_by,''),'unknown'),200),
      updated_at = now()
  where company_id = p_company_id and route_key = p_route_key;

  insert into public.cerebro_human_route_history_preprod(
    company_id,route_key,from_mode,to_mode,from_actor,to_actor,canary_percent,
    from_version,to_version,reason,idempotency_key,changed_by
  ) values (
    p_company_id,p_route_key,cur.mode,p_mode,cur.serve_actor,new_actor,p_canary_percent,
    cur.version,cur.version+1,left(p_reason,1000),p_idempotency_key,left(coalesce(nullif(p_changed_by,''),'unknown'),200)
  );

  select * into cur from public.cerebro_human_route_control_preprod
  where company_id = p_company_id and route_key = p_route_key;
  return jsonb_build_object('ok',true,'status',200,'idempotent',false,'state',to_jsonb(cur));
end;
$$;

revoke all on function public.cerebro_human_route_transition_preprod(text,text,bigint,text,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.cerebro_human_route_transition_preprod(text,text,bigint,text,integer,text,text,text) to service_role;

comment on table public.cerebro_human_route_control_preprod is 'PREPROD-only atomic routing state for CEREBRO Human Intelligence. Service-role only; no customer data.';
comment on table public.cerebro_human_route_history_preprod is 'Append-only PREPROD routing audit history for CEREBRO Human Intelligence.';
