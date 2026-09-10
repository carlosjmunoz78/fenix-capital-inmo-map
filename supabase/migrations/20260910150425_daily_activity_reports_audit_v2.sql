create table fenix_prod.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_code text null references fenix_prod.actors(actor_code),
  actor_role text null,
  entity_type text not null,
  entity_code text null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_fields jsonb not null default '[]'::jsonb,
  source text not null default 'trigger',
  source_ref text null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index activity_log_source_ref_uq on fenix_prod.activity_log(source,source_ref) where source_ref is not null;
create index activity_log_day_actor_idx on fenix_prod.activity_log(occurred_at,actor_code);
create index activity_log_entity_idx on fenix_prod.activity_log(entity_type,entity_code,occurred_at desc);
revoke all on fenix_prod.activity_log from public, anon, authenticated;
alter table fenix_prod.activity_log enable row level security;

create or replace function fenix_prod.capture_activity_v1()
returns trigger language plpgsql security definer set search_path='fenix_prod','public','auth','pg_temp' as $$
declare v_actor text; v_role text; v_new jsonb; v_old jsonb; v_code text; v_changed jsonb:='[]'::jsonb;
begin
  select actor_code, role into v_actor, v_role from fenix_prod.actors where auth_user_id=auth.uid() and active=true limit 1;
  if tg_op='INSERT' then v_new=to_jsonb(new); v_old='{}'::jsonb;
  elsif tg_op='UPDATE' then v_new=to_jsonb(new); v_old=to_jsonb(old);
  else v_new='{}'::jsonb; v_old=to_jsonb(old); end if;
  v_code=coalesce(v_new->>'expediente_code',v_new->>'cliente_code',v_new->>'contacto_code',v_new->>'inmobiliaria_code',v_new->>'bank_code',v_new->>'tarea_code',v_new->>'document_code',v_new->>'appraisal_code',v_new->>'firma_code',v_new->>'send_code',v_new->>'offer_code',v_new->>'movimiento_code',v_new->>'case_code',v_new->>'id',v_old->>'expediente_code',v_old->>'cliente_code',v_old->>'contacto_code',v_old->>'inmobiliaria_code',v_old->>'bank_code',v_old->>'tarea_code',v_old->>'document_code',v_old->>'appraisal_code',v_old->>'firma_code',v_old->>'send_code',v_old->>'offer_code',v_old->>'movimiento_code',v_old->>'case_code',v_old->>'id');
  if tg_op='UPDATE' then select coalesce(jsonb_agg(k order by k),'[]'::jsonb) into v_changed from (select n.key k from jsonb_each(v_new) n left join jsonb_each(v_old) o on o.key=n.key where n.value is distinct from o.value and n.key not in ('updated_at','version')) s; end if;
  insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source) values(v_actor,v_role,tg_table_name,v_code,tg_op,v_changed,'trigger');
  return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function fenix_prod.capture_activity_v1() from public,anon,authenticated;

DO $$ declare t text; begin
  foreach t in array array['expedientes','clientes','contactos_inmobiliaria','contactos_bancarios','bancos','inmobiliarias','tareas','documentos','tasaciones','firmas','envios_banco','ofertas','economia','special_cases','special_case_people'] loop
    if to_regclass('fenix_prod.'||t) is not null then execute format('create trigger fenix_activity_capture_v1 after insert or update or delete on fenix_prod.%I for each row execute function fenix_prod.capture_activity_v1()',t); end if;
  end loop;
end $$;

insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref,occurred_at)
select h.actor_code,a.role,'expediente_stage',h.expediente_code,'UPDATE','["stage"]'::jsonb,'expediente_stage_history',h.id::text,h.created_at from fenix_prod.expediente_stage_history h left join fenix_prod.actors a on a.actor_code=h.actor_code on conflict do nothing;
insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref,occurred_at)
select h.actor_code,a.role,'documento',h.document_code,'UPDATE',jsonb_build_array(coalesce(h.action,'change')),'document_change_history',h.id::text,h.created_at from fenix_prod.document_change_history h left join fenix_prod.actors a on a.actor_code=h.actor_code on conflict do nothing;
insert into fenix_prod.activity_log(actor_code,actor_role,entity_type,entity_code,action,changed_fields,source,source_ref,occurred_at)
select h.actor_code,a.role,'firma',h.firma_code,'UPDATE',jsonb_build_array(coalesce(h.action,'change')),'firma_history',h.id::text,h.created_at from fenix_prod.firma_history h left join fenix_prod.actors a on a.actor_code=h.actor_code on conflict do nothing;

create table fenix_prod.daily_report_snapshots (
  report_date date not null,
  scope_key text not null,
  scope_kind text not null check(scope_kind in ('company','actor')),
  scope_actor_code text null references fenix_prod.actors(actor_code),
  status text not null default 'completed',
  activity_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  primary key(report_date,scope_key)
);
revoke all on fenix_prod.daily_report_snapshots from public,anon,authenticated;
alter table fenix_prod.daily_report_snapshots enable row level security;

