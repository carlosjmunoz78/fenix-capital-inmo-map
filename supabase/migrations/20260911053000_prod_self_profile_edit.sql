create or replace function public.fenix_prod_profile_get_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path = 'fenix_prod','public','auth','pg_temp'
as $$
declare a fenix_prod.actors%rowtype; v_email text;
begin
  select * into a from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','profile_not_found'); end if;
  select u.email::text into v_email from auth.users u where u.id=a.auth_user_id;
  return jsonb_build_object('ok',true,'status',200,'profile',jsonb_build_object(
    'actor_code',a.actor_code,'display_name',a.display_name,'role',a.role,
    'zone_code',a.zone_code,'email',v_email,'active',a.active
  ));
end
$$;

create or replace function public.fenix_prod_profile_update_server(
  p_actor_code text,
  p_display_name text,
  p_zone_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'fenix_prod','public','auth','pg_temp'
as $$
declare
  a fenix_prod.actors%rowtype;
  v_name text := trim(coalesce(p_display_name,''));
  v_zone text := nullif(trim(coalesce(p_zone_code,'')),'');
  v_changed jsonb := '{}'::jsonb;
  v_email text;
begin
  if length(v_name)<2 or length(v_name)>120 or length(coalesce(v_zone,''))>80 then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_profile_fields');
  end if;
  select * into a from fenix_prod.actors where actor_code=p_actor_code and active=true for update;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','profile_not_found'); end if;

  if a.display_name is distinct from v_name then
    v_changed := v_changed || jsonb_build_object('display_name',jsonb_build_object('from',a.display_name,'to',v_name));
  end if;
  if a.zone_code is distinct from v_zone then
    v_changed := v_changed || jsonb_build_object('zone_code',jsonb_build_object('from',a.zone_code,'to',v_zone));
  end if;

  update fenix_prod.actors set display_name=v_name,zone_code=v_zone where actor_code=p_actor_code;
  if v_changed <> '{}'::jsonb then
    insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref,occurred_at)
    values(a.actor_code,a.role,'profile',a.actor_code,'profile.updated',v_changed,'fenix-profile-api',a.auth_user_id::text,now());
  end if;
  select u.email::text into v_email from auth.users u where u.id=a.auth_user_id;
  return jsonb_build_object('ok',true,'status',200,'profile',jsonb_build_object(
    'actor_code',a.actor_code,'display_name',v_name,'role',a.role,
    'zone_code',v_zone,'email',v_email,'active',a.active
  ));
end
$$;

revoke all on function public.fenix_prod_profile_get_server(text) from public,anon,authenticated;
revoke all on function public.fenix_prod_profile_update_server(text,text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_profile_get_server(text) to service_role;
grant execute on function public.fenix_prod_profile_update_server(text,text,text) to service_role;
