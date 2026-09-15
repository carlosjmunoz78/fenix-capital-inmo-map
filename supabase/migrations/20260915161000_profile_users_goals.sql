-- FENIX profile / user hierarchy / monthly goals.
-- Additive where possible; existing actors/auth identities remain authoritative.

create table if not exists fenix_prod.performance_goals (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'FENIX',
  scope_type text not null check (scope_type in ('ROLE','USER')),
  scope_code text not null,
  metric_code text not null check (metric_code in ('EXPEDIENTES','FIRMAS','INMOBILIARIAS')),
  period_type text not null default 'MONTH' check (period_type='MONTH'),
  target_value integer not null check (target_value>=0),
  effective_from date not null default date_trunc('month',current_date)::date,
  effective_to date,
  active boolean not null default true,
  updated_by_actor_code text not null references fenix_prod.actors(actor_code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to>=effective_from)
);

create index if not exists performance_goals_lookup_idx
  on fenix_prod.performance_goals(company_id,scope_type,scope_code,metric_code,effective_from desc)
  where active;

-- Seed requested defaults only when that role/metric has no active definition.
insert into fenix_prod.performance_goals(company_id,scope_type,scope_code,metric_code,target_value,updated_by_actor_code)
select 'FENIX','ROLE',x.role,x.metric,x.target,'CARLOS-ADMIN'
from (values
  ('Financiero','FIRMAS',4),
  ('Financiero','EXPEDIENTES',10),
  ('Visitador','EXPEDIENTES',10),
  ('Visitador','INMOBILIARIAS',3),
  ('Direccion','FIRMAS',3),
  ('Direccion','EXPEDIENTES',10)
) as x(role,metric,target)
where exists(select 1 from fenix_prod.actors where actor_code='CARLOS-ADMIN')
  and not exists(
    select 1 from fenix_prod.performance_goals g
    where g.company_id='FENIX' and g.scope_type='ROLE' and g.scope_code=x.role
      and g.metric_code=x.metric and g.active
  );

create or replace function public.fenix_prod_profile_get_user()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','auth','pg_temp'
as $function$
declare me fenix_prod.actors%rowtype; p fenix_prod.actor_profiles%rowtype;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select * into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me.actor_code is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 select * into p from fenix_prod.actor_profiles where actor_code=me.actor_code;
 return jsonb_build_object('ok',true,'status',200,'item',jsonb_build_object(
  'actor_code',me.actor_code,'role',me.role,'display_name',coalesce(me.display_name,''),'username',coalesce(p.username,''),
  'birth_date',p.birth_date,'contact_email',coalesce(p.contact_email,''),'phone',coalesce(p.phone,''),'job_title',coalesce(p.job_title,''),
  'zone',coalesce(p.zone,''),'bio',coalesce(p.bio,''),'linkedin',coalesce(p.linkedin,''),'instagram',coalesce(p.instagram,''),
  'facebook',coalesce(p.facebook,''),'x_twitter',coalesce(p.x_twitter,''),'tiktok',coalesce(p.tiktok,''),'youtube',coalesce(p.youtube,''),
  'threads',coalesce(p.threads,''),'telegram',coalesce(p.telegram,''),'website',coalesce(p.website,''),'avatar_url',coalesce(p.avatar_url,''),
  'updated_at',p.updated_at
 ));
end $function$;

