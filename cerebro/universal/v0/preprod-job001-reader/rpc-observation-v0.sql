-- CEREBRO LAB · PREPROD · additive read-only RPC stats observation.
-- Rollback after consumers assessed: DROP wrapper then private function.
create function cerebro_lab_private.job001_rpc_stats_observe_v0()
returns jsonb
language sql stable security definer set search_path=''
as $f$
select pg_catalog.jsonb_build_object(
 'source','PREPROD_JOB001_DISPATCH_RPC_STATS',
 'observed_at',pg_catalog.now(),
 'stats_reset_at',(select i.stats_reset from extensions.pg_stat_statements_info i limit 1),
 'matching_normalized_statements',pg_catalog.count(*)::int,
 'rpc_calls_since_reset',coalesce(pg_catalog.sum(s.calls),0)::bigint,
 'runtime_execution_verified',false,
 'hostinger_origin_verified',false,
 'downstream_effect_verified',false,
 'source_semantics','POSTGREST_SQL_RPC_INVOCATION_COUNTER_NOT_JOB_COMPLETION'
)
from extensions.pg_stat_statements s
where s.query like 'WITH pgrst_source AS (%'
  and s.query ilike '%cerebro_job001_dispatch_preprod%';
$f$;
revoke all on function cerebro_lab_private.job001_rpc_stats_observe_v0() from public,anon,authenticated;
grant execute on function cerebro_lab_private.job001_rpc_stats_observe_v0() to service_role;
create function public.cerebro_operativa_job001_rpc_observation_lab_v0()
returns jsonb
language sql stable security invoker set search_path=''
as $g$
 select cerebro_lab_private.job001_rpc_stats_observe_v0();
$g$;
revoke all on function public.cerebro_operativa_job001_rpc_observation_lab_v0() from public,anon,authenticated;
grant execute on function public.cerebro_operativa_job001_rpc_observation_lab_v0() to service_role;
comment on function public.cerebro_operativa_job001_rpc_observation_lab_v0()
is 'CEREBRO LAB only: cumulative PostgREST calls to existing JOB001 dispatch RPC since pg_stat_statements reset, no writes, no raw query or secrets';
