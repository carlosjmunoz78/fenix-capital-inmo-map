-- Scope operation-specific fields to the current expediente relation.
create or replace function public.fenix_prod_exp_person_update_server(
  p_actor_code text,
  p_client_code text,
  p_exp_code text,
  p_changes jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,fenix_prod
as $$
declare
  v_role text;
  v_profile jsonb;
  v_dni text;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active;
  if coalesce(v_role,'') not in ('Direccion','Financiero') then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;
  if not exists(select 1 from fenix_prod.clientes where cliente_code=p_client_code and active) then
    return jsonb_build_object('ok',false,'status',404,'error','contact_not_found');
  end if;
  if p_exp_code is not null and not exists(
    select 1 from fenix_prod.expediente_personas
    where expediente_code=p_exp_code and cliente_code=p_client_code and active
  ) then
    return jsonb_build_object('ok',false,'status',404,'error','expediente_person_relation_not_found');
  end if;

  v_dni=case when p_changes?'dni_nie'
    then nullif(upper(regexp_replace(coalesce(p_changes->>'dni_nie',''),'[^A-Za-z0-9]','','g')),'')
    else null end;
  if v_dni is not null and exists(
    select 1 from fenix_prod.clientes
    where cliente_code<>p_client_code and active
      and upper(regexp_replace(coalesce(dni_nie,''),'[^A-Za-z0-9]','','g'))=v_dni
  ) then
    return jsonb_build_object('ok',false,'status',409,'error','dni_already_exists');
  end if;

  select profile into v_profile from fenix_prod.clientes where cliente_code=p_client_code;
  update fenix_prod.clientes set
    nombre=case when p_changes?'nombre' then coalesce(nullif(trim(p_changes->>'nombre'),''),nombre) else nombre end,
    apellidos=case when p_changes?'apellidos' then nullif(trim(p_changes->>'apellidos'),'') else apellidos end,
    dni_nie=case when p_changes?'dni_nie' then v_dni else dni_nie end,
    telefono=case when p_changes?'telefono' then nullif(trim(p_changes->>'telefono'),'') else telefono end,
    email=case when p_changes?'email' then nullif(trim(p_changes->>'email'),'') else email end,
    profile=coalesce(v_profile,'{}'::jsonb)||(p_changes-'nombre'-'apellidos'-'dni_nie'-'telefono'-'email'-'rol_operacion'-'orden_expediente'),
    updated_at=now()
  where cliente_code=p_client_code;

  if p_exp_code is not null and (p_changes?'rol_operacion' or p_changes?'orden_expediente') then
    update fenix_prod.expediente_personas set
      rol_operacion=case when p_changes?'rol_operacion' then coalesce(nullif(p_changes->>'rol_operacion',''),rol_operacion) else rol_operacion end,
      orden_expediente=case when p_changes?'orden_expediente' then nullif(p_changes->>'orden_expediente','')::int else orden_expediente end,
      updated_at=now()
    where expediente_code=p_exp_code and cliente_code=p_client_code and active;
  end if;

  return jsonb_build_object('ok',true,'status',200,'id',p_client_code,'expediente_code',p_exp_code);
exception when others then
  return jsonb_build_object('ok',false,'status',500,'error',sqlerrm);
end$$;
