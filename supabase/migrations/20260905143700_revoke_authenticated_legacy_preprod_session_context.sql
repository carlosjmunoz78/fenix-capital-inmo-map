-- PRE-PROD hardening: the client-facing app uses the service-role-only
-- preprod_test_session_context_server RPC through fenix-app-api-test.
-- Keep the legacy SECURITY DEFINER session-context RPC unavailable to
-- authenticated users to avoid a second direct execution surface.

REVOKE EXECUTE ON FUNCTION public.preprod_test_session_context() FROM authenticated;