create or replace function fenix_prod.refresh_daily_report_snapshot_v1(p_date date,p_actor_code text default null)
returns void language plpgsql security definer set search_path='fenix_prod','public','pg_temp' as $$
declare v_scope text:=case when p_actor_code is null then 'company' else 'actor' end; v_key text:=coalesce(p_actor_code,'__company__'); v_count int; v_events jsonb; v_breakdown jsonb;
begin
  select count(*),coalesce(jsonb_agg(jsonb_build_object('at',l.occurred_at,'actor_code',l.actor_code,'actor',coalesce(a.display_name,l.actor_code,'Sistema/No identificado'),'role',l.actor_role,'entity_type',l.entity_type,'entity_code',l.entity_code,'action',l.action,'changed_fields',l.changed_fields,'source',l.source) order by l.occurred_at desc),'[]'::jsonb) into v_count,v_events from fenix_prod.activity_log l left join fenix_prod.actors a on a.actor_code=l.actor_code where (l.occurred_at at time zone 'Europe/Madrid')::date=p_date and (p_actor_code is null or l.actor_code=p_actor_code);
  select coalesce(jsonb_object_agg(k,c),'{}'::jsonb) into v_breakdown from (select entity_type||':'||action k,count(*) c from fenix_prod.activity_log where (occurred_at at time zone 'Europe/Madrid')::date=p_date and (p_actor_code is null or actor_code=p_actor_code) group by entity_type,action order by entity_type,action) s;
  insert into fenix_prod.daily_report_snapshots(report_date,scope_key,scope_kind,scope_actor_code,status,activity_count,payload,generated_at) values(p_date,v_key,v_scope,p_actor_code,'completed',v_count,jsonb_build_object('events',v_events,'breakdown',v_breakdown,'timezone','Europe/Madrid','coverage','audited_activity'),now()) on conflict(report_date,scope_key) do update set status='completed',activity_count=excluded.activity_count,payload=excluded.payload,generated_at=excluded.generated_at;
end $$;
revoke all on function fenix_prod.refresh_daily_report_snapshot_v1(date,text) from public,anon,authenticated;

create or replace function fenix_prod.activity_refresh_report_trigger_v1()
returns trigger language plpgsql security definer set search_path='fenix_prod','public','pg_temp' as $$ declare d date; begin d=(new.occurred_at at time zone 'Europe/Madrid')::date; perform fenix_prod.refresh_daily_report_snapshot_v1(d,null); if new.actor_code is not null then perform fenix_prod.refresh_daily_report_snapshot_v1(d,new.actor_code); end if; return new; end $$;
revoke all on function fenix_prod.activity_refresh_report_trigger_v1() from public,anon,authenticated;
create trigger fenix_activity_refresh_reports_v1 after insert on fenix_prod.activity_log for each row execute function fenix_prod.activity_refresh_report_trigger_v1();

select fenix_prod.refresh_daily_report_snapshot_v1(current_date,null);
DO $$ declare r record; begin for r in select actor_code from fenix_prod.actors where active and auth_user_id is not null loop perform fenix_prod.refresh_daily_report_snapshot_v1(current_date,r.actor_code); end loop; end $$;

create or replace function public.fenix_prod_reports_server(p_actor_code text)
returns jsonb language plpgsql security definer set search_path='fenix_prod','public','pg_temp' as $$
declare g jsonb; r text; items jsonb; v_scope_kind text; v_scope_actor text; begin
  g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if;
  r:=g->>'role'; if r not in ('Direccion','Financiero','Visitador') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  v_scope_kind:=case when r='Direccion' then 'company' else 'actor' end; v_scope_actor:=case when r='Direccion' then null else p_actor_code end;
  perform fenix_prod.refresh_daily_report_snapshot_v1(current_date,v_scope_actor);
  select coalesce(jsonb_agg(jsonb_build_object('id',s.scope_key||'-'||s.report_date::text,'categoria','Actividad diaria','tipo','Actividad diaria','titulo',case when v_scope_kind='company' then 'Informe diario de empresa · '||to_char(s.report_date,'DD/MM/YYYY') else 'Mi informe diario · '||to_char(s.report_date,'DD/MM/YYYY') end,'fecha',s.report_date,'generated_at',s.generated_at,'status',s.status,'activity_count',s.activity_count,'scope_kind',s.scope_kind,'scope_actor_code',s.scope_actor_code,'activity',coalesce(s.payload->'events','[]'::jsonb),'breakdown',coalesce(s.payload->'breakdown','{}'::jsonb),'timezone','Europe/Madrid','coverage','Actividad auditada; captura automática completa desde la activación de daily_activity_reports_audit_v2') order by s.report_date desc),'[]'::jsonb) into items from fenix_prod.daily_report_snapshots s where s.scope_kind=v_scope_kind and ((v_scope_actor is null and s.scope_actor_code is null) or s.scope_actor_code=v_scope_actor) and s.report_date>=current_date-30;
  return jsonb_build_object('ok',true,'status',200,'contract_version',2,'role',r,'scope',v_scope_kind,'items',items,'kpis',jsonb_build_object('total',jsonb_array_length(items)));
end $$;
revoke all on function public.fenix_prod_reports_server(text) from public,anon,authenticated;
grant execute on function public.fenix_prod_reports_server(text) to service_role;
