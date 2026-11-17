-- CEREBRO OS Universal LAB: guarded, bounded, read-only live staging suspension observation.
-- PREPROD project only: hnqlnvakzaywtafeiybt. No call to WP, no scheduler changes.
-- Source-controlled DDL; deployment must match this exact file.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cerebro_universal_staging_observation_lab_v0 (
 evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id text NOT NULL DEFAULT 'fenix' CHECK(company_id='fenix'),
 environment text NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
 actor_code text NOT NULL DEFAULT 'CARLOS-ADMIN' CHECK(actor_code='CARLOS-ADMIN'),
 action text NOT NULL DEFAULT 'STAGING_SUSPENSION_OBSERVATION' CHECK(action='STAGING_SUSPENSION_OBSERVATION'),
 idempotency_key text NOT NULL UNIQUE CHECK(idempotency_key ~ '^lab-observe-[a-z0-9-]{12,48}$'),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object' AND snapshot->>'state'='SUSPENDED_BY_OWNER'),
 executed_external_actions boolean NOT NULL DEFAULT false CHECK(executed_external_actions=false),
 prod_execution_enabled boolean NOT NULL DEFAULT false CHECK(prod_execution_enabled=false),
 additional_cost_eur numeric NOT NULL DEFAULT 0 CHECK(additional_cost_eur=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cerebro_universal_staging_observation_lab_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cerebro_universal_staging_observation_lab_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.cerebro_universal_staging_observation_lab_v0 TO service_role;

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
 'known_controls_closed',guarded_jobs.found=15 AND guarded_jobs.active=0 AND crons.found=8 AND crons.active=0 AND sql_guards.total=4 AND sql_guards.protected=4,
 'global_isolation_verified',false,
 'external_hostinger_verified',false,
 'staging_probed',false,
 'executed_external_actions',false,
 'prod_execution_enabled',false,
 'additional_cost_eur',0,
 'source','PREPROD_SQL_LIVE_AGGREGATE_NO_EXTERNAL_IO'
)
FROM control CROSS JOIN guarded_jobs CROSS JOIN crons CROSS JOIN sql_guards CROSS JOIN bridge;
$fn$;
REVOKE ALL ON FUNCTION public.cerebro_universal_staging_status_lab_v0() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cerebro_universal_staging_status_lab_v0() TO service_role;
COMMENT ON FUNCTION public.cerebro_universal_staging_status_lab_v0() IS 'PREPROD only, service_role, fixed live suspension counts; cannot contact staging or run a job';
COMMIT;
