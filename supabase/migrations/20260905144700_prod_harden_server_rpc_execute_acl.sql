-- PROD hardening: service-only RPCs that are called through authenticated Edge gateways.
-- Preserve server execution while removing direct PostgREST execution for PUBLIC/anon/authenticated.

REVOKE EXECUTE ON FUNCTION public.fenix_prod_directory_personal_server(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fenix_prod_directory_personal_server(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fenix_prod_notarias_server(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fenix_prod_notarias_server(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fenix_prod_registros_server(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fenix_prod_registros_server(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fenix_prod_task_create_server(text,text,text,text,timestamp with time zone,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fenix_prod_task_create_server(text,text,text,text,timestamp with time zone,text,text,text,text,text,text,text,text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fenix_prod_bank_create_server(text,text,text,text,text,text,boolean,boolean,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fenix_prod_bank_create_server(text,text,text,text,text,text,boolean,boolean,jsonb,jsonb,text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fenix_prod_reports_server(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fenix_prod_reports_server(text) TO service_role;
