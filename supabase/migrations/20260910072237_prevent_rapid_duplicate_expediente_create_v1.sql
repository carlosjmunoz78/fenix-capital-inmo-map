create or replace function public.fenix_prod_exp_create(
 p_cliente_nombre text,
 p_cliente_apellidos text default null,
 p_cliente_email text default null,
 p_cliente_telefono text default null,
 p_localidad text default null,
 p_precio_vivienda numeric default null,
 p_importe_solicitado numeric default null,
 p_owner_actor_code text default null,
 p_inmobiliaria_code text default null,
 p_payload_operacion jsonb default '{}'::jsonb,
 p_consentimiento_comercial boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare
 v_ctx jsonb; v_actor text; v_role text; v_owner text; v_client text; v_code text; v_existing boolean:=false; v_first jsonb; v_profile jsonb; v_recent text;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 v_ctx:=public.fenix_prod_actor_context_by_auth_server(auth.uid());
 if not coalesce((v_ctx->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 v_actor:=v_ctx->>'actor_code'; v_role:=v_ctx->>'role';
 if v_role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if coalesce(trim(p_cliente_nombre),'')='' then return jsonb_build_object('ok',false,'status',400,'error','client_name_required'); end if;
 if v_role='Financiero' then v_owner:=v_actor; else v_owner:=coalesce(nullif(trim(p_owner_actor_code),''),v_actor); end if;
 if not exists(select 1 from fenix_prod.actors where actor_code=v_owner and active=true and role in ('Direccion','Financiero')) then return jsonb_build_object('ok',false,'status',400,'error','invalid_owner'); end if;
 if coalesce(trim(p_cliente_email),'')<>'' then select cliente_code into v_client from fenix_prod.clientes where lower(email)=lower(trim(p_cliente_email)) and synthetic=false and active limit 1; end if;
 if v_client is null and coalesce(trim(p_cliente_telefono),'')<>'' then select cliente_code into v_client from fenix_prod.clientes where regexp_replace(coalesce(telefono,''),'\D','','g')=regexp_replace(trim(p_cliente_telefono),'\D','','g') and synthetic=false and active limit 1; end if;
 v_first:=case when jsonb_typeof(coalesce(p_payload_operacion,'{}'::jsonb)->'intervinientes')='array' then (p_payload_operacion->'intervinientes')->0 else null end;
 v_profile:=coalesce(v_first,'{}'::jsonb)-'nombre'-'apellidos'-'dni_nie'-'rol_operacion'-'orden_expediente';
 if v_client is null then
   v_client:='app|'||gen_random_uuid()::text;
   insert into fenix_prod.clientes(cliente_code,nombre,apellidos,estado,telefono,email,canal_entrada,canal_marketing,cliente_fenix,consentimiento_comercial,source_payload,synthetic,active,dni_nie,profile)
   values(v_client,trim(p_cliente_nombre),nullif(trim(coalesce(p_cliente_apellidos,'')),''),'Convertido',nullif(trim(coalesce(p_cliente_telefono,'')),''),nullif(trim(coalesce(p_cliente_email,'')),''),'App Fénix','Nuevo expediente',true,coalesce(p_consentimiento_comercial,false),jsonb_build_object('created_by',v_actor),false,true,nullif(upper(regexp_replace(coalesce(v_first->>'dni_nie',''),'[^A-Za-z0-9]','','g')),''),v_profile);
 else
   v_existing:=true;
 end if;
 if coalesce(trim(p_inmobiliaria_code),'')<>'' and not exists(select 1 from fenix_prod.inmobiliarias where inmobiliaria_code=p_inmobiliaria_code and synthetic=false) then return jsonb_build_object('ok',false,'status',400,'error','invalid_inmobiliaria'); end if;
 if v_existing then
   select e.expediente_code into v_recent
   from fenix_prod.expediente_personas ep
   join fenix_prod.expedientes e on e.expediente_code=ep.expediente_code
   where ep.cliente_code=v_client and ep.active and e.synthetic=false
     and lower(coalesce(e.stage,'')) not in ('cerrado','cierre','finalizado','firmado','baja','perdido','pausado')
     and e.created_at >= now()-interval '15 minutes'
     and lower(coalesce(trim(e.localidad),''))=lower(coalesce(trim(p_localidad),''))
     and e.precio_vivienda is not distinct from p_precio_vivienda
   order by e.created_at desc limit 1;
   if v_recent is not null then
     return jsonb_build_object('ok',true,'status',200,'id',v_recent,'expediente_code',v_recent,'cliente_id',v_client,'cliente_reutilizado',true,'destino','Expedientes','primary_participant_linked',true,'duplicate_prevented',true);
   end if;
 end if;
 v_code:='exp-app-'||replace(gen_random_uuid()::text,'-','');
 insert into fenix_prod.expedientes(expediente_code,owner_actor_code,cliente_alias,stage,synthetic,inmobiliaria_code,localidad,precio_vivienda,importe_solicitado,payload_operacion,notas)
 values(v_code,v_owner,trim(p_cliente_nombre||' '||coalesce(p_cliente_apellidos,'')),'Entrada',false,nullif(trim(coalesce(p_inmobiliaria_code,'')),''),nullif(trim(coalesce(p_localidad,'')),''),p_precio_vivienda,p_importe_solicitado,coalesce(p_payload_operacion,'{}'::jsonb),nullif(trim(coalesce(p_payload_operacion->>'notas_generales','')),''));
 insert into fenix_prod.expediente_personas(expediente_code,cliente_code,rol_operacion,orden_expediente,active)
 values(v_code,v_client,coalesce(nullif(v_first->>'rol_operacion',''),'Titular comprador'),coalesce(nullif(v_first->>'orden_expediente','')::int,1),true)
 on conflict do nothing;
 return jsonb_build_object('ok',true,'status',201,'id',v_code,'expediente_code',v_code,'cliente_id',v_client,'cliente_reutilizado',v_existing,'destino','Expedientes','primary_participant_linked',true,'duplicate_prevented',false);
end $function$;
