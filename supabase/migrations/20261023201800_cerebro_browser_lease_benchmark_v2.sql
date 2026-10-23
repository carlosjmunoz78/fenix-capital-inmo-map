-- CEREBRO Browser 1 Phase 2 rebuild closure: benchmark-scoped lease RPC.
create or replace function public.cerebro_browser_lease_benchmark_v2(
  p_worker_id text,
  p_environment text,
  p_idempotency_prefix text,
  p_lease_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg public.cerebro_browser_orchestrator_config_v2%rowtype;
  v_job public.cerebro_browser_job_v2%rowtype;
  v_candidate record;
  v_lease uuid;
  v_scope text;
  v_global integer;
begin
  if p_idempotency_prefix is null or length(p_idempotency_prefix)<10 then raise exception 'INVALID_BENCHMARK_PREFIX'; end if;
  if p_lease_seconds<30 or p_lease_seconds>1800 then raise exception 'INVALID_LEASE_SECONDS'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cerebro_browser_orchestrator_v2:'||p_environment,0));
  select * into v_cfg from public.cerebro_browser_orchestrator_config_v2 where environment=p_environment;
  if v_cfg.environment is null or v_cfg.enabled is not true then
    return jsonb_build_object('ok',true,'job',null,'backpressure','ORCHESTRATOR_DISABLED');
  end if;
  perform public.cerebro_browser_reap_v2(p_environment);
  select count(*) into v_global
  from public.cerebro_browser_job_v2
  where environment=p_environment and status='LEASED' and lease_expires_at>now();
  if v_global>=v_cfg.global_max_concurrent then
    return jsonb_build_object('ok',true,'job',null,'backpressure','GLOBAL_LIMIT');
  end if;

  for v_candidate in
    select j.*,
      (select count(*) from public.cerebro_browser_job_v2 a where a.environment=j.environment and a.company_id=j.company_id and a.status='LEASED' and a.lease_expires_at>now()) as company_active,
      (select count(*) from public.cerebro_browser_job_v2 a where a.environment=j.environment and a.company_id=j.company_id and a.department_id=j.department_id and a.status='LEASED' and a.lease_expires_at>now()) as department_active,
      coalesce((select f.last_leased_at from public.cerebro_browser_fairness_v2 f where f.company_id=j.company_id and f.environment=j.environment and f.department_id=j.department_id),to_timestamp(0)) as department_last_leased
    from public.cerebro_browser_job_v2 j
    where j.environment=p_environment
      and j.status='QUEUED'
      and j.not_before<=now()
      and j.cancel_requested=false
      and j.idempotency_key like p_idempotency_prefix||'%'
      and j.expected_cost_eur=0
      and j.risk<>'HIGH'
      and not exists(
        select 1 from public.cerebro_browser_profile_lease_v2 l
        where l.scope_key=j.company_id||'::'||j.environment||'::'||j.browser_profile_id
          and l.lease_expires_at>now()
      )
    order by j.priority desc, department_active asc, department_last_leased asc, j.created_at asc
    for update of j skip locked
    limit 25
  loop
    if v_candidate.company_active>=v_cfg.default_company_max_concurrent
       or v_candidate.department_active>=v_cfg.default_department_max_concurrent then
      continue;
    end if;
    v_lease:=gen_random_uuid();
    v_scope:=v_candidate.company_id||'::'||v_candidate.environment||'::'||v_candidate.browser_profile_id;
    begin
      insert into public.cerebro_browser_profile_lease_v2(scope_key,company_id,environment,browser_profile_id,job_id,lease_id,worker_id,lease_expires_at)
      values(v_scope,v_candidate.company_id,v_candidate.environment,v_candidate.browser_profile_id,v_candidate.job_id,v_lease,p_worker_id,now()+make_interval(secs=>p_lease_seconds));
    exception when unique_violation then
      continue;
    end;
    update public.cerebro_browser_job_v2
    set status='LEASED',lease_id=v_lease,leased_by=p_worker_id,
        lease_expires_at=now()+make_interval(secs=>p_lease_seconds),last_heartbeat_at=now(),
        attempt_count=attempt_count+1,updated_at=now(),error_code=null
    where job_id=v_candidate.job_id
    returning * into v_job;
    insert into public.cerebro_browser_fairness_v2(company_id,environment,department_id,last_leased_at,lease_count)
    values(v_job.company_id,v_job.environment,v_job.department_id,now(),1)
    on conflict(company_id,environment,department_id)
    do update set last_leased_at=excluded.last_leased_at,
                  lease_count=public.cerebro_browser_fairness_v2.lease_count+1;
    return jsonb_build_object('ok',true,'job',to_jsonb(v_job),'benchmark_isolated',true,'prefix',p_idempotency_prefix);
  end loop;
  return jsonb_build_object('ok',true,'job',null,'backpressure','NO_ELIGIBLE_JOB','benchmark_isolated',true);
end;
$$;

revoke all on function public.cerebro_browser_lease_benchmark_v2(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.cerebro_browser_lease_benchmark_v2(text,text,text,integer) to service_role;
