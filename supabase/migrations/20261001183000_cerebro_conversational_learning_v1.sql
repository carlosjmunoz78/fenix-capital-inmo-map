-- CEREBRO Conversational Learning V1
-- Lightweight, searchable episodic memory for owner conversations.
-- Stores only bounded user turns that pass runtime sensitivity filters.
-- It is not a raw audio/transcript archive and does not replace CRM/entity memory.

create table if not exists fenix_prod.cerebro_conversation_memory (
  memory_id uuid primary key default gen_random_uuid(),
  actor_code text not null references fenix_prod.actors(actor_code) on update cascade on delete restrict,
  company_id text not null,
  engine_id text not null default 'CONSOLE-001',
  environment text not null default 'PROD' check (environment in ('LAB','PREPROD','PROD')),
  version text not null default 'v1',
  memory_kind text not null default 'USER_TURN'
    check (memory_kind in ('USER_TURN','FACT','DECISION','CORRECTION')),
  content_text text not null check (char_length(content_text) between 1 and 2000),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  source_type text not null default 'CEREBRO_CONVERSATION'
    check (source_type='CEREBRO_CONVERSATION'),
  confidence numeric(4,3) not null default 1.000 check (confidence >= 0 and confidence <= 1),
  active boolean not null default true,
  seen_count integer not null default 1 check (seen_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('spanish'::regconfig, coalesce(content_text,''))
  ) stored
);

create unique index if not exists cerebro_conversation_memory_dedupe_uq
  on fenix_prod.cerebro_conversation_memory(actor_code,company_id,content_hash);

create index if not exists cerebro_conversation_memory_scope_recent_idx
  on fenix_prod.cerebro_conversation_memory(actor_code,company_id,active,last_seen_at desc);

create index if not exists cerebro_conversation_memory_search_idx
  on fenix_prod.cerebro_conversation_memory using gin(search_vector);

alter table fenix_prod.cerebro_conversation_memory enable row level security;

revoke all on fenix_prod.cerebro_conversation_memory from public, anon, authenticated;
grant select, insert, update on fenix_prod.cerebro_conversation_memory to service_role;

