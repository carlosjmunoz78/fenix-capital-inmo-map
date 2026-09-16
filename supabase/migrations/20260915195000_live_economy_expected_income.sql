-- Canonical expected Fenix income for the active pipeline.
-- Business rule: each active expediente contributes 3,500 EUR base;
-- an expediente linked to an inmobiliaria has a 1,100 EUR commission,
-- therefore contributes 2,400 EUR net expected income.
-- Additive contract evolution only; no customer row mutation.

create or replace function public.fenix_prod_economia_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare
  r text;
  items jsonb;
  total_base numeric;
  total_iva numeric;
  total_total numeric;
  g jsonb;
  active_count int;
  active_inmo int;
  active_no_inmo int;
  active_requested numeric;
  expected_gross numeric;
  expected_commissions numeric;
  expected_net numeric;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role';
  if r is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.movimiento_code,'movimiento',e.movimiento,'naturaleza',e.naturaleza,
      'tipo',e.tipo,'estado',e.estado,'beneficiario',e.beneficiario,'concepto',e.concepto,
      'importe_base',e.importe_base,'iva_pct',e.iva_pct,'iva_importe',e.iva_importe,'total',e.total,
      'fecha_prevista',e.fecha_prevista,'fecha_factura',e.fecha_factura,'fecha_cobro',e.fecha_cobro
    ) order by coalesce(e.fecha_cobro,e.fecha_factura,e.fecha_prevista,e.created_at) desc),'[]'::jsonb),
    coalesce(sum(e.importe_base),0),coalesce(sum(e.iva_importe),0),coalesce(sum(e.total),0)
  into items,total_base,total_iva,total_total
  from fenix_prod.economia e
  where coalesce(e.synthetic,false)=false;

  select
    count(*)::int,
    count(*) filter (where nullif(trim(e.inmobiliaria_code),'') is not null)::int,
    count(*) filter (where nullif(trim(e.inmobiliaria_code),'') is null)::int,
    coalesce(sum(e.importe_solicitado),0)
  into active_count,active_inmo,active_no_inmo,active_requested
  from fenix_prod.expedientes e
  where coalesce(e.synthetic,false)=false
    and public.fenix_prod_expediente_is_active(
      e.stage,
      exists(select 1 from fenix_prod.firmas f where f.expediente_code=e.expediente_code and lower(coalesce(f.estado,''))='firmado')
    );

  expected_gross := active_count * 3500;
  expected_commissions := active_inmo * 1100;
  expected_net := expected_gross - expected_commissions;

  return jsonb_build_object(
    'ok',true,'status',200,'contract_version',3,'items',items,
    'kpis',jsonb_build_object('total_movimientos',jsonb_array_length(items),'importe_base',total_base,'iva',total_iva,'total',total_total),
    'pipeline_activo',jsonb_build_object(
      'expedientes',active_count,
      'expedientes_inmobiliaria',active_inmo,
      'expedientes_sin_inmobiliaria',active_no_inmo,
      'importe_solicitado',active_requested,
      'honorario_base_por_expediente',3500,
      'comision_inmobiliaria_por_expediente',1100,
      'ingreso_bruto_esperado',expected_gross,
      'comisiones_inmobiliarias_esperadas',expected_commissions,
      'ingreso_fenix_esperado',expected_net
    )
  );
end $function$;
