alter table fenix_prod.inmobiliarias add column if not exists notas_b2b text;
alter table fenix_prod.inmobiliarias add column if not exists proximo_contacto_b2b date;

update fenix_prod.inmobiliarias i
set notas_b2b = nullif((select string_agg(e->>'plain_text','' order by ord) from jsonb_array_elements(coalesce(i.source_payload#>'{properties,Notas,rich_text}','[]'::jsonb)) with ordinality as t(e,ord)),'')
where i.notas_b2b is null and jsonb_typeof(i.source_payload#>'{properties,Notas,rich_text}')='array';

update fenix_prod.inmobiliarias
set proximo_contacto_b2b = nullif(source_payload#>>'{properties,Próximo contacto B2B,date,start}','')::date
where proximo_contacto_b2b is null and nullif(source_payload#>>'{properties,Próximo contacto B2B,date,start}','') is not null;

create or replace function public.fenix_prod_inmo_list_server(p_actor_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; z text; items jsonb; g jsonb; begin
g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if; r:=g->>'role'; z:=nullif(g->>'zone_code','');
if r not in ('Direccion','Financiero','Visitador') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
select coalesce(jsonb_agg(jsonb_build_object(
'inmobiliaria_code',i.inmobiliaria_code,'id',i.inmobiliaria_code,'nombre_alias',i.nombre_alias,'nombre',i.nombre_alias,
'localidad',i.localidad,'provincia',i.provincia,'estado',i.estado,'direccion',i.direccion,'telefono',i.telefono,'email',i.email,
'prioridad_b2b',i.prioridad_b2b,'salud_b2b',i.salud_b2b,'nivel_colaboracion',i.nivel_colaboracion,'canal_preferido_b2b',i.canal_preferido_b2b,
'comision_vigente',i.comision_vigente,'comision_fenix_por_firma',i.comision_fenix_firma,'activa',i.activa,'owner_actor_code',i.owner_actor_code,
'zone_code',i.zone_code,'zona_operativa',i.zona_operativa,'id_visitador_operativo',i.id_visitador_operativo,
'notas_b2b',i.notas_b2b,'proximo_contacto_b2b',i.proximo_contacto_b2b,'version',i.version,'updated_at',i.updated_at
) order by i.nombre_alias),'[]'::jsonb) into items
from fenix_prod.inmobiliarias i
where i.synthetic=false and (r='Direccion' or (r='Visitador' and (i.owner_actor_code=p_actor_code or (z is not null and i.zone_code=z))) or (r='Financiero' and exists(select 1 from fenix_prod.expedientes e where e.owner_actor_code=p_actor_code and e.inmobiliaria_code=i.inmobiliaria_code)));
return jsonb_build_object('ok',true,'status',200,'contract_version',4,'role',r,'kpis',jsonb_build_object('total',jsonb_array_length(items)),'items',items); end $function$;

create or replace function public.fenix_prod_inmo_get_server(p_actor_code text,p_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; z text; x fenix_prod.inmobiliarias%rowtype; exps jsonb; exp_n int:=0; signed_n int:=0; begin
select role,zone_code into r,z from fenix_prod.actors where actor_code=p_actor_code and active=true;
if r is null then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
select * into x from fenix_prod.inmobiliarias where inmobiliaria_code=p_code;
if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
if not (r='Direccion' or (r='Visitador' and (x.owner_actor_code=p_actor_code or (z is not null and x.zone_code=z))) or (r='Financiero' and exists(select 1 from fenix_prod.expedientes e where e.owner_actor_code=p_actor_code and e.inmobiliaria_code=x.inmobiliaria_code))) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
select coalesce(jsonb_agg(jsonb_build_object('expediente_code',e.expediente_code,'cliente_alias',e.cliente_alias,'stage',e.stage,'owner_actor_code',e.owner_actor_code,'version',e.version,'updated_at',e.updated_at) order by e.updated_at desc),'[]'::jsonb) into exps from fenix_prod.expedientes e where e.inmobiliaria_code=x.inmobiliaria_code and (r in ('Direccion','Visitador') or (r='Financiero' and e.owner_actor_code=p_actor_code));
exp_n:=jsonb_array_length(exps); select count(*) into signed_n from jsonb_array_elements(exps) q where q->>'stage'='Firmado';
return jsonb_build_object('ok',true,'status',200,'contract_version',3,
'item',jsonb_build_object('id',x.inmobiliaria_code,'inmobiliaria_code',x.inmobiliaria_code,'nombre_alias',x.nombre_alias,'nombre',x.nombre_alias,
'localidad',x.localidad,'provincia',x.provincia,'direccion',x.direccion,'telefono',x.telefono,'email',x.email,'estado',x.estado,'activa',x.activa,
'owner_actor_code',x.owner_actor_code,'zone_code',x.zone_code,'zona_operativa',x.zona_operativa,'id_visitador_operativo',x.id_visitador_operativo,
'prioridad_b2b',x.prioridad_b2b,'salud_b2b',x.salud_b2b,'nivel_colaboracion',x.nivel_colaboracion,'canal_preferido_b2b',x.canal_preferido_b2b,
'notas_b2b',x.notas_b2b,'proximo_contacto_b2b',x.proximo_contacto_b2b,'version',x.version,'updated_at',x.updated_at,
'expedientes',exps,'firmas',jsonb_build_array()),
'stats',jsonb_build_object('expedientes_total',exp_n,'firmados',signed_n),'expedientes',exps); end $function$;

create or replace function public.fenix_prod_inmo_followup_update_v1(p_inmobiliaria_code text,p_expected_version integer,p_notas text default null,p_proximo_contacto date default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_ctx jsonb; v_actor text; v_role text; v_zone text; x fenix_prod.inmobiliarias%rowtype; begin
if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
v_ctx:=public.fenix_prod_actor_context_by_auth_server(auth.uid());
if not coalesce((v_ctx->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
v_actor:=v_ctx->>'actor_code';v_role:=v_ctx->>'role';v_zone:=nullif(v_ctx->>'zone_code','');
if v_role not in ('Direccion','Visitador') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
select * into x from fenix_prod.inmobiliarias where inmobiliaria_code=p_inmobiliaria_code and synthetic=false for update;
if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
if v_role='Visitador' and not (x.owner_actor_code=v_actor or (v_zone is not null and x.zone_code=v_zone)) then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
if x.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',x.version); end if;
update fenix_prod.inmobiliarias set notas_b2b=case when p_notas is null then notas_b2b else nullif(btrim(p_notas),'') end,
proximo_contacto_b2b=coalesce(p_proximo_contacto,proximo_contacto_b2b),version=version+1,updated_at=now()
where inmobiliaria_code=p_inmobiliaria_code returning * into x;
return jsonb_build_object('ok',true,'status',200,'inmobiliaria_code',x.inmobiliaria_code,'version',x.version,'notas_b2b',x.notas_b2b,'proximo_contacto_b2b',x.proximo_contacto_b2b); end $function$;

revoke all on function public.fenix_prod_inmo_followup_update_v1(text,integer,text,date) from public,anon;
grant execute on function public.fenix_prod_inmo_followup_update_v1(text,integer,text,date) to authenticated,service_role;
