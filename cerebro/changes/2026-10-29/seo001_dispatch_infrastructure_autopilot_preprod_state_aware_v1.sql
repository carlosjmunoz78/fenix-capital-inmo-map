-- Deployed PREPROD state-aware dispatcher.
-- Supabase project: hnqlnvakzaywtafeiybt
-- PROD project cluhljgonannaafpmblx is not touched by this SQL.

CREATE OR REPLACE FUNCTION public.seo001_dispatch_infrastructure_autopilot_preprod()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','net','vault'
AS $function$
declare
  s text;
  req bigint;
  next_phase text;
  work_exists boolean;
begin
  select c.evidence->>'next_phase'
    into next_phase
  from public.seo_cerebro_sitewide_audit_control_preprod c
  where c.company_id='FENIX_CAPITAL'
    and c.engine_id='SEO-001'
    and c.environment='PREPROD'
  limit 1;

  select exists(
    select 1
    from public.seo_cerebro_sitewide_page_queue_preprod q
    where q.company_id='FENIX_CAPITAL'
      and q.engine_id='SEO-001'
      and q.environment='PREPROD'
      and (
        q.audit_result->'staging_noindex_enforcer_v2' is null
        or q.audit_result->'runtime_pro_independence_v1' is null
      )
  ) into work_exists;

  if next_phase='BLOCKED_PENDING_CONTENT_UX_REMEDIATION'
     and not coalesce(work_exists,false)
  then
    return jsonb_build_object(
      'ok', true,
      'state', 'SKIPPED_BLOCKED_NEXT_PHASE',
      'next_phase', next_phase
    );
  end if;

  select decrypted_secret into s
  from vault.decrypted_secrets
  where name='FENIX CEREBRO PREPROD'
  limit 1;

  if coalesce(s,'')='' then
    return jsonb_build_object('ok',false,'state','MISSING_SECRET');
  end if;

  select net.http_post(
    url:='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/fenix-seo-infrastructure-autopilot-preprod',
    headers:=jsonb_build_object('Content-Type','application/json','x-fenix-cron-secret',s),
    body:=jsonb_build_object('limit',15),
    timeout_milliseconds:=45000
  ) into req;

  return jsonb_build_object('ok',true,'state','DISPATCHED','request_id',req);
end;
$function$;