create or replace function public.fenix_prod_profile_update_user(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','auth','pg_temp'
as $function$
declare
 me text; my_role text;
 new_name text:=left(btrim(coalesce(p_profile->>'display_name','')),120);
 new_username text:=nullif(left(btrim(coalesce(p_profile->>'username','')),80),'');
 bd date;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code,role into me,my_role from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 if new_name='' then return jsonb_build_object('ok',false,'status',400,'error','display_name_required'); end if;
 begin bd:=nullif(p_profile->>'birth_date','')::date; exception when others then return jsonb_build_object('ok',false,'status',400,'error','invalid_birth_date'); end;
 if bd is not null and (bd>current_date or bd<date '1900-01-01') then return jsonb_build_object('ok',false,'status',400,'error','invalid_birth_date'); end if;
 if new_username is not null and exists(select 1 from fenix_prod.actor_profiles ap where lower(ap.username)=lower(new_username) and ap.actor_code<>me) then return jsonb_build_object('ok',false,'status',409,'error','username_taken'); end if;
 update fenix_prod.actors set display_name=new_name where actor_code=me;
 insert into fenix_prod.actor_profiles(
   actor_code,username,birth_date,contact_email,phone,job_title,zone,bio,linkedin,instagram,facebook,x_twitter,tiktok,youtube,threads,telegram,website,avatar_url,updated_at,updated_by_actor_code
 ) values(
   me,new_username,bd,left(btrim(coalesce(p_profile->>'contact_email','')),180),left(btrim(coalesce(p_profile->>'phone','')),60),
   left(btrim(coalesce(p_profile->>'job_title','')),120),left(btrim(coalesce(p_profile->>'zone','')),120),left(coalesce(p_profile->>'bio',''),3000),
   left(btrim(coalesce(p_profile->>'linkedin','')),400),left(btrim(coalesce(p_profile->>'instagram','')),400),
   left(btrim(coalesce(p_profile->>'facebook','')),400),left(btrim(coalesce(p_profile->>'x_twitter','')),400),
   left(btrim(coalesce(p_profile->>'tiktok','')),400),left(btrim(coalesce(p_profile->>'youtube','')),400),
   left(btrim(coalesce(p_profile->>'threads','')),400),left(btrim(coalesce(p_profile->>'telegram','')),400),
   left(btrim(coalesce(p_profile->>'website','')),400),left(btrim(coalesce(p_profile->>'avatar_url','')),800),now(),me
 ) on conflict(actor_code) do update set
   username=excluded.username,birth_date=excluded.birth_date,contact_email=excluded.contact_email,phone=excluded.phone,job_title=excluded.job_title,zone=excluded.zone,
   bio=excluded.bio,linkedin=excluded.linkedin,instagram=excluded.instagram,facebook=excluded.facebook,x_twitter=excluded.x_twitter,tiktok=excluded.tiktok,
   youtube=excluded.youtube,threads=excluded.threads,telegram=excluded.telegram,website=excluded.website,avatar_url=excluded.avatar_url,updated_at=now(),updated_by_actor_code=me;
 insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source)
 values(me,my_role,'perfil',me,'UPDATE',jsonb_build_array('display_name','username','birth_date','contact_email','phone','job_title','zone','bio','socials','avatar_url'),'profile-self-service');
 return public.fenix_prod_profile_get_user();
 exception when unique_violation then return jsonb_build_object('ok',false,'status',409,'error','username_taken');
end $function$;

create or replace function public.fenix_prod_profile_get_full_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path to 'public','fenix_prod','auth','pg_temp'
as $function$
declare v_auth_user_id uuid;
begin
 select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
 return public.fenix_prod_profile_get_user();
end $function$;

