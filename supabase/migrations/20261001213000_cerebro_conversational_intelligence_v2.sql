-- CEREBRO Conversational Intelligence V2
-- Additive evolution of owner conversational memory.
-- Preserves V1 RPCs and rows; adds structured kinds, subject keys and explicit supersession.

alter table fenix_prod.cerebro_conversation_memory
  add column if not exists subject_key text,
  add column if not exists superseded_by uuid,
  add column if not exists valid_from timestamptz not null default now(),
  add column if not exists valid_until timestamptz,
  add column if not exists canonical_status text not null default 'EPISODIC';

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid='fenix_prod.cerebro_conversation_memory'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%memory_kind%'
  loop
    execute format('alter table fenix_prod.cerebro_conversation_memory drop constraint %I',c.conname);
  end loop;
end $$;

alter table fenix_prod.cerebro_conversation_memory
  add constraint cerebro_conversation_memory_kind_v2_chk
    check (memory_kind in ('USER_TURN','FACT','DECISION','CORRECTION','PREFERENCE','OPERATIONAL_KNOWLEDGE'));

do $$
begin
  if not exists(
    select 1
    from pg_constraint
    where conrelid='fenix_prod.cerebro_conversation_memory'::regclass
      and conname='cerebro_conversation_memory_superseded_by_fk'
  ) then
    alter table fenix_prod.cerebro_conversation_memory
      add constraint cerebro_conversation_memory_superseded_by_fk
      foreign key (superseded_by)
      references fenix_prod.cerebro_conversation_memory(memory_id)
      on update cascade on delete set null;
  end if;
end $$;

do $$
begin
  if not exists(
    select 1
    from pg_constraint
    where conrelid='fenix_prod.cerebro_conversation_memory'::regclass
      and conname='cerebro_conversation_memory_canonical_status_chk'
  ) then
    alter table fenix_prod.cerebro_conversation_memory
      add constraint cerebro_conversation_memory_canonical_status_chk
      check (canonical_status in ('EPISODIC','CANDIDATE','VERIFIED'));
  end if;
end $$;

alter table fenix_prod.cerebro_conversation_memory
  drop constraint if exists cerebro_conversation_memory_subject_key_chk;
alter table fenix_prod.cerebro_conversation_memory
  add constraint cerebro_conversation_memory_subject_key_chk
    check (subject_key is null or char_length(subject_key) between 2 and 160);

create index if not exists cerebro_conversation_memory_subject_idx
  on fenix_prod.cerebro_conversation_memory(actor_code,company_id,subject_key,active,last_seen_at desc)
  where subject_key is not null;

create index if not exists cerebro_conversation_memory_superseded_by_idx
  on fenix_prod.cerebro_conversation_memory(superseded_by)
  where superseded_by is not null;

create or replace function public.fenix_prod_cerebro_memory_observe_v2_server(
  p_actor_code text,
  p_company_id text,
  p_engine_id text,
  p_environment text,
  p_version text,
  p_memory_kind text,
  p_content_text text,
  p_content_hash text,
  p_subject_key text default null
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
  v_version text := coalesce(nullif(btrim(p_version),''),'v2');
  v_kind text := upper(coalesce(nullif(btrim(p_memory_kind),''),'USER_TURN'));
  v_content text := nullif(btrim(p_content_text),'');
  v_hash text := lower(coalesce(nullif(btrim(p_content_hash),''),''));
  v_subject text := left(nullif(btrim(p_subject_key),''),160);
  v_status text := case when v_kind in ('FACT','DECISION','CORRECTION','PREFERENCE','OPERATIONAL_KNOWLEDGE') then 'CANDIDATE' else 'EPISODIC' end;
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
  if v_kind not in ('USER_TURN','FACT','DECISION','CORRECTION','PREFERENCE','OPERATIONAL_KNOWLEDGE') then
    return jsonb_build_object('ok',false,'error','invalid_memory_kind');
  end if;
  if char_length(v_content)>2000 or v_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid_content');
  end if;

  insert into fenix_prod.cerebro_conversation_memory(
    actor_code,company_id,engine_id,environment,version,memory_kind,
    content_text,content_hash,subject_key,source_type,confidence,active,canonical_status
  )
  values(
    v_actor,v_company,v_engine,v_environment,v_version,v_kind,
    v_content,v_hash,v_subject,'CEREBRO_CONVERSATION',1.000,true,v_status
  )
  on conflict(actor_code,company_id,content_hash)
  do update set
    last_seen_at=now(),
    seen_count=fenix_prod.cerebro_conversation_memory.seen_count+1,
    active=true,
    subject_key=coalesce(excluded.subject_key,fenix_prod.cerebro_conversation_memory.subject_key),
    memory_kind=case
      when fenix_prod.cerebro_conversation_memory.memory_kind='USER_TURN' then excluded.memory_kind
      else fenix_prod.cerebro_conversation_memory.memory_kind
    end
  returning * into v_row;

  return jsonb_build_object(
    'ok',true,
    'item',jsonb_build_object(
      'memory_id',v_row.memory_id,
      'memory_kind',v_row.memory_kind,
      'subject_key',v_row.subject_key,
      'canonical_status',v_row.canonical_status,
      'seen_count',v_row.seen_count,
      'last_seen_at',v_row.last_seen_at
    )
  );
end;
$$;

create or replace function public.fenix_prod_cerebro_memory_supersede_server(
  p_actor_code text,
  p_company_id text,
  p_query text,
  p_superseded_by uuid
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
  if v_actor is null or v_company is null or v_query is null or p_superseded_by is null then
    return jsonb_build_object('ok',false,'error','invalid_payload');
  end if;
  if not exists(
    select 1 from fenix_prod.cerebro_conversation_memory
    where memory_id=p_superseded_by and actor_code=v_actor and company_id=v_company
  ) then
    return jsonb_build_object('ok',false,'error','replacement_not_found');
  end if;

  v_ts := websearch_to_tsquery('spanish'::regconfig,left(v_query,500));

  update fenix_prod.cerebro_conversation_memory
     set active=false,
         valid_until=now(),
         superseded_by=p_superseded_by,
         last_seen_at=now()
   where actor_code=v_actor
     and company_id=v_company
     and active=true
     and memory_id<>p_superseded_by
     and memory_kind in ('FACT','DECISION','CORRECTION','PREFERENCE','OPERATIONAL_KNOWLEDGE')
     and search_vector @@ v_ts;

  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'superseded',v_count);
end;
$$;

revoke all on function public.fenix_prod_cerebro_memory_observe_v2_server(text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_cerebro_memory_supersede_server(text,text,text,uuid) from public, anon, authenticated;

grant execute on function public.fenix_prod_cerebro_memory_observe_v2_server(text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.fenix_prod_cerebro_memory_supersede_server(text,text,text,uuid) to service_role;
