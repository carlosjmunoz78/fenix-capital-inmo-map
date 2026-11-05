-- CANDIDATE ONLY; NOT APPLIED. PREPROD exclusively; requires independent DBA review.
-- Grants are created only by an independently authenticated owner decision flow,
-- not by this migration. Empty grants => fail-closed.
begin;
-- Fail if already present; never revoke grants of an unrelated existing schema.
do $$ begin
 if exists(select 1 from pg_namespace where nspname='cerebro_pc001_private') then
  raise exception 'PC001_PRIVATE_SCHEMA_ALREADY_EXISTS_REVIEW_REQUIRED';end if;
end $$;
create schema cerebro_pc001_private;
revoke all on schema cerebro_pc001_private from PUBLIC, anon, authenticated;
grant usage on schema cerebro_pc001_private to service_role;
create table cerebro_pc001_private.pc001_owner_health_grants_v1 (
  grant_id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null,
  company_id text not null check (company_id='fenix'),
  device_id text not null check (device_id='78ca78cf158b3cda329cf39e0270f0a5'),
  environment text not null check (environment='PREPROD'),
  version text not null check (version='pc001-windows-v1'),
  capability text not null check (capability='SERVICE_HEALTH'),
  action text not null check (action='READ_HEALTH'),
  policy_id text not null check (policy_id='pc001-readonly-preprod-v1'),
  approval_mode text not null check (approval_mode in ('ONE_TIME','ALL_SIMILAR','EXCEPTION_ONLY')),
  state text not null default 'ACTIVE' check (state in ('ACTIVE','REVOKED','EXPIRED')),
  max_uses integer not null check (max_uses between 1 and 10000),
  decision_request_id uuid not null unique,
  used_count integer not null default 0 check (used_count>=0 and used_count<=max_uses),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  owner_decision_ref text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  check (approval_mode='ALL_SIMILAR' or max_uses=1)
);
alter table cerebro_pc001_private.pc001_owner_health_grants_v1 enable row level security;
revoke all on table cerebro_pc001_private.pc001_owner_health_grants_v1 from PUBLIC,anon,authenticated;
grant select,insert,update on cerebro_pc001_private.pc001_owner_health_grants_v1 to service_role;
create table cerebro_pc001_private.pc001_owner_health_issues_v1 (
 owner_auth_user_id uuid not null, request_id uuid not null,
 grant_id uuid not null references cerebro_pc001_private.pc001_owner_health_grants_v1(grant_id),
 command_id text not null unique,
 issued_at timestamptz not null default now(),
 primary key (owner_auth_user_id,request_id)
);
alter table cerebro_pc001_private.pc001_owner_health_issues_v1 enable row level security;
revoke all on table cerebro_pc001_private.pc001_owner_health_issues_v1 from PUBLIC,anon,authenticated;
grant select,insert on cerebro_pc001_private.pc001_owner_health_issues_v1 to service_role;
-- SECURITY INVOKER: the caller needs table privileges; never create an RLS-bypass DEFINER in public.
create function public.pc001_owner_health_enqueue_v1(
 p_owner_auth_id uuid,p_grant_id uuid,p_request_id uuid,p_row jsonb
) returns jsonb language plpgsql security invoker
set search_path = pg_catalog,public,cerebro_pc001_private as $$
declare g cerebro_pc001_private.pc001_owner_health_grants_v1%rowtype;
device public.cerebro_device_agents_preprod%rowtype;
old_cmd record;old_issue record;
v_id text;v_key text;v_hash text;v_payload jsonb;v_since timestamptz := now()-interval '10 minutes';
begin
  -- Single per-PC serialization across DIFFERENT request UUIDs.
  perform pg_advisory_xact_lock(hashtextextended('CEREBRO-PC001-FENIX-PREPROD-HEALTH-V1',0));
  if p_owner_auth_id is null or p_grant_id is null or p_request_id is null or p_row is null then
    return jsonb_build_object('ok',false,'code','INVALID_REQUEST');end if;
  select * into g from cerebro_pc001_private.pc001_owner_health_grants_v1
    where grant_id=p_grant_id and owner_auth_user_id=p_owner_auth_id for update;
  if not found or g.state<>'ACTIVE' or g.revoked_at is not null or g.expires_at<=now()
   or g.company_id<>'fenix'
   or g.device_id<>'78ca78cf158b3cda329cf39e0270f0a5'
   or g.environment<>'PREPROD' or g.version<>'pc001-windows-v1'
   or g.capability<>'SERVICE_HEALTH' or g.action<>'READ_HEALTH'
   or g.policy_id<>'pc001-readonly-preprod-v1' then
    return jsonb_build_object('ok',false,'code','GRANT_NOT_VALID');end if;
  v_id:=p_row->>'command_id';v_key:=p_row->>'idempotency_key';v_hash:=p_row->>'payload_sha256';v_payload:=p_row->'payload';
  if v_id is null or v_key is null or v_hash is null or length(v_hash)<>64
    or v_payload is null or jsonb_typeof(v_payload)<>'object'
    or (v_payload->>'issued_at') is null
    or (v_payload->>'expires_at') is null
    or (v_payload->'policy'->'allowed_company_ids') is distinct from '["fenix"]'::jsonb
    or (v_payload->'policy'->'allowed_venture_ids') is distinct from '["fenix"]'::jsonb
    or (v_payload->'policy'->'allowed_engine_ids') is distinct from '["PC-001"]'::jsonb
    or (v_payload->'policy'->'allowed_environments') is distinct from '["PREPROD"]'::jsonb
    or (v_payload->'policy'->'allowed_versions') is distinct from '["pc001-windows-v1"]'::jsonb
    or (v_payload->'policy'->'allowed_capabilities') is distinct from '["SERVICE_HEALTH"]'::jsonb
    or (v_payload->'policy'->'allowed_actions') is distinct from '["READ_HEALTH"]'::jsonb
    or p_row->>'company_id' is distinct from 'fenix' or p_row->>'environment' is distinct from 'PREPROD'
    or p_row->>'device_id' is distinct from '78ca78cf158b3cda329cf39e0270f0a5'
    or p_row->>'engine_id' is distinct from 'PC-001' or p_row->>'version' is distinct from 'pc001-windows-v1'
    or v_payload->>'schema_version' is distinct from '2.0.0'
    or v_payload->>'company_id' is distinct from 'fenix' or v_payload->>'device_id' is distinct from '78ca78cf158b3cda329cf39e0270f0a5'
    or v_payload->>'capability' is distinct from 'SERVICE_HEALTH' or v_payload->>'action' is distinct from 'READ_HEALTH'
    or v_payload->'policy'->>'policy_id' is distinct from 'pc001-readonly-preprod-v1'
    or (v_payload->'policy'->>'prod_allowed')::boolean is distinct from false
    or (v_payload->'policy'->>'trading_allowed')::boolean is distinct from false
    or (v_payload->'policy'->>'state_changing')::boolean is distinct from false
    or v_payload->>'idempotency_key' is distinct from v_key
    or (p_row->>'state') is distinct from 'QUEUED'
    or (v_payload->>'expires_at')::timestamptz<=now()
    or (v_payload->>'expires_at')::timestamptz>now()+interval '15 minutes'
    or (v_payload->>'issued_at')::timestamptz>now()+interval '10 seconds'
    or (v_payload->>'issued_at')::timestamptz<now()-interval '180 seconds'
    then return jsonb_build_object('ok',false,'code','ENVELOPE_SCOPE_DENIED');end if;
  select command_id,grant_id into old_issue from cerebro_pc001_private.pc001_owner_health_issues_v1
   where owner_auth_user_id=p_owner_auth_id and request_id=p_request_id;
  if found and (old_issue.command_id<>v_id or old_issue.grant_id<>p_grant_id) then
    return jsonb_build_object('ok',false,'code','OWNER_REQUEST_REPLAY_CONFLICT');end if;
  select command_id,state,payload_sha256 into old_cmd from public.cerebro_device_commands_preprod
   where device_id=g.device_id and company_id='fenix' and environment='PREPROD' and idempotency_key=v_key;
  if found then
    -- Retry reuses the originally stored immutable envelope. Recomputed issued_at/expiry may differ.
    if old_issue.command_id is distinct from v_id or old_cmd.command_id<>v_id then
     return jsonb_build_object('ok',false,'code','REPLAY_PAYLOAD_MISMATCH');end if;
    return jsonb_build_object('ok',true,'duplicate',true,'command_id',old_cmd.command_id,'state',old_cmd.state);
  end if;
  if g.used_count>=g.max_uses then return jsonb_build_object('ok',false,'code','GRANT_USAGE_EXHAUSTED');end if;
  select * into device from public.cerebro_device_agents_preprod where device_id=g.device_id for update;
  if not found or device.status<>'ONLINE' or device.revoked_at is not null
    or device.company_id<>'fenix' or device.environment<>'PREPROD'
    or device.version<>'pc001-windows-v1' or device.last_seen_at is null
    or device.last_seen_at<now()-interval '180 seconds'
    then return jsonb_build_object('ok',false,'code','DEVICE_OFFLINE');end if;
  if exists(select 1 from public.cerebro_device_commands_preprod
    where device_id=g.device_id and state in ('QUEUED','DELIVERED')) then
    return jsonb_build_object('ok',false,'code','QUEUE_BUSY');end if;
  if exists(select 1 from public.cerebro_device_commands_preprod
    where device_id=g.device_id and engine_id='PC-001' and created_at>v_since) then
    return jsonb_build_object('ok',false,'code','RATE_LIMIT');end if;
  insert into public.cerebro_device_commands_preprod
    (command_id,company_id,environment,device_id,engine_id,version,idempotency_key,payload,payload_sha256,state)
   values(v_id,'fenix','PREPROD',g.device_id,'PC-001','pc001-windows-v1',v_key,v_payload,v_hash,'QUEUED');
  insert into cerebro_pc001_private.pc001_owner_health_issues_v1
    (owner_auth_user_id,request_id,grant_id,command_id)
   values(p_owner_auth_id,p_request_id,p_grant_id,v_id);
  update cerebro_pc001_private.pc001_owner_health_grants_v1 set used_count=used_count+1,last_used_at=now()
    where grant_id=g.grant_id;
  return jsonb_build_object('ok',true,'duplicate',false,'command_id',v_id,'state','QUEUED');