create or replace function public.fenix_prod_profile_update_full_server(p_actor_code text,p_profile jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public','fenix_prod','auth','pg_temp'
as $function$
declare v_auth_user_id uuid;
begin
 select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
 return public.fenix_prod_profile_update_user(p_profile);
end $function$;

create or replace function public.fenix_prod_profile_goals_get_server(p_actor_code text,p_company_id text default 'FENIX')
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare
 a fenix_prod.actors%rowtype;
 month_start date:=date_trunc('month',current_date)::date;
 month_next date:=(date_trunc('month',current_date)+interval '1 month')::date;
 goals jsonb;
begin
 select * into a from fenix_prod.actors where actor_code=p_actor_code and active limit 1;
 if a.actor_code is null then return jsonb_build_object('ok',false,'status',404,'error','actor_not_found'); end if;
 with applicable as (
   select g.metric_code,g.target_value,g.scope_type,g.effective_from,
          row_number() over(partition by g.metric_code order by case when g.scope_type='USER' then 0 else 1 end,g.effective_from desc,g.updated_at desc) rn
   from fenix_prod.performance_goals g
   where g.company_id=p_company_id and g.active and g.period_type='MONTH'
     and g.effective_from<=month_start and (g.effective_to is null or g.effective_to>=month_start)
     and ((g.scope_type='USER' and g.scope_code=a.actor_code) or (g.scope_type='ROLE' and g.scope_code=a.role))
 ), chosen as (
   select metric_code,target_value from applicable where rn=1
 ), actuals as (
   select 'EXPEDIENTES'::text metric_code,count(*)::int actual
   from fenix_prod.expedientes e where e.owner_actor_code=a.actor_code and e.created_at>=month_start and e.created_at<month_next
   union all
   select 'FIRMAS',count(*)::int from fenix_prod.firmas f
   where f.owner_actor_code=a.actor_code and coalesce(f.fecha_firma,f.closed_at,f.created_at)>=month_start and coalesce(f.fecha_firma,f.closed_at,f.created_at)<month_next
   union all
   select 'INMOBILIARIAS',count(*)::int from fenix_prod.inmobiliarias i
   where (i.owner_actor_code=a.actor_code or i.id_visitador_operativo=a.actor_code or i.responsable_fenix=a.actor_code)
     and i.created_at>=month_start and i.created_at<month_next
 ), rows as (
   select c.metric_code,c.target_value,coalesce(x.actual,0) actual,
          greatest(c.target_value-coalesce(x.actual,0),0) missing,
          case when c.target_value=0 then 100 else least(100,round(coalesce(x.actual,0)*100.0/c.target_value))::int end pct
   from chosen c left join actuals x using(metric_code)
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'metric_code',metric_code,'target',target_value,'actual',actual,'missing',missing,'pct',pct,
   'status',case when pct>=100 then 'CUMPLIDO' when pct>=75 then 'CERCA' when pct>=40 then 'EN_CURSO' else 'POR_MEJORAR' end,
   'guidance',case metric_code
      when 'FIRMAS' then case when missing=0 then 'Objetivo mensual cubierto.' else 'Faltan '||missing||' firma(s) para el objetivo mensual.' end
      when 'EXPEDIENTES' then case when missing=0 then 'Objetivo mensual cubierto.' else 'Faltan '||missing||' expediente(s) para el objetivo mensual.' end
      when 'INMOBILIARIAS' then case when missing=0 then 'Objetivo mensual cubierto.' else 'Faltan '||missing||' inmobiliaria(s) para el objetivo mensual.' end
    end
 ) order by metric_code),'[]'::jsonb) into goals from rows;
 return jsonb_build_object('ok',true,'status',200,'actor_code',a.actor_code,'role',a.role,'company_id',p_company_id,'period_start',month_start,'period_end',month_next-1,'items',goals);
end $function$;

create or replace function public.fenix_prod_profile_goal_set_server(
 p_actor_code text,p_scope_type text,p_scope_code text,p_metric_code text,p_target_value integer,p_company_id text default 'FENIX'
)
returns jsonb
language plpgsql security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare admin_role text; target_role text; allowed boolean:=false; month_start date:=date_trunc('month',current_date)::date;
begin
 select role into admin_role from fenix_prod.actors where actor_code=p_actor_code and active;
 if admin_role<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if p_scope_type not in ('ROLE','USER') or p_metric_code not in ('EXPEDIENTES','FIRMAS','INMOBILIARIAS') or p_target_value<0 then return jsonb_build_object('ok',false,'status',400,'error','invalid_input'); end if;
 if p_scope_type='ROLE' then
   target_role:=p_scope_code;
   allowed:=p_actor_code='CARLOS-ADMIN' or (p_actor_code='BELEN-DIR' and target_role in ('Financiero','Visitador'));
 else
   select role into target_role from fenix_prod.actors where actor_code=p_scope_code and active;
   if target_role is null then return jsonb_build_object('ok',false,'status',404,'error','target_not_found'); end if;
   allowed:=p_actor_code='CARLOS-ADMIN' or (p_actor_code='BELEN-DIR' and target_role in ('Financiero','Visitador') and exists(select 1 from fenix_prod.actors where actor_code=p_scope_code and created_by_actor_code='BELEN-DIR'));
 end if;
 if not allowed then return jsonb_build_object('ok',false,'status',403,'error','goal_scope_forbidden'); end if;
 update fenix_prod.performance_goals set active=false,updated_at=now(),updated_by_actor_code=p_actor_code
 where company_id=p_company_id and scope_type=p_scope_type and scope_code=p_scope_code and metric_code=p_metric_code and active and effective_from<=month_start and (effective_to is null or effective_to>=month_start);
 insert into fenix_prod.performance_goals(company_id,scope_type,scope_code,metric_code,target_value,effective_from,updated_by_actor_code)
 values(p_company_id,p_scope_type,p_scope_code,p_metric_code,p_target_value,month_start,p_actor_code);
 insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref)
 values(p_actor_code,admin_role,'objetivo',p_scope_code,'UPDATE',jsonb_build_array(p_metric_code),'profile-goals',p_scope_type||':'||p_target_value::text);
 return jsonb_build_object('ok',true,'status',200,'scope_type',p_scope_type,'scope_code',p_scope_code,'metric_code',p_metric_code,'target',p_target_value);
