create or replace function public.fenix_prod_chat_conversations_user()
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 return jsonb_build_object('ok',true,'status',200,'items',coalesce((
  select jsonb_agg(to_jsonb(q) order by q.last_at desc nulls last,q.created_at desc)
  from (
   select c.conversation_code,c.kind,c.created_at,c.updated_at,
    case when c.kind='direct' then coalesce((select coalesce(a.display_name,a.actor_code) from fenix_prod.chat_conversation_members cm join fenix_prod.actors a on a.actor_code=cm.actor_code where cm.conversation_code=c.conversation_code and cm.actor_code<>me limit 1),c.title,'Conversación') else coalesce(nullif(btrim(c.title),''),'Grupo') end as title,
    coalesce((select jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',coalesce(a.display_name,a.actor_code),'role',a.role) order by coalesce(a.display_name,a.actor_code)) from fenix_prod.chat_conversation_members cm join fenix_prod.actors a on a.actor_code=cm.actor_code where cm.conversation_code=c.conversation_code),'[]'::jsonb) members,
    (select max(m.created_at) from fenix_prod.chat_messages m where m.conversation_code=c.conversation_code) last_at,
    (select left(m.body,120) from fenix_prod.chat_messages m where m.conversation_code=c.conversation_code order by m.created_at desc limit 1) last_message
   from fenix_prod.chat_conversations c join fenix_prod.chat_conversation_members self on self.conversation_code=c.conversation_code and self.actor_code=me
  ) q
 ),'[]'::jsonb));
end $$;
revoke all on function public.fenix_prod_chat_conversations_user() from public,anon;
grant execute on function public.fenix_prod_chat_conversations_user() to authenticated,service_role;
