create or replace function public.fenix_prod_communications_send_claim_server(
 p_actor_code text,p_communication_code text,p_expected_version integer,p_payload_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer
set search_path='pg_catalog','public','fenix_prod','pg_temp'
as $$
declare v_role text; v_row fenix_prod.comunicaciones%rowtype;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if nullif(trim(p_idempotency_key),'') is null then return jsonb_build_object('ok',false,'status',400,'error','missing_idempotency_key'); end if;
 select * into v_row from fenix_prod.comunicaciones where communication_code=p_communication_code and synthetic=false for update;
 if not found then return jsonb_build_object('ok',false,'status',404,'error','communication_not_found'); end if;
 if v_row.estado='Enviada' and v_row.send_idempotency_key=p_idempotency_key then return jsonb_build_object('ok',true,'status',200,'idempotent_replay',true,'item',to_jsonb(v_row)); end if;
 if v_row.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict'); end if;
 if v_row.estado not in ('Autorizada','Error') or v_row.authorized_hash is distinct from p_payload_hash or v_row.payload_hash<>p_payload_hash then return jsonb_build_object('ok',false,'status',409,'error','not_authorized_for_current_payload'); end if;
 if v_row.no_contactar then return jsonb_build_object('ok',false,'status',409,'error','do_not_contact'); end if;
 if v_row.canal='WhatsApp' and (not v_row.consentimiento_requerido or not v_row.consentimiento_valido) then return jsonb_build_object('ok',false,'status',409,'error','consent_required'); end if;
 if v_row.canal not in ('Email','WhatsApp') then return jsonb_build_object('ok',false,'status',400,'error','unsupported_channel'); end if;
 update fenix_prod.comunicaciones
 set estado='Enviando',send_idempotency_key=p_idempotency_key,attempts=attempts+1,last_error=null,version=version+1,updated_at=now()
 where id=v_row.id returning * into v_row;
 return jsonb_build_object('ok',true,'status',200,'item',to_jsonb(v_row));
end $$;
revoke all on function public.fenix_prod_communications_send_claim_server(text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_communications_send_claim_server(text,text,integer,text,text) to service_role;
