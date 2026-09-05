-- fenix-evidence-universal-test v2 now resolves the signed-in user via auth.getUser
-- and calls preprod_test_actor_context_by_auth_server with service_role.
REVOKE EXECUTE ON FUNCTION public.preprod_test_session_context() FROM authenticated;