end;$$;
revoke all on function public.pc001_owner_health_enqueue_v1(uuid,uuid,uuid,jsonb) from PUBLIC,anon,authenticated;
grant execute on function public.pc001_owner_health_enqueue_v1(uuid,uuid,uuid,jsonb) to service_role;

-- The only way to create or revoke a grant is a trusted Edge call with a freshly
-- verified owner auth session. These invoker functions are inaccessible to clients.
create function public.pc001_owner_health_authorize_v1(
 p_owner_auth_id uuid,p_decision_request_id uuid,p_mode text
) returns jsonb language plpgsql security invoker
set search_path = pg_catalog,public,cerebro_pc001_private as $$
declare existing record;v_id uuid := gen_random_uuid();v_max integer;v_expiry timestamptz;
begin
 if p_owner_auth_id is null or p_decision_request_id is null or p_mode is null
   or p_mode not in ('ONE_TIME','ALL_SIMILAR','EXCEPTION_ONLY') then
   return jsonb_build_object('ok',false,'code','INVALID_GRANT_REQUEST');end if;
 perform pg_advisory_xact_lock(hashtextextended('CEREBRO-PC001-FENIX-PREPROD-HEALTH-GRANT-V1-'||p_owner_auth_id::text,0));
 select grant_id,owner_auth_user_id,approval_mode,state into existing
  from cerebro_pc001_private.pc001_owner_health_grants_v1
  where decision_request_id=p_decision_request_id;
 if found then
   if existing.owner_auth_user_id<>p_owner_auth_id or existing.approval_mode<>p_mode then
     return jsonb_build_object('ok',false,'code','DECISION_REPLAY_CONFLICT');end if;
   return jsonb_build_object('ok',true,'duplicate',true,'grant_id',existing.grant_id,'mode',existing.approval_mode,'state',existing.state);
 end if;
 v_max:=case when p_mode='ALL_SIMILAR' then 10000 else 1 end;
 v_expiry:=now()+case when p_mode='ALL_SIMILAR' then interval '365 days' else interval '15 minutes' end;
 insert into cerebro_pc001_private.pc001_owner_health_grants_v1
 (grant_id,decision_request_id,owner_auth_user_id,company_id,device_id,environment,version,capability,action,policy_id,
  approval_mode,state,max_uses,used_count,expires_at,owner_decision_ref)
 values(v_id,p_decision_request_id,p_owner_auth_id,'fenix','78ca78cf158b3cda329cf39e0270f0a5',
 'PREPROD','pc001-windows-v1','SERVICE_HEALTH','READ_HEALTH','pc001-readonly-preprod-v1',
 p_mode,'ACTIVE',v_max,0,v_expiry,'authenticated-owner:'||p_decision_request_id::text);
 return jsonb_build_object('ok',true,'duplicate',false,'grant_id',v_id,'mode',p_mode,'state','ACTIVE','expires_at',v_expiry);
