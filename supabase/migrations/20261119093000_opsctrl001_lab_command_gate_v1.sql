-- OPSCTRL-001 · Minimal LIVE LAB commands on already existing QA and CERT schedules.
-- Conserves all historical data; no permissions for PROD or UMS; no GHA.
create table if not exists cerebro_lab.operativa_operator_command_v1 (
 request_id uuid primary key,
 company_id text not null default 'fenix' check (company_id='fenix'),
 environment text not null default 'LAB' check (environment='LAB'),
 engine_id text not null check(engine_id in ('QA-001','CERT-001')),
 command text not null check(command in ('RUN_ONCE','PAUSE_SCHEDULE','RESUME_SCHEDULE')),
 outcome text not null check(outcome in ('SUCCEEDED','NO_CHANGE')),
 job_id bigint not null check(job_id in (74,77)),
 previous_active boolean not null,
 final_active boolean not null,
 result_status text not null,
 created_at timestamptz not null default now(),
 prod_mutation boolean not null default false check(prod_mutation=false),
 paid_execution boolean not null default false check(paid_execution=false)
);
alter table cerebro_lab.operativa_operator_command_v1 enable row level security;
revoke all on cerebro_lab.operativa_operator_command_v1 from public,anon,authenticated,service_role;
create index if not exists operativa_operator_command_lab_recent_v1 on
 cerebro_lab.operativa_operator_command_v1 (created_at desc);

create or replace function public.cerebro_lab_operator_state_v1()
returns jsonb language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $body$
declare
 result jsonb;
begin
 with authorized as (
  select
   case when j.jobid=74 then 'QA-001' else 'CERT-001' end as engine_id,
   j.jobid,j.jobname,j.active,j.schedule
  from cron.job j
  where (j.jobid=74 and j.jobname='cerebro-agent-qa-001-lab-v1'
    and j.schedule='*/15 * * * *' and j.command='select cerebro_lab.run_agent_qa_v1();')
   or (j.jobid=77 and j.jobname='cerebro-cert-supervisor-lab-v1'
    and j.schedule='3,18,33,48 * * * *' and j.command='select cerebro_lab.run_cert_supervisor_v1();')
 )
 select pg_catalog.jsonb_build_object(
  'status',case when count(*)=2 then 'OK' else 'CONFIG_DRIFT' end,
  'source','CEREBRO_OPERATIVA_OPERATOR_LAB_V1',
  'company_id','fenix','environment','LAB','read_only',true,'prod_execution_enabled',false,
  'observed_at',now(),
  'engines',coalesce(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object('engine_id',engine_id,'cron_job_id',jobid,
   'schedule_active',active,'schedule',schedule,'control_capability','RUN_ONCE_PAUSE_RESUME_LAB_ONLY')
   order by engine_id),'[]'::jsonb),
  'commands',coalesce((select pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object('request_id',request_id,'engine_id',engine_id,
   'command',command,'outcome',outcome,'job_id',job_id,'previous_active',previous_active,
   'final_active',final_active,'created_at',created_at)
   order by created_at desc) from (select * from cerebro_lab.operativa_operator_command_v1
    order by created_at desc limit 15) history),'[]'::jsonb)
 ) into result
 from authorized;
 return result;
end;
$body$;
revoke all on function public.cerebro_lab_operator_state_v1() from public,anon,authenticated,service_role;
grant execute on function public.cerebro_lab_operator_state_v1() to service_role;

