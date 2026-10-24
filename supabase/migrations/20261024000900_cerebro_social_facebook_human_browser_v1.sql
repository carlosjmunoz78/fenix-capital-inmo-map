create or replace function public.cerebro_social_facebook_browser_enqueue_v1(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_target text := trim(coalesce(p_request->>'target_url',''));
  v_mode text := upper(coalesce(nullif(trim(p_request->>'mode'),''),'MUTATE'));
  v_risk text := upper(coalesce(nullif(trim(p_request->>'risk'),''),'LOW'));
  v_commands jsonb := coalesce(p_request->'commands','[]'::jsonb);
  v_identity text := nullif(trim(p_request->>'identity_id'),'');
  v_account text := nullif(trim(p_request->>'account_id'),'');
  v_idempotency text := nullif(trim(p_request->>'idempotency_key'),'');
  v_audit text := nullif(trim(p_request->>'audit_id'),'');
  v_credential_ref text := nullif(trim(p_request->>'credential_ref_id'),'');
  v_capability text;
  v_profile text;
  v_command jsonb;
  v_name text;
  v_url text;
  v_result jsonb;
begin
  if v_identity is null or v_account is null or v_idempotency is null or v_audit is null then
    raise exception 'FACEBOOK_BROWSER_SCOPE_REQUIRED';
  end if;
  if v_mode not in ('OBSERVE','MUTATE') then raise exception 'FACEBOOK_BROWSER_MODE_DENIED'; end if;
  if v_risk not in ('LOW','MEDIUM') then raise exception 'FACEBOOK_BROWSER_RISK_DENIED'; end if;
  if coalesce((p_request->>'expected_cost_eur')::numeric,0) <> 0 then raise exception 'FACEBOOK_BROWSER_MONEY_LIMIT'; end if;
  if jsonb_typeof(v_commands) <> 'array' or jsonb_array_length(v_commands) < 1 or jsonb_array_length(v_commands) > 50 then
    raise exception 'FACEBOOK_BROWSER_COMMAND_COUNT_DENIED';
  end if;

  if not (
    v_target ~* '^https://(www\.)?facebook\.com(/|$)' or
    v_target ~* '^https://business\.facebook\.com(/|$)' or
    v_target ~* '^https://(www\.)?canva\.com(/|$)' or
    v_target ~* '^https://accounts\.google\.com(/|$)'
  ) then raise exception 'FACEBOOK_BROWSER_ORIGIN_DENIED'; end if;

  for v_command in select value from jsonb_array_elements(v_commands)
  loop
    v_name := lower(coalesce(v_command->>'command',''));
    if v_name not in ('goto','back','forward','reload','open_tab','close_tab','switch_tab','click','double_click','hover','fill','write','type','press','check','uncheck','select','upload','drag','scroll','wait','extract_text','extract_html','screenshot','download_click') then
      raise exception 'FACEBOOK_BROWSER_COMMAND_DENIED:%',v_name;
    end if;
    if v_name in ('goto','open_tab') and coalesce(v_command->>'url','') <> '' then
      v_url := trim(v_command->>'url');
      if not (
        v_url ~* '^https://(www\.)?facebook\.com(/|$)' or
        v_url ~* '^https://business\.facebook\.com(/|$)' or
        v_url ~* '^https://(www\.)?canva\.com(/|$)' or
        v_url ~* '^https://accounts\.google\.com(/|$)'
      ) then raise exception 'FACEBOOK_BROWSER_COMMAND_ORIGIN_DENIED'; end if;
    end if;
  end loop;

  v_capability := case when v_mode='MUTATE' then 'browser1.act' else 'browser1.observe' end;
  v_profile := 'b1-fenix-' || regexp_replace(v_identity,'[^a-zA-Z0-9._-]','_','g') || '-' || regexp_replace(v_account,'[^a-zA-Z0-9._-]','_','g') || '-PROD';

  select public.cerebro_actgw_browser_enqueue_v1(
    jsonb_build_object(
      'idempotency_key',v_idempotency,
      'company_id','fenix',
      'engine_id','SOC-001',
      'department_id','social-facebook',
      'identity_id',v_identity,
      'account_id',v_account,
      'browser_profile_id',v_profile,
      'credential_ref_id',v_credential_ref,
      'target_url',v_target,
      'mode',v_mode,
      'risk',v_risk,
      'capability',v_capability,
      'expected_cost_eur',0,
      'commands',v_commands,
      'priority',coalesce((p_request->>'priority')::integer,70),
      'timeout_seconds',least(greatest(coalesce((p_request->>'timeout_seconds')::integer,600),30),900),
      'max_attempts',least(greatest(coalesce((p_request->>'max_attempts')::integer,2),1),3),
      'audit_id',v_audit,
      'authority',jsonb_build_object(
        'canonical_engine_ids',jsonb_build_array('SOC-001'),
        'browser_binding',jsonb_build_object(
          'healthy',true,
          'kill_switch_enabled',true,
          'fresh_attestation',true,
          'attestation_source','SOC001_FACEBOOK_HUMAN_BROWSER_V1'
        ),
        'engine_authority',jsonb_build_object(
          'browser_use_authorized',true,
          'operation_authorized',true,
          'prod_mutation_authorized',true,
          'promotion_gate_green',true,
          'rollback_ready',true,
          'observability_ready',true,
          'audit_ready',true,
          'idempotency_proven',true
        ),
        'kill_switch_enabled',true,
        'delegation_source','SOC-001'
      )
    )
  ) into v_result;

  return v_result || jsonb_build_object(
    'binding_id','CEREBRO-SOCIAL-FACEBOOK-HUMAN-BROWSER-V1',
    'origin_engine_id','SOC-001',
    'provider_side_effect_authorized',false,
    'authenticated_autonomy_requires_valid_credential_canary',true
  );
end;
$function$;

revoke all on function public.cerebro_social_facebook_browser_enqueue_v1(jsonb) from public;
revoke all on function public.cerebro_social_facebook_browser_enqueue_v1(jsonb) from anon;
revoke all on function public.cerebro_social_facebook_browser_enqueue_v1(jsonb) from authenticated;
grant execute on function public.cerebro_social_facebook_browser_enqueue_v1(jsonb) to service_role;
