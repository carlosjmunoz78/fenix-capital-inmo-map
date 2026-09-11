begin;

create table if not exists fenix_prod.weekly_report_snapshots (
  week_start date not null,
  scope_key text not null,
  scope_kind text not null check (scope_kind in ('company','actor')),
  scope_actor_code text references fenix_prod.actors(actor_code),
  status text not null,
  activity_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (week_start,scope_key)
);

create index if not exists idx_weekly_report_snapshots_scope
  on fenix_prod.weekly_report_snapshots(scope_kind,scope_actor_code,week_start desc);

revoke all on fenix_prod.weekly_report_snapshots from anon, authenticated;

create or replace function fenix_prod.refresh_weekly_report_snapshot_v1(p_week_start date,p_actor_code text default null)
returns void
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $$
declare
  v_start date:=date_trunc('week',p_week_start::timestamp)::date;
  v_end date:=date_trunc('week',p_week_start::timestamp)::date+6;
  v_scope text:=case when p_actor_code is null then 'company' else 'actor' end;
  v_key text:=coalesce(p_actor_code,'__company__');
  v_count int;
  v_events jsonb;
  v_breakdown jsonb;
begin
  select count(*),coalesce(jsonb_agg(jsonb_build_object(
    'at',l.occurred_at,
    'local_datetime',to_char(l.occurred_at at time zone 'Europe/Madrid','DD/MM/YYYY HH24:MI:SS'),
    'local_time',to_char(l.occurred_at at time zone 'Europe/Madrid','HH24:MI:SS'),
    'actor_code',l.actor_code,
    'actor',coalesce(a.display_name,l.actor_code,'Sistema/No identificado'),
    'role',l.actor_role,
    'entity_type',l.entity_type,
    'entity_code',l.entity_code,
    'action',l.action,
    'changed_fields',l.changed_fields,
    'source',l.source
  ) order by l.occurred_at desc),'[]'::jsonb)
  into v_count,v_events
  from fenix_prod.activity_log l
  left join fenix_prod.actors a on a.actor_code=l.actor_code
  where (l.occurred_at at time zone 'Europe/Madrid')::date between v_start and v_end
    and (p_actor_code is null or l.actor_code=p_actor_code);

  select coalesce(jsonb_object_agg(k,c),'{}'::jsonb)
  into v_breakdown
  from (
    select entity_type||':'||action k,count(*) c
    from fenix_prod.activity_log
    where (occurred_at at time zone 'Europe/Madrid')::date between v_start and v_end
      and (p_actor_code is null or actor_code=p_actor_code)
    group by entity_type,action
    order by entity_type,action
  ) s;

  insert into fenix_prod.weekly_report_snapshots(week_start,scope_key,scope_kind,scope_actor_code,status,activity_count,payload,generated_at)
  values(v_start,v_key,v_scope,p_actor_code,'completed',v_count,jsonb_build_object(
    'events',v_events,'breakdown',v_breakdown,'timezone','Europe/Madrid','coverage','audited_activity','time_precision','second','week_end',v_end
  ),now())
  on conflict(week_start,scope_key) do update
  set status='completed',activity_count=excluded.activity_count,payload=excluded.payload,generated_at=excluded.generated_at;
end
$$;

create or replace function fenix_prod.activity_refresh_report_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $$
declare
  d date;
  w date;
begin
  d=(new.occurred_at at time zone 'Europe/Madrid')::date;
  w=date_trunc('week',d::timestamp)::date;
  perform fenix_prod.refresh_daily_report_snapshot_v1(d,null);
  perform fenix_prod.refresh_weekly_report_snapshot_v1(w,null);
  if new.actor_code is not null then
    perform fenix_prod.refresh_daily_report_snapshot_v1(d,new.actor_code);
    perform fenix_prod.refresh_weekly_report_snapshot_v1(w,new.actor_code);
  end if;
  return new;
end
$$;

