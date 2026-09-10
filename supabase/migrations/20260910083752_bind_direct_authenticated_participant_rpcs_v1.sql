-- Source-control snapshot of PROD participant RPC actor/scope binding.

create or replace function public.fenix_prod_exp_people_server(p_actor_code text,p_exp_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare g jsonb; v_role text; v_owner text; v_items jsonb; v_count int; v_tit int; v_ava int;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  v_role:=g->>'role';
  select owner_actor_code into v_owner from fenix_prod.expedientes where expediente_code=p_exp_code;
  if v_owner is null then return jsonb_build_object('ok',false,'status',404,'error','expediente_not_found'); end if;
  if coalesce(v_role,'') not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  if v_role='Financiero' and v_owner is distinct from p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',c.cliente_code,'contact_code',c.cliente_code,'comprador',trim(concat_ws(' ',c.nombre,c.apellidos)),'nombre',c.nombre,'apellidos',c.apellidos,'dni_nie',c.dni_nie,'telefono',c.telefono,'email',c.email,'rol_operacion',ep.rol_operacion,'orden_expediente',ep.orden_expediente,'fecha_nacimiento',coalesce(c.profile->>'fecha_nacimiento',ev->>'fecha_nacimiento'),'edad',coalesce(nullif(c.profile->>'edad','')::int,case when coalesce(c.profile->>'fecha_nacimiento',ev->>'fecha_nacimiento') ~ '^\d{4}-\d{2}-\d{2}$' then extract(year from age(current_date,coalesce(c.profile->>'fecha_nacimiento',ev->>'fecha_nacimiento')::date))::int else null end),'nacionalidad',coalesce(c.profile->>'nacionalidad',ev->>'nacionalidad'),'residencia',coalesce(c.profile->>'residencia',ev->>'residencia'),'estado_civil',coalesce(c.profile->>'estado_civil',ev->>'estado_civil'),'regimen_matrimonial',coalesce(c.profile->>'regimen_matrimonial',ev->>'regimen_matrimonial'),'hijos',coalesce(nullif(c.profile->>'hijos','')::int,nullif(ev->>'hijos','')::int),'situacion_laboral',coalesce(c.profile->>'situacion_laboral',ev->>'situacion_laboral'),'empresa_organismo',coalesce(c.profile->>'empresa_organismo',c.profile->>'empresa',ev->>'empresa_organismo'),'antiguedad_laboral',coalesce(c.profile->>'antiguedad_laboral',ev->>'antiguedad_laboral'),'sueldo_neto_mensual',coalesce(nullif(c.profile->>'sueldo_neto_mensual','')::numeric,nullif(ev->>'sueldo_neto_mensual','')::numeric),'numero_pagas',coalesce(nullif(c.profile->>'numero_pagas','')::int,nullif(ev->>'numero_pagas','')::int),'otros_ingresos_mensuales',nullif(c.profile->>'otros_ingresos_mensuales','')::numeric,'deudas_mensuales',coalesce(nullif(c.profile->>'deudas_mensuales','')::numeric,nullif(ev->>'deudas_mensuales','')::numeric),'tarjetas_otras_cuotas',coalesce(nullif(c.profile->>'tarjetas_otras_cuotas','')::numeric,nullif(ev->>'tarjetas_otras_cuotas','')::numeric),'pension_paga',nullif(c.profile->>'pension_paga','')::numeric,'pension_recibe',nullif(c.profile->>'pension_recibe','')::numeric,'ahorro_disponible',coalesce(nullif(c.profile->>'ahorro_disponible','')::numeric,nullif(ev->>'ahorro_disponible','')::numeric),'origen_fondos',coalesce(c.profile->>'origen_fondos',ev->>'origen_fondos'),'aportado_operacion',coalesce(nullif(c.profile->>'aportado_operacion','')::numeric,nullif(ev->>'aportado_operacion','')::numeric),'fondos_donados',nullif(c.profile->>'fondos_donados','')::boolean,'documentacion_completa',coalesce(nullif(c.profile->>'documentacion_completa','')::boolean,false),'documentos',coalesce(ev->'documentos','[]'::jsonb),'revision_belen',c.profile->>'revision_belen','datos_revisados_financiero',coalesce(nullif(c.profile->>'datos_revisados_financiero','')::boolean,false),'listas',(select coalesce(jsonb_agg(l.nombre order by l.nombre),'[]'::jsonb) from fenix_prod.contact_list_members m join fenix_prod.contact_lists l on l.list_code=m.list_code where m.cliente_code=c.cliente_code and l.active))) order by coalesce(ep.orden_expediente,999),ep.created_at),'[]'::jsonb),count(*),count(*) filter(where lower(ep.rol_operacion) like '%titular%' or lower(ep.rol_operacion) like '%comprador%'),count(*) filter(where lower(ep.rol_operacion) like '%avalista%')
  into v_items,v_count,v_tit,v_ava
  from fenix_prod.expediente_personas ep
  join fenix_prod.clientes c on c.cliente_code=ep.cliente_code
  cross join lateral public.fenix_prod_participant_evidence_profile(p_exp_code,c.cliente_code) ev
  where ep.expediente_code=p_exp_code and ep.active and c.active;
  return jsonb_build_object('ok',true,'status',200,'count',v_count,'titulares',v_tit,'avalistas',v_ava,'items',v_items);
exception when others then return jsonb_build_object('ok',false,'status',500,'error',sqlerrm);
end
$function$;

create or replace function public.fenix_prod_exp_person_create_server(p_actor_code text,p_exp_code text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare g jsonb; v_role text; v_owner text; v_client text; v_existing text; v_dni text; v_name text; v_last text; v_profile jsonb; v_rel uuid;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  v_role:=g->>'role'; select owner_actor_code into v_owner from fenix_prod.expedientes where expediente_code=p_exp_code;
  if v_owner is null then return jsonb_build_object('ok',false,'status',404,'error','expediente_not_found'); end if;
  if coalesce(v_role,'') not in ('Direccion','Financiero') or (v_role='Financiero' and v_owner is distinct from p_actor_code) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  v_name=nullif(trim(coalesce(p_payload->>'nombre','')),''); if v_name is null then return jsonb_build_object('ok',false,'status',400,'error','nombre_required'); end if;
  v_last=nullif(trim(coalesce(p_payload->>'apellidos','')),''); v_dni=upper(regexp_replace(coalesce(p_payload->>'dni_nie',''),'[^A-Za-z0-9]','','g'));
  if v_dni<>'' then select cliente_code into v_client from fenix_prod.clientes where upper(regexp_replace(coalesce(dni_nie,''),'[^A-Za-z0-9]','','g'))=v_dni and active order by created_at limit 1; end if;
  if v_client is null then
    v_client='CLI-'||upper(substr(md5(gen_random_uuid()::text),1,12)); v_profile=(p_payload-'nombre'-'apellidos'-'dni_nie'-'rol_operacion'-'orden_expediente');
    insert into fenix_prod.clientes(cliente_code,nombre,apellidos,estado,cliente_fenix,consentimiento_comercial,source_payload,synthetic,active,dni_nie,profile)
    values(v_client,v_name,v_last,'Activo',true,false,jsonb_build_object('source','expediente_interviniente','expediente_code',p_exp_code),false,true,nullif(v_dni,''),coalesce(v_profile,'{}'::jsonb));
  else
    select ep.cliente_code into v_existing from fenix_prod.expediente_personas ep where ep.expediente_code=p_exp_code and ep.cliente_code=v_client and ep.active;
    if v_existing is not null then return jsonb_build_object('ok',false,'status',409,'error','already_linked','existing_id',v_existing); end if;
  end if;
  insert into fenix_prod.expediente_personas(expediente_code,cliente_code,rol_operacion,orden_expediente)
  values(p_exp_code,v_client,coalesce(nullif(p_payload->>'rol_operacion',''),'Titular comprador'),nullif(p_payload->>'orden_expediente','')::int) returning id into v_rel;
  return jsonb_build_object('ok',true,'status',201,'id',v_client,'relation_id',v_rel);
exception when unique_violation then return jsonb_build_object('ok',false,'status',409,'error','already_linked','existing_id',v_client);
when others then return jsonb_build_object('ok',false,'status',500,'error',sqlerrm);
end
$function$;

-- Legacy update without expediente scope remains Direction-only.
create or replace function public.fenix_prod_exp_person_update_server(p_actor_code text,p_client_code text,p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare g jsonb; v_role text; v_profile jsonb; v_dni text;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  v_role:=g->>'role'; if v_role is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','expediente_scope_required'); end if;
  if not exists(select 1 from fenix_prod.clientes where cliente_code=p_client_code and active) then return jsonb_build_object('ok',false,'status',404,'error','contact_not_found'); end if;
  v_dni=case when p_changes?'dni_nie' then nullif(upper(regexp_replace(coalesce(p_changes->>'dni_nie',''),'[^A-Za-z0-9]','','g')),'') else null end;
  if v_dni is not null and exists(select 1 from fenix_prod.clientes where cliente_code<>p_client_code and active and upper(regexp_replace(coalesce(dni_nie,''),'[^A-Za-z0-9]','','g'))=v_dni) then return jsonb_build_object('ok',false,'status',409,'error','dni_already_exists'); end if;
  select profile into v_profile from fenix_prod.clientes where cliente_code=p_client_code;
  update fenix_prod.clientes set nombre=case when p_changes?'nombre' then coalesce(nullif(trim(p_changes->>'nombre'),''),nombre) else nombre end,apellidos=case when p_changes?'apellidos' then nullif(trim(p_changes->>'apellidos'),'') else apellidos end,dni_nie=case when p_changes?'dni_nie' then v_dni else dni_nie end,telefono=case when p_changes?'telefono' then nullif(trim(p_changes->>'telefono'),'') else telefono end,email=case when p_changes?'email' then nullif(trim(p_changes->>'email'),'') else email end,profile=coalesce(v_profile,'{}'::jsonb)||(p_changes-'nombre'-'apellidos'-'dni_nie'-'telefono'-'email'-'rol_operacion'-'orden_expediente'),updated_at=now() where cliente_code=p_client_code;
  return jsonb_build_object('ok',true,'status',200,'id',p_client_code);
exception when others then return jsonb_build_object('ok',false,'status',500,'error',sqlerrm);
end
$function$;

create or replace function public.fenix_prod_exp_person_update_server(p_actor_code text,p_client_code text,p_exp_code text,p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare g jsonb; v_role text; v_owner text; v_profile jsonb; v_dni text;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  v_role:=g->>'role'; select owner_actor_code into v_owner from fenix_prod.expedientes where expediente_code=p_exp_code;
  if v_owner is null then return jsonb_build_object('ok',false,'status',404,'error','expediente_not_found'); end if;
  if coalesce(v_role,'') not in ('Direccion','Financiero') or (v_role='Financiero' and v_owner is distinct from p_actor_code) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  if not exists(select 1 from fenix_prod.clientes where cliente_code=p_client_code and active) then return jsonb_build_object('ok',false,'status',404,'error','contact_not_found'); end if;
  if not exists(select 1 from fenix_prod.expediente_personas where expediente_code=p_exp_code and cliente_code=p_client_code and active) then return jsonb_build_object('ok',false,'status',404,'error','expediente_person_relation_not_found'); end if;
  v_dni=case when p_changes?'dni_nie' then nullif(upper(regexp_replace(coalesce(p_changes->>'dni_nie',''),'[^A-Za-z0-9]','','g')),'') else null end;
  if v_dni is not null and exists(select 1 from fenix_prod.clientes where cliente_code<>p_client_code and active and upper(regexp_replace(coalesce(dni_nie,''),'[^A-Za-z0-9]','','g'))=v_dni) then return jsonb_build_object('ok',false,'status',409,'error','dni_already_exists'); end if;
  select profile into v_profile from fenix_prod.clientes where cliente_code=p_client_code;
  update fenix_prod.clientes set nombre=case when p_changes?'nombre' then coalesce(nullif(trim(p_changes->>'nombre'),''),nombre) else nombre end,apellidos=case when p_changes?'apellidos' then nullif(trim(p_changes->>'apellidos'),'') else apellidos end,dni_nie=case when p_changes?'dni_nie' then v_dni else dni_nie end,telefono=case when p_changes?'telefono' then nullif(trim(p_changes->>'telefono'),'') else telefono end,email=case when p_changes?'email' then nullif(trim(p_changes->>'email'),'') else email end,profile=coalesce(v_profile,'{}'::jsonb)||(p_changes-'nombre'-'apellidos'-'dni_nie'-'telefono'-'email'-'rol_operacion'-'orden_expediente'),updated_at=now() where cliente_code=p_client_code;
  if p_changes?'rol_operacion' or p_changes?'orden_expediente' then update fenix_prod.expediente_personas set rol_operacion=case when p_changes?'rol_operacion' then coalesce(nullif(p_changes->>'rol_operacion',''),rol_operacion) else rol_operacion end,orden_expediente=case when p_changes?'orden_expediente' then nullif(p_changes->>'orden_expediente','')::int else orden_expediente end,updated_at=now() where expediente_code=p_exp_code and cliente_code=p_client_code and active; end if;
  return jsonb_build_object('ok',true,'status',200,'id',p_client_code,'expediente_code',p_exp_code);
exception when others then return jsonb_build_object('ok',false,'status',500,'error',sqlerrm);
end
$function$;

revoke execute on function public.fenix_prod_exp_people_server(text,text) from public,anon;
revoke execute on function public.fenix_prod_exp_person_create_server(text,text,jsonb) from public,anon;
revoke execute on function public.fenix_prod_exp_person_update_server(text,text,jsonb) from public,anon;
revoke execute on function public.fenix_prod_exp_person_update_server(text,text,text,jsonb) from public,anon;
grant execute on function public.fenix_prod_exp_people_server(text,text) to authenticated,service_role;
grant execute on function public.fenix_prod_exp_person_create_server(text,text,jsonb) to authenticated,service_role;
grant execute on function public.fenix_prod_exp_person_update_server(text,text,jsonb) to authenticated,service_role;
grant execute on function public.fenix_prod_exp_person_update_server(text,text,text,jsonb) to authenticated,service_role;
