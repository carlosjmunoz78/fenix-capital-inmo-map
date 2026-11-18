-- CERT-001 | LAB-only, read-only cross-source certification gate projection.
-- No source-table mutations, no new subscriptions, no assumption of agent execution.
-- Uses pre-existing pg_cron and signed QA-001 receipt ledger.
create or replace function public.cerebro_lab_certification_gates_v1()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,pg_temp
as $function$
declare
  qa jsonb;
  historical jsonb;
  fact_row public.cerebro_universal_fact_attestation_lab_v0%rowtype;
  fact_recorded boolean:=false;
  social_total integer:=0;
  social_active integer:=0;
  social_recent_succeeded integer:=0;
  social_last timestamptz;
  social_last_status text;
begin
  qa:=public.cerebro_lab_qa_observe_v1();
  historical:=public.cerebro_lab_engine_truth_v1();
  if (qa->>'status')<>'OK' or (qa->>'signature_verified')<>'true'
    or (historical->>'status')<>'OK' then
    return pg_catalog.jsonb_build_object(
     'status','INTEGRITY_HOLD','environment','LAB','company_id','fenix',
     'reason','QA_RECEIPT_OR_HISTORY_INVALID','all_certified',false,
     'prod_execution_enabled',false);
  end if;

  select * into fact_row from public.cerebro_universal_fact_attestation_lab_v0
   where company_id='fenix' and engine_id='FACT-001' and environment='LAB'
   order by created_at desc limit 1;
  fact_recorded:=found;

  -- At most 1,200 recent pg_cron entries; never scan all logs per schedule.
  with recent as materialized (
    select jobid,status,start_time from cron.job_run_details
    order by runid desc limit 1200
  ), last_by_job as (
    select distinct on (jobid) jobid,status,start_time
    from recent order by jobid,start_time desc
  ), schedule as (
    select j.jobname,j.active,l.status as last_status,l.start_time as last_time
    from cron.job j left join last_by_job l on l.jobid=j.jobid
    where j.jobname like 'cerebro-social-%'
  )
  select count(*)::integer,
   count(*) filter(where active)::integer,
   count(*) filter(where active and last_status='succeeded'
     and last_time>now()-interval '48 hours')::integer,
   max(last_time),
   (array_agg(last_status order by last_time desc nulls last))[1]
  into social_total,social_active,social_recent_succeeded,social_last,social_last_status
  from schedule;

  return pg_catalog.jsonb_build_object(
   'status','OK','source','CEREBRO_LAB_CERTIFICATION_GATES_V1',
   'company_id','fenix','environment','LAB',
   'generated_at',now(),'read_only',true,'executed',false,
   'prod_execution_enabled',false,
   'global_autonomy_certified',false,'global_excellence_certified',false,
   'evidence_categories',pg_catalog.jsonb_build_array(
     pg_catalog.jsonb_build_object(
       'id','QA-001','kind','SIGNED_LAB_QA_EXECUTION',
       'source','SUPABASE_PGCRON','actor_role','ENG-QA',
       'receipt_id',qa->>'receipt_id',
       'signed_runs',coalesce((qa->>'runs_count')::integer,0),
       'tests_passed',coalesce((qa->>'tests_passed')::integer,0),
       'tests_total',coalesce((qa->>'tests_total')::integer,0),
       'integrity_verified',true,'last_execution_at',qa->>'observed_at',
       'specific_capability_evidenced',true,
       'full_engine_certified',false,'business_quality_certified',false),
     pg_catalog.jsonb_build_object(
       'id','FACT-001','kind','HISTORICAL_REGISTRY_ATTESTATION',
       'source','EXISTING_LAB_DETERMINISTIC_RECEIPT',
       'receipt_id',case when fact_recorded then fact_row.receipt_id else null end,
       'last_execution_at',case when fact_recorded then fact_row.created_at else null end,
       'specific_capability_evidenced',fact_recorded and
          fact_row.capability_id='fact.registry.attest' and
          fact_row.version='0.1.0-lab' and
          fact_row.registry_count=179 and fact_row.base_count=177 and
          fact_row.preserved_base=true and fact_row.executed=true and
          fact_row.external_actions_executed=false and
          fact_row.prod_execution_enabled=false and
          fact_row.policy_decision='LAB_EXECUTION_ALLOWLIST' and
          fact_row.additional_cost_eur=0 and
          fact_row.registry_digest~'^[a-f0-9]{64}$',
       'full_engine_certified',false,'business_quality_certified',false),
     pg_catalog.jsonb_build_object(
       'id','CONSOLE-001','kind','LEGACY_JOB_HISTORY_UNATTRIBUTED',
       'source','JARVIS_AND_BROWSER_LAB_TABLES',
       'historical_rows',coalesce((
          select sum((v->>'historical_jobs')::integer) from
          pg_catalog.jsonb_array_elements(historical->'sources') v
          where v->>'engine_id'='CONSOLE-001'),0),
       'role_identity_verified',false,'specific_capability_evidenced',false,
       'full_engine_certified',false,'business_quality_certified',false),
     pg_catalog.jsonb_build_object(
       'id','UMS-001','kind','HOLD_IN_LEGACY_CREATIVE_QUEUE',
       'source','CREATIVE_LAB_TABLE',
       'historical_rows',coalesce((
          select sum((v->>'historical_jobs')::integer) from
          pg_catalog.jsonb_array_elements(historical->'sources') v
          where v->>'engine_id'='UMS-001'),0),
       'specific_capability_evidenced',false,'hold_untouched',true,
       'full_engine_certified',false,'business_quality_certified',false),
     pg_catalog.jsonb_build_object(
       'id','SOCIAL_LAB_SCHEDULES','kind','SCHEDULE_EXECUTION_METADATA',
       'source','PG_CRON_EXISTING_LAB',
       'scheduled_jobs_total',social_total,'active_schedules',social_active,
       'run_history_sampling','LATEST_1200_PGCRON_RUNS',
       'active_schedules_succeeded_within_48h',social_recent_succeeded,
       'last_schedule_run_at',social_last,'last_schedule_status',social_last_status,
       'agent_identity_verified',false,'specific_capability_evidenced',false,
       'business_outcome_verified',false,'full_engine_certified',false)
   ),
   'historical_source_rows',historical->'historical_job_rows',
   'engine_runtime_attribution_required',true,
   'quality_tribunal_required',true,'cost_measured',false,
   'owner_live_actions_executed',false
  );
end;
$function$;
revoke all on function public.cerebro_lab_certification_gates_v1() from public,anon,authenticated;
grant execute on function public.cerebro_lab_certification_gates_v1() to service_role;
comment on function public.cerebro_lab_certification_gates_v1() is
 'Owner-LAB only gate synopsis; source truth not a certification or a runtime dispatch.';
-- Rollback: DROP FUNCTION public.cerebro_lab_certification_gates_v1();
