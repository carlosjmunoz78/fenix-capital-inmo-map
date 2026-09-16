-- CEREBRO OS · repair chat send V2 server wrapper
-- Root cause: legacy fenix_prod_chat_send_v2_user uses ON CONFLICT(idempotency_key)
-- but the live unique key is (sender_actor_code,idempotency_key).
-- This patch changes only the server-only wrapper; the legacy user RPC is preserved unchanged.

begin;

create or replace function public.fenix_prod_chat_send_v2_server(
  p_actor_code text,
  p_conversation_code text,
  p_body text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, fenix_prod, pg_temp
as $$
declare
  code text;
  clean text:=btrim(coalesce(p_body,''));
  idem text:=left(coalesce(nullif(btrim(p_idempotency_key),''),gen_random_uuid()::text),200);
begin
  if not exists(select 1 from fenix_prod.actors where actor_code=p_actor_code and active=true) then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  if not exists(select 1 from fenix_prod.chat_conversation_members where conversation_code=p_conversation_code and actor_code=p_actor_code) then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;
  if clean='' or length(clean)>5000 then
    return jsonb_build_object('ok',false,'status',400,'error','invalid_body');
  end if;

  insert into fenix_prod.chat_messages(channel_code,conversation_code,sender_actor_code,body,idempotency_key)
  values('CHAT',p_conversation_code,p_actor_code,clean,idem)
  on conflict(sender_actor_code,idempotency_key)
  do update set idempotency_key=excluded.idempotency_key
  returning message_code into code;

  update fenix_prod.chat_conversations set updated_at=now() where conversation_code=p_conversation_code;

  return jsonb_build_object('ok',true,'status',201,'item',jsonb_build_object(
    'message_code',code,'sender_actor_code',p_actor_code,'body',clean,'created_at',now()));
end $$;

revoke all on function public.fenix_prod_chat_send_v2_server(text,text,text,text) from public, anon, authenticated;
grant execute on function public.fenix_prod_chat_send_v2_server(text,text,text,text) to service_role;

commit;
