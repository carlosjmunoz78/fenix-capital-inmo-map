begin;

alter table fenix_prod.actors
  add column if not exists created_by_auth_user_id uuid,
  add column if not exists created_by_actor_code text,
  add column if not exists profile_kind text;

update fenix_prod.actors
set profile_kind = case
  when actor_code='CARLOS-ADMIN' then 'Carlos'
  when actor_code='BELEN-DIR' then 'Belen'
  when role='Financiero' then 'Financiero'
  when role='Visitador' then 'Visitador'
  when role='Direccion' then 'Director'
  else role
end
where profile_kind is null;

alter table fenix_prod.actors
  drop constraint if exists actors_profile_kind_check;

alter table fenix_prod.actors
  add constraint actors_profile_kind_check
  check (profile_kind is null or profile_kind in ('Carlos','Belen','Director','Financiero','Visitador'));

create index if not exists idx_actors_created_by_auth_user_id
  on fenix_prod.actors(created_by_auth_user_id)
  where created_by_auth_user_id is not null;

create index if not exists idx_actors_created_by_actor_code
  on fenix_prod.actors(created_by_actor_code)
  where created_by_actor_code is not null;

create or replace function public.fenix_prod_user_admin_register_server(p_actor_code text,p_auth_user_id uuid,p_email text,p_display_name text,p_role text)
returns jsonb language plpgsql security definer set search_path='fenix_prod','public','pg_temp' as $$
declare g jsonb; r text; code text; creator_auth uuid; profile text;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code);
 if not coalesce((g->>'ok')::boolean,false) then return g; end if;
 r:=g->>'role';
 if r<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if p_role not in ('Direccion','Financiero','Visitador') then return jsonb_build_object('ok',false,'status',400,'error','invalid_role'); end if;
 if p_role='Direccion' and p_actor_code<>'CARLOS-ADMIN' then return jsonb_build_object('ok',false,'status',403,'error','director_creation_forbidden'); end if;
 if exists(select 1 from fenix_prod.actors where auth_user_id=p_auth_user_id) then return jsonb_build_object('ok',false,'status',409,'error','already_linked'); end if;
 select auth_user_id into creator_auth from fenix_prod.actors where actor_code=p_actor_code and active;
 code:=case p_role when 'Direccion' then 'DIR-' when 'Financiero' then 'FIN-' else 'VIS-' end || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 profile:=case p_role when 'Direccion' then 'Director' when 'Financiero' then 'Financiero' else 'Visitador' end;
 insert into fenix_prod.actors(actor_code,auth_user_id,role,active,display_name,created_by_auth_user_id,created_by_actor_code,profile_kind)
 values(code,p_auth_user_id,p_role,true,nullif(trim(p_display_name),''),creator_auth,p_actor_code,profile);
 insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref)
 values(p_actor_code,r,'usuario',code,'create',jsonb_build_array('email','display_name','role'),'profile-user-admin',p_email);
 return jsonb_build_object('ok',true,'status',201,'actor_code',code,'role',p_role);
end $$;
revoke all on function public.fenix_prod_user_admin_register_server(text,uuid,text,text,text) from public,anon;
grant execute on function public.fenix_prod_user_admin_register_server(text,uuid,text,text,text) to service_role;

create or replace function public.fenix_prod_user_admin_list_server(p_actor_code text)
returns jsonb language plpgsql security definer set search_path='fenix_prod','public','auth','pg_temp' as $$
declare g jsonb; r text; items jsonb;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code);
 if not coalesce((g->>'ok')::boolean,false) then return g; end if;
 r:=g->>'role';
 if r<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',a.display_name,'role',a.role,'email',u.email,'active',a.active) order by a.display_name nulls last,a.actor_code),'[]'::jsonb)
 into items
 from fenix_prod.actors a left join auth.users u on u.id=a.auth_user_id
 where a.active and a.created_by_actor_code=p_actor_code;
 return jsonb_build_object('ok',true,'status',200,'items',items,'can_create_director',p_actor_code='CARLOS-ADMIN');
end $$;
revoke all on function public.fenix_prod_user_admin_list_server(text) from public,anon;
grant execute on function public.fenix_prod_user_admin_list_server(text) to service_role;

create or replace function public.fenix_prod_user_admin_target_server(p_actor_code text,p_target_actor_code text)
returns jsonb language plpgsql security definer set search_path='fenix_prod','public','pg_temp' as $$
declare g jsonb; r text; t fenix_prod.actors%rowtype;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code);
 if not coalesce((g->>'ok')::boolean,false) then return g; end if;
 r:=g->>'role';
 if r<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into t from fenix_prod.actors where actor_code=p_target_actor_code and active;
 if t.id is null or t.auth_user_id is null then return jsonb_build_object('ok',false,'status',404,'error','target_not_found'); end if;
 if t.actor_code=p_actor_code then return jsonb_build_object('ok',false,'status',400,'error','use_self_password_change'); end if;
 if t.created_by_actor_code is distinct from p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','target_not_created_by_actor'); end if;
 return jsonb_build_object('ok',true,'status',200,'auth_user_id',t.auth_user_id,'target_role',t.role);
end $$;
revoke all on function public.fenix_prod_user_admin_target_server(text,text) from public,anon;
grant execute on function public.fenix_prod_user_admin_target_server(text,text) to service_role;

commit;