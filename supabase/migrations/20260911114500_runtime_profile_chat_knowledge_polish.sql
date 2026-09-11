begin;

alter table fenix_prod.actor_profiles
  add column if not exists facebook text,
  add column if not exists x_twitter text,
  add column if not exists tiktok text,
  add column if not exists youtube text,
  add column if not exists threads text,
  add column if not exists telegram text;

create or replace function public.fenix_prod_profile_socials_get_user()
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; p fenix_prod.actor_profiles%rowtype; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 select * into p from fenix_prod.actor_profiles where actor_code=me;
 return jsonb_build_object('ok',true,'status',200,'item',jsonb_build_object(
  'facebook',coalesce(p.facebook,''),'x_twitter',coalesce(p.x_twitter,''),'tiktok',coalesce(p.tiktok,''),
  'youtube',coalesce(p.youtube,''),'threads',coalesce(p.threads,''),'telegram',coalesce(p.telegram,'')));
end $$;
revoke all on function public.fenix_prod_profile_socials_get_user() from public,anon;
grant execute on function public.fenix_prod_profile_socials_get_user() to authenticated,service_role;

create or replace function public.fenix_prod_profile_socials_update_user(p_socials jsonb)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; my_role text; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code,role into me,my_role from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 insert into fenix_prod.actor_profiles(actor_code,facebook,x_twitter,tiktok,youtube,threads,telegram,updated_at,updated_by_actor_code)
 values(me,left(btrim(coalesce(p_socials->>'facebook','')),400),left(btrim(coalesce(p_socials->>'x_twitter','')),400),left(btrim(coalesce(p_socials->>'tiktok','')),400),left(btrim(coalesce(p_socials->>'youtube','')),400),left(btrim(coalesce(p_socials->>'threads','')),400),left(btrim(coalesce(p_socials->>'telegram','')),400),now(),me)
 on conflict(actor_code) do update set facebook=excluded.facebook,x_twitter=excluded.x_twitter,tiktok=excluded.tiktok,youtube=excluded.youtube,threads=excluded.threads,telegram=excluded.telegram,updated_at=now(),updated_by_actor_code=me;
 insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source)
 values(me,my_role,'perfil',me,'UPDATE',jsonb_build_array('facebook','x_twitter','tiktok','youtube','threads','telegram'),'profile-self-service');
 return jsonb_build_object('ok',true,'status',200);
end $$;
revoke all on function public.fenix_prod_profile_socials_update_user(jsonb) from public,anon;
grant execute on function public.fenix_prod_profile_socials_update_user(jsonb) to authenticated,service_role;

-- Corrige el fallo real de guardado del perfil: activity_log solo admite INSERT/UPDATE/DELETE.
create or replace function public.fenix_prod_profile_update_user(p_profile jsonb)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; my_role text; new_name text:=left(btrim(coalesce(p_profile->>'display_name','')),120); new_username text:=nullif(left(btrim(coalesce(p_profile->>'username','')),80),''); bd date; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code,role into me,my_role from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 if new_name='' then return jsonb_build_object('ok',false,'status',400,'error','display_name_required'); end if;
 begin bd:=nullif(p_profile->>'birth_date','')::date; exception when others then return jsonb_build_object('ok',false,'status',400,'error','invalid_birth_date'); end;
 if bd is not null and (bd>current_date or bd<date '1900-01-01') then return jsonb_build_object('ok',false,'status',400,'error','invalid_birth_date'); end if;
 if new_username is not null and exists(select 1 from fenix_prod.actor_profiles ap where lower(ap.username)=lower(new_username) and ap.actor_code<>me) then return jsonb_build_object('ok',false,'status',409,'error','username_taken'); end if;
 update fenix_prod.actors set display_name=new_name where actor_code=me;
 insert into fenix_prod.actor_profiles(actor_code,username,birth_date,contact_email,phone,job_title,zone,bio,linkedin,instagram,website,avatar_url,updated_at,updated_by_actor_code)
 values(me,new_username,bd,left(btrim(coalesce(p_profile->>'contact_email','')),180),left(btrim(coalesce(p_profile->>'phone','')),60),left(btrim(coalesce(p_profile->>'job_title','')),120),left(btrim(coalesce(p_profile->>'zone','')),120),left(coalesce(p_profile->>'bio',''),3000),left(btrim(coalesce(p_profile->>'linkedin','')),400),left(btrim(coalesce(p_profile->>'instagram','')),400),left(btrim(coalesce(p_profile->>'website','')),400),left(btrim(coalesce(p_profile->>'avatar_url','')),800),now(),me)
 on conflict(actor_code) do update set username=excluded.username,birth_date=excluded.birth_date,contact_email=excluded.contact_email,phone=excluded.phone,job_title=excluded.job_title,zone=excluded.zone,bio=excluded.bio,linkedin=excluded.linkedin,instagram=excluded.instagram,website=excluded.website,avatar_url=excluded.avatar_url,updated_at=now(),updated_by_actor_code=me;
 insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source)
 values(me,my_role,'perfil',me,'UPDATE',jsonb_build_array('display_name','username','birth_date','contact_email','phone','job_title','zone','bio','linkedin','instagram','website','avatar_url'),'profile-self-service');
 return public.fenix_prod_profile_get_user();
 exception when unique_violation then return jsonb_build_object('ok',false,'status',409,'error','username_taken'); end $$;
