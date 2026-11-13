CREATE OR REPLACE FUNCTION public.seo001_probe_wp_bridge_preprod()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
declare
  req bigint;
  rid uuid:=gen_random_uuid();
  target text:='https://staging.fenixcapital.es/wp-json/fenix-guard/v1/cerebro/status';
begin
  select net.http_get(
    url:=target,
    headers:=jsonb_build_object('Accept','application/json'),
    timeout_milliseconds:=15000
  ) into req;

  insert into public.seo_cerebro_wp_bridge_health_preprod(
    id,target_url,request_id,state,detail
  ) values (
    rid,target,req,'DISPATCHED',
    jsonb_build_object(
      'probe_kind','CORE_GUARD_CEREBRO_STATUS',
      'plugin_first',true,
      'wpvibe_allowed',false,
      'dispatched_at',now()
    )
  );
  return jsonb_build_object('ok',true,'state','DISPATCHED','id',rid,'request_id',req,'target_url',target);
end;
$function$
;
