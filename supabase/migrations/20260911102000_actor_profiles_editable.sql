create table if not exists fenix_prod.actor_profiles(
  actor_code text primary key references fenix_prod.actors(actor_code) on delete cascade,
  username text,
  birth_date date,
  contact_email text,
  phone text,
  job_title text,
  zone text,
  bio text,
  linkedin text,
  instagram text,
  website text,
  avatar_url text,
  updated_at timestamptz not null default now(),
  updated_by_actor_code text references fenix_prod.actors(actor_code)
);
create unique index if not exists actor_profiles_username_ci_uidx on fenix_prod.actor_profiles(lower(username)) where username is not null and btrim(username)<>'';
revoke all on fenix_prod.actor_profiles from public,anon,authenticated;
alter table fenix_prod.actor_profiles enable row level security;

create or replace function public.fenix_prod_profile_get_user()
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare me fenix_prod.actors%rowtype; p fenix_prod.actor_profiles%rowtype; begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select * into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me.actor_code is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 select * into p from fenix_prod.actor_profiles where actor_code=me.actor_code;
 return jsonb_build_object('ok',true,'status',200,'item',jsonb_build_object(
  'actor_code',me.actor_code,'role',me.role,'display_name',coalesce(me.display_name,''),'username',coalesce(p.username,''),
  'birth_date',p.birth_date,'contact_email',coalesce(p.contact_email,''),'phone',coalesce(p.phone,''),'job_title',coalesce(p.job_title,''),
  'zone',coalesce(p.zone,''),'bio',coalesce(p.bio,''),'linkedin',coalesce(p.linkedin,''),'instagram',coalesce(p.instagram,''),
  'website',coalesce(p.website,''),'avatar_url',coalesce(p.avatar_url,''),'updated_at',p.updated_at
 ));
end $$;
revoke all on function public.fenix_prod_profile_get_user() from public,anon;
grant execute on function public.fenix_prod_profile_get_user() to authenticated,service_role;

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
 values(me,my_role,'perfil',me,'profile_update',jsonb_build_array('display_name','username','birth_date','contact_email','phone','job_title','zone','bio','linkedin','instagram','website','avatar_url'),'profile-self-service');
 return public.fenix_prod_profile_get_user();
 exception when unique_violation then return jsonb_build_object('ok',false,'status',409,'error','username_taken'); end $$;
revoke all on function public.fenix_prod_profile_update_user(jsonb) from public,anon;
grant execute on function public.fenix_prod_profile_update_user(jsonb) to authenticated,service_role;
