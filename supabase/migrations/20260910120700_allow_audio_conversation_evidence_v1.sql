create or replace function public.fenix_prod_evidence_prepare_server(
 p_actor_code text, p_upload_id uuid, p_origin_type text, p_origin_code text, p_evidence_kind text,
 p_storage_path text, p_mime_type text, p_filename text, p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare s jsonb; r jsonb; k text;
begin
 k:=lower(trim(coalesce(p_evidence_kind,'')));
 if k not in ('documento','texto_conversacion','comentario','audio_conversacion') then
   return jsonb_build_object('ok',false,'status',400,'error','invalid_evidence_kind');
 end if;
 s:=public.fenix_prod_evidence_scope_server(p_actor_code,p_origin_type,p_origin_code);
 if not coalesce((s->>'ok')::boolean,false) then return s; end if;
 r:=public.fenix_prod_doc_prepare(p_actor_code,p_upload_id,s->>'scope_type',s->>'scope_code',p_storage_path,p_mime_type,p_filename,p_expires_at);
 if not coalesce((r->>'ok')::boolean,false) then return r; end if;
 update fenix_prod.document_upload_sessions
 set origin_type=lower(trim(p_origin_type)),origin_code=p_origin_code,evidence_kind=k
 where id=p_upload_id;
 return r||jsonb_build_object('origin_type',lower(trim(p_origin_type)),'origin_code',p_origin_code,'evidence_kind',k,'scope_type',s->>'scope_type','scope_code',s->>'scope_code');
end
$function$;
