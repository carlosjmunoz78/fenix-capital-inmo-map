-- CEREBRO CONSOLE-001 · parallel readonly public-repository capability in existing LAB.
-- Does NOT lease, complete, alter or assume identity of legacy GitHub-OIDC worker.
create table if not exists cerebro_lab.console_repo_signer_v1(
 id smallint primary key check(id=1),
 key_bytes bytea not null check(octet_length(key_bytes)=32)
);
revoke all on cerebro_lab.console_repo_signer_v1 from public,anon,authenticated,service_role;
insert into cerebro_lab.console_repo_signer_v1(id,key_bytes)
 select 1,extensions.gen_random_bytes(32)
 where not exists(select 1 from cerebro_lab.console_repo_signer_v1 where id=1);

create table if not exists cerebro_lab.console_repo_readonly_v1(
 request_id bigint primary key check(request_id>0),
 job_id uuid not null unique default pg_catalog.gen_random_uuid(),
 company_id text not null default 'fenix' check(company_id='fenix'),
 engine_id text not null default 'CONSOLE-001' check(engine_id='CONSOLE-001'),
 environment text not null default 'LAB' check(environment='LAB'),
 version text not null default '1.0.0' check(version='1.0.0'),
 capability_id text not null default 'repo.sandbox.public.readonly.v0'
  check(capability_id='repo.sandbox.public.readonly.v0'),
 source text not null default 'SUPABASE_PG_NET'
  check(source='SUPABASE_PG_NET'),
 repository text not null default 'carlosjmunoz78/fenix-capital-inmo-map'
  check(repository='carlosjmunoz78/fenix-capital-inmo-map'),
 branch text not null default 'main' check(branch='main'),
 agent_role_id text default null check(agent_role_id is null),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 state text not null default 'QUEUED' check(state in ('QUEUED','SUCCEEDED','FAILED','NO_RESPONSE')),
 http_status integer,
 observed_sha text check(observed_sha is null or observed_sha ~ '^[a-f0-9]{40}$'),
 signature_hex text check(signature_hex is null or signature_hex ~ '^[a-f0-9]{64}$'),
 external_actions_executed boolean not null default false check(external_actions_executed=false),
 prod_execution_enabled boolean not null default false check(prod_execution_enabled=false),
 expected_cost_eur integer not null default 0 check(expected_cost_eur=0),
 check((state='QUEUED' and completed_at is null and signature_hex is null) or
  (state<>'QUEUED' and completed_at is not null and signature_hex is not null))
);
alter table cerebro_lab.console_repo_readonly_v1 enable row level security;
revoke all on cerebro_lab.console_repo_readonly_v1 from public,anon,authenticated,service_role;
create index if not exists console_repo_readonly_lab_recent_v1
 on cerebro_lab.console_repo_readonly_v1(completed_at desc);

create or replace function cerebro_lab.enqueue_console_repo_readonly_v1()
returns jsonb language plpgsql security invoker set search_path=pg_catalog,pg_temp
as $fn$
declare request_id bigint; job_id uuid;
begin
 select net.http_get(
  url=>'https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/commits/main',
  headers=>'{"accept":"application/vnd.github+json","user-agent":"CEREBRO-LAB-Readonly-1"}'::jsonb,
  timeout_milliseconds=>7000
 ) into request_id;
 insert into cerebro_lab.console_repo_readonly_v1(request_id)
 values(request_id) returning console_repo_readonly_v1.job_id into job_id;
 return jsonb_build_object('status','QUEUED','job_id',job_id,
  'company_id','fenix','engine_id','CONSOLE-001','environment','LAB',
  'capability_id','repo.sandbox.public.readonly.v0','public_read_only',true,
  'github_actions_used',false,'legacy_worker_executed',false);
end;
$fn$;
revoke all on function cerebro_lab.enqueue_console_repo_readonly_v1() from public,anon,authenticated,service_role;
grant execute on function cerebro_lab.enqueue_console_repo_readonly_v1() to postgres;

create or replace function cerebro_lab.collect_console_repo_readonly_v1()
returns jsonb language plpgsql security invoker set search_path=pg_catalog,pg_temp
as $fn$
declare
 r record;
 response record;
 sha text;
 final_state text;
 code integer;
 stamp timestamptz;
 signing bytea;
 material text;
 signature text;
 processed integer:=0;
 successes integer:=0;
