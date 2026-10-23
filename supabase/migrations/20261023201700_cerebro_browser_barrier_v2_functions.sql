-- CEREBRO Browser 1 Phase 2 rebuild closure: barrier functions.
create or replace function public.cerebro_browser_barrier_arrive_v2(
  p_run_id text,
  p_stage_concurrency integer,
  p_worker_slot integer,
  p_worker_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_ready integer;
begin
  if p_stage_concurrency not in (1,2,4,8,16) then raise exception 'INVALID_STAGE_CONCURRENCY'; end if;
  if p_worker_slot < 1 or p_worker_slot > p_stage_concurrency then raise exception 'INVALID_WORKER_SLOT'; end if;
  insert into public.cerebro_browser_barrier_v2(run_id,stage_concurrency,worker_slot,worker_id,ready_at)
  values(p_run_id,p_stage_concurrency,p_worker_slot,p_worker_id,now())
  on conflict(run_id,stage_concurrency,worker_slot)
  do update set worker_id=excluded.worker_id,ready_at=excluded.ready_at;
  select count(*) into v_ready
  from public.cerebro_browser_barrier_v2
  where run_id=p_run_id and stage_concurrency=p_stage_concurrency;
  return jsonb_build_object('ok',true,'ready',v_ready,'target',p_stage_concurrency,'go',v_ready>=p_stage_concurrency);
end;
$$;

create or replace function public.cerebro_browser_barrier_status_v2(
  p_run_id text,
  p_stage_concurrency integer
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok',true,
    'ready',count(*),
    'target',p_stage_concurrency,
    'go',count(*)>=p_stage_concurrency
  )
  from public.cerebro_browser_barrier_v2
  where run_id=p_run_id and stage_concurrency=p_stage_concurrency;
$$;

revoke all on function public.cerebro_browser_barrier_arrive_v2(text,integer,integer,text) from public, anon, authenticated;
revoke all on function public.cerebro_browser_barrier_status_v2(text,integer) from public, anon, authenticated;
grant execute on function public.cerebro_browser_barrier_arrive_v2(text,integer,integer,text) to service_role;
grant execute on function public.cerebro_browser_barrier_status_v2(text,integer) to service_role;
