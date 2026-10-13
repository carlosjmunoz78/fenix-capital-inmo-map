-- Exact rollback for CEREBRO channel access profiles V1.
-- Restores the Ana server wrapper from PR #605 and removes only the new scope guard.

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

drop function if exists public.fenix_prod_ana_channel_scope_guard_v1(text);
