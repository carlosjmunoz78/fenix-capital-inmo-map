-- Preserve the historical EQUIPO channel while exposing it through the persistent V2 conversation engine.
-- Additive/non-destructive: no messages are deleted or rewritten beyond assigning conversation_code to legacy rows.

DO $$
DECLARE
  v_creator text;
BEGIN
  SELECT actor_code INTO v_creator
  FROM fenix_prod.actors
  WHERE active
  ORDER BY CASE WHEN actor_code='CARLOS-ADMIN' THEN 0 ELSE 1 END, actor_code
  LIMIT 1;

  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'chat_history_persistence: no active actor available';
  END IF;

  INSERT INTO fenix_prod.chat_conversations(
    conversation_code, kind, title, created_by_actor_code, created_at, updated_at
  )
  VALUES(
    'CONV-EQUIPO-FENIX', 'group', 'Equipo Fénix', v_creator,
    COALESCE((SELECT min(created_at) FROM fenix_prod.chat_messages WHERE channel_code='EQUIPO'), now()),
    COALESCE((SELECT max(created_at) FROM fenix_prod.chat_messages WHERE channel_code='EQUIPO'), now())
  )
  ON CONFLICT (conversation_code) DO UPDATE
  SET title=EXCLUDED.title,
      updated_at=GREATEST(fenix_prod.chat_conversations.updated_at, EXCLUDED.updated_at);

  INSERT INTO fenix_prod.chat_conversation_members(conversation_code, actor_code)
  SELECT 'CONV-EQUIPO-FENIX', actor_code
  FROM fenix_prod.actors
  WHERE active
  ON CONFLICT DO NOTHING;

  UPDATE fenix_prod.chat_messages
  SET conversation_code='CONV-EQUIPO-FENIX'
  WHERE channel_code='EQUIPO'
    AND conversation_code IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.fenix_prod_chat_send_server(
  p_actor_code text,
  p_body text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'fenix_prod', 'pg_temp'
AS $function$
DECLARE
  v_body text := btrim(coalesce(p_body,''));
  v_key text := btrim(coalesce(p_idempotency_key,''));
  v_msg fenix_prod.chat_messages%rowtype;
  v_actor fenix_prod.actors%rowtype;
BEGIN
  SELECT * INTO v_actor
  FROM fenix_prod.actors
  WHERE actor_code=p_actor_code AND active=true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'status',403,'error','forbidden');
  END IF;

  IF char_length(v_body) < 1 OR char_length(v_body) > 4000 THEN
    RETURN jsonb_build_object('ok',false,'status',400,'error','invalid_message');
  END IF;
  IF char_length(v_key) < 8 OR char_length(v_key) > 200 THEN
    RETURN jsonb_build_object('ok',false,'status',400,'error','invalid_idempotency_key');
  END IF;

  INSERT INTO fenix_prod.chat_conversation_members(conversation_code,actor_code)
  VALUES('CONV-EQUIPO-FENIX',p_actor_code)
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_msg
  FROM fenix_prod.chat_messages
  WHERE sender_actor_code=p_actor_code AND idempotency_key=v_key
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO fenix_prod.chat_messages(
      sender_actor_code,body,idempotency_key,channel_code,conversation_code
    )
    VALUES(
      p_actor_code,v_body,v_key,'EQUIPO','CONV-EQUIPO-FENIX'
    )
    RETURNING * INTO v_msg;
  END IF;

  UPDATE fenix_prod.chat_conversations
  SET updated_at=GREATEST(updated_at,v_msg.created_at)
  WHERE conversation_code='CONV-EQUIPO-FENIX';

  RETURN jsonb_build_object(
    'ok',true,'status',200,'item',jsonb_build_object(
      'message_code',v_msg.message_code,
      'sender_actor_code',v_msg.sender_actor_code,
      'sender_name',coalesce(v_actor.display_name,v_actor.actor_code),
      'sender_role',v_actor.role,
      'body',v_msg.body,
      'created_at',v_msg.created_at
    )
  );
END;
$function$;

-- Rollback contract (manual, only if this migration must be reversed):
-- 1) restore the previous fenix_prod_chat_send_server function from the deployment snapshot;
-- 2) UPDATE fenix_prod.chat_messages SET conversation_code=NULL
--    WHERE conversation_code='CONV-EQUIPO-FENIX' AND channel_code='EQUIPO';
-- 3) DELETE FROM fenix_prod.chat_conversation_members WHERE conversation_code='CONV-EQUIPO-FENIX';
-- 4) DELETE FROM fenix_prod.chat_conversations WHERE conversation_code='CONV-EQUIPO-FENIX';
