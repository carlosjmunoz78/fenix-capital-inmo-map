-- fenix-evidence-universal-test is an authenticated client of this self-scoped facade.
-- The function resolves only auth.uid() and does not accept an actor override.
GRANT EXECUTE ON FUNCTION public.preprod_test_session_context() TO authenticated;
