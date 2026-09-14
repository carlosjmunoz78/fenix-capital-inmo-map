-- Additive canonical labor-profile contract. No table rewrite, no existing field removal.
-- Storage remains fenix_prod.clientes.profile JSONB using explicit semantic keys.

create or replace function public.fenix_prod_exp_labor_profile_server(
  p_actor_code text,
  p_exp_code text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $$
declare
  g jsonb;
  v_role text;
  v_owner text;
  v_items jsonb;
begin
  g := public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  v_role := g->>'role';

  select owner_actor_code into v_owner
  from fenix_prod.expedientes
  where expediente_code=p_exp_code;

  if v_owner is null then
    return jsonb_build_object('ok',false,'status',404,'error','expediente_not_found');
  end if;
  if coalesce(v_role,'') not in ('Direccion','Financiero') then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;
  if v_role='Financiero' and v_owner is distinct from p_actor_code then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',c.cliente_code,
    'tipo_contrato',nullif(c.profile->>'tipo_contrato',''),
    'modalidad_contrato',nullif(c.profile->>'modalidad_contrato',''),
    'fecha_inicio',nullif(c.profile->>'fecha_inicio',''),
    'fecha_fin',nullif(c.profile->>'fecha_fin',''),
    'jornada',nullif(c.profile->>'jornada',''),
    'categoria_profesional',nullif(c.profile->>'categoria_profesional',''),
    'numero_pagas',case when coalesce(c.profile->>'numero_pagas','') ~ '^[0-9]{1,2}$' then (c.profile->>'numero_pagas')::int else null end
  )) order by coalesce(ep.orden_expediente,999),ep.created_at),'[]'::jsonb)
  into v_items
  from fenix_prod.expediente_personas ep
  join fenix_prod.clientes c on c.cliente_code=ep.cliente_code
  where ep.expediente_code=p_exp_code and ep.active and c.active;

  return jsonb_build_object('ok',true,'status',200,'items',v_items);
exception when others then
  return jsonb_build_object('ok',false,'status',500,'error',sqlerrm);
end
$$;

revoke all on function public.fenix_prod_exp_labor_profile_server(text,text) from public;
revoke all on function public.fenix_prod_exp_labor_profile_server(text,text) from anon;
revoke all on function public.fenix_prod_exp_labor_profile_server(text,text) from authenticated;
grant execute on function public.fenix_prod_exp_labor_profile_server(text,text) to service_role;

comment on function public.fenix_prod_exp_labor_profile_server(text,text) is
'Canonical explicit labor-profile read contract for expediente participants. Keeps tipo_contrato, modalidad_contrato, fecha_inicio, fecha_fin, jornada, categoria_profesional and numero_pagas semantically distinct.';

-- Rollback: DROP FUNCTION public.fenix_prod_exp_labor_profile_server(text,text);
