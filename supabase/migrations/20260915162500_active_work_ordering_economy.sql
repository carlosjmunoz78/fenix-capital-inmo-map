-- Canonical active-work semantics across App surfaces.
-- Preserves existing data/contracts; changes ordering and derived KPIs only.

create or replace function public.fenix_prod_expediente_is_active(
  p_stage text,
  p_has_signed_firma boolean default false
)
returns boolean
language sql
immutable
as $$
  select not coalesce(p_has_signed_firma,false)
     and lower(trim(coalesce(p_stage,''))) not in (
       'cerrado','cierre','finalizado','firmado','baja','perdido','pausado'
     );
$$;

create or replace function public.fenix_prod_task_order_bucket(p_estado text)
returns integer
language sql
immutable
as $$
  select case lower(trim(coalesce(p_estado,'')))
    when 'activa' then 0
    when 'pendiente' then 0
    when 'en curso' then 0
    when 'esperando tercero' then 1
    when 'aplazada' then 1
    when 'completada' then 2
    when 'terminada' then 2
    when 'cancelada' then 3
    when 'baja' then 3
    else 1
  end;
$$;

create or replace function public.fenix_prod_exp_list_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_role text; v_items jsonb;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true;
 if v_role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select coalesce(jsonb_agg(to_jsonb(x)-'active_rank' order by x.active_rank asc,x.updated_at desc),'[]'::jsonb)
 into v_items
 from (
   select e.expediente_code,e.cliente_alias,e.stage,e.owner_actor_code,e.version,e.updated_at,
          case when public.fenix_prod_expediente_is_active(
            e.stage,
            exists(select 1 from fenix_prod.firmas f where f.expediente_code=e.expediente_code and lower(coalesce(f.estado,''))='firmado')
          ) then 0 else 1 end active_rank
   from fenix_prod.expedientes e
   where v_role='Direccion' or e.owner_actor_code=p_actor_code
 ) x;
 return jsonb_build_object('ok',true,'status',200,'items',v_items);
end $function$;

create or replace function public.fenix_prod_get_tareas_server(p_actor_code text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_role text; v jsonb;
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if v_role is null then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(
   jsonb_build_object(
     'tarea_code',t.tarea_code,'id',t.tarea_code,'tarea',coalesce(t.titulo,t.tarea_code),'titulo',t.titulo,
     'owner_actor_code',t.owner_actor_code,'estado',t.estado,'criticidad',t.criticidad,'esperando_de',t.esperando_de,
     'fecha_limite',t.fecha_limite,'automatica',t.automatica,'bloqueante',t.bloqueante,'version',t.version,
     'created_at',t.created_at,'completed_at',t.completed_at
   ) order by public.fenix_prod_task_order_bucket(t.estado),coalesce(t.fecha_limite,t.created_at),coalesce(t.titulo,t.tarea_code)
 ),'[]'::jsonb)
 into v
 from fenix_prod.tareas t
 where t.synthetic=false and t.source_url is not null
   and (v_role='Direccion' or (v_role in ('Financiero','Visitador') and t.owner_actor_code=p_actor_code));
 return coalesce(v,'[]'::jsonb);
end $function$;

