insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fenix-prod-chat','fenix-prod-chat',false,20971520,array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/opus','audio/aac','audio/flac'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists fenix_prod_chat_storage_insert on storage.objects;
create policy fenix_prod_chat_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='fenix-prod-chat' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from fenix_prod.actors a where a.auth_user_id=auth.uid() and a.active));
drop policy if exists fenix_prod_chat_storage_select on storage.objects;
create policy fenix_prod_chat_storage_select on storage.objects for select to authenticated
using(bucket_id='fenix-prod-chat' and exists(select 1 from fenix_prod.actors a where a.auth_user_id=auth.uid() and a.active));
drop policy if exists fenix_prod_chat_storage_delete_own on storage.objects;
create policy fenix_prod_chat_storage_delete_own on storage.objects for delete to authenticated
using(bucket_id='fenix-prod-chat' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from fenix_prod.actors a where a.auth_user_id=auth.uid() and a.active));

create table fenix_prod.chat_attachments(
 id uuid primary key default gen_random_uuid(),
 attachment_code text not null unique default ('CHATATT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20))),
 message_code text not null references fenix_prod.chat_messages(message_code) on delete cascade,
 uploader_actor_code text not null references fenix_prod.actors(actor_code),
 storage_path text not null unique,
 filename text not null,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=20971520),
 created_at timestamptz not null default now()
);
revoke all on fenix_prod.chat_attachments from public,anon,authenticated;
alter table fenix_prod.chat_attachments enable row level security;
create index chat_attachments_message_idx on fenix_prod.chat_attachments(message_code,created_at);

create or replace function public.fenix_prod_chat_attachment_add_user(p_message_code text,p_storage_path text,p_filename text,p_mime_type text,p_size_bytes bigint)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare v_actor text; v_uid uuid:=auth.uid(); v_code text; begin
 if v_uid is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into v_actor from fenix_prod.actors where auth_user_id=v_uid and active limit 1;
 if v_actor is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 if not exists(select 1 from fenix_prod.chat_messages where message_code=p_message_code and sender_actor_code=v_actor and channel_code='EQUIPO') then return jsonb_build_object('ok',false,'status',403,'error','message_not_owned'); end if;
 if p_storage_path is null or p_storage_path not like v_uid::text||'/%' then return jsonb_build_object('ok',false,'status',400,'error','invalid_storage_path'); end if;
 if coalesce(p_size_bytes,0)<=0 or p_size_bytes>20971520 then return jsonb_build_object('ok',false,'status',400,'error','invalid_size'); end if;
 if coalesce(p_mime_type,'') not in ('image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/opus','audio/aac','audio/flac') then return jsonb_build_object('ok',false,'status',400,'error','invalid_mime'); end if;
 insert into fenix_prod.chat_attachments(message_code,uploader_actor_code,storage_path,filename,mime_type,size_bytes) values(p_message_code,v_actor,p_storage_path,left(coalesce(nullif(btrim(p_filename),''),'archivo'),240),p_mime_type,p_size_bytes) returning attachment_code into v_code;
 return jsonb_build_object('ok',true,'status',201,'attachment_code',v_code);
 exception when unique_violation then return jsonb_build_object('ok',false,'status',409,'error','attachment_exists'); end $$;
revoke all on function public.fenix_prod_chat_attachment_add_user(text,text,text,text,bigint) from public,anon;
grant execute on function public.fenix_prod_chat_attachment_add_user(text,text,text,text,bigint) to authenticated,service_role;

create or replace function public.fenix_prod_chat_list_server(p_actor_code text,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','pg_temp' as $$
declare v_limit integer:=greatest(1,least(coalesce(p_limit,100),200)); begin
 if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 return jsonb_build_object('ok',true,'status',200,'channel','EQUIPO','items',coalesce((select jsonb_agg(x order by x.created_at asc) from (
  select m.message_code,m.sender_actor_code,coalesce(a.display_name,m.sender_actor_code) sender_name,a.role sender_role,m.body,m.created_at,
   coalesce((select jsonb_agg(jsonb_build_object('attachment_code',ca.attachment_code,'filename',ca.filename,'mime_type',ca.mime_type,'size_bytes',ca.size_bytes,'storage_path',ca.storage_path,'created_at',ca.created_at) order by ca.created_at) from fenix_prod.chat_attachments ca where ca.message_code=m.message_code),'[]'::jsonb) attachments
  from fenix_prod.chat_messages m join fenix_prod.actors a on a.actor_code=m.sender_actor_code where m.channel_code='EQUIPO' order by m.created_at desc limit v_limit
 ) x),'[]'::jsonb));
end $$;
