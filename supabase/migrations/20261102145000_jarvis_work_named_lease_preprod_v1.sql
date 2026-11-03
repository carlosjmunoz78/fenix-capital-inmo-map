-- JARVIS Work named lease V1 · PREPROD
-- Keeps sandbox and Git workers on the same durable queue without cross-consuming jobs.

create or replace function public.jarvis_work_lease_named_v1(
  p_worker_id text,
  p_job_name text,
  p_company_id text default 'fenix',
  p_environment text default 'PREPROD',
  p_lease_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.jarvis_work_job_v1%rowtype;
begin
  if p_environment <> 'PREPROD' then raise exception 'PREPROD_ONLY'; end if;
  if p_worker_id is null or btrim(p_worker_id) = '' then raise exception 'WORKER_REQUIRED'; end if;
  if p_job_name is null or btrim(p_job_name) = '' then raise exception 'JOB_NAME_REQUIRED'; end if;
  with picked as (
    select job_id from public.jarvis_work_job_v1
    where company_id=p_company_id
      and environment=p_environment
      and name=btrim(p_job_name)
      and status in ('QUEUED','RETRY_WAIT')
      and next_attempt_at<=now()
    order by priority asc,created_at asc,job_id asc
    for update skip locked
    limit 1
  )
  update public.jarvis_work_job_v1 j
  set status='RUNNING',attempts=j.attempts+1,worker_id=p_worker_id,
      lease_id=gen_random_uuid(),lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,3600))),
      heartbeat_at=now(),started_at=coalesce(j.started_at,now()),updated_at=now()
  from picked where j.job_id=picked.job_id returning j.* into r;
  if r.job_id is null then return jsonb_build_object('ok',true,'job',null); end if;
  return jsonb_build_object('ok',true,'job',to_jsonb(r));
end $$;

revoke all on function public.jarvis_work_lease_named_v1(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.jarvis_work_lease_named_v1(text,text,text,text,integer) to service_role;
