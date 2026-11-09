-- PRE-CHANGE EXACT ROLLBACK. Check drift before applying.
BEGIN;
CREATE OR REPLACE FUNCTION public.fenix_prod_exp_stage_server(p_actor_code text, p_exp_code text, p_expected_version integer, p_new_stage text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'fenix_prod', 'public', 'pg_temp'
AS $function$
declare
  a fenix_prod.actors%rowtype;
  e fenix_prod.expedientes%rowtype;
  v_stage text:=trim(coalesce(p_new_stage,''));
  v_restore text;
  v_source text:='manual';
  v_allowed constant text[] := array['Entrada','Documentación','Documentación incompleta','Documentación completa','Análisis','Tasación','Pre-OK + Tasación realizada','Tasación realizada','Notaría','Cierre','Finalizado','Baja','Pausado','Perdido','Revisión legado'];
begin
  select * into a from fenix_prod.actors where actor_code=p_actor_code and active=true;
  if not found or a.role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select * into e from fenix_prod.expedientes where expediente_code=p_exp_code for update;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
  if a.role='Financiero' and e.owner_actor_code<>p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  if p_expected_version is null then return jsonb_build_object('ok',false,'status',400,'error','expected_version_required'); end if;
  if e.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',e.version,'current_stage',e.stage); end if;
  if v_stage='__REACTIVATE__' then
    if not (lower(e.stage) like '%paus%' or lower(e.stage) like '%baja%' or lower(e.stage) like '%cerrad%' or lower(e.stage) like '%perdido%' or lower(e.stage) like '%finalizado%') then return jsonb_build_object('ok',true,'status',200,'no_op',true,'stage',e.stage,'version',e.version); end if;
    select h.from_stage into v_restore from fenix_prod.expediente_stage_history h where h.expediente_code=e.expediente_code and h.to_stage=e.stage and nullif(trim(h.from_stage),'') is not null order by h.created_at desc limit 1;
    if nullif(trim(coalesce(v_restore,'')),'') is null then return jsonb_build_object('ok',false,'status',409,'error','reactivation_history_missing','current_version',e.version,'current_stage',e.stage); end if;
    v_stage:=v_restore;v_source:='reactivate';
  end if;
  if not (v_stage = any(v_allowed)) then return jsonb_build_object('ok',false,'status',400,'error','invalid_stage'); end if;
  if v_stage=e.stage then return jsonb_build_object('ok',true,'status',200,'no_op',true,'stage',e.stage,'version',e.version); end if;
  update fenix_prod.expedientes set stage=v_stage,version=version+1,updated_at=now() where id=e.id;
  insert into fenix_prod.expediente_stage_history(expediente_code,actor_code,from_stage,to_stage,source) values(e.expediente_code,p_actor_code,e.stage,v_stage,v_source);
  return jsonb_build_object('ok',true,'status',200,'stage',v_stage,'version',e.version+1,'source',v_source);
end $function$
;
CREATE OR REPLACE FUNCTION public.fenix_prod_exp_update_server(p_actor_code text, p_code text, p_expected_version integer, p_cliente_alias text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_inmobiliaria_code text DEFAULT NULL::text, p_notas text DEFAULT NULL::text, p_proxima_accion date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'fenix_prod', 'pg_temp'
AS $function$
declare
  v_role text;
  v fenix_prod.expedientes%rowtype;
  v_old_stage text;
  v_new_stage text;
  v_new_inmo text;
  v_allowed constant text[] := array['Entrada','Documentación','Documentación incompleta','Documentación completa','Análisis','Tasación','Pre-OK + Tasación realizada','Tasación realizada','Notaría','Cierre','Finalizado','Baja','Pausado','Perdido','Revisión legado'];
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select * into v from fenix_prod.expedientes where expediente_code=p_code and synthetic=false for update;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
  if v_role='Financiero' and v.owner_actor_code<>p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  if p_expected_version is null or v.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',v.version); end if;

  v_old_stage := v.stage;
  v_new_stage := coalesce(nullif(trim(p_stage),''),v.stage);
  if not (v_new_stage = any(v_allowed)) then return jsonb_build_object('ok',false,'status',400,'error','invalid_stage'); end if;

  v_new_inmo := case when p_inmobiliaria_code is null then v.inmobiliaria_code when trim(p_inmobiliaria_code)='' then null else trim(p_inmobiliaria_code) end;
  if v_new_inmo is not null and not exists(select 1 from fenix_prod.inmobiliarias where inmobiliaria_code=v_new_inmo and synthetic=false) then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_inmobiliaria');
  end if;

  update fenix_prod.expedientes e set
    cliente_alias=coalesce(nullif(trim(p_cliente_alias),''),e.cliente_alias),
    stage=v_new_stage,
    inmobiliaria_code=v_new_inmo,
    notas=case when p_notas is null then e.notas else nullif(trim(p_notas),'') end,
    proxima_accion=coalesce(p_proxima_accion,e.proxima_accion),
    version=e.version+1,
    updated_at=now()
  where e.expediente_code=p_code
  returning * into v;

  if v_new_stage is distinct from v_old_stage then
    insert into fenix_prod.expediente_stage_history(expediente_code,actor_code,from_stage,to_stage,source)
    values(p_code,p_actor_code,v_old_stage,v_new_stage,'exp_update');
  end if;

  return jsonb_build_object('ok',true,'status',200,'contract_version',2,'expediente',to_jsonb(v)-'id'-'synthetic');
end $function$
;
ALTER TABLE fenix_prod.performance_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE fenix_prod.expediente_propiedades DISABLE ROW LEVEL SECURITY;
ALTER TABLE fenix_prod.expediente_propiedad_history DISABLE ROW LEVEL SECURITY;
COMMIT;
