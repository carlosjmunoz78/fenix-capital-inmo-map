-- CEREBRO DISPATCH-OBS-001 · standalone PREPROD health readback via existing pg_net.
-- Only fixed GET /health URLs. No OIDC bypass, jobs lease, media generation or PROD writes.
create table if not exists cerebro_lab.dispatch_health_signer_v1 (
 id smallint primary key check(id=1),
 key_bytes bytea not null check(octet_length(key_bytes)=32)
);
revoke all on cerebro_lab.dispatch_health_signer_v1 from public,anon,authenticated,service_role;
insert into cerebro_lab.dispatch_health_signer_v1(id,key_bytes)
 select 1,extensions.gen_random_bytes(32)
 where not exists(select 1 from cerebro_lab.dispatch_health_signer_v1 where id=1);

create table if not exists cerebro_lab.dispatch_health_sample_v1 (
 request_id bigint primary key check(request_id>0),
 company_id text not null default 'fenix' check(company_id='fenix'),
 environment text not null default 'LAB' check(environment='LAB'),
 component_id text not null default 'DISPATCH-OBS-001' check(component_id='DISPATCH-OBS-001'),
 version text not null default '1.0.0' check(version='1.0.0'),
 service_slug text not null check(service_slug in (
  'jarvis-work-dispatch-v1-preprod',
  'cerebro-browser-work-total-dispatch-v1-preprod',
  'cerebro-creative-dispatch-v1',
  'cerebro-ums-production-dispatch-v1')),
 engine_id text not null check(engine_id in ('CONSOLE-001','FACT-001','UMS-001')),
 requested_at timestamptz not null default now(),
 checked_at timestamptz,
 state text not null default 'PENDING' check(state in
  ('PENDING','HEALTH_ENDPOINT_OK','HEALTH_ENDPOINT_FAILED','NO_RESPONSE')),
 http_status integer,
 response_digest text,
 signature_hex text,
 check((state='PENDING' and checked_at is null and signature_hex is null) or
       (state<>'PENDING' and checked_at is not null and signature_hex ~ '^[a-f0-9]{64}$')),
 unique(request_id,service_slug)
);
alter table cerebro_lab.dispatch_health_sample_v1 enable row level security;
revoke all on cerebro_lab.dispatch_health_sample_v1 from public,anon,authenticated,service_role;
create index if not exists dispatch_health_sample_v1_recency
 on cerebro_lab.dispatch_health_sample_v1(service_slug,checked_at desc);

create or replace function cerebro_lab.enqueue_dispatch_health_v1()
returns jsonb language plpgsql security invoker
set search_path=pg_catalog,pg_temp
as $fn$
declare
 r record;
 request_id bigint;
 queued integer:=0;
begin
 for r in
  select * from (values
   ('jarvis-work-dispatch-v1-preprod','CONSOLE-001'),
   ('cerebro-browser-work-total-dispatch-v1-preprod','CONSOLE-001'),
   ('cerebro-creative-dispatch-v1','FACT-001'),
   ('cerebro-ums-production-dispatch-v1','UMS-001')
  ) as services(service_slug,engine_id)
 loop
  select net.http_get(
   url=>'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/'||r.service_slug||'/health',
   headers=>'{"accept":"application/json"}'::jsonb,
   timeout_milliseconds=>7000
  ) into request_id;
  insert into cerebro_lab.dispatch_health_sample_v1(request_id,service_slug,engine_id)
  values(request_id,r.service_slug,r.engine_id);
  queued:=queued+1;
 end loop;
 return pg_catalog.jsonb_build_object('status','QUEUED','count',queued,
  'company_id','fenix','environment','LAB','method','GET_HEALTH_ONLY',
  'runtime_jobs_executed',false,'github_actions_used',false);
end;
$fn$;
revoke all on function cerebro_lab.enqueue_dispatch_health_v1() from public,anon,authenticated,service_role;
grant execute on function cerebro_lab.enqueue_dispatch_health_v1() to postgres;

create or replace function cerebro_lab.collect_dispatch_health_v1()
returns jsonb language plpgsql security invoker
set search_path=pg_catalog,pg_temp
as $fn$
declare
 sample record;
 raw record;
 content_json jsonb;
 final_state text;
 content_hash text;
 code integer;
 signing_key bytea;
 seal text;
 material text;
 done_count integer:=0;
 valid_count integer:=0;
