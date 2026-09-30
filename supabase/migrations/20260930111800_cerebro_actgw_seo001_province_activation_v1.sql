-- CEREBRO ACTGW -> SEO-001 PREPROD province activation V1
-- Additive only. No PROD writes. Idempotent action registration.

create table if not exists public.cerebro_action_requests_preprod (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null,
  environment text not null,
  version text not null default 'v1',
  action_type text not null,
  proposal_hash text not null,
  requested_by text not null,
  scope jsonb not null default '{}'::jsonb,
  state text not null default 'RECEIVED',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cerebro_action_requests_preprod_identity_chk
    check (company_id='FENIX_CAPITAL' and engine_id='SEO-001' and environment='PREPROD'),
  constraint cerebro_action_requests_preprod_proposal_hash_chk
    check (proposal_hash ~ '^[0-9a-f]{64}$')
);

create unique index if not exists cerebro_action_requests_preprod_proposal_uq
  on public.cerebro_action_requests_preprod(company_id,engine_id,environment,proposal_hash);

create or replace function public.seo001_register_province_activation_preprod(
  p_company_id text,
  p_engine_id text,
  p_environment text,
  p_province text,
  p_capital text,
  p_coverage text,
  p_proposal_hash text,
  p_requested_by text,
  p_municipalities jsonb
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  req public.cerebro_action_requests_preprod%rowtype;
  item jsonb;
  muni text;
  code text;
  slug text;
  wave_no int;
  priority_no int;
  seq int;
  territory_count int:=0;
  job_count int:=0;
  capital_run_created boolean:=false;
  v_job_type text;
begin
  if p_company_id<>'FENIX_CAPITAL' or p_engine_id<>'SEO-001' or p_environment<>'PREPROD' then
    return jsonb_build_object('ok',false,'error','identity_not_allowed');
  end if;
  if p_coverage not in ('capital_only','capital_and_province') then
    return jsonb_build_object('ok',false,'error','coverage_not_allowed');
  end if;
  if coalesce(trim(p_province),'')='' or coalesce(trim(p_capital),'')='' then
    return jsonb_build_object('ok',false,'error','province_and_capital_required');
  end if;
  if p_proposal_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid_proposal_hash');
  end if;
  if jsonb_typeof(p_municipalities)<>'array' or jsonb_array_length(p_municipalities)<1 then
    return jsonb_build_object('ok',false,'error','municipality_list_required');
  end if;

  select * into req
  from public.cerebro_action_requests_preprod
  where company_id=p_company_id and engine_id=p_engine_id and environment=p_environment
    and proposal_hash=p_proposal_hash
  limit 1;

  if req.id is not null then
    return jsonb_build_object('ok',true,'reused',true,'request_id',req.id,'state',req.state,'result',req.result);
  end if;

  insert into public.cerebro_action_requests_preprod(
    company_id,engine_id,environment,version,action_type,proposal_hash,requested_by,scope,state
  ) values (
    p_company_id,p_engine_id,p_environment,'v1','SEO_ZONE_ACTIVATION',p_proposal_hash,p_requested_by,
    jsonb_build_object('province',p_province,'capital',p_capital,'coverage',p_coverage),
    'REGISTERING'
  ) returning * into req;

  for item in select value from jsonb_array_elements(p_municipalities)
  loop
    muni:=trim(coalesce(item->>'name',''));
    code:=trim(coalesce(item->>'code',''));
    if muni='' then continue; end if;
    if p_coverage='capital_only' and lower(muni)<>lower(p_capital) then continue; end if;

    slug:=lower(translate(muni,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'));
    slug:=regexp_replace(slug,'[^a-z0-9]+','-','g');
    slug:=trim(both '-' from slug);
    wave_no:=case when lower(muni)=lower(p_capital) then 1 else 3 end;
    priority_no:=case when wave_no=1 then 10 else 30 end;

    insert into public.seo_cerebro_territories_preprod(
      company_id,engine_id,environment,engine_version,province,municipality,wave,
      primary_keyword,secondary_keyword,b2b_keyword,planned_url,
      structural_family,differentiation_seed,existing_url_state,local_research_state,status,
      image_manifest,keyword_evidence,cannibalization_evidence,updated_at
    ) values (
      p_company_id,p_engine_id,p_environment,'0.4.1',p_province,muni,wave_no,
      'asesor hipotecario en '||muni,'financiera en '||muni,'financiación para inmobiliarias en '||muni,
      'https://fenixcapital.es/asesor-hipotecario-'||slug||'/',
      'PENDING_RESEARCH','PENDING_RESEARCH','POR_AUDITAR','RESEARCH_REQUIRED','PLANNED',
      '{}'::jsonb,
      jsonb_build_object('source','INE_API_2026','official_municipality_code',nullif(code,''),'discovered_at',now(),
        'interpretation','Territory registration only; keyword demand still requires research.'),
      '{}'::jsonb,now()
    )
    on conflict(company_id,engine_id,environment,province,municipality) do nothing;
    if found then territory_count:=territory_count+1; end if;

    foreach v_job_type in array array[
      'AUDIT_EXISTING_URL','KEYWORD_RESEARCH','LOCAL_CONTEXT_RESEARCH','ANTI_CANNIBALIZATION',
      'DRAFT_LOCAL_LANDING','IMAGE_MANIFEST','B2B_REAL_ESTATE_PLAN','QA_PREPUBLISH'
    ]
    loop
      insert into public.seo_cerebro_expansion_jobs_preprod(
        company_id,engine_id,environment,province,municipality,job_type,priority,status,payload,result,updated_at
      ) values (
        p_company_id,p_engine_id,p_environment,p_province,muni,v_job_type,priority_no,'QUEUED',
        jsonb_build_object('source_action_request_id',req.id,'proposal_hash',p_proposal_hash,'coverage',p_coverage,
          'official_municipality_code',nullif(code,'')),
        '{}'::jsonb,now()
      )
      on conflict(company_id,engine_id,environment,province,municipality,job_type) do nothing;
      if found then job_count:=job_count+1; end if;
    end loop;
  end loop;

  if not exists (
    select 1 from public.seo_cerebro_territories_preprod
    where company_id=p_company_id and engine_id=p_engine_id and environment=p_environment
      and province=p_province and lower(municipality)=lower(p_capital)
  ) then
    update public.cerebro_action_requests_preprod
      set state='FAILED_CAPITAL_NOT_REGISTERED',result=jsonb_build_object('error','capital_not_in_municipality_source'),updated_at=now()
    where id=req.id;
    return jsonb_build_object('ok',false,'error','capital_not_in_municipality_source','request_id',req.id);
  end if;

  if not exists (
    select 1 from public.seo_cerebro_city_runs_preprod
    where company_id=p_company_id and engine_id=p_engine_id and environment=p_environment
      and province=p_province and lower(municipality)=lower(p_capital)
  ) then
    select coalesce(max(sequence_no),0)+1 into seq
    from public.seo_cerebro_city_runs_preprod
    where company_id=p_company_id and engine_id=p_engine_id and environment=p_environment;

    insert into public.seo_cerebro_city_runs_preprod(
      company_id,engine_id,environment,province,municipality,run_role,sequence_no,state,
      auto_execute,supervisor_required,supervisor_state,learned_policy_version,blockers,evidence,
      overall_state,city_complete,completion_contract_version,completion_gates,updated_at
    ) values (
      p_company_id,p_engine_id,p_environment,p_province,p_capital,'NORMAL',seq,'QUEUED',
      true,false,'NOT_REQUIRED',1,'[]'::jsonb,
      jsonb_build_object('source_action_request_id',req.id,'proposal_hash',p_proposal_hash,'coverage',p_coverage),
      'GROWTH_STACK_PENDING',false,'CITY_GROWTH_STACK_V2','{}'::jsonb,now()
    );
    capital_run_created:=true;
  end if;

  insert into public.seo_cerebro_city_growth_stack_preprod(
    company_id,engine_id,environment,province,municipality,evidence,blockers,updated_at
  ) values (
    p_company_id,p_engine_id,p_environment,p_province,p_capital,
    jsonb_build_object('source_action_request_id',req.id,'proposal_hash',p_proposal_hash),'[]'::jsonb,now()
  )
  on conflict(company_id,engine_id,environment,province,municipality) do nothing;

  update public.cerebro_action_requests_preprod
  set state='REGISTERED_PREPROD',
      result=jsonb_build_object('territories_inserted',territory_count,'expansion_jobs_inserted',job_count,
        'capital_run_created',capital_run_created,'capital',p_capital,'province',p_province,'coverage',p_coverage,
        'next','SEO-001 existing PREPROD workers and gates'),
      updated_at=now()
  where id=req.id
  returning * into req;

  return jsonb_build_object('ok',true,'reused',false,'request_id',req.id,'state',req.state,'result',req.result);
end;
$$;

revoke all on function public.seo001_register_province_activation_preprod(
  text,text,text,text,text,text,text,text,jsonb
) from public, anon, authenticated;

grant execute on function public.seo001_register_province_activation_preprod(
  text,text,text,text,text,text,text,text,jsonb
) to service_role;
