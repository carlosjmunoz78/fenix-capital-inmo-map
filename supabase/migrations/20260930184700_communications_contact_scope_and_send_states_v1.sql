alter table fenix_prod.comunicaciones drop constraint if exists comunicaciones_scope_type_check;
alter table fenix_prod.comunicaciones
  add constraint comunicaciones_scope_type_check
  check (scope_type = any (array['expediente'::text,'inmobiliaria'::text,'contacto'::text]));

alter table fenix_prod.comunicaciones drop constraint if exists comunicaciones_estado_check;
alter table fenix_prod.comunicaciones
  add constraint comunicaciones_estado_check
  check (estado = any (array[
    'Preparada'::text,'Autorizada'::text,'Enviando'::text,'Enviada'::text,
    'Respondida'::text,'Cancelada'::text,'Error'::text
  ]));

create or replace function public.fenix_prod_communications_prepare_server(
  p_actor_code text,
  p_scope_type text,
  p_scope_code text,
  p_canal text,
  p_recipient_alias text,
  p_asunto text,
  p_cuerpo text,
  p_consentimiento_requerido boolean,
  p_consentimiento_valido boolean,
  p_no_contactar boolean,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','fenix_prod','extensions','pg_temp'
as $function$
declare
  v_role text;
  v_code text;
  v_hash text;
  v_row fenix_prod.comunicaciones%rowtype;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  if p_scope_type not in ('expediente','inmobiliaria','contacto') then return jsonb_build_object('ok',false,'status',400,'error','invalid_scope_type'); end if;
  if p_canal not in ('Email','WhatsApp') then return jsonb_build_object('ok',false,'status',400,'error','invalid_channel'); end if;
  if nullif(trim(p_scope_code),'') is null or nullif(trim(p_recipient_alias),'') is null or nullif(trim(p_cuerpo),'') is null or nullif(trim(p_idempotency_key),'') is null then
    return jsonb_build_object('ok',false,'status',400,'error','missing_required_fields');
  end if;
  if p_no_contactar then return jsonb_build_object('ok',false,'status',409,'error','do_not_contact'); end if;
  if p_canal='WhatsApp' and (not coalesce(p_consentimiento_requerido,false) or not coalesce(p_consentimiento_valido,false)) then
    return jsonb_build_object('ok',false,'status',409,'error','consent_required');
  end if;
  if p_scope_type='expediente' and not exists(select 1 from fenix_prod.expedientes where expediente_code=p_scope_code and synthetic=false) then
    return jsonb_build_object('ok',false,'status',404,'error','scope_not_found');
  end if;
  if p_scope_type='inmobiliaria' and not exists(select 1 from fenix_prod.inmobiliarias where inmobiliaria_code=p_scope_code and synthetic=false) then
    return jsonb_build_object('ok',false,'status',404,'error','scope_not_found');
  end if;

  select * into v_row from fenix_prod.comunicaciones where prepare_idempotency_key=p_idempotency_key limit 1;
  if found then return jsonb_build_object('ok',true,'status',200,'idempotent_replay',true,'item',to_jsonb(v_row)); end if;

  v_code := 'COM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
  v_hash := encode(
    extensions.digest(convert_to(concat_ws('|',p_scope_type,p_scope_code,p_canal,trim(p_recipient_alias),coalesce(trim(p_asunto),''),trim(p_cuerpo)),'UTF8'),'sha256'),
    'hex'
  );

  insert into fenix_prod.comunicaciones(
    communication_code,scope_type,scope_code,owner_actor_code,canal,recipient_alias,asunto,cuerpo,estado,
    consentimiento_requerido,consentimiento_valido,no_contactar,requiere_aprobacion,payload_hash,
    prepare_idempotency_key,synthetic
  ) values(
    v_code,p_scope_type,p_scope_code,p_actor_code,p_canal,trim(p_recipient_alias),nullif(trim(p_asunto),''),
    trim(p_cuerpo),'Preparada',coalesce(p_consentimiento_requerido,false),coalesce(p_consentimiento_valido,false),
    false,true,v_hash,p_idempotency_key,false
  ) returning * into v_row;

  return jsonb_build_object('ok',true,'status',201,'item',to_jsonb(v_row));
end
$function$;
