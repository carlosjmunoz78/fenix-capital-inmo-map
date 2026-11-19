-- AUDIT-001: existing LAB engines, read-only, no changes to source tables.
-- Writes only to new function definition. Independent from GitHub Actions.
create or replace function public.cerebro_lab_engine_truth_v1()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,pg_temp
as $fn$
declare
 overview jsonb;
 qa jsonb;
 total_jobs bigint;
begin
 with input as (
  select 'JARVIS'::text as source, engine_id, environment, status,
    updated_at as last_at,
    (payload ? 'agent_role_id' or payload ? 'subagent_role_id') as has_role
    from public.jarvis_work_job_v1
    where company_id='fenix' and environment in ('LAB','PREPROD')
  union all
  select 'BROWSER'::text,engine_id,environment,status,updated_at,
    (authority ? 'agent_role_id' or authority ? 'subagent_role_id'
      or result_summary ? 'agent_role_id' or result_summary ? 'subagent_role_id')
    from public.cerebro_browser_job_v2
    where company_id='fenix' and environment in ('LAB','PREPROD')
  union all
  select 'CREATIVE'::text,engine_id,environment,status,updated_at,
    (request ? 'agent_role_id' or request ? 'subagent_role_id'
      or result_summary ? 'agent_role_id' or result_summary ? 'subagent_role_id')
    from public.cerebro_creative_job_v1
    where company_id='fenix' and environment in ('LAB','PREPROD')
 ), facts as (
  select source,engine_id,environment,sum(n) as total,
    max(last_record_at) as last_record_at,
    sum(role_identity_rows) as explicit_role_rows,
    sum(recent_metadata_rows) as recent_metadata_rows,
    sum(rows_marked_running) as rows_marked_running,
    jsonb_object_agg(status, n) as statuses
  from (
    select source,engine_id,environment,status,count(*) as n,
      max(last_at) as last_record_at,
      count(*) filter(where has_role) as role_identity_rows,
      count(*) filter(where last_at>now()-interval '5 minutes') as recent_metadata_rows,
      count(*) filter(where status in ('RUNNING','LEASED','STARTED','PROCESSING')) as rows_marked_running
    from input group by source,engine_id,environment,status
  ) by_state
  group by source,engine_id,environment
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'source',source,'engine_id',engine_id,'environment',environment,
  'historical_jobs',total,'last_job_metadata_at',last_record_at,
  'explicit_role_rows',explicit_role_rows,'recent_metadata_rows',recent_metadata_rows,
  'rows_marked_running',rows_marked_running,'statuses',statuses,
  'role_activation_verified',false,'engine_certified_autonomous',false,
  'diagnosis',case
   when recent_metadata_rows=0 then 'NO_RECENT_METADATA'
   when explicit_role_rows=0 then 'RECENT_BUT_ROLE_ID_UNATTRIBUTED'
   else 'RECENT_JOBS_REQUIRE_SIGNED_RECEIPTS'
  end
 ) order by source,engine_id,environment),'[]'::jsonb),coalesce(sum(total),0)
 into overview,total_jobs from facts;
 qa:=public.cerebro_lab_qa_observe_v1();
 return jsonb_build_object(
  'status','OK','source','CEREBRO_LAB_ENGINE_TRUTH_AUDIT_V1',
  'company_id','fenix','environment','LAB',
  'read_only',true,'generated_at',now(),
  'historical_job_rows',total_jobs,
  'sources',overview,
  'qa_001',jsonb_build_object(
    'agent_role_id','ENG-QA','engine_id','QA-001',
    'signature_verified',coalesce((qa->>'signature_verified')::boolean,false),
    'execution_status',qa->>'execution_status',
    'last_receipt_at',qa->>'observed_at',
    'signed_runs',coalesce((qa->>'runs_count')::integer,0),
    'tests_passed',coalesce((qa->>'tests_passed')::integer,0),
    'tests_total',coalesce((qa->>'tests_total')::integer,0),
    'quality_verdict','QA_METADATA_ONLY_NO_TRIBUNAL',
    'operational_autonomy_certified',false
  ),
  'all_engines_certified',false,
  'autonomy_global_certified',false
 );
end;
$fn$;
revoke all on function public.cerebro_lab_engine_truth_v1() from public,anon,authenticated;
grant execute on function public.cerebro_lab_engine_truth_v1() to service_role;
comment on function public.cerebro_lab_engine_truth_v1() is
 'Owner-facing LAB-only readout via service role; historical jobs do not imply active engines.';
-- Rollback: DROP FUNCTION public.cerebro_lab_engine_truth_v1();
