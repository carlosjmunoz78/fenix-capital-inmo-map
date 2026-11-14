-- CEREBRO OS · LAB PREPROD · v0: read-only fixed pg_cron observation.
-- PRECONDITIONS: inspect pg_cron, 4 fixed existing job IDs, no existing function.
-- NO cron scheduling, NO data updates, NO job code, NO secrets, NO PROD.
-- Rollback (only if confirmed no consumers):
--   drop function if exists public.cerebro_job001_pgcron_observation_lab_v0();
--   drop function if exists cerebro_lab_private.job001_pgcron_observe_v0();
--   drop schema cerebro_lab_private; -- only when empty.
create schema if not exists cerebro_lab_private;
revoke all on schema cerebro_lab_private from public, anon, authenticated;
grant usage on schema cerebro_lab_private to service_role;

create function cerebro_lab_private.job001_pgcron_observe_v0()
returns jsonb
language sql stable security definer set search_path=''
as $f$
with existing_jobs as (
 select j.jobid,j.active
 from cron.job as j
 where j.jobid in (6,22,23,25)
),
latest as (
 select distinct on (r.jobid) r.jobid,r.status,r.start_time,r.end_time
 from cron.job_run_details as r
 where r.jobid in (6,22,23,25)
 order by r.jobid,r.start_time desc
)
select pg_catalog.jsonb_build_object(
  'source','PREPROD_PG_CRON_OBSERVATION',
  'observed_at',pg_catalog.now(),
  'is_job001_hostinger_master',false,
  'is_job001_runtime_proof',false,
  'jobs',coalesce(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object(
     'legacy_pg_cron_job_id',j.jobid,
     'active',j.active,
     'last_status',case when r.status in ('succeeded','failed','running','starting','sending') then r.status else 'UNKNOWN' end,
     'last_run_at',r.start_time,
     'last_finished_at',r.end_time,
     'run_record_present',r.jobid is not null,
     'downstream_effect_verified',false
   ) order by j.jobid
  ),'[]'::jsonb)
)
from existing_jobs as j
left join latest as r using(jobid);
$f$;

revoke all on function cerebro_lab_private.job001_pgcron_observe_v0() from public, anon, authenticated;
grant execute on function cerebro_lab_private.job001_pgcron_observe_v0() to service_role;

create function public.cerebro_job001_pgcron_observation_lab_v0()
returns jsonb
language sql stable security invoker set search_path=''
as $g$
 select cerebro_lab_private.job001_pgcron_observe_v0();
$g$;

revoke all on function public.cerebro_job001_pgcron_observation_lab_v0() from public, anon, authenticated;
grant execute on function public.cerebro_job001_pgcron_observation_lab_v0() to service_role;
comment on function public.cerebro_job001_pgcron_observation_lab_v0()
is 'CEREBRO OS PREPROD fixed pg_cron run summary only; service_role only; no command text, no dispatch, not JOB001 Hostinger runtime';
