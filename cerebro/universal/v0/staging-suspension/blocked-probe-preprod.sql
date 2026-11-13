CREATE OR REPLACE FUNCTION public.seo001_probe_wp_bridge_preprod()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'net'
AS $function$
BEGIN
  -- Owner suspension 2026-11-13. This PREPROD dispatch branch may not probe
  -- staging until explicit owner reactivation, following change controls.
  -- No dynamic URLs, net.http_get, writes, secrets, or retry queues.
  RETURN jsonb_build_object(
   'ok',false,'state','BLOCKED_DEPENDENCY',
   'reason','STAGING_SUSPENDED_BY_OWNER',
   'dependency_id','wordpress_staging','job_id',13,
   'id',null,'request_id',null,'target_url',null,
   'side_effects',false,'environment','PREPROD');
END;
$function$;