create or replace function public.fenix_prod_reports_server(p_actor_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $$
declare
  g jsonb;
  r text;
  daily_items jsonb;
  weekly_items jsonb;
  items jsonb;
  v_scope_kind text;
  v_scope_actor text;
  d int;
  w int;
begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code);
  if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role';
  if r not in ('Direccion','Financiero','Visitador') then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  v_scope_kind:=case when r='Direccion' then 'company' else 'actor' end;
  v_scope_actor:=case when r='Direccion' then null else p_actor_code end;

  for d in 0..29 loop
    perform fenix_prod.refresh_daily_report_snapshot_v1(current_date-d,v_scope_actor);
  end loop;
  for w in 0..11 loop
    perform fenix_prod.refresh_weekly_report_snapshot_v1((date_trunc('week',current_date::timestamp)::date-(w*7)),v_scope_actor);
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id','daily-'||s.scope_key||'-'||s.report_date::text,
    'categoria','Informe diario','tipo','Informe diario','periodo','daily',
    'titulo',case when v_scope_kind='company' then 'Informe diario de toda la empresa · '||to_char(s.report_date,'DD/MM/YYYY') else 'Mi informe diario · '||to_char(s.report_date,'DD/MM/YYYY') end,
    'fecha',s.report_date,'generado_en',s.generated_at,'status',s.status,'activity_count',s.activity_count,
    'scope_kind',s.scope_kind,'scope_actor_code',s.scope_actor_code,
    'activity',coalesce(s.payload->'events','[]'::jsonb),'breakdown',coalesce(s.payload->'breakdown','{}'::jsonb),
    'timezone','Europe/Madrid','time_precision','second',
    'coverage','Actividad auditada con usuario, rol, acción, entidad y hora exacta'
  ) order by s.report_date desc),'[]'::jsonb)
  into daily_items
  from fenix_prod.daily_report_snapshots s
  where s.scope_kind=v_scope_kind
    and ((v_scope_actor is null and s.scope_actor_code is null) or s.scope_actor_code=v_scope_actor)
    and s.report_date>=current_date-29;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id','weekly-'||s.scope_key||'-'||s.week_start::text,
    'categoria','Informe semanal','tipo','Informe semanal','periodo','weekly',
    'titulo',case when v_scope_kind='company' then 'Informe semanal de toda la empresa · '||to_char(s.week_start,'DD/MM/YYYY') else 'Mi informe semanal · '||to_char(s.week_start,'DD/MM/YYYY') end,
    'fecha',s.week_start,'generado_en',s.generated_at,'status',s.status,'activity_count',s.activity_count,
    'scope_kind',s.scope_kind,'scope_actor_code',s.scope_actor_code,
    'activity',coalesce(s.payload->'events','[]'::jsonb),'breakdown',coalesce(s.payload->'breakdown','{}'::jsonb),
    'timezone','Europe/Madrid','time_precision','second',
    'coverage','Actividad auditada de la semana con usuario, rol, acción, entidad y hora exacta'
  ) order by s.week_start desc),'[]'::jsonb)
  into weekly_items
  from fenix_prod.weekly_report_snapshots s
  where s.scope_kind=v_scope_kind
    and ((v_scope_actor is null and s.scope_actor_code is null) or s.scope_actor_code=v_scope_actor)
    and s.week_start>=date_trunc('week',current_date::timestamp)::date-77;

  items:=coalesce(daily_items,'[]'::jsonb)||coalesce(weekly_items,'[]'::jsonb);
  return jsonb_build_object(
    'ok',true,'status',200,'contract_version',4,'role',r,'scope',v_scope_kind,
    'periods',jsonb_build_array('daily','weekly'),'timezone','Europe/Madrid','items',items,
    'kpis',jsonb_build_object('total',jsonb_array_length(items),'daily',jsonb_array_length(daily_items),'weekly',jsonb_array_length(weekly_items))
  );
end
$$;

commit;
