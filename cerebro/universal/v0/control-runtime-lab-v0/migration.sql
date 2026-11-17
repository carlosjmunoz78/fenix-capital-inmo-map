-- CEREBRO OS · LAB-DEMO-001 · isolated reversible proof of actual control.
-- Additive-only. NEVER run against PROD; project hnqlnvakzaywtafeiybt ONLY.
-- Authenticated owner is verified in Edge before service_role invokes these RPCs.
-- No schema changes to existing APP/CRM/SEO/FACT/JOB001 objects.
begin;
create table cerebro_lab_private.console_worker_control_v0(
 company_id text not null check(company_id='fenix'),
 engine_id text not null check(engine_id='LAB-DEMO-001'),
 environment text not null check(environment='LAB'),
 version text not null default '0.1.0' check(version='0.1.0'),
 desired_state text not null default 'PAUSED' check(desired_state in ('PAUSED','RUNNING')),
 priority integer not null default 3 check(priority between 1 and 5),
 revision bigint not null default 1 check(revision>=1),
 work_units bigint not null default 0 check(work_units>=0),
 last_receipt_id uuid,
 updated_at timestamptz not null default now(),
 updated_by text not null default 'SYSTEM_BOOTSTRAP',
 primary key(company_id,engine_id,environment)
);
create table cerebro_lab_private.console_worker_audit_v0(
 receipt_id uuid primary key default gen_random_uuid(),
 idempotency_key text not null unique,
 company_id text not null check(company_id='fenix'),
 engine_id text not null check(engine_id='LAB-DEMO-001'),
 environment text not null check(environment='LAB'),
 actor_code text not null default 'CARLOS-ADMIN' check(actor_code='CARLOS-ADMIN'),
 action text not null check(action in ('PAUSE','RESUME','PRIORITIZE','TICK')),
 requested_priority integer,
 expected_revision bigint not null,
 before_state jsonb not null,
 after_state jsonb not null,
 executed_work_units integer not null check(executed_work_units in (0,1)),
 created_at timestamptz not null default now()
);
alter table cerebro_lab_private.console_worker_control_v0 enable row level security;
alter table cerebro_lab_private.console_worker_audit_v0 enable row level security;
revoke all on cerebro_lab_private.console_worker_control_v0 from public,anon,authenticated;
revoke all on cerebro_lab_private.console_worker_audit_v0 from public,anon,authenticated;
grant usage on schema cerebro_lab_private to service_role;
grant select,insert,update on cerebro_lab_private.console_worker_control_v0 to service_role;
grant select,insert on cerebro_lab_private.console_worker_audit_v0 to service_role;
insert into cerebro_lab_private.console_worker_control_v0
(company_id,engine_id,environment,desired_state,priority,revision,work_units)
values('fenix','LAB-DEMO-001','LAB','PAUSED',3,1,0);

create function public.cerebro_operativa_lab_control_rpc_v0(
 p_company_id text,p_environment text,p_engine_id text,
 p_action text,p_priority integer,p_expected_revision bigint,p_idempotency_key text)
returns jsonb language plpgsql security invoker
set search_path = pg_catalog, cerebro_lab_private, public
as $function$
declare s cerebro_lab_private.console_worker_control_v0%rowtype;
        r cerebro_lab_private.console_worker_audit_v0%rowtype;
        prev jsonb; curr jsonb; next_state text;
        next_priority integer; next_units bigint; used_units integer; rid uuid;
