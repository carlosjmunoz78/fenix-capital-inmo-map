create or replace function public.fenix_prod_exp_stage_server(p_actor_code text, p_exp_code text, p_expected_version integer, p_new_stage text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare
  a fenix_prod.actors%rowtype;
  e fenix_prod.expedientes%rowtype;
  v_stage text:=trim(coalesce(p_new_stage,''));
  v_restore text;
  v_source text:='manual';
begin
  select * into a from fenix_prod.actors where actor_code=p_actor_code and active=true;
  if not found or a.role not in ('Direccion','Financiero') then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  select * into e from fenix_prod.expedientes where expediente_code=p_exp_code for update;
  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','not_found');
  end if;

  if a.role='Financiero' and e.owner_actor_code<>p_actor_code then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  if e.version<>p_expected_version then
    return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',e.version,'current_stage',e.stage);
  end if;

  if v_stage='__REACTIVATE__' then
    if not (lower(e.stage) like '%paus%' or lower(e.stage) like '%baja%' or lower(e.stage) like '%cerrad%' or lower(e.stage) like '%perdido%') then
      return jsonb_build_object('ok',true,'status',200,'no_op',true,'stage',e.stage,'version',e.version);
    end if;

    select h.from_stage into v_restore
    from fenix_prod.expediente_stage_history h
    where h.expediente_code=e.expediente_code
      and h.to_stage=e.stage
      and nullif(trim(h.from_stage),'') is not null
    order by h.created_at desc
    limit 1;

    if nullif(trim(coalesce(v_restore,'')),'') is null then
      return jsonb_build_object('ok',false,'status',409,'error','reactivation_history_missing','current_version',e.version,'current_stage',e.stage);
    end if;

    v_stage:=v_restore;
    v_source:='reactivate';
  end if;

  if v_stage='' or length(v_stage)>80 then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_stage');
  end if;

  if v_stage=e.stage then
    return jsonb_build_object('ok',true,'status',200,'no_op',true,'stage',e.stage,'version',e.version);
  end if;

  update fenix_prod.expedientes
  set stage=v_stage,version=version+1,updated_at=now()
  where id=e.id;

  insert into fenix_prod.expediente_stage_history(expediente_code,actor_code,from_stage,to_stage,source)
  values(e.expediente_code,p_actor_code,e.stage,v_stage,v_source);

  return jsonb_build_object('ok',true,'status',200,'stage',v_stage,'version',e.version+1,'source',v_source);
end
$function$;