revoke all on function public.fenix_prod_profile_update_user(jsonb) from public,anon;
grant execute on function public.fenix_prod_profile_update_user(jsonb) to authenticated,service_role;

create or replace function public.fenix_prod_chat_group_create_user(p_member_actor_codes text[],p_title text)
returns jsonb language plpgsql security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; members text[]; ccode text; bad integer; clean_title text:=left(coalesce(nullif(btrim(p_title),''),'Grupo'),120); begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 select array_agg(distinct x order by x) into members from unnest(array_append(coalesce(p_member_actor_codes,array[]::text[]),me)) x where nullif(btrim(x),'') is not null;
 if coalesce(cardinality(members),0)<2 then return jsonb_build_object('ok',false,'status',400,'error','select_at_least_one_person'); end if;
 select count(*) into bad from unnest(members) x left join fenix_prod.actors a on a.actor_code=x and a.active where a.actor_code is null;
 if bad>0 then return jsonb_build_object('ok',false,'status',400,'error','invalid_member'); end if;
 insert into fenix_prod.chat_conversations(kind,title,created_by_actor_code) values('group',clean_title,me) returning conversation_code into ccode;
 insert into fenix_prod.chat_conversation_members(conversation_code,actor_code) select ccode,x from unnest(members) x;
 return jsonb_build_object('ok',true,'status',201,'conversation_code',ccode,'kind','group');
end $$;
revoke all on function public.fenix_prod_chat_group_create_user(text[],text) from public,anon;
grant execute on function public.fenix_prod_chat_group_create_user(text[],text) to authenticated,service_role;

create table if not exists fenix_prod.ana_knowledge_cards(
  knowledge_code text primary key,
  title text not null,
  answer text not null,
  status text not null default 'approved' check(status in ('approved','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on fenix_prod.ana_knowledge_cards from public,anon,authenticated;
alter table fenix_prod.ana_knowledge_cards enable row level security;

insert into fenix_prod.ana_knowledge_cards(knowledge_code,title,answer,status)
values('HIP-FUNC-100-DOCS','Documentación · funcionario · hipoteca 100%',
'Para estudiar una hipoteca al 100% de un funcionario, la documentación base en Fénix es: DNI/NIE; contrato o acreditación laboral; 3 últimas nóminas; vida laboral; movimientos bancarios de los últimos 6 meses; IRPF o certificado de retenciones; detalle de préstamos y otras deudas; precio y dirección del inmueble; honorarios de agencia si existen; contrato de arras si existe; y nota simple o referencia catastral. Para el 100% se revisa además el cumplimiento de los criterios vigentes de primera vivienda y ausencia de deudas con Seguridad Social o Hacienda.',
'approved')
on conflict(knowledge_code) do update set title=excluded.title,answer=excluded.answer,status='approved',updated_at=now();

create or replace function public.fenix_prod_ana_knowledge_answer_user(p_question text)
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me text; q text:=lower(coalesce(p_question,'')); ans text; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 if q like '%funcionario%' and (q like '%hipoteca%' or q like '%financi%') and (q like '%100%' or q like '%document%') then
  select answer into ans from fenix_prod.ana_knowledge_cards where knowledge_code='HIP-FUNC-100-DOCS' and status='approved';
 end if;
 if ans is null then return jsonb_build_object('ok',true,'status',200,'found',false); end if;
 return jsonb_build_object('ok',true,'status',200,'found',true,'answer',ans,'source','CEREBRO_CANONICAL');
end $$;
revoke all on function public.fenix_prod_ana_knowledge_answer_user(text) from public,anon;
grant execute on function public.fenix_prod_ana_knowledge_answer_user(text) to authenticated,service_role;

commit;
