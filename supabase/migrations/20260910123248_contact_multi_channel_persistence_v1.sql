alter table fenix_prod.clientes add column if not exists telefonos jsonb not null default '[]'::jsonb;
alter table fenix_prod.clientes add column if not exists emails jsonb not null default '[]'::jsonb;
alter table fenix_prod.contactos_inmobiliaria add column if not exists telefonos jsonb not null default '[]'::jsonb;
alter table fenix_prod.contactos_inmobiliaria add column if not exists emails jsonb not null default '[]'::jsonb;
alter table fenix_prod.contactos_bancarios add column if not exists telefonos jsonb not null default '[]'::jsonb;
alter table fenix_prod.contactos_bancarios add column if not exists emails jsonb not null default '[]'::jsonb;

update fenix_prod.clientes set telefonos=jsonb_build_array(telefono) where telefono is not null and btrim(telefono)<>'' and jsonb_array_length(telefonos)=0;
update fenix_prod.clientes set emails=jsonb_build_array(email) where email is not null and btrim(email)<>'' and jsonb_array_length(emails)=0;
update fenix_prod.contactos_inmobiliaria set telefonos=jsonb_build_array(telefono) where telefono is not null and btrim(telefono)<>'' and jsonb_array_length(telefonos)=0;
update fenix_prod.contactos_inmobiliaria set emails=jsonb_build_array(email) where email is not null and btrim(email)<>'' and jsonb_array_length(emails)=0;
update fenix_prod.contactos_bancarios set telefonos=jsonb_build_array(telefono) where telefono is not null and btrim(telefono)<>'' and jsonb_array_length(telefonos)=0;
update fenix_prod.contactos_bancarios set emails=jsonb_build_array(email) where email is not null and btrim(email)<>'' and jsonb_array_length(emails)=0;

