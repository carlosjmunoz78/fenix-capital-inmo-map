-- Source-control snapshot of PROD actor binding for directory/economia/reports RPCs.

create or replace function public.fenix_prod_notarias_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; items jsonb; active_count int; g jsonb;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role';
  if r not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',n.source_id,'notaria',n.nombre,'nombre',n.nombre,'localidad',n.localidad,'provincia',n.provincia,'direccion',n.direccion,'telefono',n.telefono,'email',n.email,'principal',n.principal,'notario_oficial_principal',n.principal,'activo',n.activo,'nivel_verificacion',n.nivel_verificacion,'fuente_oficial',n.fuente_oficial,'horario_observaciones',n.horario_observaciones,'notas',n.notas) order by n.provincia,n.localidad,n.nombre),'[]'::jsonb),count(*) filter(where n.activo)
  into items,active_count from fenix_prod.notarias n;
  return jsonb_build_object('ok',true,'status',200,'contract_version',2,'items',items,'kpis',jsonb_build_object('total',jsonb_array_length(items),'activas',active_count));
end
$function$;

create or replace function public.fenix_prod_registros_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; items jsonb; g jsonb;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role';
  if r not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',n.source_id,'registro',n.nombre,'nombre',n.nombre,'municipio_sede',n.municipio_sede,'localidad',n.municipio_sede,'provincia',n.provincia,'municipios_cubiertos',n.municipios_cubiertos,'direccion',n.direccion,'cp',n.cp,'telefono',n.telefono,'email',n.email,'registrador',n.registrador,'numero',n.numero,'activo',n.activo,'cita_online',n.cita_online,'nivel_verificacion',n.nivel_verificacion,'fuente_oficial',n.fuente_oficial,'horario',n.horario,'servicios_telematicos',n.servicios_telematicos,'notas',n.notas) order by n.provincia,n.municipio_sede,n.nombre),'[]'::jsonb)
  into items from fenix_prod.registros_propiedad n where n.activo;
  return jsonb_build_object('ok',true,'status',200,'contract_version',1,'items',items,'kpis',jsonb_build_object('total',jsonb_array_length(items)));
end
$function$;

create or replace function public.fenix_prod_economia_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; items jsonb; total_base numeric; total_iva numeric; total_total numeric; g jsonb;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role';
  if r is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',e.movimiento_code,'movimiento',e.movimiento,'naturaleza',e.naturaleza,'tipo',e.tipo,'estado',e.estado,'beneficiario',e.beneficiario,'concepto',e.concepto,'importe_base',e.importe_base,'iva_pct',e.iva_pct,'iva_importe',e.iva_importe,'total',e.total,'fecha_prevista',e.fecha_prevista,'fecha_factura',e.fecha_factura,'fecha_cobro',e.fecha_cobro) order by coalesce(e.fecha_cobro,e.fecha_factura,e.fecha_prevista,e.created_at) desc),'[]'::jsonb),coalesce(sum(e.importe_base),0),coalesce(sum(e.iva_importe),0),coalesce(sum(e.total),0)
  into items,total_base,total_iva,total_total from fenix_prod.economia e where coalesce(e.synthetic,false)=false;
  return jsonb_build_object('ok',true,'status',200,'contract_version',1,'items',items,'kpis',jsonb_build_object('total_movimientos',jsonb_array_length(items),'importe_base',total_base,'iva',total_iva,'total',total_total));
end
$function$;

create or replace function public.fenix_prod_reports_server(p_actor_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; g jsonb;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role';
  if r<>'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  return jsonb_build_object('ok',true,'status',200,'contract_version',1,'items','[]'::jsonb,'kpis',jsonb_build_object('total',0));
end
$function$;

revoke execute on function public.fenix_prod_notarias_server(text) from public,anon,authenticated;
revoke execute on function public.fenix_prod_registros_server(text) from public,anon,authenticated;
revoke execute on function public.fenix_prod_economia_server(text) from public,anon,authenticated;
revoke execute on function public.fenix_prod_reports_server(text) from public,anon,authenticated;
grant execute on function public.fenix_prod_notarias_server(text) to service_role;
grant execute on function public.fenix_prod_registros_server(text) to service_role;
grant execute on function public.fenix_prod_economia_server(text) to service_role;
grant execute on function public.fenix_prod_reports_server(text) to service_role;
