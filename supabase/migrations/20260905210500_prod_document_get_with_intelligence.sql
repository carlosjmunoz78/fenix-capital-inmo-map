create or replace function public.fenix_prod_document_get_server(p_actor_code text, p_document_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare
  v_role text;
  d fenix_prod.documentos%rowtype;
  v_extraction jsonb;
  v_intel_status text;
  v_updated_at timestamptz;
  v_upload_id uuid;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true;
  if coalesce(v_role,'') not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select * into d from fenix_prod.documentos where document_code=p_document_code and (v_role='Direccion' or owner_actor_code=p_actor_code);
  if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
  select r.extraction,r.status,r.updated_at,r.upload_id into v_extraction,v_intel_status,v_updated_at,v_upload_id from fenix_prod.document_intelligence_runs r where r.document_id=d.id order by r.updated_at desc nulls last limit 1;
  if v_upload_id is null then
    select us.id into v_upload_id from fenix_prod.document_versions dv join fenix_prod.document_upload_sessions us on us.storage_path=dv.storage_path where dv.document_id=d.id and us.status='completed' order by dv.created_at desc,us.created_at desc limit 1;
  end if;
  return jsonb_build_object('ok',true,'status',200,'item',to_jsonb(d),'contract_version',2,'intelligence',case when v_extraction is null then null else jsonb_build_object('status',v_intel_status,'updated_at',v_updated_at,'extraction',v_extraction) end,'upload_id',v_upload_id);
end $function$;
revoke all on function public.fenix_prod_document_get_server(text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_document_get_server(text,text) to service_role;