create or replace function public.fenix_prod_search_server(p_actor_code text,p_q text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare v_role text; v_zone text; q text:=lower(trim(coalesce(p_q,''))); v jsonb;
begin
 select role,zone_code into v_role,v_zone from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if coalesce(v_role,'')='' or length(q)<2 then return '[]'::jsonb; end if;
 with items as (
   select 0 type_order,
          case when public.fenix_prod_expediente_is_active(e.stage,exists(select 1 from fenix_prod.firmas f where f.expediente_code=e.expediente_code and lower(coalesce(f.estado,''))='firmado')) then 0 else 1 end activity_order,
          e.updated_at sort_at,
          jsonb_build_object('type','expediente','id',e.expediente_code,'title',coalesce(nullif(e.cliente_alias,''),e.expediente_code),'meta',coalesce(e.stage,''),'route','/expedientes/'||e.expediente_code) item
   from fenix_prod.expedientes e
   where (lower(e.expediente_code) like '%'||q||'%' or lower(coalesce(e.cliente_alias,'')) like '%'||q||'%' or lower(coalesce(e.localidad,'')) like '%'||q||'%')
     and (v_role='Direccion' or (v_role='Financiero' and e.owner_actor_code=p_actor_code))
   union all
   select 1,0,i.updated_at,jsonb_build_object('type','inmobiliaria','id',i.inmobiliaria_code,'title',coalesce(nullif(i.nombre_alias,''),i.inmobiliaria_code),'meta',coalesce(i.localidad,''),'route','/inmobiliarias/'||i.inmobiliaria_code)
   from fenix_prod.inmobiliarias i
   where (lower(i.inmobiliaria_code) like '%'||q||'%' or lower(coalesce(i.nombre_alias,'')) like '%'||q||'%' or lower(coalesce(i.localidad,'')) like '%'||q||'%' or lower(coalesce(i.telefono,'')) like '%'||q||'%' or lower(coalesce(i.email,'')) like '%'||q||'%')
     and (v_role='Direccion' or (v_role='Visitador' and (i.owner_actor_code=p_actor_code or (v_zone is not null and i.zone_code=v_zone))) or (v_role='Financiero' and exists(select 1 from fenix_prod.expedientes e2 where e2.owner_actor_code=p_actor_code and e2.inmobiliaria_code=i.inmobiliaria_code)))
   union all
   select 2,public.fenix_prod_task_order_bucket(t.estado),t.updated_at,jsonb_build_object('type','tarea','id',t.tarea_code,'title',coalesce(nullif(t.titulo,''),t.tarea_code),'meta',coalesce(t.estado,''),'route','/tareas/'||t.tarea_code)
   from fenix_prod.tareas t
   where (lower(t.tarea_code) like '%'||q||'%' or lower(coalesce(t.titulo,'')) like '%'||q||'%' or lower(coalesce(t.estado,'')) like '%'||q||'%')
     and (v_role='Direccion' or t.owner_actor_code=p_actor_code)
   union all
   select 3,0,b.updated_at,jsonb_build_object('type','banco','id',b.bank_code,'title',coalesce(nullif(b.nombre,''),b.bank_code),'meta',coalesce(b.localidad,''),'route','/bancos/'||b.bank_code)
   from fenix_prod.bancos b
   where v_role in ('Direccion','Financiero') and coalesce(b.active,true)=true
     and (lower(b.bank_code) like '%'||q||'%' or lower(coalesce(b.nombre,'')) like '%'||q||'%' or lower(coalesce(b.localidad,'')) like '%'||q||'%' or lower(coalesce(b.perfil,'')) like '%'||q||'%')
   union all
   select 4,0,t.updated_at,jsonb_build_object('type','tasacion','id',t.appraisal_code,'title',coalesce(nullif(t.tasadora,''),t.appraisal_code),'meta',coalesce(t.estado,''),'route','/tasaciones/'||t.appraisal_code)
   from fenix_prod.tasaciones t
   where (lower(t.appraisal_code) like '%'||q||'%' or lower(coalesce(t.expediente_code,'')) like '%'||q||'%' or lower(coalesce(t.tasadora,'')) like '%'||q||'%' or lower(coalesce(t.estado,'')) like '%'||q||'%')
     and (v_role='Direccion' or (v_role='Financiero' and t.owner_actor_code=p_actor_code))
   union all
   select 5,0,f.updated_at,jsonb_build_object('type','firma','id',f.firma_code,'title',f.firma_code,'meta',coalesce(f.estado,''),'route','/firmas/'||f.firma_code)
   from fenix_prod.firmas f
   where (lower(f.firma_code) like '%'||q||'%' or lower(coalesce(f.expediente_code,'')) like '%'||q||'%' or lower(coalesce(f.estado,'')) like '%'||q||'%')
     and (v_role='Direccion' or (v_role='Financiero' and f.owner_actor_code=p_actor_code))
   union all
   select 6,0,d.updated_at,jsonb_build_object('type','documento','id',d.document_code,'title',coalesce(nullif(d.title,''),d.document_code),'meta',coalesce(d.tipo,''),'route','/documentacion/'||d.document_code)
   from fenix_prod.documentos d left join fenix_prod.expedientes e on e.id=d.expediente_id
   where (lower(d.document_code) like '%'||q||'%' or lower(coalesce(d.title,'')) like '%'||q||'%' or lower(coalesce(d.tipo,'')) like '%'||q||'%')
     and (v_role='Direccion' or (v_role='Financiero' and (d.owner_actor_code=p_actor_code or e.owner_actor_code=p_actor_code)))
   union all
   select 7,0,c.updated_at,jsonb_build_object('type','contacto','id',c.cliente_code,'title',trim(concat_ws(' ',c.nombre,c.apellidos)),'meta',coalesce(c.email,c.telefono,c.estado,''),'route','/contactos/'||c.cliente_code)
   from fenix_prod.clientes c
   where v_role='Direccion' and coalesce(c.active,true)=true
     and (lower(c.cliente_code) like '%'||q||'%' or lower(coalesce(c.nombre,'')) like '%'||q||'%' or lower(coalesce(c.apellidos,'')) like '%'||q||'%' or lower(coalesce(c.telefono,'')) like '%'||q||'%' or lower(coalesce(c.email,'')) like '%'||q||'%')
 )
 select coalesce(jsonb_agg(item order by type_order,activity_order,sort_at desc nulls last),'[]'::jsonb)
 into v from (select * from items order by type_order,activity_order,sort_at desc nulls last limit 100) x;
 return coalesce(v,'[]'::jsonb);
end $function$;

create or replace function public.fenix_prod_profile_goals_get_server(p_actor_code text,p_company_id text default 'FENIX')
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
declare a fenix_prod.actors%rowtype; month_start date:=date_trunc('month',current_date)::date; month_next date:=(date_trunc('month',current_date)+interval '1 month')::date; goals jsonb;
begin
 select * into a from fenix_prod.actors where actor_code=p_actor_code and active limit 1;
 if a.actor_code is null then return jsonb_build_object('ok',false,'status',404,'error','actor_not_found'); end if;
 with applicable as (
   select g.metric_code,g.target_value,g.scope_type,g.effective_from,row_number() over(partition by g.metric_code order by case when g.scope_type='USER' then 0 else 1 end,g.effective_from desc,g.updated_at desc) rn
   from fenix_prod.performance_goals g
   where g.company_id=p_company_id and g.active and g.period_type='MONTH' and g.effective_from<=month_start and (g.effective_to is null or g.effective_to>=month_start)
     and ((g.scope_type='USER' and g.scope_code=a.actor_code) or (g.scope_type='ROLE' and g.scope_code=a.role))
 ), chosen as (select metric_code,target_value from applicable where rn=1), actuals as (
   select 'EXPEDIENTES'::text metric_code,count(*)::int actual
   from fenix_prod.expedientes e
   where e.owner_actor_code=a.actor_code and e.created_at>=month_start and e.created_at<month_next
     and public.fenix_prod_expediente_is_active(e.stage,exists(select 1 from fenix_prod.firmas f where f.expediente_code=e.expediente_code and lower(coalesce(f.estado,''))='firmado'))
   union all
   select 'FIRMAS',count(*)::int from fenix_prod.firmas f where f.owner_actor_code=a.actor_code and coalesce(f.fecha_firma,f.closed_at,f.created_at)>=month_start and coalesce(f.fecha_firma,f.closed_at,f.created_at)<month_next
   union all
   select 'INMOBILIARIAS',count(*)::int from fenix_prod.inmobiliarias i where (i.owner_actor_code=a.actor_code or i.id_visitador_operativo=a.actor_code or i.responsable_fenix=a.actor_code) and i.created_at>=month_start and i.created_at<month_next
 ), rows as (
   select c.metric_code,c.target_value,coalesce(x.actual,0) actual,greatest(c.target_value-coalesce(x.actual,0),0) missing,case when c.target_value=0 then 100 else least(100,round(coalesce(x.actual,0)*100.0/c.target_value))::int end pct
   from chosen c left join actuals x using(metric_code)
 )
 select coalesce(jsonb_agg(jsonb_build_object('metric_code',metric_code,'target',target_value,'actual',actual,'missing',missing,'pct',pct,'status',case when pct>=100 then 'CUMPLIDO' when pct>=75 then 'CERCA' when pct>=40 then 'EN_CURSO' else 'POR_MEJORAR' end,'guidance',case metric_code when 'FIRMAS' then case when missing=0 then 'Objetivo mensual cubierto.' else 'Faltan '||missing||' firma(s) para el objetivo mensual.' end when 'EXPEDIENTES' then case when missing=0 then 'Objetivo mensual cubierto.' else 'Faltan '||missing||' expediente(s) activos para el objetivo mensual.' end when 'INMOBILIARIAS' then case when missing=0 then 'Objetivo mensual cubierto.' else 'Faltan '||missing||' inmobiliaria(s) para el objetivo mensual.' end end) order by metric_code),'[]'::jsonb) into goals from rows;
 return jsonb_build_object('ok',true,'status',200,'actor_code',a.actor_code,'role',a.role,'company_id',p_company_id,'period_start',month_start,'period_end',month_next-1,'items',goals);
end $function$;

create or replace function public.fenix_prod_economia_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; items jsonb; total_base numeric; total_iva numeric; total_total numeric; g jsonb; active_count int; active_requested numeric;
begin
 g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if; r:=g->>'role';
 if r is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.movimiento_code,'movimiento',e.movimiento,'naturaleza',e.naturaleza,'tipo',e.tipo,'estado',e.estado,'beneficiario',e.beneficiario,'concepto',e.concepto,'importe_base',e.importe_base,'iva_pct',e.iva_pct,'iva_importe',e.iva_importe,'total',e.total,'fecha_prevista',e.fecha_prevista,'fecha_factura',e.fecha_factura,'fecha_cobro',e.fecha_cobro) order by coalesce(e.fecha_cobro,e.fecha_factura,e.fecha_prevista,e.created_at) desc),'[]'::jsonb),coalesce(sum(e.importe_base),0),coalesce(sum(e.iva_importe),0),coalesce(sum(e.total),0)
 into items,total_base,total_iva,total_total from fenix_prod.economia e where coalesce(e.synthetic,false)=false;
 select count(*)::int,coalesce(sum(e.importe_solicitado),0)
 into active_count,active_requested
 from fenix_prod.expedientes e
 where coalesce(e.synthetic,false)=false
   and public.fenix_prod_expediente_is_active(e.stage,exists(select 1 from fenix_prod.firmas f where f.expediente_code=e.expediente_code and lower(coalesce(f.estado,''))='firmado'));
 return jsonb_build_object('ok',true,'status',200,'contract_version',2,'items',items,
   'kpis',jsonb_build_object('total_movimientos',jsonb_array_length(items),'importe_base',total_base,'iva',total_iva,'total',total_total),
   'pipeline_activo',jsonb_build_object('expedientes',active_count,'importe_solicitado',active_requested));
end $function$;
