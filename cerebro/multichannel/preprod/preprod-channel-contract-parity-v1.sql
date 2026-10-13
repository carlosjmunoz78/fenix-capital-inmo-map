-- CEREBRO PREPROD multichannel contract parity V1
-- Isolated contract harness: reproduces PR #605 conversational overlay plus #616
-- FULL_OWNER/FENIX_OPERATIONAL scope semantics without PROD schemas, data or authority.
-- It is intentionally additive and operates only on synthetic/provided jsonb responses.

create or replace function public.preprod_test_channel_access_decision_v1(
  p_channel_id text,
  p_question text
) returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $function$
declare
  v_channel text := upper(btrim(coalesce(p_channel_id,'')));
  v_q text := lower(translate(btrim(coalesce(p_question,'')),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN'));
  v_profile text;
  v_scope text := 'FENIX_OPERATIONAL';
  v_allowed boolean;
begin
  if v_channel in ('CONSOLE_TEXT','CONSOLE_VOICE','TELEGRAM_TEXT','TELEGRAM_VOICE') then
    v_profile := 'FULL_OWNER';
  elsif v_channel in ('APP_ANA_TEXT','APP_ANA_VOICE') then
    v_profile := 'FENIX_OPERATIONAL';
  else
    return jsonb_build_object(
      'allowed',false,
      'status','UNSUPPORTED_CHANNEL',
      'channel_id',v_channel,
      'human_required',false,
      'prod_authority_changed',false,
      'prod_write_authorized',false,
      'trading_access',false
    );
  end if;

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

  v_allowed := v_profile='FULL_OWNER' or v_scope='FENIX_OPERATIONAL';

  return jsonb_build_object(
    'allowed',v_allowed,
    'status',case when v_allowed then 'ALLOWED' else 'FORBIDDEN_SCOPE' end,
    'reason',case when v_allowed then 'CHANNEL_PROFILE_SCOPE_ALLOWED' else 'CHANNEL_PROFILE_SCOPE_DENIED' end,
    'channel_id',v_channel,
    'access_profile',v_profile,
    'requested_scope',v_scope,
    'human_required',false,
    'authority_expanded',false,
    'prod_authority_changed',false,
    'prod_write_authorized',false,
    'secrets_disclosure_authorized',false,
    'cross_company_data_authorized',false,
    'trading_bridge_authorized',false,
    'trading_access',false,
    'additional_cost_eur',0
  );
end
$function$;

create or replace function public.preprod_test_apply_conversation_overlay_v1(
  p_channel_id text,
  p_question text,
  p_response jsonb
) returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $function$
declare
  v_q text := lower(translate(btrim(coalesce(p_question,'')),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN'));
  v_answer text := btrim(coalesce(p_response->>'answer',''));
  v_prefix text := '';
  v_followup text := '';
  v_reason text := 'NO_CHANGE';
  v_out jsonb := coalesce(p_response,'{}'::jsonb);
begin
  if coalesce((p_response->>'ok')::boolean,false) is not true
     or coalesce((p_response->>'status')::integer,0) <> 200
     or coalesce((p_response->>'found')::boolean,false) is not true
     or v_answer = '' then
    return v_out;
  end if;

  if v_q ~ '(mala experiencia|salio mal|desconfio|no me fio|antes me fue mal)' then
    v_prefix := 'Entiendo que quieras ir con más cuidado después de esa experiencia.';
    v_followup := '¿Qué fue exactamente lo que salió mal y qué quieres evitar ahora?';
    v_reason := 'OBSERVABLE_CONCERN';
  elsif v_q ~ '(perdido|no entiendo|no me cuadra|sigo dudando|no tengo claro)' then
    v_prefix := 'Veo que esto todavía no te ha quedado claro.';
    v_followup := '¿Qué parte necesitas cerrar primero: el criterio, el dato que falta o el siguiente paso?';
    v_reason := 'OBSERVABLE_CONCERN';
  elsif v_q ~ '(no responde|no me estas resolviendo|dando vueltas|eso suena general|no me convence)' then
    v_prefix := 'Tienes razón en pedir algo más concreto.';
    v_followup := '¿Qué necesitas que concrete ahora: un dato, el criterio o el siguiente paso?';
    v_reason := 'OBSERVABLE_CONCERN';
  elsif v_q ~ '(voy con prisa|vamos al grano|al grano|respuesta mas concreta)' then
    v_prefix := 'Voy al punto.';
    v_followup := '¿Necesitas el siguiente paso, el dato que falta o una decisión entre opciones?';
    v_reason := 'OBSERVABLE_CONCERN';
  elsif v_q ~ '(otra financiacion|otro prestamo|cuota mensual|deuda)' then
    v_prefix := 'Ese dato puede cambiar el análisis y conviene incorporarlo.';
    v_followup := '¿Cuál es la cuota mensual aproximada y queda alguna otra financiación relevante?';
    v_reason := 'OBSERVABLE_CONCERN';
  end if;

  if v_reason = 'NO_CHANGE' then
    return v_out;
  end if;

  if position('?' in v_answer) > 0 then v_followup := ''; end if;

  v_out := jsonb_set(v_out,'{answer}',to_jsonb(concat_ws(E'\n\n',nullif(v_prefix,''),v_answer,nullif(v_followup,''))),true);
  v_out := v_out || jsonb_build_object(
    'human_intelligence',jsonb_build_object(
      'version','V1',
      'policy_version','1.0.0',
      'mode','CONSERVATIVE_OVERLAY',
      'channel_id',p_channel_id,
      'owner','CHAT-001',
      'reason',v_reason,
      'authoritative_answer',v_answer,
      'authoritative_preserved',true,
      'questions_added',case when v_followup='' then 0 else 1 end,
      'prod_authority_changed',false
    )
  );
  return v_out;
end
$function$;

create or replace function public.preprod_test_multichannel_contract_v1(
  p_channel_id text,
  p_question text,
  p_response jsonb
) returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $function$
declare
  v_access jsonb;
  v_out jsonb;
begin
  v_access := public.preprod_test_channel_access_decision_v1(p_channel_id,p_question);

  if coalesce((v_access->>'allowed')::boolean,false) is not true then
    return jsonb_build_object(
      'ok',false,
      'status',403,
      'found',false,
      'error',case when v_access->>'status'='UNSUPPORTED_CHANNEL' then 'unsupported_channel' else 'channel_scope_denied' end,
      'reason',v_access->>'reason',
      'channel_id',v_access->>'channel_id',
      'access_profile',v_access->>'access_profile',
      'requested_scope',v_access->>'requested_scope',
      'human_required',false,
      'prod_authority_changed',false,
      'prod_write_authorized',false,
      'trading_access',false,
      'additional_cost_eur',0
    );
  end if;

  v_out := public.preprod_test_apply_conversation_overlay_v1(p_channel_id,p_question,p_response);
  return v_out || jsonb_build_object(
    'preprod_contract',jsonb_build_object(
      'version','1.0.0',
      'access_profile',v_access->>'access_profile',
      'requested_scope',v_access->>'requested_scope',
      'authority_expanded',false,
      'prod_write_authorized',false,
      'trading_access',false,
      'additional_cost_eur',0
    )
  );
end
$function$;
