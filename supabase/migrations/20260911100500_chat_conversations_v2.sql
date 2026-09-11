create table if not exists fenix_prod.chat_conversations(
  conversation_code text primary key default ('CONV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20))),
  kind text not null check(kind in ('direct','group')),
  title text,
  created_by_actor_code text not null references fenix_prod.actors(actor_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fenix_prod.chat_conversation_members(
  conversation_code text not null references fenix_prod.chat_conversations(conversation_code) on delete cascade,
  actor_code text not null references fenix_prod.actors(actor_code),
  joined_at timestamptz not null default now(),
  primary key(conversation_code,actor_code)
);

alter table fenix_prod.chat_messages add column if not exists conversation_code text references fenix_prod.chat_conversations(conversation_code) on delete cascade;
create index if not exists chat_messages_conversation_idx on fenix_prod.chat_messages(conversation_code,created_at);
create index if not exists chat_members_actor_idx on fenix_prod.chat_conversation_members(actor_code,conversation_code);

revoke all on fenix_prod.chat_conversations from public,anon,authenticated;
revoke all on fenix_prod.chat_conversation_members from public,anon,authenticated;
alter table fenix_prod.chat_conversations enable row level security;
alter table fenix_prod.chat_conversation_members enable row level security;

create or replace function public.fenix_prod_chat_people_user()
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 return jsonb_build_object('ok',true,'status',200,'items',coalesce((select jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',coalesce(a.display_name,a.actor_code),'role',a.role) order by coalesce(a.display_name,a.actor_code)) from fenix_prod.actors a where a.active and a.actor_code<>me),'[]'::jsonb));
end $$;
revoke all on function public.fenix_prod_chat_people_user() from public,anon;
grant execute on function public.fenix_prod_chat_people_user() to authenticated,service_role;

create or replace function public.fenix_prod_chat_conversations_user()
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 return jsonb_build_object('ok',true,'status',200,'items',coalesce((select jsonb_agg(row_data order by last_at desc nulls last,created_at desc) from (
  select c.conversation_code,c.kind,c.created_at,c.updated_at,
   case when c.kind='direct' then coalesce((select coalesce(a.display_name,a.actor_code) from fenix_prod.chat_conversation_members cm join fenix_prod.actors a on a.actor_code=cm.actor_code where cm.conversation_code=c.conversation_code and cm.actor_code<>me limit 1),c.title,'Conversación') else coalesce(nullif(btrim(c.title),''),'Grupo') end as title,
   coalesce((select jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',coalesce(a.display_name,a.actor_code),'role',a.role) order by coalesce(a.display_name,a.actor_code)) from fenix_prod.chat_conversation_members cm join fenix_prod.actors a on a.actor_code=cm.actor_code where cm.conversation_code=c.conversation_code),'[]'::jsonb) members,
   (select max(m.created_at) from fenix_prod.chat_messages m where m.conversation_code=c.conversation_code) last_at,
   (select left(m.body,120) from fenix_prod.chat_messages m where m.conversation_code=c.conversation_code order by m.created_at desc limit 1) last_message
  from fenix_prod.chat_conversations c join fenix_prod.chat_conversation_members self on self.conversation_code=c.conversation_code and self.actor_code=me
 ) q(row_data,kind,created_at,updated_at,title,members,last_at,last_message)),'[]'::jsonb));
end $$;
revoke all on function public.fenix_prod_chat_conversations_user() from public,anon;
grant execute on function public.fenix_prod_chat_conversations_user() to authenticated,service_role;

create or replace function public.fenix_prod_chat_conversation_create_user(p_member_actor_codes text[],p_title text default null)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; members text[]; ccode text; ckind text; bad integer; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 select array_agg(distinct x order by x) into members from unnest(array_append(coalesce(p_member_actor_codes,array[]::text[]),me)) x where nullif(btrim(x),'') is not null;
 if coalesce(cardinality(members),0)<2 then return jsonb_build_object('ok',false,'status',400,'error','select_at_least_one_person'); end if;
 select count(*) into bad from unnest(members) x left join fenix_prod.actors a on a.actor_code=x and a.active where a.actor_code is null;
 if bad>0 then return jsonb_build_object('ok',false,'status',400,'error','invalid_member'); end if;
 ckind:=case when cardinality(members)=2 then 'direct' else 'group' end;
 if ckind='direct' then
   select c.conversation_code into ccode from fenix_prod.chat_conversations c where c.kind='direct' and (select array_agg(cm.actor_code order by cm.actor_code) from fenix_prod.chat_conversation_members cm where cm.conversation_code=c.conversation_code)=members limit 1;
 end if;
 if ccode is null then
   insert into fenix_prod.chat_conversations(kind,title,created_by_actor_code) values(ckind,case when ckind='group' then left(coalesce(nullif(btrim(p_title),''),'Grupo'),120) else null end,me) returning conversation_code into ccode;
   insert into fenix_prod.chat_conversation_members(conversation_code,actor_code) select ccode,x from unnest(members) x;
 end if;
 return jsonb_build_object('ok',true,'status',201,'conversation_code',ccode,'kind',ckind);
end $$;
revoke all on function public.fenix_prod_chat_conversation_create_user(text[],text) from public,anon;
grant execute on function public.fenix_prod_chat_conversation_create_user(text[],text) to authenticated,service_role;

create or replace function public.fenix_prod_chat_list_v2_user(p_conversation_code text,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; lim integer:=greatest(1,least(coalesce(p_limit,100),200)); begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null or not exists(select 1 from fenix_prod.chat_conversation_members where conversation_code=p_conversation_code and actor_code=me) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 return jsonb_build_object('ok',true,'status',200,'conversation_code',p_conversation_code,'items',coalesce((select jsonb_agg(x order by x.created_at asc) from (
  select m.message_code,m.sender_actor_code,coalesce(a.display_name,m.sender_actor_code) sender_name,a.role sender_role,m.body,m.created_at,
   coalesce((select jsonb_agg(jsonb_build_object('attachment_code',ca.attachment_code,'filename',ca.filename,'mime_type',ca.mime_type,'size_bytes',ca.size_bytes,'storage_path',ca.storage_path,'created_at',ca.created_at) order by ca.created_at) from fenix_prod.chat_attachments ca where ca.message_code=m.message_code),'[]'::jsonb) attachments
  from fenix_prod.chat_messages m join fenix_prod.actors a on a.actor_code=m.sender_actor_code where m.conversation_code=p_conversation_code order by m.created_at desc limit lim
 ) x),'[]'::jsonb));
end $$;
revoke all on function public.fenix_prod_chat_list_v2_user(text,integer) from public,anon;
grant execute on function public.fenix_prod_chat_list_v2_user(text,integer) to authenticated,service_role;

create or replace function public.fenix_prod_chat_send_v2_user(p_conversation_code text,p_body text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; code text; clean text:=btrim(coalesce(p_body,'')); begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null or not exists(select 1 from fenix_prod.chat_conversation_members where conversation_code=p_conversation_code and actor_code=me) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if clean='' or length(clean)>5000 then return jsonb_build_object('ok',false,'status',400,'error','invalid_body'); end if;
 insert into fenix_prod.chat_messages(channel_code,conversation_code,sender_actor_code,body,idempotency_key) values('CHAT',p_conversation_code,me,clean,left(coalesce(nullif(btrim(p_idempotency_key),''),gen_random_uuid()::text),200)) on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning message_code into code;
 update fenix_prod.chat_conversations set updated_at=now() where conversation_code=p_conversation_code;
 return jsonb_build_object('ok',true,'status',201,'item',jsonb_build_object('message_code',code,'sender_actor_code',me,'body',clean,'created_at',now()));
end $$;
revoke all on function public.fenix_prod_chat_send_v2_user(text,text,text) from public,anon;
grant execute on function public.fenix_prod_chat_send_v2_user(text,text,text) to authenticated,service_role;

create or replace function public.fenix_prod_chat_attachment_add_v2_user(p_message_code text,p_storage_path text,p_filename text,p_mime_type text,p_size_bytes bigint)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; uid uuid:=auth.uid(); code text; conv text; begin
 if uid is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=uid and active limit 1;
 select conversation_code into conv from fenix_prod.chat_messages where message_code=p_message_code and sender_actor_code=me;
 if me is null or conv is null or not exists(select 1 from fenix_prod.chat_conversation_members where conversation_code=conv and actor_code=me) then return jsonb_build_object('ok',false,'status',403,'error','message_not_owned'); end if;
 if p_storage_path is null or p_storage_path not like uid::text||'/%' then return jsonb_build_object('ok',false,'status',400,'error','invalid_storage_path'); end if;
 if coalesce(p_size_bytes,0)<=0 or p_size_bytes>20971520 then return jsonb_build_object('ok',false,'status',400,'error','invalid_size'); end if;
 insert into fenix_prod.chat_attachments(message_code,uploader_actor_code,storage_path,filename,mime_type,size_bytes) values(p_message_code,me,p_storage_path,left(coalesce(nullif(btrim(p_filename),''),'archivo'),240),p_mime_type,p_size_bytes) returning attachment_code into code;
 return jsonb_build_object('ok',true,'status',201,'attachment_code',code);
 exception when unique_violation then return jsonb_build_object('ok',false,'status',409,'error','attachment_exists'); end $$;
revoke all on function public.fenix_prod_chat_attachment_add_v2_user(text,text,text,text,bigint) from public,anon;
grant execute on function public.fenix_prod_chat_attachment_add_v2_user(text,text,text,text,bigint) to authenticated,service_role;

drop policy if exists fenix_prod_chat_storage_select on storage.objects;
create policy fenix_prod_chat_storage_select on storage.objects for select to authenticated using(
 bucket_id='fenix-prod-chat' and exists(
  select 1 from fenix_prod.chat_attachments ca join fenix_prod.chat_messages m on m.message_code=ca.message_code join fenix_prod.actors me on me.auth_user_id=auth.uid() and me.active
  where ca.storage_path=name and (m.channel_code='EQUIPO' or exists(select 1 from fenix_prod.chat_conversation_members cm where cm.conversation_code=m.conversation_code and cm.actor_code=me.actor_code))
 )
);