create or replace function public.fenix_prod_contact_create_v2(
 p_tipo text,
 p_nombre text,
 p_apellidos text default null,
 p_email text default null,
 p_telefono text default null,
 p_emails jsonb default '[]'::jsonb,
 p_telefonos jsonb default '[]'::jsonb,
 p_cargo text default null,
 p_entidad_id text default null,
 p_observaciones text default null,
 p_consentimiento_comercial boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare
 v_ctx jsonb; v_role text; v_result jsonb; v_id text; v_emails jsonb; v_phones jsonb; v_duplicate boolean:=false;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 v_ctx:=public.fenix_prod_actor_context_by_auth_server(auth.uid());
 if not coalesce((v_ctx->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 v_role:=v_ctx->>'role';
 if p_tipo in ('cliente_hipoteca_particular','cliente_hipoteca_inmobiliaria','cliente_deuda_refinanciacion','cliente_herencia','cliente_obra_nueva') and v_role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if p_tipo='trabajador_inmobiliaria' and v_role not in ('Direccion','Visitador') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if p_tipo='contacto_bancario' and v_role<>'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;

 v_emails:=case when jsonb_typeof(p_emails)='array' then p_emails else '[]'::jsonb end;
 v_phones:=case when jsonb_typeof(p_telefonos)='array' then p_telefonos else '[]'::jsonb end;
 if coalesce(btrim(p_email),'')<>'' and not exists(select 1 from jsonb_array_elements_text(v_emails) e where lower(btrim(e))=lower(btrim(p_email))) then v_emails:=jsonb_build_array(btrim(p_email))||v_emails; end if;
 if coalesce(btrim(p_telefono),'')<>'' and not exists(select 1 from jsonb_array_elements_text(v_phones) p where regexp_replace(p,'\D','','g')=regexp_replace(btrim(p_telefono),'\D','','g')) then v_phones:=jsonb_build_array(btrim(p_telefono))||v_phones; end if;

 if p_tipo in ('cliente_hipoteca_particular','cliente_hipoteca_inmobiliaria','cliente_deuda_refinanciacion','cliente_herencia','cliente_obra_nueva') then
   select exists(
     select 1 from fenix_prod.clientes c where c.synthetic=false and (
       exists(select 1 from jsonb_array_elements_text(v_emails) e where btrim(e)<>'' and (lower(c.email)=lower(btrim(e)) or exists(select 1 from jsonb_array_elements_text(c.emails) ce where lower(btrim(ce))=lower(btrim(e)))))
       or exists(select 1 from jsonb_array_elements_text(v_phones) p where regexp_replace(btrim(p),'\D','','g')<>'' and (regexp_replace(coalesce(c.telefono,''),'\D','','g')=regexp_replace(btrim(p),'\D','','g') or exists(select 1 from jsonb_array_elements_text(c.telefonos) cp where regexp_replace(btrim(cp),'\D','','g')=regexp_replace(btrim(p),'\D','','g'))))
     )
   ) into v_duplicate;
 elsif p_tipo='trabajador_inmobiliaria' then
   select exists(
     select 1 from fenix_prod.contactos_inmobiliaria c where c.synthetic=false and (
       exists(select 1 from jsonb_array_elements_text(v_emails) e where btrim(e)<>'' and (lower(c.email)=lower(btrim(e)) or exists(select 1 from jsonb_array_elements_text(c.emails) ce where lower(btrim(ce))=lower(btrim(e)))))
       or exists(select 1 from jsonb_array_elements_text(v_phones) p where regexp_replace(btrim(p),'\D','','g')<>'' and (regexp_replace(coalesce(c.telefono,''),'\D','','g')=regexp_replace(btrim(p),'\D','','g') or exists(select 1 from jsonb_array_elements_text(c.telefonos) cp where regexp_replace(btrim(cp),'\D','','g')=regexp_replace(btrim(p),'\D','','g'))))
     )
   ) into v_duplicate;
 elsif p_tipo='contacto_bancario' then
   select exists(
     select 1 from fenix_prod.contactos_bancarios c where c.synthetic=false and (
       exists(select 1 from jsonb_array_elements_text(v_emails) e where btrim(e)<>'' and (lower(c.email)=lower(btrim(e)) or exists(select 1 from jsonb_array_elements_text(c.emails) ce where lower(btrim(ce))=lower(btrim(e)))))
       or exists(select 1 from jsonb_array_elements_text(v_phones) p where regexp_replace(btrim(p),'\D','','g')<>'' and (regexp_replace(coalesce(c.telefono,''),'\D','','g')=regexp_replace(btrim(p),'\D','','g') or exists(select 1 from jsonb_array_elements_text(c.telefonos) cp where regexp_replace(btrim(cp),'\D','','g')=regexp_replace(btrim(p),'\D','','g'))))
     )
   ) into v_duplicate;
 end if;
 if v_duplicate then return jsonb_build_object('ok',false,'status',409,'error','duplicate_contact'); end if;

 v_result:=public.fenix_prod_contact_create(p_tipo,p_nombre,p_apellidos,p_email,p_telefono,p_cargo,p_entidad_id,p_observaciones,p_consentimiento_comercial);
 if not coalesce((v_result->>'ok')::boolean,false) then return v_result; end if;
 v_id:=v_result->>'id';
 if p_tipo in ('cliente_hipoteca_particular','cliente_hipoteca_inmobiliaria','cliente_deuda_refinanciacion','cliente_herencia','cliente_obra_nueva') then
   update fenix_prod.clientes set telefonos=v_phones,emails=v_emails where cliente_code=v_id;
 elsif p_tipo='trabajador_inmobiliaria' then
   update fenix_prod.contactos_inmobiliaria set telefonos=v_phones,emails=v_emails where contacto_code=v_id;
 elsif p_tipo='contacto_bancario' then
   update fenix_prod.contactos_bancarios set telefonos=v_phones,emails=v_emails where contacto_code=v_id;
 end if;
 return v_result||jsonb_build_object('telefonos',v_phones,'emails',v_emails);
end $function$;

revoke all on function public.fenix_prod_contact_create_v2(text,text,text,text,text,jsonb,jsonb,text,text,text,boolean) from public, anon;
grant execute on function public.fenix_prod_contact_create_v2(text,text,text,text,text,jsonb,jsonb,text,text,text,boolean) to authenticated, service_role;

create or replace function public.fenix_prod_contacts_server(p_actor_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; z text; items jsonb; g jsonb; begin
g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if; r:=g->>'role'; z:=nullif(g->>'zone_code','');
select coalesce(jsonb_agg(x order by x->>'tipo',x->>'nombre'),'[]'::jsonb) into items from (
select jsonb_build_object('id',c.cliente_code,'tipo','Cliente','nombre',trim(coalesce(c.nombre,'')||' '||coalesce(c.apellidos,'')),'estado',c.estado,'activo',c.active,'telefono',c.telefono,'telefonos',c.telefonos,'email',c.email,'emails',c.emails,'origen',c.canal_entrada,'canal_marketing',c.canal_marketing,'cliente_fenix',c.cliente_fenix,'fuente','Clientes','destino','/contactos/'||c.cliente_code) x from fenix_prod.clientes c where c.synthetic=false and r in ('Direccion','Financiero')
union all select jsonb_build_object('id',ci.contacto_code,'tipo','Contacto inmobiliaria','nombre',trim(coalesce(ci.nombre,'')||' '||coalesce(ci.apellidos,'')),'cargo',ci.cargo,'telefono',ci.telefono,'telefonos',ci.telefonos,'email',ci.email,'emails',ci.emails,'contacto_principal',ci.contacto_principal,'activo',ci.activa,'fuente','Contactos inmobiliaria','destino','/contactos/'||ci.contacto_code) from fenix_prod.contactos_inmobiliaria ci where ci.synthetic=false and r in ('Direccion','Visitador')
union all select jsonb_build_object('id',cb.contacto_code,'tipo','Contacto bancario','nombre',trim(coalesce(cb.nombre,'')||' '||coalesce(cb.apellidos,'')),'cargo',cb.cargo,'telefono',cb.telefono,'telefonos',cb.telefonos,'email',cb.email,'emails',cb.emails,'contacto_principal',cb.contacto_preferente,'activo',cb.activo,'fuente','Contactos bancarios','destino','/contactos/'||cb.contacto_code) from fenix_prod.contactos_bancarios cb where cb.synthetic=false and r='Direccion'
union all select jsonb_build_object('id',i.inmobiliaria_code,'tipo','Inmobiliaria','nombre',i.nombre_alias,'localidad',i.localidad,'provincia',i.provincia,'fuente','Inmobiliarias','destino','/inmobiliarias/'||i.inmobiliaria_code) from fenix_prod.inmobiliarias i where i.synthetic=false and (r='Direccion' or (r='Visitador' and (i.owner_actor_code=p_actor_code or (z is not null and i.zone_code=z))) or (r='Financiero' and exists(select 1 from fenix_prod.expedientes e where e.owner_actor_code=p_actor_code and e.inmobiliaria_code=i.inmobiliaria_code)))
) s;
return jsonb_build_object('ok',true,'status',200,'contract_version',6,'role',r,'kpis',jsonb_build_object('total',jsonb_array_length(items)),'items',items); end $function$;

create or replace function public.fenix_prod_contact_get_server(p_actor_code text, p_id text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public','fenix_prod'
as $function$
declare v_base jsonb; v_client fenix_prod.clientes%rowtype; v_lists jsonb; v_exps jsonb;
begin
 select x into v_base from jsonb_array_elements(coalesce((public.fenix_prod_contacts_server(p_actor_code)->'items'),'[]'::jsonb)) x where x->>'id'=p_id limit 1;
 if v_base is null then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
 if v_base->>'tipo'='Cliente' then
   select * into v_client from fenix_prod.clientes where cliente_code=p_id;
   select coalesce(jsonb_agg(l.nombre order by l.nombre),'[]'::jsonb) into v_lists from fenix_prod.contact_list_members m join fenix_prod.contact_lists l on l.list_code=m.list_code where m.cliente_code=p_id and l.active;
   select coalesce(jsonb_agg(ep.expediente_code order by ep.created_at),'[]'::jsonb) into v_exps from fenix_prod.expediente_personas ep where ep.cliente_code=p_id and ep.active;
   v_base=v_base||jsonb_strip_nulls(jsonb_build_object('nombre',v_client.nombre,'apellidos',v_client.apellidos,'dni_nie',v_client.dni_nie,'telefono',v_client.telefono,'telefonos',v_client.telefonos,'email',v_client.email,'emails',v_client.emails,'profile',v_client.profile,'listas',v_lists,'expedientes',v_exps));
 end if;
 return jsonb_build_object('ok',true,'status',200,'contacto',v_base);
end $function$;
