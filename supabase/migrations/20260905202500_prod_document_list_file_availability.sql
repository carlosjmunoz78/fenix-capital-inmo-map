create or replace function public.fenix_prod_document_list_server(p_actor_code text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_role text; v jsonb;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role is null then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'document_code',d.document_code,'title',d.title,'tipo',d.tipo,'sensibilidad',d.sensibilidad,'estado',d.estado,'calidad',d.calidad,'current_version',d.current_version,'owner_actor_code',d.owner_actor_code,
   'scope_type',case when d.expediente_id is not null then 'expediente' when d.inmobiliaria_id is not null then 'inmobiliaria' else 'general' end,
   'scope_code',coalesce(e.expediente_code,i.inmobiliaria_code),
   'has_file',exists(select 1 from fenix_prod.document_versions dv where dv.document_id=d.id),
   'created_at',d.created_at,'updated_at',d.updated_at
 ) order by d.document_code),'[]'::jsonb) into v
 from fenix_prod.documentos d
 left join fenix_prod.expedientes e on e.id=d.expediente_id
 left join fenix_prod.inmobiliarias i on i.id=d.inmobiliaria_id
 where v_role='Direccion'
    or (v_role='Financiero' and d.expediente_id is not null and d.owner_actor_code=p_actor_code)
    or (v_role='Visitador' and d.inmobiliaria_id is not null and d.owner_actor_code=p_actor_code and d.sensibilidad='B2B');
 return coalesce(v,'[]'::jsonb);
end $function$;
revoke all on function public.fenix_prod_document_list_server(text) from public,anon,authenticated;
grant execute on function public.fenix_prod_document_list_server(text) to service_role;
