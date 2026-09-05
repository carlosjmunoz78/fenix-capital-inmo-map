create or replace function public.fenix_prod_document_access_server(p_actor_code text, p_document_code text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare
  v_role text;
  d fenix_prod.documentos%rowtype;
  allowed boolean:=false;
  exp_code text;
  inmo_code text;
  v_extraction jsonb;
  v_intel_status text;
  v_intel_updated_at timestamptz;
  v_upload_id uuid;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  select * into d from fenix_prod.documentos where document_code=p_document_code limit 1;
  if not found then return jsonb_build_object('exists',false,'allowed',false); end if;

  if v_role='Direccion' then allowed:=true;
  elsif v_role='Financiero' and d.expediente_id is not null and d.owner_actor_code=p_actor_code then allowed:=true;
  elsif v_role='Visitador' and d.inmobiliaria_id is not null and d.owner_actor_code=p_actor_code and d.sensibilidad='B2B' then allowed:=true;
  end if;

  if d.expediente_id is not null then select expediente_code into exp_code from fenix_prod.expedientes where id=d.expediente_id; end if;
  if d.inmobiliaria_id is not null then select inmobiliaria_code into inmo_code from fenix_prod.inmobiliarias where id=d.inmobiliaria_id; end if;

  if allowed then
    select r.extraction,r.status,r.updated_at,r.upload_id
      into v_extraction,v_intel_status,v_intel_updated_at,v_upload_id
      from fenix_prod.document_intelligence_runs r
     where r.document_id=d.id
     order by r.updated_at desc nulls last
     limit 1;

    if v_upload_id is null then
      select us.id into v_upload_id
        from fenix_prod.document_versions dv
        join fenix_prod.document_upload_sessions us on us.storage_path=dv.storage_path
       where dv.document_id=d.id and us.status='completed'
       order by dv.created_at desc,us.created_at desc
       limit 1;
    end if;
  end if;

  return jsonb_build_object(
    'exists',true,
    'allowed',allowed,
    'internal_document_id',case when allowed then d.id else null end,
    'document',case when allowed then jsonb_build_object(
      'document_code',d.document_code,'title',d.title,'tipo',d.tipo,'sensibilidad',d.sensibilidad,
      'estado',d.estado,'calidad',d.calidad,'current_version',d.current_version,'owner_actor_code',d.owner_actor_code,
      'scope_type',case when d.expediente_id is not null then 'expediente' when d.inmobiliaria_id is not null then 'inmobiliaria' else 'general' end,
      'scope_code',coalesce(exp_code,inmo_code),'created_at',d.created_at,'updated_at',d.updated_at
    ) else null end,
    'intelligence',case when allowed and v_extraction is not null then jsonb_build_object('status',v_intel_status,'updated_at',v_intel_updated_at,'extraction',v_extraction) else null end,
    'upload_id',case when allowed then v_upload_id else null end,
    'contract_version',2
  );
end $function$;

revoke all on function public.fenix_prod_document_access_server(text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_document_access_server(text,text) to service_role;
