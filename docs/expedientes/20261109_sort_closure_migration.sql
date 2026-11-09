-- Persist sorted backend list; actual closing event when known, otherwise updated_at as marked fallback.
BEGIN;
CREATE OR REPLACE FUNCTION public.fenix_prod_exp_list_server(p_actor_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'fenix_prod', 'pg_temp'
AS $function$
declare v_role text; v_items jsonb;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true;
 if v_role not in ('Direccion','Financiero') then
   return jsonb_build_object('ok',false,'status',403,'error','forbidden');
 end if;

 select coalesce(
   jsonb_agg(
     to_jsonb(x)-'active_rank'
     order by x.active_rank asc,
       case when x.active_rank=0 then x.updated_at else coalesce(x.fecha_finalizacion,x.updated_at) end desc,
       x.expediente_code asc
   ),'[]'::jsonb)
 into v_items
 from (
   select e.expediente_code,e.cliente_alias,e.stage,e.owner_actor_code,e.version,e.updated_at,
          activity.is_active,
          case when activity.is_active then null else history.finished_at end as fecha_finalizacion,
          case when activity.is_active then null when history.finished_at is not null then 'historial' else 'ultima_actualizacion' end as origen_fecha_finalizacion,
          case when activity.is_active then 0 else 1 end as active_rank
   from fenix_prod.expedientes e
   cross join lateral (
     select public.fenix_prod_expediente_is_active(
       e.stage,
       exists (
         select 1 from fenix_prod.firmas f
         where f.expediente_code=e.expediente_code
           and lower(coalesce(f.estado,''))='firmado'
       )
     ) as is_active
   ) activity
   left join lateral (
     select max(h.created_at) as finished_at
     from fenix_prod.expediente_stage_history h
     where h.expediente_code=e.expediente_code
       and lower(trim(h.to_stage)) in ('cerrado','cierre','finalizado','firmado','baja','perdido','pausado')
   ) history on true
   where v_role='Direccion' or e.owner_actor_code=p_actor_code
 ) x;

 return jsonb_build_object('ok',true,'status',200,'items',v_items);
end $function$
;
COMMIT;
