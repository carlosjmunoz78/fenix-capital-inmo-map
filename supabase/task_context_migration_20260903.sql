begin;

alter table fenix_prod.tareas
  add column if not exists origin_type text,
  add column if not exists origin_code text,
  add column if not exists action_channel text,
  add column if not exists happened text,
  add column if not exists planned_action text,
  add column if not exists ana_draft text,
  add column if not exists user_correction text;

create index if not exists tareas_origin_lookup_idx
  on fenix_prod.tareas(origin_type,origin_code)
  where origin_type is not null and origin_code is not null;

alter table fenix_prod.tareas
  drop constraint if exists tareas_action_channel_check;
alter table fenix_prod.tareas
  add constraint tareas_action_channel_check
  check (action_channel is null or action_channel in ('whatsapp','email','llamada','tarea'));

drop function if exists public.fenix_prod_task_create_server(text,text,text,text,timestamp with time zone,text);

create or replace function public.fenix_prod_task_create_server(
  p_actor_code text,
  p_tarea text,
  p_target_actor_code text,
  p_criticidad text default null,
  p_fecha_limite timestamp with time zone default null,
  p_idempotency_key text default null,
  p_origin_type text default null,
  p_origin_code text default null,
  p_action_channel text default null,
  p_happened text default null,
  p_planned_action text default null,
  p_ana_draft text default null,
  p_user_correction text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare
  r text;
  target_role text;
  code text;
  existing jsonb;
  linked_exp uuid;
  linked_inmo uuid;
begin
  select role into r from fenix_prod.actors where actor_code=p_actor_code and active=true;
  if r is null then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  if nullif(trim(p_tarea),'') is null or length(trim(p_tarea))<2 then return jsonb_build_object('ok',false,'status',400,'error','invalid_task'); end if;
  if p_criticidad is not null and p_criticidad not in ('Normal','Importante','Crítica') then return jsonb_build_object('ok',false,'status',400,'error','invalid_criticality'); end if;
  if p_action_channel is not null and p_action_channel not in ('whatsapp','email','llamada','tarea') then return jsonb_build_object('ok',false,'status',400,'error','invalid_action_channel'); end if;
  select role into target_role from fenix_prod.actors where actor_code=p_target_actor_code and active=true;
  if target_role is null then return jsonb_build_object('ok',false,'status',400,'error','invalid_assignee'); end if;
  if r <> 'Direccion' and p_target_actor_code <> p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','assignee_forbidden'); end if;

  if nullif(trim(coalesce(p_idempotency_key,'')),'') is not null then
    select jsonb_build_object('ok',true,'status',200,'id',t.tarea_code,'destino','/tareas/'||replace(t.tarea_code,'/','%2F'),'replayed',true)
      into existing
      from fenix_prod.tareas t
     where t.source_payload->>'idempotency_key'=trim(p_idempotency_key)
     limit 1;
    if existing is not null then return existing; end if;
  end if;

  if p_origin_type='expediente' and nullif(trim(coalesce(p_origin_code,'')),'') is not null then
    select e.id into linked_exp from fenix_prod.expedientes e
     where e.expediente_code=p_origin_code or e.id::text=p_origin_code limit 1;
  elsif p_origin_type='inmobiliaria' and nullif(trim(coalesce(p_origin_code,'')),'') is not null then
    select i.id into linked_inmo from fenix_prod.inmobiliarias i
     where i.inmobiliaria_code=p_origin_code or i.id::text=p_origin_code limit 1;
  end if;

  code := 'task|'||gen_random_uuid()::text;
  insert into fenix_prod.tareas(
    tarea_code,owner_actor_code,expediente_id,inmobiliaria_id,estado,titulo,criticidad,fecha_limite,
    origin_type,origin_code,action_channel,happened,planned_action,ana_draft,user_correction,source_payload
  ) values(
    code,p_target_actor_code,linked_exp,linked_inmo,'Pendiente',trim(p_tarea),p_criticidad,p_fecha_limite,
    nullif(trim(coalesce(p_origin_type,'')),''),nullif(trim(coalesce(p_origin_code,'')),''),p_action_channel,
    nullif(trim(coalesce(p_happened,'')),''),nullif(trim(coalesce(p_planned_action,'')),''),
    nullif(trim(coalesce(p_ana_draft,'')),''),nullif(trim(coalesce(p_user_correction,'')),''),
    jsonb_strip_nulls(jsonb_build_object(
      'created_via','fenix-task-api','created_by',p_actor_code,
      'idempotency_key',nullif(trim(coalesce(p_idempotency_key,'')),''),
      'origin_type',nullif(trim(coalesce(p_origin_type,'')),''),
      'origin_code',nullif(trim(coalesce(p_origin_code,'')),''),
      'action_channel',p_action_channel
    ))
  );
  return jsonb_build_object(
    'ok',true,'status',201,'id',code,'destino','/tareas/'||replace(code,'/','%2F'),
    'owner_actor_code',p_target_actor_code,'origin_type',p_origin_type,'origin_code',p_origin_code
  );
end $function$;

commit;
