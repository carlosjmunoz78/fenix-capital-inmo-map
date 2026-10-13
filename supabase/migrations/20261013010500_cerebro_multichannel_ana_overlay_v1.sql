-- CEREBRO multichannel conversation unification V1
-- Additive helper + wrapper-only change. Existing auth, knowledge lookup and response fields are preserved.
create or replace function public.fenix_prod_apply_conversation_overlay_v1(
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
  -- Fail closed: only passive successful knowledge answers may receive conversational presentation.
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

  -- Never add a second question when the authoritative answer already contains one.
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

create or replace function public.fenix_prod_ana_knowledge_answer_server(p_actor_code text, p_question text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'fenix_prod', 'auth', 'pg_temp'
as $function$
declare
  v_auth_user_id uuid;
  v_response jsonb;
begin
  select auth_user_id into v_auth_user_id
  from fenix_prod.actors
  where actor_code=p_actor_code and active=true
  limit 1;
  if v_auth_user_id is null then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  v_response := public.fenix_prod_ana_knowledge_answer_user(p_question);
  return public.fenix_prod_apply_conversation_overlay_v1('APP_ANA_TEXT',p_question,v_response);
end
$function$;