begin
 select k.key_bytes into signing from cerebro_lab.console_repo_signer_v1 k where k.id=1;
 if signing is null or octet_length(signing)<>32 then
  raise exception 'CONSOLE_SIGNER_UNAVAILABLE';
 end if;
 for r in
  select request_id,job_id,created_at from cerebro_lab.console_repo_readonly_v1
  where state='QUEUED' and created_at<now()-interval '3 seconds'
  and created_at>now()-interval '24 hours'
  order by created_at asc limit 50
 loop
  select x.id,x.status_code,x.content,x.timed_out
  into response from net._http_response x where x.id=r.request_id;
  if not found and r.created_at>now()-interval '90 seconds' then continue; end if;
  sha:=null;
  if response.id is null then
   final_state:='NO_RESPONSE';code:=null;
  else
   code:=response.status_code;final_state:='FAILED';
   if code=200 and not coalesce(response.timed_out,false) and
      char_length(coalesce(response.content,'')) between 20 and 200000 then
    begin
     sha:=(response.content::jsonb)->>'sha';
     if sha~'^[a-f0-9]{40}$' then final_state:='SUCCEEDED';else sha:=null;end if;
    exception when others then sha:=null;final_state:='FAILED';
    end;
   end if;
  end if;
  stamp:=clock_timestamp();
  material:=concat_ws('|','CEREBRO_CONSOLE_PUBLIC_REPO_V1',r.job_id::text,r.request_id::text,
   'fenix','CONSOLE-001','LAB','1.0.0','repo.sandbox.public.readonly.v0',
   'SUPABASE_PG_NET','carlosjmunoz78/fenix-capital-inmo-map','main',
   stamp::text,final_state,coalesce(code::text,'NULL'),coalesce(sha,'NULL'));
  signature:=encode(extensions.hmac(convert_to(material,'UTF8'),signing,'sha256'),'hex');
  update cerebro_lab.console_repo_readonly_v1 x set
   completed_at=stamp,state=final_state,http_status=code,observed_sha=sha,signature_hex=signature
   where x.request_id=r.request_id and x.state='QUEUED';
  processed:=processed+1;
  if final_state='SUCCEEDED' then successes:=successes+1;end if;
 end loop;
 return jsonb_build_object('status','COLLECTED','jobs_finished',processed,
  'jobs_succeeded',successes,'legacy_worker_executed',false);
end;
$fn$;
revoke all on function cerebro_lab.collect_console_repo_readonly_v1() from public,anon,authenticated,service_role;
grant execute on function cerebro_lab.collect_console_repo_readonly_v1() to postgres;

create or replace function public.cerebro_lab_console_repo_observe_v1()
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp
as $fn$
declare
 r cerebro_lab.console_repo_readonly_v1%rowtype;
 key_bytes bytea;
 material text;
 expected text;
 verified boolean;
 count_jobs integer;
begin
 select count(*) into count_jobs from cerebro_lab.console_repo_readonly_v1 where state<>'QUEUED';
 select * into r from cerebro_lab.console_repo_readonly_v1
  where state<>'QUEUED' order by completed_at desc limit 1;
 if not found then return jsonb_build_object('status','WAITING_FOR_REAL_WORK',
  'company_id','fenix','environment','LAB','engine_id','CONSOLE-001',
  'completed_job_count',0,'autonomy_certified',false,'legacy_worker_executed',false);end if;
 select k.key_bytes into key_bytes from cerebro_lab.console_repo_signer_v1 k where k.id=1;
 material:=concat_ws('|','CEREBRO_CONSOLE_PUBLIC_REPO_V1',r.job_id::text,r.request_id::text,
   'fenix','CONSOLE-001','LAB','1.0.0','repo.sandbox.public.readonly.v0',
   'SUPABASE_PG_NET','carlosjmunoz78/fenix-capital-inmo-map','main',
   r.completed_at::text,r.state,coalesce(r.http_status::text,'NULL'),
   coalesce(r.observed_sha,'NULL'));
 expected:=encode(extensions.hmac(convert_to(material,'UTF8'),key_bytes,'sha256'),'hex');
 verified:=coalesce(expected=r.signature_hex,false);
 return jsonb_build_object('status',case when verified then 'OK' else 'INTEGRITY_FAILURE' end,
  'source','CEREBRO_CONSOLE_READONLY_LAB_V1',
  'company_id','fenix','engine_id','CONSOLE-001','environment','LAB',
  'capability_id','repo.sandbox.public.readonly.v0',
  'job_id',r.job_id,'receipt_request_id',r.request_id,
  'execution_state',r.state,'http_status',r.http_status,
  'last_execution_at',r.completed_at,'repository','carlosjmunoz78/fenix-capital-inmo-map',
  'branch','main','observed_commit_sha',r.observed_sha,
  'signed',verified,'completed_job_count',count_jobs,
  'specific_capability_evidenced',verified and r.state='SUCCEEDED' and r.http_status=200,
  'agent_role_identity_verified',false,'full_engine_certified',false,
  'legacy_worker_executed',false,'autonomy_certified',false,
  'external_actions_executed',false,'prod_execution_enabled',false,
  'marginal_cost_eur_measured',false);
end;
$fn$;
revoke all on function public.cerebro_lab_console_repo_observe_v1() from public,anon,authenticated;
grant execute on function public.cerebro_lab_console_repo_observe_v1() to service_role;
-- Rollback after evidence export: unschedule new cron; drop new RPC/functions/private tables.