create or replace function public.fenix_prod_cerebro_memory_observe_server(
  p_actor_code text,
  p_company_id text,
  p_engine_id text,
  p_environment text,
  p_version text,
  p_memory_kind text,
  p_content_text text,
  p_content_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, fenix_prod
as $$
declare
  v_actor text := nullif(btrim(p_actor_code),'');
  v_company text := nullif(btrim(p_company_id),'');
  v_engine text := coalesce(nullif(btrim(p_engine_id),''),'CONSOLE-001');
  v_environment text := upper(coalesce(nullif(btrim(p_environment),''),'PROD'));
  v_version text := coalesce(nullif(btrim(p_version),''),'v1');
  v_kind text := upper(coalesce(nullif(btrim(p_memory_kind),''),'USER_TURN'));
  v_content text := nullif(btrim(p_content_text),'');
  v_hash text := lower(coalesce(nullif(btrim(p_content_hash),''),''));
  v_row fenix_prod.cerebro_conversation_memory%rowtype;
begin
  if v_actor is null or v_company is null or v_content is null then
    return jsonb_build_object('ok',false,'error','invalid_payload');
  end if;
  if not exists(select 1 from fenix_prod.actors a where a.actor_code=v_actor) then
    return jsonb_build_object('ok',false,'error','actor_not_found');
  end if;
  if v_environment not in ('LAB','PREPROD','PROD') then
    return jsonb_build_object('ok',false,'error','invalid_environment');
  end if;
  if v_kind not in ('USER_TURN','FACT','DECISION','CORRECTION') then
    return jsonb_build_object('ok',false,'error','invalid_memory_kind');
  end if;
  if char_length(v_content)>2000 or v_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid_content');
  end if;

  insert into fenix_prod.cerebro_conversation_memory(
    actor_code,company_id,engine_id,environment,version,memory_kind,
    content_text,content_hash,source_type,confidence,active
  )
  values(
    v_actor,v_company,v_engine,v_environment,v_version,v_kind,
    v_content,v_hash,'CEREBRO_CONVERSATION',1.000,true
  )
  on conflict(actor_code,company_id,content_hash)
  do update set
    last_seen_at=now(),
    seen_count=fenix_prod.cerebro_conversation_memory.seen_count+1,
    active=true
  returning * into v_row;

  return jsonb_build_object(
    'ok',true,
    'item',jsonb_build_object(
      'memory_id',v_row.memory_id,
      'memory_kind',v_row.memory_kind,
      'seen_count',v_row.seen_count,
      'last_seen_at',v_row.last_seen_at
    )
  );
end;
$$;

create or replace function public.fenix_prod_cerebro_memory_search_server(
  p_actor_code text,
  p_company_id text,
  p_query text,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, fenix_prod
as $$
declare
  v_actor text := nullif(btrim(p_actor_code),'');
  v_company text := nullif(btrim(p_company_id),'');
  v_query text := nullif(btrim(p_query),'');
  v_limit integer := greatest(1,least(coalesce(p_limit,5),10));
  v_ts tsquery;
  v_items jsonb;
begin
  if v_actor is null or v_company is null or v_query is null then
    return jsonb_build_object('ok',false,'error','invalid_payload');
  end if;
  if not exists(select 1 from fenix_prod.actors a where a.actor_code=v_actor) then
    return jsonb_build_object('ok',false,'error','actor_not_found');
  end if;

  v_ts := websearch_to_tsquery('spanish'::regconfig,left(v_query,500));

  select coalesce(jsonb_agg(jsonb_build_object(
    'memory_id',m.memory_id,
    'memory_kind',m.memory_kind,
    'content',m.content_text,
    'environment',m.environment,
    'version',m.version,
    'last_seen_at',m.last_seen_at,
    'seen_count',m.seen_count,
    'rank',ts_rank_cd(m.search_vector,v_ts)
  ) order by ts_rank_cd(m.search_vector,v_ts) desc,m.last_seen_at desc),'[]'::jsonb)
  into v_items
  from (
    select *
    from fenix_prod.cerebro_conversation_memory
    where actor_code=v_actor
      and company_id=v_company
      and active=true
      and search_vector @@ v_ts
    order by ts_rank_cd(search_vector,v_ts) desc,last_seen_at desc
    limit v_limit
  ) m;

  return jsonb_build_object('ok',true,'items',v_items);
end;
$$;

create or replace function public.fenix_prod_cerebro_memory_forget_server(
  p_actor_code text,
  p_company_id text,
  p_query text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, fenix_prod
as $$
declare
  v_actor text := nullif(btrim(p_actor_code),'');
  v_company text := nullif(btrim(p_company_id),'');
  v_query text := nullif(btrim(p_query),'');
  v_ts tsquery;
  v_count integer := 0;
begin
  if v_actor is null or v_company is null or v_query is null then
    return jsonb_build_object('ok',false,'error','invalid_payload');
  end if;
  v_ts := websearch_to_tsquery('spanish'::regconfig,left(v_query,500));

  update fenix_prod.cerebro_conversation_memory
     set active=false,last_seen_at=now()
   where actor_code=v_actor
     and company_id=v_company
     and active=true
     and search_vector @@ v_ts;

  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'deactivated',v_count);
end;
$$;

revoke all on function public.fenix_prod_cerebro_memory_observe_server(text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_cerebro_memory_search_server(text,text,text,integer) from public, anon, authenticated;
revoke all on function public.fenix_prod_cerebro_memory_forget_server(text,text,text) from public, anon, authenticated;

grant execute on function public.fenix_prod_cerebro_memory_observe_server(text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.fenix_prod_cerebro_memory_search_server(text,text,text,integer) to service_role;
grant execute on function public.fenix_prod_cerebro_memory_forget_server(text,text,text) to service_role;
