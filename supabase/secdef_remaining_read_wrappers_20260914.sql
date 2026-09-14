-- CEREBRO OS · Remaining SECURITY DEFINER read wrappers
-- PREPARED ON PARALLEL BRANCH ONLY. NOT APPLIED TO PROD.
-- Goal: preserve behavior while moving direct authenticated RPCs behind service_role-only server contracts.

begin;

create or replace function public.fenix_prod_ana_knowledge_answer_server(
  p_actor_code text,
  p_question text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, fenix_prod, pg_temp
as $$
declare
  q text:=btrim(coalesce(p_question,''));
  qn text;
  hit record;
  correction_hit record;
begin
  if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active=true) then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  if length(q)<3 then return jsonb_build_object('ok',true,'status',200,'found',false); end if;
  qn:=lower(translate(q,'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN'));
  with qt as (
    select distinct token from unnest(regexp_split_to_array(regexp_replace(qn,'[^a-z0-9%]+',' ','g'),'\s+')) token
    where length(token)>=3 and token not in ('necesito','quiero','saber','dime','puedes','para','como','cual','cuales','sobre','esta','este','estos','estas')
  ), ranked as (
    select k.knowledge_code,k.title,k.answer,k.domain,
           count(*) filter (where lower(translate(coalesce(k.title,'')||' '||coalesce(k.answer,'')||' '||array_to_string(k.tags,' '),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')) like '%'||qt.token||'%')::int as score,
           k.updated_at
    from fenix_prod.ana_knowledge_cards k cross join qt
    where k.status='approved'
    group by k.knowledge_code,k.title,k.answer,k.domain,k.updated_at
  )
  select * into hit from ranked where score>=2 order by score desc,updated_at desc limit 1;
  if hit.knowledge_code is not null then
    return jsonb_build_object('ok',true,'status',200,'found',true,'answer',hit.answer,'source','CEREBRO_CANONICAL','knowledge_code',hit.knowledge_code,'domain',hit.domain,'score',hit.score);
  end if;
  select c.correction_code,c.approved_rule into correction_hit
  from fenix_prod.ana_correcciones c
  where c.status='approved' and nullif(btrim(coalesce(c.approved_rule,'')),'') is not null
    and exists (
      select 1 from unnest(regexp_split_to_array(regexp_replace(qn,'[^a-z0-9%]+',' ','g'),'\s+')) token
      where length(token)>=4 and lower(translate(c.approved_rule,'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')) like '%'||token||'%'
    )
  order by c.reviewed_at desc nulls last,c.created_at desc limit 1;
  if correction_hit.correction_code is not null then
    return jsonb_build_object('ok',true,'status',200,'found',true,'answer',correction_hit.approved_rule,'source','CEREBRO_APPROVED_CORRECTION','knowledge_code',correction_hit.correction_code);
  end if;
  return jsonb_build_object('ok',true,'status',200,'found',false);
end $$;

create or replace function public.fenix_prod_chat_conversations_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, pg_temp
as $$
begin
  if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active=true) then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  return jsonb_build_object('ok',true,'status',200,'items',coalesce((
    select jsonb_agg(to_jsonb(q) order by q.last_at desc nulls last,q.created_at desc)
    from (
      select c.conversation_code,c.kind,c.created_at,c.updated_at,
        case when c.kind='direct' then coalesce((select coalesce(a.display_name,a.actor_code) from fenix_prod.chat_conversation_members cm join fenix_prod.actors a on a.actor_code=cm.actor_code where cm.conversation_code=c.conversation_code and cm.actor_code<>p_actor_code limit 1),c.title,'Conversación') else coalesce(nullif(btrim(c.title),''),'Grupo') end as title,
        coalesce((select jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',coalesce(a.display_name,a.actor_code),'role',a.role) order by coalesce(a.display_name,a.actor_code)) from fenix_prod.chat_conversation_members cm join fenix_prod.actors a on a.actor_code=cm.actor_code where cm.conversation_code=c.conversation_code),'[]'::jsonb) members,
        (select max(m.created_at) from fenix_prod.chat_messages m where m.conversation_code=c.conversation_code) last_at,
        (select left(m.body,120) from fenix_prod.chat_messages m where m.conversation_code=c.conversation_code order by m.created_at desc limit 1) last_message
      from fenix_prod.chat_conversations c join fenix_prod.chat_conversation_members self on self.conversation_code=c.conversation_code and self.actor_code=p_actor_code
    ) q
  ),'[]'::jsonb));
end $$;

create or replace function public.fenix_prod_chat_list_v2_server(
  p_actor_code text,
  p_conversation_code text,
  p_limit integer default 100
) returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, pg_temp
as $$
declare lim integer:=greatest(1,least(coalesce(p_limit,100),200));
begin
  if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active=true) or not exists(select 1 from fenix_prod.chat_conversation_members where conversation_code=p_conversation_code and actor_code=p_actor_code) then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;
  return jsonb_build_object('ok',true,'status',200,'conversation_code',p_conversation_code,'items',coalesce((select jsonb_agg(x order by x.created_at asc) from (
    select m.message_code,m.sender_actor_code,coalesce(a.display_name,m.sender_actor_code) sender_name,a.role sender_role,m.body,m.created_at,
      coalesce((select jsonb_agg(jsonb_build_object('attachment_code',ca.attachment_code,'filename',ca.filename,'mime_type',ca.mime_type,'size_bytes',ca.size_bytes,'storage_path',ca.storage_path,'created_at',ca.created_at) order by ca.created_at) from fenix_prod.chat_attachments ca where ca.message_code=m.message_code),'[]'::jsonb) attachments
    from fenix_prod.chat_messages m join fenix_prod.actors a on a.actor_code=m.sender_actor_code where m.conversation_code=p_conversation_code order by m.created_at desc limit lim
  ) x),'[]'::jsonb));
end $$;

create or replace function public.fenix_prod_chat_people_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, pg_temp
as $$
begin
  if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active=true) then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  return jsonb_build_object('ok',true,'status',200,'items',coalesce((select jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',coalesce(a.display_name,a.actor_code),'role',a.role) order by coalesce(a.display_name,a.actor_code)) from fenix_prod.actors a where a.active and a.actor_code<>p_actor_code),'[]'::jsonb));
end $$;

create or replace function public.fenix_prod_profile_get_full_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, pg_temp
as $$
declare me fenix_prod.actors%rowtype; p fenix_prod.actor_profiles%rowtype;
begin
  select * into me from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if me.actor_code is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  select * into p from fenix_prod.actor_profiles where actor_code=me.actor_code;
  return jsonb_build_object('ok',true,'status',200,'item',jsonb_build_object(
    'actor_code',me.actor_code,'role',me.role,'display_name',coalesce(me.display_name,''),'username',coalesce(p.username,''),
    'birth_date',p.birth_date,'contact_email',coalesce(p.contact_email,''),'phone',coalesce(p.phone,''),'job_title',coalesce(p.job_title,''),
    'zone',coalesce(p.zone,''),'bio',coalesce(p.bio,''),'linkedin',coalesce(p.linkedin,''),'instagram',coalesce(p.instagram,''),
    'website',coalesce(p.website,''),'avatar_url',coalesce(p.avatar_url,''),'updated_at',p.updated_at
  ));
end $$;

create or replace function public.fenix_prod_profile_socials_get_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, pg_temp
as $$
declare p fenix_prod.actor_profiles%rowtype;
begin
  if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active=true) then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  select * into p from fenix_prod.actor_profiles where actor_code=p_actor_code;
  return jsonb_build_object('ok',true,'status',200,'item',jsonb_build_object(
    'facebook',coalesce(p.facebook,''),'x_twitter',coalesce(p.x_twitter,''),'tiktok',coalesce(p.tiktok,''),
    'youtube',coalesce(p.youtube,''),'threads',coalesce(p.threads,''),'telegram',coalesce(p.telegram,'')));
end $$;

revoke all on function public.fenix_prod_ana_knowledge_answer_server(text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_conversations_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_list_v2_server(text,text,integer) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_people_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_profile_get_full_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_profile_socials_get_server(text) from public, anon, authenticated;

grant execute on function public.fenix_prod_ana_knowledge_answer_server(text,text) to service_role;
grant execute on function public.fenix_prod_chat_conversations_server(text) to service_role;
grant execute on function public.fenix_prod_chat_list_v2_server(text,text,integer) to service_role;
grant execute on function public.fenix_prod_chat_people_server(text) to service_role;
grant execute on function public.fenix_prod_profile_get_full_server(text) to service_role;
grant execute on function public.fenix_prod_profile_socials_get_server(text) to service_role;

commit;

-- No direct authenticated RPC is revoked here.
-- Promotion gate: syntax/behavior tests -> apply wrappers -> Gateway routes -> authenticated HTTP parity -> only then retire corresponding *_user EXECUTE.