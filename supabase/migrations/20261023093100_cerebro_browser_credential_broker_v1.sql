create table if not exists public.cerebro_credential_lease_audit_v1 (
  audit_row_id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  credential_ref_id text not null,
  company_id text not null,
  environment text not null,
  capability text not null,
  origin text not null,
  worker_id text not null,
  materialized_at timestamptz not null default now(),
  secret_material_logged boolean not null default false
);
alter table public.cerebro_credential_lease_audit_v1 enable row level security;
revoke all on public.cerebro_credential_lease_audit_v1 from anon, authenticated;
grant select, insert on public.cerebro_credential_lease_audit_v1 to service_role;

create or replace function public.cerebro_browser_credential_materialize_v1(p_job_id uuid,p_lease_id uuid,p_worker_id text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_job public.cerebro_browser_job_v1%rowtype;
  v_binding public.cerebro_credential_binding_v1%rowtype;
  v_origin text;
  v_capability text;
  v_secret_text text;
  v_payload jsonb;
begin
  select * into v_job from public.cerebro_browser_job_v1
  where job_id=p_job_id and lease_id=p_lease_id and leased_by=p_worker_id and status='LEASED' and lease_expires_at>now();
  if v_job.job_id is null then return jsonb_build_object('ok',false,'error','LEASE_NOT_ACTIVE'); end if;
  if v_job.credential_ref_id is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_REF_NOT_REQUESTED'); end if;

  select * into v_binding from public.cerebro_credential_binding_v1 where credential_ref_id=v_job.credential_ref_id and active=true;
  if v_binding.credential_ref_id is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_BINDING_NOT_FOUND'); end if;
  if v_binding.company_id<>v_job.company_id then return jsonb_build_object('ok',false,'error','CROSS_COMPANY_CREDENTIAL_DENIED'); end if;
  if not (v_job.environment=any(v_binding.allowed_environments)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_ENVIRONMENT_DENIED'); end if;

  v_origin:=lower(substring(v_job.target_url from '^https?://[^/]+'));
  if v_origin is null then return jsonb_build_object('ok',false,'error','CREDENTIAL_TARGET_ORIGIN_INVALID'); end if;
  if cardinality(v_binding.allowed_origins)>0 and not exists(select 1 from unnest(v_binding.allowed_origins) x where lower(x)=v_origin) then return jsonb_build_object('ok',false,'error','CREDENTIAL_ORIGIN_DENIED'); end if;
  v_capability:=case when v_job.mode='MUTATE' then 'browser1.act' else 'browser1.observe' end;
  if cardinality(v_binding.allowed_capabilities)>0 and not (v_capability=any(v_binding.allowed_capabilities)) then return jsonb_build_object('ok',false,'error','CREDENTIAL_CAPABILITY_DENIED'); end if;

  select decrypted_secret into v_secret_text from vault.decrypted_secrets where name=v_binding.vault_secret_name limit 1;
  if v_secret_text is null then return jsonb_build_object('ok',false,'error','VAULT_SECRET_NOT_AVAILABLE'); end if;
  begin v_payload:=v_secret_text::jsonb;
  exception when others then return jsonb_build_object('ok',false,'error','VAULT_SECRET_PAYLOAD_INVALID'); end;

  insert into public.cerebro_credential_lease_audit_v1(job_id,credential_ref_id,company_id,environment,capability,origin,worker_id,secret_material_logged)
  values(v_job.job_id,v_binding.credential_ref_id,v_job.company_id,v_job.environment,v_capability,v_origin,p_worker_id,false);

  return jsonb_build_object('ok',true,'credential_ref_id',v_binding.credential_ref_id,'identity_id',v_binding.identity_id,'account_id',v_binding.account_id,'provider',v_binding.provider,'secret_payload',v_payload,'secret_material_logged',false);
end;
$$;

revoke all on function public.cerebro_browser_credential_materialize_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.cerebro_browser_credential_materialize_v1(uuid,uuid,text) to service_role;