begin
 if p_company_id is distinct from 'fenix' or p_environment is distinct from 'LAB'
 or p_engine_id is distinct from 'LAB-DEMO-001' then
  return jsonb_build_object('status','DENIED','reason','SCOPE_NOT_ALLOWLISTED','executed',false);
 end if;
 if p_action is null or p_action not in ('PAUSE','RESUME','PRIORITIZE','TICK') then
  return jsonb_build_object('status','DENIED','reason','ACTION_NOT_ALLOWLISTED','executed',false);
 end if;
 if p_idempotency_key is null or p_idempotency_key !~ '^labctrl-[a-z0-9-]{20,60}$' then
  return jsonb_build_object('status','DENIED','reason','IDEMPOTENCY_REQUIRED','executed',false);
 end if;
 if p_expected_revision is null or p_expected_revision<1 then
  return jsonb_build_object('status','DENIED','reason','REVISION_REQUIRED','executed',false);
 end if;
 if p_action='PRIORITIZE' then
  if p_priority is null or p_priority not between 1 and 5 then
   return jsonb_build_object('status','DENIED','reason','PRIORITY_OUT_OF_RANGE','executed',false);
  end if;
 elsif p_priority is not null then
  return jsonb_build_object('status','DENIED','reason','UNEXPECTED_PRIORITY','executed',false);
 end if;
 select * into s from cerebro_lab_private.console_worker_control_v0
  where company_id=p_company_id and engine_id=p_engine_id and environment=p_environment for update;
 if not found then return jsonb_build_object('status','UNAVAILABLE','reason','WORKER_MISSING','executed',false);end if;
 select * into r from cerebro_lab_private.console_worker_audit_v0 where idempotency_key=p_idempotency_key;
 if found then
  if r.action is distinct from p_action or r.requested_priority is distinct from p_priority
  or r.expected_revision is distinct from p_expected_revision then
   return jsonb_build_object('status','CONFLICT','reason','IDEMPOTENCY_CONFLICT','executed',false);
  end if;
  return jsonb_build_object('status','REPLAY','source','PREPROD_LAB_WORKER_RPC_V0',
   'executed',false,'previous_executed',true,'executed_work_units',r.executed_work_units,
   'receipt_id',r.receipt_id,'before',r.before_state,'after',r.after_state,
   'observed_at',now(),'company_id',p_company_id,'engine_id',p_engine_id,'environment',p_environment);
 end if;
 if s.revision<>p_expected_revision then
  return jsonb_build_object('status','CONFLICT','reason','STALE_REVISION',
   'executed',false,'current_revision',s.revision);
 end if;
 prev=jsonb_build_object('desired_state',s.desired_state,'priority',s.priority,
  'revision',s.revision,'work_units',s.work_units);
 next_state=s.desired_state;next_priority=s.priority;next_units=s.work_units;used_units=0;
 if p_action='PAUSE' then next_state='PAUSED';end if;
 if p_action='RESUME' then next_state='RUNNING';end if;
 if p_action='PRIORITIZE' then next_priority=p_priority;end if;
 if p_action='TICK' and next_state='RUNNING' then
  next_units=next_units+1;used_units=1;
 end if;
 rid=gen_random_uuid();
 curr=jsonb_build_object('desired_state',next_state,'priority',next_priority,
  'revision',s.revision+1,'work_units',next_units);
 update cerebro_lab_private.console_worker_control_v0
 set desired_state=next_state,priority=next_priority,work_units=next_units,
  revision=s.revision+1,last_receipt_id=rid,updated_at=now(),updated_by='CARLOS-ADMIN'
 where company_id=p_company_id and engine_id=p_engine_id and environment=p_environment;
 insert into cerebro_lab_private.console_worker_audit_v0
 (receipt_id,idempotency_key,company_id,engine_id,environment,action,requested_priority,
  expected_revision,before_state,after_state,executed_work_units)
 values(rid,p_idempotency_key,p_company_id,p_engine_id,p_environment,p_action,p_priority,
  p_expected_revision,prev,curr,used_units);
 return jsonb_build_object('status','APPLIED','source','PREPROD_LAB_WORKER_RPC_V0',
  'executed',true,'executed_work_units',used_units,'receipt_id',rid,
  'before',prev,'after',curr,'observed_at',now(),
  'company_id',p_company_id,'engine_id',p_engine_id,'environment',p_environment);
end
$function$;

create function public.cerebro_operativa_lab_observe_rpc_v0(
 p_company_id text,p_environment text,p_engine_id text)
returns jsonb language sql stable security invoker
set search_path = pg_catalog, cerebro_lab_private, public
as $function$
 select jsonb_build_object('status','OK','source','PREPROD_LAB_WORKER_RPC_V0',
 'company_id',s.company_id,'environment',s.environment,'engine_id',s.engine_id,
 'version',s.version,'desired_state',s.desired_state,'priority',s.priority,
 'work_units',s.work_units,'revision',s.revision,'last_receipt_id',s.last_receipt_id,
 'updated_at',s.updated_at,'observed_at',now(),'runtime_kind','DETERMINISTIC_MANUAL_LAB_WORKER',
 'autonomous_scheduling',false,'prod_execution_enabled',false)
 from cerebro_lab_private.console_worker_control_v0 s
 where p_company_id='fenix' and p_environment='LAB' and p_engine_id='LAB-DEMO-001'
 and s.company_id=p_company_id and s.environment=p_environment and s.engine_id=p_engine_id
$function$;
revoke all on function public.cerebro_operativa_lab_control_rpc_v0(text,text,text,text,integer,bigint,text) from public,anon,authenticated;
revoke all on function public.cerebro_operativa_lab_observe_rpc_v0(text,text,text) from public,anon,authenticated;
grant execute on function public.cerebro_operativa_lab_control_rpc_v0(text,text,text,text,integer,bigint,text) to service_role;
grant execute on function public.cerebro_operativa_lab_observe_rpc_v0(text,text,text) to service_role;
commit;
