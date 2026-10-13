-- CEREBRO channel access profiles V1
-- Additive fail-closed scope guard for Ana. Existing auth/RBAC and knowledge contracts remain authoritative.

create or replace function public.fenix_prod_ana_channel_scope_guard_v1(p_question text)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $function$
declare
  v_q text := lower(translate(btrim(coalesce(p_question,'')),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN'));
  v_scope text := 'FENIX_OPERATIONAL';
begin
  if v_q ~ '\m(trading|broker|exchange|orden de mercado|comprar acciones|vender acciones|crypto|criptomoneda|trading lab)\M' then
    v_scope := 'TRADING_ISOLATED';
  elsif v_q ~ '\m(password|contrasena|clave privada|api key|api-key|secret|secreto|access token|refresh token|token de acceso|credential|credencial|vault)\M' then
    v_scope := 'SECRETS_CREDENTIALS';
  elsif v_q ~ '(datos de otra empresa|otra compania|otra sociedad|cruzar empresas|cross company|cross-company|cross tenant|cross-tenant)' then
    v_scope := 'CROSS_COMPANY_PRIVATE';
  elsif v_q ~ '(multiempresa|multi empresa|company registry|tenant|tenants|alta de empresa|nueva empresa|otra empresa|cambiar de empresa|activar empresa|onboarding de empresa)' then
    v_scope := 'MULTICOMPANY_CONTROL';
  elsif v_q ~ '(owner only|owner-only|solo carlos|solo el propietario|admin global|administrador global|cuenta personal de carlos|datos privados de carlos|perfil privado de carlos)' then
    v_scope := 'OWNER_PRIVATE';
  end if;

  return jsonb_build_object(
    'allowed',v_scope='FENIX_OPERATIONAL',
    'access_profile','FENIX_OPERATIONAL',
    'requested_scope',v_scope,
    'reason',case when v_scope='FENIX_OPERATIONAL' then 'CHANNEL_PROFILE_SCOPE_ALLOWED' else 'CHANNEL_PROFILE_SCOPE_DENIED' end,
    'human_required',false,
    'prod_authority_changed',false,
    'prod_write_authorized',false,
    'trading_access',false
  );
end
$function$;

create or replace function public.fenix_prod_ana_knowledge_answer_server(p_actor_code text, p_question text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'fenix_prod', 'auth', 'pg_temp'
as $function$
declare
  v_auth_user_id uuid;
  v_response jsonb;
  v_scope jsonb;
begin
  select auth_user_id into v_auth_user_id
  from fenix_prod.actors
  where actor_code=p_actor_code and active=true
  limit 1;
  if v_auth_user_id is null then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;

  v_scope := public.fenix_prod_ana_channel_scope_guard_v1(p_question);
  if coalesce((v_scope->>'allowed')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,
      'status',403,
      'found',false,
      'error','channel_scope_denied',
      'reason',v_scope->>'reason',
      'access_profile',v_scope->>'access_profile',
      'requested_scope',v_scope->>'requested_scope',
      'human_required',false,
      'prod_authority_changed',false,
      'prod_write_authorized',false,
      'trading_access',false
    );
  end if;

  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  v_response := public.fenix_prod_ana_knowledge_answer_user(p_question);
  return public.fenix_prod_apply_conversation_overlay_v1('APP_ANA_TEXT',p_question,v_response);
end
$function$;
