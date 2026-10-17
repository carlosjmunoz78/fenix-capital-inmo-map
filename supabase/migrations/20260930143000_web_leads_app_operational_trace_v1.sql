-- CEREBRO web leads -> App operational trace v1
-- Additive candidate. No existing table is replaced or dropped.

create or replace function public.fenix_prod_web_leads_list_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  v_items jsonb;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.received_at desc),'[]'::jsonb)
  into v_items
  from (
    select
      c.id,
      c.cliente_code,
      c.nombre,
      c.email,
      c.telefono,
      c.estado,
      c.consentimiento_comercial,
      c.created_at as received_at,
      c.updated_at,
      coalesce(c.source_payload->>'source','web') as source,
      c.source_payload->>'landing_url' as landing_url,
      coalesce(c.source_payload->>'city',c.source_payload->>'source_city') as city,
      coalesce(c.source_payload->>'funnel',c.source_payload->>'intent') as funnel,
      c.source_payload->>'asset_url' as asset_url,
      c.source_payload->>'asset_label' as asset_label,
      t.tarea_code,
      t.estado as task_state,
      t.planned_action,
      t.happened,
      t.fecha_limite,
      t.updated_at as task_updated_at,
      (
        select max(n.created_at)
        from fenix_prod.task_action_notes n
        where n.tarea_code=t.tarea_code
      ) as last_action_at
    from fenix_prod.clientes c
    left join lateral (
      select tt.*
      from fenix_prod.tareas tt
      where tt.origin_type='cliente' and tt.origin_code=c.cliente_code
      order by tt.created_at desc
      limit 1
    ) t on true
    where c.active=true
      and (
        coalesce(c.source_payload->>'source','') like 'web%'
        or c.canal_entrada='Web'
      )
  ) x;

  return jsonb_build_object('ok',true,'status',200,'items',v_items);
end
$$;

create or replace function public.fenix_prod_web_lead_timeline_server(
  p_actor_code text,
  p_cliente_code text
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  v_cliente fenix_prod.clientes%rowtype;
  v_timeline jsonb;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  select * into v_cliente
  from fenix_prod.clientes
  where cliente_code=p_cliente_code and active=true
    and (coalesce(source_payload->>'source','') like 'web%' or canal_entrada='Web')
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','lead_not_found');
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.occurred_at desc),'[]'::jsonb)
  into v_timeline
  from (
    select
      le.created_at as occurred_at,
      'lead'::text as kind,
      le.status::text as action,
      null::text as actor_code,
      jsonb_build_object('idempotency_key',le.idempotency_key) as meta
    from fenix_prod.lead_events le
    where le.cliente_id=v_cliente.id

    union all

    select
      n.created_at,
      'task_action',
      n.action_kind,
      n.actor_code,
      jsonb_build_object('comment',n.comment_text,'tarea_code',n.tarea_code)
    from fenix_prod.task_action_notes n
    join fenix_prod.tareas tt on tt.tarea_code=n.tarea_code
    where tt.origin_type='cliente' and tt.origin_code=v_cliente.cliente_code

    union all

    select
      al.occurred_at,
      'activity',
      al.action,
      al.actor_code,
      jsonb_build_object('entity_type',al.entity_type,'entity_code',al.entity_code,'changed_fields',al.changed_fields,'source',al.source,'source_ref',al.source_ref)
    from fenix_prod.activity_log al
    where (al.entity_type='clientes' and al.entity_code=v_cliente.cliente_code)
       or (al.entity_type='tareas' and al.entity_code in (
          select tarea_code from fenix_prod.tareas where origin_type='cliente' and origin_code=v_cliente.cliente_code
       ))

    union all

    select
      co.updated_at,
      'communication',
      co.estado,
      co.owner_actor_code,
      jsonb_build_object('canal',co.canal,'asunto',co.asunto,'provider_message_id',co.provider_message_id,'provider_event_type',co.provider_event_type,'last_error',co.last_error)
    from fenix_prod.comunicaciones co
    where co.scope_code=v_cliente.cliente_code
  ) t;

  return jsonb_build_object(
    'ok',true,'status',200,
    'lead',jsonb_build_object(
      'id',v_cliente.id,
      'cliente_code',v_cliente.cliente_code,
      'nombre',v_cliente.nombre,
      'email',v_cliente.email,
      'telefono',v_cliente.telefono,
      'estado',v_cliente.estado,
      'consentimiento_comercial',v_cliente.consentimiento_comercial,
      'source_payload',v_cliente.source_payload,
      'created_at',v_cliente.created_at,
      'updated_at',v_cliente.updated_at
    ),
    'timeline',v_timeline
  );
end
$$;

create or replace function public.fenix_prod_web_lead_action_server(
  p_actor_code text,
  p_cliente_code text,
  p_action_kind text,
  p_comment text default null,
  p_happened text default null,
  p_planned_action text default null,
  p_next_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  v_cliente fenix_prod.clientes%rowtype;
  v_task fenix_prod.tareas%rowtype;
  v_action text := left(coalesce(nullif(btrim(p_action_kind),''),'note'),80);
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  select * into v_cliente
  from fenix_prod.clientes
  where cliente_code=p_cliente_code and active=true
    and (coalesce(source_payload->>'source','') like 'web%' or canal_entrada='Web')
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','lead_not_found');
  end if;

  select * into v_task
  from fenix_prod.tareas
  where origin_type='cliente' and origin_code=v_cliente.cliente_code
    and estado not in ('Completada','Cancelada')
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok',false,'status',409,'error','active_task_not_found');
  end if;

  insert into fenix_prod.task_action_notes(tarea_code,actor_code,action_kind,comment_text)
  values(v_task.tarea_code,p_actor_code,v_action,nullif(btrim(p_comment),''));

  update fenix_prod.tareas
  set happened=coalesce(nullif(btrim(p_happened),''),happened),
      planned_action=coalesce(nullif(btrim(p_planned_action),''),planned_action),
      fecha_limite=coalesce(p_next_at,fecha_limite),
      estado=case when estado='Pendiente' then 'En curso' else estado end,
      version=version+1,
      updated_at=now()
  where id=v_task.id
  returning * into v_task;

  insert into fenix_prod.activity_log(
    actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref,occurred_at
  ) values(
    p_actor_code,v_role,'web_lead',v_cliente.cliente_code,'WEB_LEAD_ACTION',
    jsonb_build_array('happened','planned_action','fecha_limite'),
    'app','task:'||v_task.tarea_code,now()
  );

  return jsonb_build_object(
    'ok',true,'status',200,
    'cliente_code',v_cliente.cliente_code,
    'task',jsonb_build_object(
      'tarea_code',v_task.tarea_code,
      'estado',v_task.estado,
      'happened',v_task.happened,
      'planned_action',v_task.planned_action,
      'fecha_limite',v_task.fecha_limite,
      'version',v_task.version,
      'updated_at',v_task.updated_at
    )
  );
end
$$;

revoke all on function public.fenix_prod_web_leads_list_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_web_lead_timeline_server(text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_web_lead_action_server(text,text,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.fenix_prod_web_leads_list_server(text) to service_role;
grant execute on function public.fenix_prod_web_lead_timeline_server(text,text) to service_role;
grant execute on function public.fenix_prod_web_lead_action_server(text,text,text,text,text,text,timestamptz) to service_role;
