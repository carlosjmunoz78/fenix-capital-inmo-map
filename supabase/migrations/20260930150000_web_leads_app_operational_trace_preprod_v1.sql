-- PREPROD-only operational trace for web leads.
-- Additive, reversible by dropping these RPCs/table in PREPROD only.

create table if not exists public.web_lead_actions_preprod (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.web_leads_preprod(id) on delete cascade,
  actor_code text not null,
  action_kind text not null,
  happened text,
  planned_action text,
  comment_text text,
  next_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.web_lead_actions_preprod enable row level security;
create index if not exists web_lead_actions_preprod_lead_created_idx
on public.web_lead_actions_preprod(lead_id,created_at desc);

create or replace function public.preprod_test_web_leads_list_server(p_actor_code text)
returns jsonb language plpgsql security definer
set search_path='public','preprod_test','pg_temp'
as $$
declare v_role text; v_items jsonb;
begin
  select role into v_role from preprod_test.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.received_at desc),'[]'::jsonb) into v_items
  from (
    select l.id,l.display_name as nombre,l.email,l.phone as telefono,l.identity_status,l.source,l.landing_url,
      l.consent_privacy,l.consent_marketing,l.created_at as received_at,l.updated_at,l.source_payload,
      coalesce(l.source_payload->>'municipality',l.source_payload->>'city') as city,
      coalesce(l.source_payload->>'funnel',l.source_payload->>'intent') as funnel,
      coalesce(l.source_payload->>'lead_magnet_url',l.source_payload->>'asset_url') as asset_url,
      l.source_payload->>'asset_label' as asset_label,
      t.task_key as tarea_code,t.status as task_state,t.due_at as fecha_limite,
      a.happened,a.planned_action,a.created_at as last_action_at
    from public.web_leads_preprod l
    left join lateral (select wt.* from public.web_lead_tasks_preprod wt where wt.lead_id=l.id order by wt.created_at desc limit 1) t on true
    left join lateral (select wa.* from public.web_lead_actions_preprod wa where wa.lead_id=l.id order by wa.created_at desc limit 1) a on true
  ) x;
  return jsonb_build_object('ok',true,'status',200,'items',v_items);
end $$;

create or replace function public.preprod_test_web_lead_timeline_server(p_actor_code text,p_lead_id uuid)
returns jsonb language plpgsql security definer
set search_path='public','preprod_test','pg_temp'
as $$
declare v_role text; v_lead public.web_leads_preprod%rowtype; v_timeline jsonb;
begin
  select role into v_role from preprod_test.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select * into v_lead from public.web_leads_preprod where id=p_lead_id;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','lead_not_found'); end if;
  select coalesce(jsonb_agg(to_jsonb(z) order by z.occurred_at desc),'[]'::jsonb) into v_timeline
  from (
    select e.created_at as occurred_at,'lead'::text as kind,e.status::text as action,null::text as actor_code,
      jsonb_build_object('idempotency_key',e.idempotency_key) as meta
    from public.web_lead_events_preprod e where e.lead_id=v_lead.id
    union all
    select a.created_at,'task_action',a.action_kind,a.actor_code,
      jsonb_build_object('comment',a.comment_text,'happened',a.happened,'planned_action',a.planned_action,'next_at',a.next_at)
    from public.web_lead_actions_preprod a where a.lead_id=v_lead.id
    union all
    select o.updated_at,'communication',o.status,'CEREBRO',
      jsonb_build_object('message_kind',o.message_kind,'subject',o.subject,'brevo_message_id',o.brevo_message_id,'last_error',o.last_error)
    from public.seo_cerebro_email_outbox_preprod o where o.lead_id=v_lead.id
  ) z;
  return jsonb_build_object('ok',true,'status',200,
    'lead',jsonb_build_object('id',v_lead.id,'cliente_code',v_lead.id::text,'nombre',v_lead.display_name,'email',v_lead.email,'telefono',v_lead.phone,
      'estado',v_lead.identity_status,'consentimiento_comercial',v_lead.consent_marketing,'source_payload',v_lead.source_payload,
      'created_at',v_lead.created_at,'updated_at',v_lead.updated_at),
    'timeline',v_timeline);
end $$;

create or replace function public.preprod_test_web_lead_action_server(
  p_actor_code text,p_lead_id uuid,p_action_kind text,p_comment text default null,
  p_happened text default null,p_planned_action text default null,p_next_at timestamptz default null
)
returns jsonb language plpgsql security definer
set search_path='public','preprod_test','pg_temp'
as $$
declare v_role text; v_lead public.web_leads_preprod%rowtype; v_task public.web_lead_tasks_preprod%rowtype; v_action_id uuid;
begin
  select role into v_role from preprod_test.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role is distinct from 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select * into v_lead from public.web_leads_preprod where id=p_lead_id;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','lead_not_found'); end if;
  select * into v_task from public.web_lead_tasks_preprod where lead_id=v_lead.id order by created_at desc limit 1;
  if not found then return jsonb_build_object('ok',false,'status',409,'error','task_not_found'); end if;
  insert into public.web_lead_actions_preprod(lead_id,actor_code,action_kind,happened,planned_action,comment_text,next_at)
  values(v_lead.id,p_actor_code,left(coalesce(nullif(btrim(p_action_kind),''),'note'),80),nullif(btrim(p_happened),''),
    nullif(btrim(p_planned_action),''),nullif(btrim(p_comment),''),p_next_at)
  returning id into v_action_id;
  update public.web_lead_tasks_preprod set due_at=coalesce(p_next_at,due_at) where id=v_task.id returning * into v_task;
  return jsonb_build_object('ok',true,'status',200,'action_id',v_action_id,'lead_id',v_lead.id,
    'task',jsonb_build_object('tarea_code',v_task.task_key,'estado',v_task.status,'planned_action',p_planned_action,'happened',p_happened,'fecha_limite',v_task.due_at));
end $$;

revoke all on function public.preprod_test_web_leads_list_server(text) from public,anon,authenticated;
revoke all on function public.preprod_test_web_lead_timeline_server(text,uuid) from public,anon,authenticated;
revoke all on function public.preprod_test_web_lead_action_server(text,uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.preprod_test_web_leads_list_server(text) to service_role;
grant execute on function public.preprod_test_web_lead_timeline_server(text,uuid) to service_role;
grant execute on function public.preprod_test_web_lead_action_server(text,uuid,text,text,text,text,timestamptz) to service_role;
