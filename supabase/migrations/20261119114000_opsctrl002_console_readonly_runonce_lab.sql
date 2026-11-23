-- OPSCTRL-002: additive and strictly scoped CONSOLE-001 public-repository read control.
-- Reuses existing pg_net queue + collector. No modifications to existing QA/CERT controls.
create table if not exists cerebro_lab.operativa_console_command_v1(
 request_id uuid primary key,
 company_id text not null default 'fenix' check(company_id='fenix'),
 engine_id text not null default 'CONSOLE-001' check(engine_id='CONSOLE-001'),
 environment text not null default 'LAB' check(environment='LAB'),
 version text not null default '1.0.0' check(version='1.0.0'),
 command text not null default 'RUN_ONCE' check(command='RUN_ONCE'),
 job_id uuid not null unique,
 outcome text not null default 'QUEUED' check(outcome='QUEUED'),
 created_at timestamptz not null default clock_timestamp(),
 prod_execution_enabled boolean not null default false check(prod_execution_enabled=false),
 paid_execution boolean not null default false check(paid_execution=false)
);
alter table cerebro_lab.operativa_console_command_v1 enable row level security;
revoke all on cerebro_lab.operativa_console_command_v1 from public,anon,authenticated,service_role;
create index if not exists operativa_console_command_time_idx
 on cerebro_lab.operativa_console_command_v1(created_at desc);

create or replace function public.cerebro_lab_console_run_once_v1(p_request_id uuid)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $fn$
declare
 old cerebro_lab.operativa_console_command_v1%rowtype;
 jobjson jsonb;
 jid uuid;
begin
 if p_request_id is null then raise exception 'OPSCTRL_CONSOLE_ID_REQUIRED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(820083);
 select * into old from cerebro_lab.operativa_console_command_v1 where request_id=p_request_id;
 if found then
  return pg_catalog.jsonb_build_object('status','ALREADY_QUEUED','engine_id','CONSOLE-001',
   'company_id','fenix','environment','LAB','version','1.0.0','command','RUN_ONCE',
   'request_id',p_request_id,'job_id',old.job_id,'outcome','QUEUED','executed',false,
   'audit_persisted',true,'prod_execution_enabled',false);
 end if;
 if (select count(*) from cron.job where
    (jobid=82 and jobname='cerebro-console-readonly-enqueue-lab-v1'
      and schedule='17,47 * * * *'
      and command='select cerebro_lab.enqueue_console_repo_readonly_v1();' and active=true)
    or
    (jobid=83 and jobname='cerebro-console-readonly-collect-lab-v1'
      and schedule='19,49 * * * *'
      and command='select cerebro_lab.collect_console_repo_readonly_v1();' and active=true)
   )<>2 then raise exception 'OPSCTRL_CONSOLE_CRON_CONTRACT_DRIFT'; end if;
 if exists(select 1 from cerebro_lab.operativa_console_command_v1
    where created_at>clock_timestamp()-interval '60 seconds')
 then raise exception 'OPSCTRL_CONSOLE_RATE_LIMIT_60S';end if;
 -- Reuses only fixed allowlisted public GitHub commit GET in the existing runner.
 jobjson:=cerebro_lab.enqueue_console_repo_readonly_v1();
 if jobjson->>'status'<>'QUEUED' or jobjson->>'company_id'<>'fenix'
    or jobjson->>'engine_id'<>'CONSOLE-001'
    or jobjson->>'environment'<>'LAB'
    or jobjson->>'public_read_only'<>'true'
 then raise exception 'OPSCTRL_CONSOLE_ENQUEUE_CONTRACT_DRIFT';end if;
 jid:=(jobjson->>'job_id')::uuid;
 if jid is null or not exists(
   select 1 from cerebro_lab.console_repo_readonly_v1
   where job_id=jid and state='QUEUED'
 ) then raise exception 'OPSCTRL_CONSOLE_ENQUEUE_NOT_PERSISTED';end if;
 insert into cerebro_lab.operativa_console_command_v1(request_id,job_id)
 values(p_request_id,jid);
 return pg_catalog.jsonb_build_object('status','QUEUED','engine_id','CONSOLE-001',
  'company_id','fenix','environment','LAB','version','1.0.0','command','RUN_ONCE',
  'request_id',p_request_id,'job_id',jid,'outcome','QUEUED','executed',false,
  'audit_persisted',true,'prod_execution_enabled',false,
  'external_side_effect','PUBLIC_GITHUB_REPOSITORY_READ_ONLY_REQUEST');
end;
$fn$;
revoke all on function public.cerebro_lab_console_run_once_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.cerebro_lab_console_run_once_v1(uuid) to service_role;

create or replace function public.cerebro_lab_console_control_state_v1()
returns jsonb language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $fn$
declare recent jsonb; active_count integer;
begin
 select count(*) into active_count from cron.job where
 (jobid=82 and jobname='cerebro-console-readonly-enqueue-lab-v1'
      and schedule='17,47 * * * *'
      and command='select cerebro_lab.enqueue_console_repo_readonly_v1();' and active=true)
 or
 (jobid=83 and jobname='cerebro-console-readonly-collect-lab-v1'
      and schedule='19,49 * * * *'
      and command='select cerebro_lab.collect_console_repo_readonly_v1();' and active=true);
 with recent_jobs as (
  select c.request_id,c.job_id,c.created_at,j.state,j.completed_at,
    j.http_status,j.signature_hex
  from cerebro_lab.operativa_console_command_v1 c
  left join cerebro_lab.console_repo_readonly_v1 j on j.job_id=c.job_id
  order by c.created_at desc limit 10
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'request_id',request_id,'job_id',job_id,'state',coalesce(state,'UNKNOWN'),
  'http_status',http_status,'signed_receipt_present',
    (state='SUCCEEDED' and signature_hex ~ '^[a-f0-9]{64}$'),
  'created_at',created_at,'completed_at',completed_at)
 order by created_at desc),'[]'::jsonb) into recent from recent_jobs;
 return jsonb_build_object(
  'status',case when active_count=2 then 'OK' else 'UNAVAILABLE' end,
  'source','CEREBRO_CONSOLE_OPSCTRL_LAB_V1',
  'company_id','fenix','engine_id','CONSOLE-001','environment','LAB','version','1.0.0',
  'read_only',true,'executed',false,'prod_execution_enabled',false,
  'capability','PUBLIC_REPO_READ_ONCE_ONLY','collector_schedules_active',active_count=2,
  'signed_receipt_cryptographically_verified',false,
  'requests',recent,'observed_at',now());
end;
$fn$;
revoke all on function public.cerebro_lab_console_control_state_v1() from public,anon,authenticated,service_role;
grant execute on function public.cerebro_lab_console_control_state_v1() to service_role;
-- Rollback safety: REVOKE EXECUTE on the new command RPC only; retain audit and original cron jobs.
