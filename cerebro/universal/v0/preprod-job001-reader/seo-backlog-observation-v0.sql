-- CEREBRO OS · isolated PREPROD read-only SEO queue + supervisor observer.
-- No staging probes, no dispatch, no writes, no new queues or crons.
create function cerebro_lab_private.seo_backlog_observe_v0()
returns jsonb
language sql stable security definer set search_path=''
as $f$
with counts as (
 select pg_catalog.count(*)::bigint as total,
  pg_catalog.count(*) filter (where status='QUEUED')::bigint as queued,
  pg_catalog.count(*) filter (where status='DONE')::bigint as done,
  pg_catalog.count(*) filter (where status='WAITING_PREREQUISITES')::bigint as waiting,
  pg_catalog.count(*) filter (where status='CANCELLED')::bigint as cancelled,
  pg_catalog.max(updated_at) filter (where status='DONE') as latest_done_at,
  pg_catalog.max(updated_at) filter (where status='QUEUED') as latest_queued_at
 from public.seo_cerebro_expansion_jobs_preprod
 where company_id='FENIX_CAPITAL' and environment='PREPROD' and engine_id='SEO-001'
), supervisor as (
 select autonomy_state,measured_at
 from public.seo_cerebro_supervisor_preprod
 where company_id='FENIX_CAPITAL' and environment='PREPROD' and engine_id='SEO-001'
 order by measured_at desc limit 1
)
select pg_catalog.jsonb_build_object(
 'source','PREPROD_SEO_BACKLOG_READ_ONLY',
 'company_id','fenix','source_company_id','FENIX_CAPITAL',
 'engine_id','SEO-001','source_environment','PREPROD',
 'observed_at',pg_catalog.now(),
 'total',c.total,'queued',c.queued,'done',c.done,
 'waiting_prerequisites',c.waiting,'cancelled',c.cancelled,
 'latest_done_at',c.latest_done_at,'latest_queued_at',c.latest_queued_at,
 'supervisor_state',coalesce((select s.autonomy_state from supervisor s),'UNVERIFIED'),
 'supervisor_last_measured_at',(select s.measured_at from supervisor s),
 'staging_status','SUSPENDED_BY_OWNER_NO_PROBE',
 'staging_probe_performed',false,
 'seo_dispatch_authorized',false,'downstream_publication_verified',false
)
from counts c;
$f$;
revoke all on function cerebro_lab_private.seo_backlog_observe_v0() from public,anon,authenticated;
grant execute on function cerebro_lab_private.seo_backlog_observe_v0() to service_role;
create function public.cerebro_operativa_seo_backlog_summary_lab_v0()
returns jsonb language sql stable security invoker set search_path=''
as $g$
 select cerebro_lab_private.seo_backlog_observe_v0();
$g$;
revoke all on function public.cerebro_operativa_seo_backlog_summary_lab_v0() from public,anon,authenticated;
grant execute on function public.cerebro_operativa_seo_backlog_summary_lab_v0() to service_role;
comment on function public.cerebro_operativa_seo_backlog_summary_lab_v0()
is 'PREPROD isolated read-only FENIX_CAPITAL SEO-001 backlog and supervisor; staging offline per owner; no publishing or execution';
