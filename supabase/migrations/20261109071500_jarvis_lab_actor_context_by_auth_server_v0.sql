-- CEREBRO JARVIS · LAB-only backend actor lookup · 2026-11-09
-- New function only. Existing preprod_test.actors and production resources unchanged.
-- Caller must authenticate a user with Supabase Auth before passing its UUID.
DO $audit$
BEGIN
  IF to_regprocedure('public.jarvis_lab_actor_context_by_auth_server_v0(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'JARVIS_LAB_ACTOR_CONTEXT_ALREADY_EXISTS';
  END IF;
END
$audit$;

CREATE FUNCTION public.jarvis_lab_actor_context_by_auth_server_v0(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM preprod_test.actors AS a
    WHERE a.auth_user_id=p_auth_user_id
      AND a.actor_code='CARLOS-ADMIN'
      AND a.role='Direccion'
      AND a.active IS TRUE
  )
  THEN pg_catalog.jsonb_build_object('ok',true,'actor_code','CARLOS-ADMIN')
  ELSE pg_catalog.jsonb_build_object('ok',false)
  END;
$fn$;

REVOKE ALL ON FUNCTION public.jarvis_lab_actor_context_by_auth_server_v0(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.jarvis_lab_actor_context_by_auth_server_v0(uuid) FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jarvis_lab_actor_context_by_auth_server_v0(uuid) TO service_role;
