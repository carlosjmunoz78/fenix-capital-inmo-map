-- Expose the already-defined canonical active predicate to App consumers.
-- Additive response field only; no data mutation and no row removal.

create or replace function public.fenix_prod_exp_list_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_role text; v_items jsonb;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true;
 if v_role not in ('Direccion','Financiero') then
   return jsonb_build_object('ok',false,'status',403,'error','forbidden');
 end if;

 select coalesce(jsonb_agg(to_jsonb(x)-'active_rank' order by x.active_rank asc,x.updated_at desc),'[]'::jsonb)
 into v_items
 from (
   select e.expediente_code,e.cliente_alias,e.stage,e.owner_actor_code,e.version,e.updated_at,
          public.fenix_prod_expediente_is_active(
            e.stage,
            exists(
              select 1 from fenix_prod.firmas f
              where f.expediente_code=e.expediente_code
                and lower(coalesce(f.estado,''))='firmado'
            )
          ) as is_active,
          case when public.fenix_prod_expediente_is_active(
            e.stage,
            exists(
              select 1 from fenix_prod.firmas f
              where f.expediente_code=e.expediente_code
                and lower(coalesce(f.estado,''))='firmado'
            )
          ) then 0 else 1 end active_rank
   from fenix_prod.expedientes e
   where v_role='Direccion' or e.owner_actor_code=p_actor_code
 ) x;

 return jsonb_build_object('ok',true,'status',200,'items',v_items);
end $function$;