end;$$;
revoke all on function public.pc001_owner_health_authorize_v1(uuid,uuid,text) from PUBLIC,anon,authenticated;
grant execute on function public.pc001_owner_health_authorize_v1(uuid,uuid,text) to service_role;

create function public.pc001_owner_health_revoke_v1(
 p_owner_auth_id uuid,p_grant_id uuid
) returns jsonb language plpgsql security invoker
set search_path = pg_catalog,public,cerebro_pc001_private as $$
declare affected integer;
begin
 if p_owner_auth_id is null or p_grant_id is null then
  return jsonb_build_object('ok',false,'code','INVALID_REVOKE_REQUEST');end if;
 update cerebro_pc001_private.pc001_owner_health_grants_v1 set state='REVOKED',revoked_at=now()
  where owner_auth_user_id=p_owner_auth_id and grant_id=p_grant_id and state='ACTIVE';
 get diagnostics affected=row_count;
 return jsonb_build_object('ok',affected=1,'code',case when affected=1 then 'REVOKED' else 'NOT_ACTIVE_OR_NOT_OWNED' end,
  'future_issues_denied',true,'already_dispatched_command_unaffected',true);
end;$$;
revoke all on function public.pc001_owner_health_revoke_v1(uuid,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.pc001_owner_health_revoke_v1(uuid,uuid) to service_role;

commit;