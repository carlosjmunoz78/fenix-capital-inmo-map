-- CEREBRO explicit user learning V1
-- Additive, owner-safe, auditable preference store.
-- Persistent preferences are intentionally small transactional records.

create table if not exists fenix_prod.cerebro_user_preferences (
  preference_id uuid primary key default gen_random_uuid(),
  actor_code text not null references fenix_prod.actors(actor_code) on update cascade on delete restrict,
  company_id text not null,
  scope text not null default 'USER' check (scope in ('USER','COMPANY')),
  category text not null check (category in (
    'voice_style',
    'wording',
    'pronunciation',
    'response_length',
    'interaction_preference',
    'workflow_preference',
    'business_preference'
  )),
  preference_key text not null check (preference_key ~ '^[a-z0-9_]{2,80}$'),
  value_text text not null check (char_length(value_text) between 1 and 500),
  source text not null default 'explicit_user_instruction'
    check (source = 'explicit_user_instruction'),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  supersedes uuid null references fenix_prod.cerebro_user_preferences(preference_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cerebro_user_preferences_one_active_key_uq
  on fenix_prod.cerebro_user_preferences(actor_code, company_id, scope, preference_key)
  where active;

create index if not exists cerebro_user_preferences_actor_active_idx
  on fenix_prod.cerebro_user_preferences(actor_code, company_id, active, updated_at desc);

alter table fenix_prod.cerebro_user_preferences enable row level security;

revoke all on fenix_prod.cerebro_user_preferences from public, anon, authenticated;
grant select, insert, update on fenix_prod.cerebro_user_preferences to service_role;

create or replace function public.fenix_prod_cerebro_preferences_list_server(
  p_actor_code text,
  p_company_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, fenix_prod
as $$
declare
  v_actor text := nullif(btrim(p_actor_code), '');
  v_company text := nullif(btrim(p_company_id), '');
  v_items jsonb;
begin
  if v_actor is null or v_company is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_scope');
  end if;

  if not exists(select 1 from fenix_prod.actors a where a.actor_code = v_actor) then
    return jsonb_build_object('ok', false, 'error', 'actor_not_found');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'preference_id', p.preference_id,
      'actor_code', p.actor_code,
      'company_id', p.company_id,
      'scope', p.scope,
      'category', p.category,
      'preference_key', p.preference_key,
      'value', p.value_text,
      'source', p.source,
      'version', p.version,
      'updated_at', p.updated_at
    )
    order by p.category, p.preference_key
  ), '[]'::jsonb)
  into v_items
  from fenix_prod.cerebro_user_preferences p
  where p.actor_code = v_actor
    and p.company_id = v_company
    and p.active = true;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

create or replace function public.fenix_prod_cerebro_preference_upsert_server(
  p_actor_code text,
  p_company_id text,
  p_scope text,
  p_category text,
  p_preference_key text,
  p_value_text text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, fenix_prod
as $$
declare
  v_actor text := nullif(btrim(p_actor_code), '');
  v_company text := nullif(btrim(p_company_id), '');
  v_scope text := upper(coalesce(nullif(btrim(p_scope), ''), 'USER'));
  v_category text := lower(coalesce(nullif(btrim(p_category), ''), ''));
  v_key text := lower(coalesce(nullif(btrim(p_preference_key), ''), ''));
  v_value text := nullif(btrim(p_value_text), '');
  v_previous fenix_prod.cerebro_user_preferences%rowtype;
  v_created fenix_prod.cerebro_user_preferences%rowtype;
begin
  if v_actor is null or v_company is null or v_value is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
  end if;
  if v_scope not in ('USER','COMPANY') then
    return jsonb_build_object('ok', false, 'error', 'invalid_scope');
  end if;
  if v_category not in (
    'voice_style','wording','pronunciation','response_length',
    'interaction_preference','workflow_preference','business_preference'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_category');
  end if;
  if v_key !~ '^[a-z0-9_]{2,80}$' or char_length(v_value) > 500 then
    return jsonb_build_object('ok', false, 'error', 'invalid_preference');
  end if;
  if not exists(select 1 from fenix_prod.actors a where a.actor_code = v_actor) then
    return jsonb_build_object('ok', false, 'error', 'actor_not_found');
  end if;

  select *
    into v_previous
  from fenix_prod.cerebro_user_preferences p
  where p.actor_code=v_actor
    and p.company_id=v_company
    and p.scope=v_scope
    and p.preference_key=v_key
    and p.active=true
  for update;

  if v_previous.preference_id is not null and v_previous.value_text = v_value and v_previous.category = v_category then
    return jsonb_build_object(
      'ok', true,
      'reused', true,
      'item', jsonb_build_object(
        'preference_id', v_previous.preference_id,
        'category', v_previous.category,
        'preference_key', v_previous.preference_key,
        'value', v_previous.value_text,
        'version', v_previous.version,
        'updated_at', v_previous.updated_at
      )
    );
  end if;

  if v_previous.preference_id is not null then
    update fenix_prod.cerebro_user_preferences
       set active=false, updated_at=now()
     where preference_id=v_previous.preference_id;
  end if;

  insert into fenix_prod.cerebro_user_preferences(
    actor_code, company_id, scope, category, preference_key, value_text,
    source, active, version, supersedes
  )
  values(
    v_actor, v_company, v_scope, v_category, v_key, v_value,
    'explicit_user_instruction', true,
    coalesce(v_previous.version,0)+1,
    v_previous.preference_id
  )
  returning * into v_created;

  return jsonb_build_object(
    'ok', true,
    'reused', false,
    'item', jsonb_build_object(
      'preference_id', v_created.preference_id,
      'category', v_created.category,
      'preference_key', v_created.preference_key,
      'value', v_created.value_text,
      'version', v_created.version,
      'updated_at', v_created.updated_at
    )
  );
end;
$$;

create or replace function public.fenix_prod_cerebro_preference_deactivate_server(
  p_actor_code text,
  p_company_id text,
  p_scope text,
  p_preference_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, fenix_prod
as $$
declare
  v_actor text := nullif(btrim(p_actor_code), '');
  v_company text := nullif(btrim(p_company_id), '');
  v_scope text := upper(coalesce(nullif(btrim(p_scope), ''), 'USER'));
  v_key text := lower(coalesce(nullif(btrim(p_preference_key), ''), ''));
  v_count integer := 0;
begin
  if v_actor is null or v_company is null or v_scope not in ('USER','COMPANY') or v_key !~ '^[a-z0-9_]{2,80}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  update fenix_prod.cerebro_user_preferences
     set active=false, updated_at=now()
   where actor_code=v_actor
     and company_id=v_company
     and scope=v_scope
     and preference_key=v_key
     and active=true;

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'deactivated', v_count);
end;
$$;

revoke all on function public.fenix_prod_cerebro_preferences_list_server(text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_cerebro_preference_upsert_server(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_cerebro_preference_deactivate_server(text,text,text,text) from public, anon, authenticated;

grant execute on function public.fenix_prod_cerebro_preferences_list_server(text,text) to service_role;
grant execute on function public.fenix_prod_cerebro_preference_upsert_server(text,text,text,text,text,text) to service_role;
grant execute on function public.fenix_prod_cerebro_preference_deactivate_server(text,text,text,text) to service_role;
