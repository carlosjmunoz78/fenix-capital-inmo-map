create or replace function public.fenix_prod_search_server(p_actor_code text, p_q text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare
  v_role text;
  v_zone text;
  q text:=lower(trim(coalesce(p_q,'')));
  v jsonb;
begin
  select role,zone_code into v_role,v_zone from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if coalesce(v_role,'')='' then return '[]'::jsonb; end if;
  if length(q)<2 then return '[]'::jsonb; end if;
  with items as (
    select jsonb_build_object('type','expediente','id',e.expediente_code,'title',coalesce(nullif(e.cliente_alias,''),e.expediente_code),'meta',coalesce(e.stage,''),'route','/expedientes/'||e.expediente_code) item from fenix_prod.expedientes e where (lower(e.expediente_code) like '%'||q||'%' or lower(coalesce(e.cliente_alias,'')) like '%'||q||'%' or lower(coalesce(e.localidad,'')) like '%'||q||'%') and (v_role='Direccion' or (v_role='Financiero' and e.owner_actor_code=p_actor_code))
    union all
    select jsonb_build_object('type','inmobiliaria','id',i.inmobiliaria_code,'title',coalesce(nullif(i.nombre_alias,''),i.inmobiliaria_code),'meta',coalesce(i.localidad,''),'route','/inmobiliarias/'||i.inmobiliaria_code) item from fenix_prod.inmobiliarias i where (lower(i.inmobiliaria_code) like '%'||q||'%' or lower(coalesce(i.nombre_alias,'')) like '%'||q||'%' or lower(coalesce(i.localidad,'')) like '%'||q||'%' or lower(coalesce(i.telefono,'')) like '%'||q||'%' or lower(coalesce(i.email,'')) like '%'||q||'%') and (v_role='Direccion' or (v_role='Visitador' and (i.owner_actor_code=p_actor_code or (v_zone is not null and i.zone_code=v_zone))) or (v_role='Financiero' and exists(select 1 from fenix_prod.expedientes e2 where e2.owner_actor_code=p_actor_code and e2.inmobiliaria_code=i.inmobiliaria_code)))
    union all
    select jsonb_build_object('type','tarea','id',t.tarea_code,'title',coalesce(nullif(t.titulo,''),t.tarea_code),'meta',coalesce(t.estado,''),'route','/tareas/'||t.tarea_code) item from fenix_prod.tareas t where (lower(t.tarea_code) like '%'||q||'%' or lower(coalesce(t.titulo,'')) like '%'||q||'%' or lower(coalesce(t.estado,'')) like '%'||q||'%') and (v_role='Direccion' or t.owner_actor_code=p_actor_code)
    union all
    select jsonb_build_object('type','banco','id',b.bank_code,'title',coalesce(nullif(b.nombre,''),b.bank_code),'meta',coalesce(b.localidad,''),'route','/bancos/'||b.bank_code) item from fenix_prod.bancos b where v_role in ('Direccion','Financiero') and coalesce(b.active,true)=true and (lower(b.bank_code) like '%'||q||'%' or lower(coalesce(b.nombre,'')) like '%'||q||'%' or lower(coalesce(b.localidad,'')) like '%'||q||'%' or lower(coalesce(b.perfil,'')) like '%'||q||'%')
    union all
    select jsonb_build_object('type','tasacion','id',t.appraisal_code,'title',coalesce(nullif(t.tasadora,''),t.appraisal_code),'meta',coalesce(t.estado,''),'route','/tasaciones/'||t.appraisal_code) item from fenix_prod.tasaciones t where (lower(t.appraisal_code) like '%'||q||'%' or lower(coalesce(t.expediente_code,'')) like '%'||q||'%' or lower(coalesce(t.tasadora,'')) like '%'||q||'%' or lower(coalesce(t.estado,'')) like '%'||q||'%') and (v_role='Direccion' or (v_role='Financiero' and t.owner_actor_code=p_actor_code))
    union all
    select jsonb_build_object('type','firma','id',f.firma_code,'title',f.firma_code,'meta',coalesce(f.estado,''),'route','/firmas/'||f.firma_code) item from fenix_prod.firmas f where (lower(f.firma_code) like '%'||q||'%' or lower(coalesce(f.expediente_code,'')) like '%'||q||'%' or lower(coalesce(f.estado,'')) like '%'||q||'%') and (v_role='Direccion' or (v_role='Financiero' and f.owner_actor_code=p_actor_code))
    union all
    select jsonb_build_object('type','documento','id',d.document_code,'title',coalesce(nullif(d.title,''),d.document_code),'meta',coalesce(d.tipo,''),'route','/documentacion/'||d.document_code) item from fenix_prod.documentos d left join fenix_prod.expedientes e on e.id=d.expediente_id where (lower(d.document_code) like '%'||q||'%' or lower(coalesce(d.title,'')) like '%'||q||'%' or lower(coalesce(d.tipo,'')) like '%'||q||'%') and (v_role='Direccion' or (v_role='Financiero' and (d.owner_actor_code=p_actor_code or e.owner_actor_code=p_actor_code)))
    union all
    select jsonb_build_object('type','contacto','id',c.cliente_code,'title',trim(concat_ws(' ',c.nombre,c.apellidos)),'meta',coalesce(c.email,c.telefono,c.estado,''),'route','/contactos/'||c.cliente_code) item from fenix_prod.clientes c where v_role='Direccion' and coalesce(c.active,true)=true and (lower(c.cliente_code) like '%'||q||'%' or lower(coalesce(c.nombre,'')) like '%'||q||'%' or lower(coalesce(c.apellidos,'')) like '%'||q||'%' or lower(coalesce(c.telefono,'')) like '%'||q||'%' or lower(coalesce(c.email,'')) like '%'||q||'%')
  )
  select coalesce(jsonb_agg(item),'[]'::jsonb) into v from (select item from items limit 100) x;
  return coalesce(v,'[]'::jsonb);
end $function$;
revoke all on function public.fenix_prod_search_server(text,text) from public, anon, authenticated;
grant execute on function public.fenix_prod_search_server(text,text) to service_role;
