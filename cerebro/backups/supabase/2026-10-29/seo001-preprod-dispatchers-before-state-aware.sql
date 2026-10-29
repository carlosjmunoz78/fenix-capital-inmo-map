-- Snapshot BEFORE state-aware dispatch optimization, 2026-10-29.
-- Scope: PREPROD only, project hnqlnvakzaywtafeiybt.

CREATE OR REPLACE FUNCTION public.seo001_dispatch_sitewide_regression_preprod()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
declare s text; req bigint;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name='FENIX CEREBRO PREPROD' limit 1;
  if coalesce(s,'')='' then return jsonb_build_object('ok',false,'state','MISSING_SECRET'); end if;
  select net.http_post(
    url:='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/fenix-seo-sitewide-regression-preprod',
    headers:=jsonb_build_object('Content-Type','application/json','x-fenix-cron-secret',s),
    body:=jsonb_build_object('limit',20),
    timeout_milliseconds:=45000
  ) into req;
  return jsonb_build_object('ok',true,'state','DISPATCHED','request_id',req);
end;
$function$;

CREATE OR REPLACE FUNCTION public.seo001_dispatch_infrastructure_autopilot_preprod()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
declare s text; req bigint;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name='FENIX CEREBRO PREPROD' limit 1;
  if coalesce(s,'')='' then return jsonb_build_object('ok',false,'state','MISSING_SECRET'); end if;
  select net.http_post(
    url:='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/fenix-seo-infrastructure-autopilot-preprod',
    headers:=jsonb_build_object('Content-Type','application/json','x-fenix-cron-secret',s),
    body:=jsonb_build_object('limit',15),
    timeout_milliseconds:=45000
  ) into req;
  return jsonb_build_object('ok',true,'state','DISPATCHED','request_id',req);
end;
$function$;
