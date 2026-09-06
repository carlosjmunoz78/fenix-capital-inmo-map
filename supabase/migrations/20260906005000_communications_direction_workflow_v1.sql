create unique index if not exists ux_comms_prepare_idempotency
  on fenix_prod.comunicaciones(prepare_idempotency_key)
  where prepare_idempotency_key is not null;
create unique index if not exists ux_comms_send_idempotency
  on fenix_prod.comunicaciones(send_idempotency_key)
  where send_idempotency_key is not null;

create or replace function public.fenix_prod_communications_list_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path='pg_catalog','public','fenix_prod','extensions','pg_temp'
as $$
declare v_role text; v_items jsonb;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb) into v_items
 from (select * from fenix_prod.comunicaciones where synthetic=false order by created_at desc limit 250) c;
 return jsonb_build_object('ok',true,'status',200,'items',v_items);
end $$;

create or replace function public.fenix_prod_communications_prepare_server(
 p_actor_code text,p_scope_type text,p_scope_code text,p_canal text,p_recipient_alias text,
 p_asunto text,p_cuerpo text,p_consentimiento_requerido boolean,p_consentimiento_valido boolean,
 p_no_contactar boolean,p_idempotency_key text)
returns jsonb language plpgsql security definer
set search_path='pg_catalog','public','fenix_prod','extensions','pg_temp'
as $$
declare v_role text; v_code text; v_hash text; v_row fenix_prod.comunicaciones%rowtype;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if p_scope_type not in ('expediente','inmobiliaria') then return jsonb_build_object('ok',false,'status',400,'error','invalid_scope_type'); end if;
 if p_canal not in ('Email','WhatsApp') then return jsonb_build_object('ok',false,'status',400,'error','invalid_channel'); end if;
 if nullif(trim(p_scope_code),'') is null or nullif(trim(p_recipient_alias),'') is null or nullif(trim(p_cuerpo),'') is null or nullif(trim(p_idempotency_key),'') is null then return jsonb_build_object('ok',false,'status',400,'error','missing_required_fields'); end if;
 if p_no_contactar then return jsonb_build_object('ok',false,'status',409,'error','do_not_contact'); end if;
 if p_canal='WhatsApp' and (not coalesce(p_consentimiento_requerido,false) or not coalesce(p_consentimiento_valido,false)) then return jsonb_build_object('ok',false,'status',409,'error','consent_required'); end if;
 if p_scope_type='expediente' and not exists(select 1 from fenix_prod.expedientes where expediente_code=p_scope_code and synthetic=false) then return jsonb_build_object('ok',false,'status',404,'error','scope_not_found'); end if;
 if p_scope_type='inmobiliaria' and not exists(select 1 from fenix_prod.inmobiliarias where inmobiliaria_code=p_scope_code and synthetic=false) then return jsonb_build_object('ok',false,'status',404,'error','scope_not_found'); end if;
 select * into v_row from fenix_prod.comunicaciones where prepare_idempotency_key=p_idempotency_key limit 1;
 if found then return jsonb_build_object('ok',true,'status',200,'idempotent_replay',true,'item',to_jsonb(v_row)); end if;
 v_code := 'COM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
 v_hash := encode(extensions.digest(convert_to(concat_ws('|',p_scope_type,p_scope_code,p_canal,trim(p_recipient_alias),coalesce(trim(p_asunto),''),trim(p_cuerpo)),'UTF8'),'sha256'),'hex');
 insert into fenix_prod.comunicaciones(communication_code,scope_type,scope_code,owner_actor_code,canal,recipient_alias,asunto,cuerpo,estado,consentimiento_requerido,consentimiento_valido,no_contactar,requiere_aprobacion,payload_hash,prepare_idempotency_key,synthetic)
 values(v_code,p_scope_type,p_scope_code,p_actor_code,p_canal,trim(p_recipient_alias),nullif(trim(p_asunto),''),trim(p_cuerpo),'Preparada',coalesce(p_consentimiento_requerido,false),coalesce(p_consentimiento_valido,false),false,true,v_hash,p_idempotency_key,false)
 returning * into v_row;
 return jsonb_build_object('ok',true,'status',201,'item',to_jsonb(v_row));