end $function$;

create or replace function public.fenix_prod_user_admin_list_server(p_actor_code text)
returns jsonb
language plpgsql security definer
set search_path to 'fenix_prod','public','auth','pg_temp'
as $function$
declare g jsonb; r text; items jsonb;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code);
 if not coalesce((g->>'ok')::boolean,false) then return g; end if;
 r:=g->>'role';
 if r<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('actor_code',a.actor_code,'display_name',a.display_name,'role',a.role,'email',u.email,'active',a.active,'created_by_actor_code',a.created_by_actor_code) order by a.display_name nulls last,a.actor_code),'[]'::jsonb)
 into items from fenix_prod.actors a left join auth.users u on u.id=a.auth_user_id
 where a.actor_code not in ('ANA-SYSTEM','CEREBRO-OPS-01')
   and (p_actor_code='CARLOS-ADMIN' or a.actor_code=p_actor_code or a.created_by_actor_code=p_actor_code);
 return jsonb_build_object('ok',true,'status',200,'items',items,'can_create_director',p_actor_code='CARLOS-ADMIN','is_superadmin',p_actor_code='CARLOS-ADMIN');
end $function$;

create or replace function public.fenix_prod_user_admin_target_server(p_actor_code text,p_target_actor_code text)
returns jsonb
language plpgsql security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare g jsonb; r text; t fenix_prod.actors%rowtype;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code);
 if not coalesce((g->>'ok')::boolean,false) then return g; end if;
 r:=g->>'role';
 if r<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into t from fenix_prod.actors where actor_code=p_target_actor_code;
 if t.id is null or t.auth_user_id is null then return jsonb_build_object('ok',false,'status',404,'error','target_not_found'); end if;
 if t.actor_code=p_actor_code then return jsonb_build_object('ok',false,'status',400,'error','use_self_password_change'); end if;
 if p_actor_code='BELEN-DIR' and (t.created_by_actor_code is distinct from p_actor_code or t.role not in ('Financiero','Visitador')) then return jsonb_build_object('ok',false,'status',403,'error','target_not_managed'); end if;
 return jsonb_build_object('ok',true,'status',200,'auth_user_id',t.auth_user_id,'target_role',t.role);
end $function$;

create or replace function public.fenix_prod_user_admin_update_server(
 p_actor_code text,p_target_actor_code text,p_display_name text,p_role text,p_active boolean
)
returns jsonb
language plpgsql security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare g jsonb; r text; t fenix_prod.actors%rowtype;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code);
 if not coalesce((g->>'ok')::boolean,false) then return g; end if;
 r:=g->>'role';
 if r<>'Direccion' or p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into t from fenix_prod.actors where actor_code=p_target_actor_code;
 if t.id is null then return jsonb_build_object('ok',false,'status',404,'error','target_not_found'); end if;
 if p_target_actor_code='CARLOS-ADMIN' and p_actor_code<>'CARLOS-ADMIN' then return jsonb_build_object('ok',false,'status',403,'error','superadmin_protected'); end if;
 if p_role not in ('Direccion','Financiero','Visitador') then return jsonb_build_object('ok',false,'status',400,'error','invalid_role'); end if;
 if p_actor_code='BELEN-DIR' and (t.created_by_actor_code is distinct from 'BELEN-DIR' or p_role not in ('Financiero','Visitador')) then return jsonb_build_object('ok',false,'status',403,'error','target_not_managed'); end if;
 if p_actor_code='CARLOS-ADMIN' and p_target_actor_code='CARLOS-ADMIN' and (p_role<>'Direccion' or not p_active) then return jsonb_build_object('ok',false,'status',400,'error','superadmin_self_protected'); end if;
 update fenix_prod.actors set display_name=left(nullif(btrim(p_display_name),''),120),role=p_role,profile_kind=case p_role when 'Direccion' then 'Director' when 'Financiero' then 'Financiero' else 'Visitador' end,active=p_active where actor_code=p_target_actor_code;
 insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source)
 values(p_actor_code,r,'usuario',p_target_actor_code,'UPDATE',jsonb_build_array('display_name','role','active'),'profile-user-admin');
 return jsonb_build_object('ok',true,'status',200,'actor_code',p_target_actor_code,'role',p_role,'active',p_active);
end $function$;