begin
 select key_bytes into signing_key from cerebro_lab.dispatch_health_signer_v1 where id=1;
 if octet_length(signing_key)<>32 or signing_key is null then
  raise exception 'DISPATCH_PROBE_SIGNER_MISSING';
 end if;
 for sample in
  select request_id,service_slug,engine_id,requested_at
  from cerebro_lab.dispatch_health_sample_v1
  where state='PENDING'
  and requested_at<now()-interval '3 seconds'
  and requested_at>now()-interval '2 hours'
  order by requested_at asc limit 200
 loop
  select x.id,x.status_code,x.content,x.timed_out,x.error_msg
  into raw from net._http_response x where x.id=sample.request_id;
  if not found and sample.requested_at>now()-interval '90 seconds' then
   continue;
  end if;
  code:=raw.status_code;
  content_hash:=case when raw.id is not null then
   encode(extensions.digest(coalesce(raw.content,''),'sha256'),'hex')
   else null end;
  final_state:='HEALTH_ENDPOINT_FAILED';
  if raw.id is null then final_state:='NO_RESPONSE';
  elsif raw.status_code=200 and not coalesce(raw.timed_out,false) then
   begin
    content_json:=raw.content::jsonb;
    if content_json->>'ok'='true' and
       content_json->>'service'=sample.service_slug and
       content_json->>'environment'='PREPROD' and
       (case when sample.engine_id='CONSOLE-001' then
          content_json->>'prod_access'='false'
        when sample.engine_id='UMS-001' then
          content_json->>'engine_id'='UMS-001' and
          content_json->>'publish_authorized'='false'
        else true end) then
       final_state:='HEALTH_ENDPOINT_OK';
    end if;
   exception when others then
    final_state:='HEALTH_ENDPOINT_FAILED';
   end;
  end if;
  material:=pg_catalog.concat_ws('|','DISPATCH_HEALTH_LAB_V1',
   sample.request_id::text,sample.service_slug,sample.engine_id,'fenix','LAB',
   final_state,coalesce(code::text,'NULL'),coalesce(content_hash,'NULL'));
  seal:=encode(extensions.hmac(convert_to(material,'UTF8'),signing_key,'sha256'),'hex');
  update cerebro_lab.dispatch_health_sample_v1 as s set
   state=final_state,http_status=code,response_digest=content_hash,
   checked_at=clock_timestamp(),signature_hex=seal
   where s.request_id=sample.request_id and s.state='PENDING';
  done_count:=done_count+1;
  if final_state='HEALTH_ENDPOINT_OK' then valid_count:=valid_count+1;end if;
 end loop;
 return pg_catalog.jsonb_build_object('status','COLLECTED','new_samples',done_count,
  'health_ok',valid_count,'executed_existing_jobs',false);
end;
$fn$;
revoke all on function cerebro_lab.collect_dispatch_health_v1() from public,anon,authenticated,service_role;
grant execute on function cerebro_lab.collect_dispatch_health_v1() to postgres;

create or replace function public.cerebro_lab_dispatch_health_observe_v1()
returns jsonb language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $fn$
declare
 key_bytes bytea;
 sample record;
 payload jsonb:='[]'::jsonb;
 material text;
 verified boolean;
 verified_count integer:=0;
 total_count integer:=0;
 last_state text;
begin
 select key_bytes into key_bytes from cerebro_lab.dispatch_health_signer_v1 where id=1;
 for sample in
  select distinct on (service_slug)
   request_id,service_slug,engine_id,environment,state,http_status,
   requested_at,checked_at,response_digest,signature_hex
  from cerebro_lab.dispatch_health_sample_v1
  where state<>'PENDING'
  order by service_slug,checked_at desc
 loop
  total_count:=total_count+1;
  material:=pg_catalog.concat_ws('|','DISPATCH_HEALTH_LAB_V1',
   sample.request_id::text,sample.service_slug,sample.engine_id,'fenix','LAB',
   sample.state,coalesce(sample.http_status::text,'NULL'),
   coalesce(sample.response_digest,'NULL'));
  verified:=coalesce(
   sample.signature_hex=encode(extensions.hmac(convert_to(material,'UTF8'),
    key_bytes,'sha256'),'hex'),false);
  if verified and sample.state='HEALTH_ENDPOINT_OK' then
   verified_count:=verified_count+1;
  end if;
  payload:=payload||jsonb_build_array(jsonb_build_object(
   'engine_id',sample.engine_id,'service',sample.service_slug,
   'last_checked_at',sample.checked_at,'health_state',
    case when verified then sample.state else 'UNTRUSTED_RECEIPT' end,
   'http_status',sample.http_status,
   'signature_verified',verified,
   'recent',sample.checked_at>now()-interval '1 hour',
   'runtime_execution_verified',false,
   'autonomy_certified',false));
 end loop;
 return jsonb_build_object(
  'status',case when total_count=4 and verified_count=4 then 'HEALTH_ENDPOINTS_RESPOND'
                else 'DEGRADED_OR_NOT_CHECKED' end,
  'source','CEREBRO_LAB_DISPATCH_HEALTH_SIGNED_V1',
  'company_id','fenix','environment','LAB',
  'observed_at',now(),'signed_samples',total_count,
  'healthy_endpoints',verified_count,'sources',payload,
  'runner_capability','HTTP_HEALTH_ONLY',
  'github_actions_required_to_execute_original_workers',true,
  'full_engine_certified',false,'legacy_jobs_executed',false,
  'prod_execution_enabled',false);
end;
$fn$;
revoke all on function public.cerebro_lab_dispatch_health_observe_v1()
 from public,anon,authenticated;
grant execute on function public.cerebro_lab_dispatch_health_observe_v1()
 to service_role;
-- Rollback after signed ledger export: unschedule only new probe crons; drop new functions/tables.