create or replace function public.cerebro_lab_operator_command_v1(
 p_request_id uuid,p_engine_id text,p_command text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $body$
declare
 target_id bigint;
 expected_name text;
 expected_schedule text;
 expected_command text;
 previous boolean;
 after boolean;
 existing cerebro_lab.operativa_operator_command_v1%rowtype;
 now_at timestamptz:=clock_timestamp();
 output_status text:='OK';
 outcome text:='SUCCEEDED';
 run_result jsonb;
begin
 if p_request_id is null or p_engine_id not in ('QA-001','CERT-001')
    or p_command not in ('RUN_ONCE','PAUSE_SCHEDULE','RESUME_SCHEDULE')
    or p_engine_id is null or p_command is null
 then raise exception 'OPSCTRL_INVALID_SCOPE'; end if;
 -- Serialize commands on these two LAB schedules; idempotency also survives retries.
 perform pg_catalog.pg_advisory_xact_lock(740077);
 select * into existing from cerebro_lab.operativa_operator_command_v1
  where request_id=p_request_id;
 if found then
  if existing.engine_id<>p_engine_id or existing.command<>p_command
   then raise exception 'OPSCTRL_IDEMPOTENCY_CONFLICT'; end if;
  return pg_catalog.jsonb_build_object('status','ALREADY_APPLIED','request_id',p_request_id,
    'engine_id',p_engine_id,'command',p_command,'outcome',existing.outcome,
    'previous_active',existing.previous_active,'final_active',existing.final_active,
    'result_status',existing.result_status,'prod_execution_enabled',false);
 end if;
 if p_engine_id='QA-001' then
  target_id:=74;expected_name:='cerebro-agent-qa-001-lab-v1';
  expected_schedule:='*/15 * * * *';expected_command:='select cerebro_lab.run_agent_qa_v1();';
 else
  target_id:=77;expected_name:='cerebro-cert-supervisor-lab-v1';
  expected_schedule:='3,18,33,48 * * * *';expected_command:='select cerebro_lab.run_cert_supervisor_v1();';
 end if;
 select active into previous from cron.job
 where jobid=target_id and jobname=expected_name
  and schedule=expected_schedule and command=expected_command;
 if not found then raise exception 'OPSCTRL_CRON_CONTRACT_DRIFT'; end if;
 if p_command='RUN_ONCE' then
  if exists(select 1 from cerebro_lab.operativa_operator_command_v1
    where engine_id=p_engine_id and command='RUN_ONCE'
    and created_at>now_at-interval '60 seconds')
   then raise exception 'OPSCTRL_RATE_LIMIT_60S'; end if;
  if p_engine_id='QA-001' then
   run_result:=cerebro_lab.run_agent_qa_v1();
  else
   run_result:=cerebro_lab.run_cert_supervisor_v1();
  end if;
  output_status:=coalesce(run_result->>'status','EXECUTED_WITHOUT_STATUS');
 elsif p_command='PAUSE_SCHEDULE' then
  if not previous then outcome:='NO_CHANGE';output_status:='ALREADY_PAUSED';
  else perform cron.alter_job(job_id=>target_id,active=>false);output_status:='SCHEDULE_PAUSED';end if;
 elsif p_command='RESUME_SCHEDULE' then
  if previous then outcome:='NO_CHANGE';output_status:='ALREADY_ACTIVE';
  else perform cron.alter_job(job_id=>target_id,active=>true);output_status:='SCHEDULE_RESUMED';end if;
 end if;
 select active into after from cron.job where jobid=target_id and jobname=expected_name;
 if after is null then raise exception 'OPSCTRL_CRON_DISAPPEARED';end if;
 if p_command='PAUSE_SCHEDULE' and after<>false then raise exception 'OPSCTRL_PAUSE_NOT_CONFIRMED';end if;
 if p_command='RESUME_SCHEDULE' and after<>true then raise exception 'OPSCTRL_RESUME_NOT_CONFIRMED';end if;
 insert into cerebro_lab.operativa_operator_command_v1(
 request_id,engine_id,command,outcome,job_id,previous_active,final_active,result_status)
 values(p_request_id,p_engine_id,p_command,outcome,target_id,previous,after,output_status);
 return pg_catalog.jsonb_build_object(
  'status','APPLIED','source','CEREBRO_OPERATIVA_OPERATOR_LAB_V1',
  'company_id','fenix','environment','LAB','request_id',p_request_id,
  'engine_id',p_engine_id,'command',p_command,'outcome',outcome,'job_id',target_id,
  'previous_active',previous,'final_active',after,'result_status',output_status,
  'audit_persisted',true,'prod_execution_enabled',false,'paid_execution',false);
end;
$body$;
revoke all on function public.cerebro_lab_operator_command_v1(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.cerebro_lab_operator_command_v1(uuid,text,text) to service_role;
-- STOP only in isolated LAB:
-- select cron.alter_job(job_id=>74,active=>true);
-- select cron.alter_job(job_id=>77,active=>true);
-- The operator API itself can be rolled back by redeploying previous Preview and
-- REVOKE EXECUTE from service_role; preserve audit history for accountability.
