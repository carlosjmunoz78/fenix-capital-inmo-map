-- V0.18 · same fixed PREPROD live reader, now includes owner evidence count from isolated LAB audit.
-- This is only CREATE OR REPLACE FUNCTION; no table, cron, Edge, DNS or staging I/O.
BEGIN;
CREATE OR REPLACE FUNCTION public.cerebro_universal_staging_status_lab_v0()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
WITH
control AS (
 SELECT count(*) FILTER(WHERE NOT c.enabled)::int AS paused,
        count(*) FILTER(WHERE c.enabled)::int AS active,
        count(*)::int AS total
 FROM public.cerebro_job001_control_preprod c
 WHERE c.company_id='FENIX_CAPITAL' AND c.environment='PREPROD' AND c.engine_id='SEO-001'
),
guarded_jobs AS (
 SELECT count(*) FILTER(WHERE NOT c.enabled)::int AS paused,
        count(*) FILTER(WHERE c.enabled)::int AS active,
        count(*)::int AS found
 FROM public.cerebro_job001_control_preprod c
 WHERE c.company_id='FENIX_CAPITAL' AND c.environment='PREPROD' AND c.engine_id='SEO-001'
 AND c.job_id IN(5,7,8,9,10,11,13,14,15,16,18,20,21,22,23)
),
crons AS (
 SELECT count(*) FILTER(WHERE NOT j.active)::int AS paused,
        count(*) FILTER(WHERE j.active)::int AS active,
        count(*)::int AS found
 FROM cron.job j WHERE j.jobid IN (61,62,65,66,67,68,69,70)
),
sql_guards AS (
 SELECT count(DISTINCT p.proname) FILTER(
    WHERE p.prosrc LIKE '%BLOCKED_DEPENDENCY%' AND p.prosrc NOT ILIKE '%net.http_%'
 )::int AS protected,
 count(DISTINCT p.proname)::int AS total
 FROM pg_catalog.pg_proc p
 JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
 AND p.proname IN(
  'seo001_probe_wp_bridge_preprod',
  'seo001_dispatch_page_quality_for_city_v2_preprod',
  'seo001_dispatch_render_qa_preprod',
  'seo001_wp_staging_http_preprod')
),
bridge AS (
 SELECT max(checked_at) AS last_recorded_at,
        count(*)::int AS rows_total
 FROM public.seo_cerebro_wp_bridge_health_preprod
),
evidence AS (
 SELECT count(*)::int AS recorded, max(created_at) AS last_recorded_at,
  (SELECT e2.evidence_id::text FROM public.cerebro_universal_staging_observation_lab_v0 e2
   WHERE e2.company_id='fenix' AND e2.environment='LAB'
   ORDER BY e2.created_at DESC LIMIT 1) AS latest_evidence_id
 FROM public.cerebro_universal_staging_observation_lab_v0 e
 WHERE e.company_id='fenix' AND e.environment='LAB'
)
SELECT jsonb_build_object(
 'status','OK',
 'state','SUSPENDED_BY_OWNER',
 'host','staging.fenixcapital.es',
 'company_id','fenix','environment','LAB',
 'source_environment','PREPROD',
 'observed_at',pg_catalog.clock_timestamp(),
 'gateway_job001',jsonb_build_object('total',control.total,'paused',control.paused,'active',control.active),
 'staging_job001',jsonb_build_object('expected',15,'found',guarded_jobs.found,'paused',guarded_jobs.paused,'active',guarded_jobs.active),
 'staging_cron',jsonb_build_object('expected',8,'found',crons.found,'paused',crons.paused,'active',crons.active),
 'sql_guard',jsonb_build_object('expected',4,'found',sql_guards.total,'protected',sql_guards.protected),
 'bridge_health',jsonb_build_object('last_recorded_at',bridge.last_recorded_at,'rows_total',bridge.rows_total),
 'durable_evidence',jsonb_build_object('recorded',evidence.recorded,'last_recorded_at',evidence.last_recorded_at,'latest_evidence_id',evidence.latest_evidence_id),
 'known_controls_closed',guarded_jobs.found=15 AND guarded_jobs.active=0 AND crons.found=8 AND crons.active=0 AND sql_guards.total=4 AND sql_guards.protected=4,
 'global_isolation_verified',false,
 'external_hostinger_verified',false,
 'staging_probed',false,
 'executed_external_actions',false,
 'prod_execution_enabled',false,
 'additional_cost_eur',0,
 'source','PREPROD_SQL_LIVE_AGGREGATE_NO_EXTERNAL_IO'
)
FROM control CROSS JOIN guarded_jobs CROSS JOIN crons CROSS JOIN sql_guards CROSS JOIN bridge CROSS JOIN evidence;
$fn$;
REVOKE ALL ON FUNCTION public.cerebro_universal_staging_status_lab_v0() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cerebro_universal_staging_status_lab_v0() TO service_role;
COMMENT ON FUNCTION public.cerebro_universal_staging_status_lab_v0() IS 'PREPROD only, service_role, fixed live suspension counts; cannot contact staging or run a job';
COMMIT;
