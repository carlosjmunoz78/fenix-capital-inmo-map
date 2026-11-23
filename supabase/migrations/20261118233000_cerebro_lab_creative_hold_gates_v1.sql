-- CEREBRO LAB only: authoritative non-PII blocker assessment, zero execution.
-- No changes to jobs, media, workers, accounts or approvals.
create or replace function public.cerebro_lab_creative_hold_gates_v1()
returns jsonb language sql security definer
set search_path=pg_catalog,pg_temp
as $body$
with grouped as (
 select engine_id, status, coalesce(error_code,'NONE') as reason_code,
  count(*)::integer as n, max(updated_at) as last_update
 from public.cerebro_creative_job_v1
 where company_id='fenix' and environment in ('LAB','PREPROD')
   and engine_id in ('FACT-001','UMS-001')
 group by engine_id,status,coalesce(error_code,'NONE')
), summarized as (
 select engine_id,
   sum(n)::integer as total,
   sum(n) filter(where status='HOLD')::integer as held,
   sum(n) filter(where status='SUCCEEDED')::integer as succeeded,
   max(last_update) as last_update,
   jsonb_agg(jsonb_build_object('state',status,'reason_code',reason_code,
     'count',n) order by status,reason_code) as reasons
 from grouped group by engine_id
)
select jsonb_build_object(
 'status','OK','source','CEREBRO_LAB_CREATIVE_HOLD_GATES_V1',
 'company_id','fenix','environment','LAB','read_only',true,
 'generated_at',now(),'external_actions_executed',false,
 'owner_rejection_override',false,'paid_generation_enabled',false,
 'prod_execution_enabled',false,'all_certified',false,
 'engines',coalesce((select jsonb_agg(jsonb_build_object(
  'engine_id',engine_id,'historical_jobs',total,'jobs_on_hold',coalesce(held,0),
  'historical_succeeded',coalesce(succeeded,0),'last_job_update',last_update,
  'blockers',reasons,'safe_to_resume',false,'autonomy_certified',false
 ) order by engine_id) from summarized),'[]'::jsonb)
);
$body$;
revoke all on function public.cerebro_lab_creative_hold_gates_v1() from public,anon,authenticated;
grant execute on function public.cerebro_lab_creative_hold_gates_v1() to service_role;
comment on function public.cerebro_lab_creative_hold_gates_v1() is
 'Aggregated reasons only, never resumes UMS owner-rejected or FACT paid jobs.';
