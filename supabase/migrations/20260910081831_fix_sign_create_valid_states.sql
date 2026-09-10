create or replace function public.fenix_prod_sign_create(
 p_expediente_code text,
 p_fecha_firma timestamptz default null,
 p_notaria text default null,
 p_oficial text default null,
 p_fein_recibida_at timestamptz default null,
 p_fein_firmada_at timestamptz default null,
 p_fecha_min_notaria date default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_ctx jsonb; v_actor text; v_role text; v_exp fenix_prod.expedientes%rowtype; v_code text; v_estado text;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 v_ctx:=public.fenix_prod_actor_context_by_auth_server(auth.uid());
 if not coalesce((v_ctx->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 v_actor:=v_ctx->>'actor_code'; v_role:=v_ctx->>'role';
 if v_role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into v_exp from fenix_prod.expedientes where expediente_code=p_expediente_code and synthetic=false limit 1;
 if not found then return jsonb_build_object('ok',false,'status',404,'error','expediente_not_found'); end if;
 if v_role='Financiero' and v_exp.owner_actor_code<>v_actor then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if exists(select 1 from fenix_prod.firmas where expediente_code=p_expediente_code and synthetic=false and estado not in ('Firmado')) then return jsonb_build_object('ok',false,'status',409,'error','active_signature_exists'); end if;
 v_code:='firma-app-'||replace(gen_random_uuid()::text,'-','');
 v_estado:=case when p_fecha_firma is null then 'Pendiente FEIN' else 'Firma programada' end;
 insert into fenix_prod.firmas(firma_code,expediente_code,owner_actor_code,estado,fecha_firma,notaria,oficial,fein_recibida_at,fein_firmada_at,fecha_min_notaria,scheduled_by_actor_code)
 values(v_code,p_expediente_code,v_exp.owner_actor_code,v_estado,p_fecha_firma,nullif(trim(coalesce(p_notaria,'')),''),nullif(trim(coalesce(p_oficial,'')),''),p_fein_recibida_at,p_fein_firmada_at,p_fecha_min_notaria,case when p_fecha_firma is null then null else v_actor end);
 return jsonb_build_object('ok',true,'status',201,'firma_code',v_code,'id',v_code,'expediente_code',p_expediente_code,'estado',v_estado);
end $function$;