end $$;

create or replace function public.fenix_prod_communications_authorize_server(
 p_actor_code text,p_communication_code text,p_expected_version integer,p_payload_hash text)
returns jsonb language plpgsql security definer
set search_path='pg_catalog','public','fenix_prod','pg_temp'
as $$
declare v_role text; v_row fenix_prod.comunicaciones%rowtype;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into v_row from fenix_prod.comunicaciones where communication_code=p_communication_code and synthetic=false for update;
 if not found then return jsonb_build_object('ok',false,'status',404,'error','communication_not_found'); end if;
 if v_row.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict'); end if;
 if v_row.estado<>'Preparada' then return jsonb_build_object('ok',false,'status',409,'error','invalid_state'); end if;
 if v_row.payload_hash<>p_payload_hash then return jsonb_build_object('ok',false,'status',409,'error','payload_changed'); end if;
 if v_row.no_contactar then return jsonb_build_object('ok',false,'status',409,'error','do_not_contact'); end if;
 if v_row.canal='WhatsApp' and (not v_row.consentimiento_requerido or not v_row.consentimiento_valido) then return jsonb_build_object('ok',false,'status',409,'error','consent_required'); end if;
 update fenix_prod.comunicaciones set estado='Autorizada',authorized_hash=payload_hash,approved_by_actor_code=p_actor_code,approved_at=now(),version=version+1,updated_at=now() where id=v_row.id returning * into v_row;
 return jsonb_build_object('ok',true,'status',200,'item',to_jsonb(v_row));
end $$;

create or replace function public.fenix_prod_communications_simulate_server(
 p_actor_code text,p_communication_code text,p_expected_version integer,p_payload_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer
set search_path='pg_catalog','public','fenix_prod','pg_temp'
as $$
declare v_role text; v_row fenix_prod.comunicaciones%rowtype;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into v_row from fenix_prod.comunicaciones where communication_code=p_communication_code and synthetic=false for update;
 if not found then return jsonb_build_object('ok',false,'status',404,'error','communication_not_found'); end if;
 if v_row.send_idempotency_key=p_idempotency_key and v_row.transport_test_status='simulated_ok' then return jsonb_build_object('ok',true,'status',200,'idempotent_replay',true,'item',to_jsonb(v_row)); end if;
 if v_row.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict'); end if;
 if v_row.estado<>'Autorizada' or v_row.authorized_hash is distinct from p_payload_hash or v_row.payload_hash<>p_payload_hash then return jsonb_build_object('ok',false,'status',409,'error','not_authorized_for_current_payload'); end if;
 if v_row.no_contactar then return jsonb_build_object('ok',false,'status',409,'error','do_not_contact'); end if;
 if v_row.canal='WhatsApp' and (not v_row.consentimiento_requerido or not v_row.consentimiento_valido) then return jsonb_build_object('ok',false,'status',409,'error','consent_required'); end if;
 update fenix_prod.comunicaciones set transport_test_status='simulated_ok',transport_idempotency_key=p_idempotency_key,send_idempotency_key=p_idempotency_key,attempts=attempts+1,last_error=null,version=version+1,updated_at=now() where id=v_row.id returning * into v_row;
 return jsonb_build_object('ok',true,'status',200,'mode','SIMULATED','item',to_jsonb(v_row));
end $$;

revoke all on function public.fenix_prod_communications_list_server(text) from public,anon,authenticated;
revoke all on function public.fenix_prod_communications_prepare_server(text,text,text,text,text,text,text,boolean,boolean,boolean,text) from public,anon,authenticated;
revoke all on function public.fenix_prod_communications_authorize_server(text,text,integer,text) from public,anon,authenticated;
revoke all on function public.fenix_prod_communications_simulate_server(text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_communications_list_server(text) to service_role;
grant execute on function public.fenix_prod_communications_prepare_server(text,text,text,text,text,text,text,boolean,boolean,boolean,text) to service_role;
grant execute on function public.fenix_prod_communications_authorize_server(text,text,integer,text) to service_role;
grant execute on function public.fenix_prod_communications_simulate_server(text,text,integer,text,text) to service_role;
