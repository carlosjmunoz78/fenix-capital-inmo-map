-- CEREBRO OPERATIVA P0-A · issuer PROD reader v0 · authorized 2026-11-16.
-- Target Supabase project ONLY: cluhljgonannaafpmblx, NOT LAB hnqlnvakzaywtafeiybt.
-- Additive standalone boolean RPC. No existing schema/tables/Auth config/roles altered.
-- Must be applied as ONE atomic Supabase migration; do not execute clauses independently.
DO $preflight$
BEGIN
 IF to_regprocedure('public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)') IS NOT NULL
  THEN RAISE EXCEPTION 'CEREBRO_PROD_READER_ALREADY_EXISTS'; END IF;
 IF to_regclass('auth.sessions') IS NULL
  THEN RAISE EXCEPTION 'ISSUER_AUTH_SESSIONS_MISSING'; END IF;
 IF (SELECT count(*) FROM pg_attribute a
   WHERE a.attrelid='auth.sessions'::regclass
   AND a.attname IN ('id','user_id','not_after')
   AND a.attnum>0 AND NOT a.attisdropped) <> 3
  THEN RAISE EXCEPTION 'ISSUER_SESSION_SCHEMA_DRIFT'; END IF;
 IF has_table_privilege('anon','auth.sessions','SELECT') OR
    has_table_privilege('authenticated','auth.sessions','SELECT')
  THEN RAISE EXCEPTION 'ISSUER_SESSION_TABLE_EXPOSURE'; END IF;
END $preflight$;

CREATE FUNCTION public.cerebro_operativa_session_guard_prod_v0(
 p_session_id uuid, p_user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=''
AS $guard$
 SELECT p_session_id IS NOT NULL
 AND p_user_id IS NOT NULL
 AND EXISTS (
   SELECT 1 FROM auth.sessions s
   WHERE s.id=p_session_id AND s.user_id=p_user_id
   AND (s.not_after IS NULL OR s.not_after>pg_catalog.now())
 );
$guard$;

-- REVOKE and GRANT are in the same transactional migration as CREATE; never
-- commit between CREATE and these statements. No browser/client access.
REVOKE ALL ON FUNCTION public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)
 TO service_role;
COMMENT ON FUNCTION public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)
 IS 'CEREBRO OPERATIVA issuer-only boolean live session lookup; service_role execute only. No owner identity or PROD API connected.';

DO $verify_acl$
DECLARE fn oid;
BEGIN
 SELECT p.oid INTO fn FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='cerebro_operativa_session_guard_prod_v0'
 AND p.pronargs=2 AND p.proargtypes[0]='pg_catalog.uuid'::regtype
 AND p.proargtypes[1]='pg_catalog.uuid'::regtype;
 IF fn IS NULL THEN RAISE EXCEPTION 'READER_MISSING_AFTER_CREATE'; END IF;
 IF (SELECT NOT(p.prosecdef AND pg_get_userbyid(p.proowner)='postgres' AND
       p.proconfig @> ARRAY['search_path=""']::text[]) FROM pg_proc p WHERE p.oid=fn)
    OR has_function_privilege('anon',fn,'EXECUTE')
    OR has_function_privilege('authenticated',fn,'EXECUTE')
    OR NOT has_function_privilege('service_role',fn,'EXECUTE')
    OR has_table_privilege('service_role','auth.sessions','SELECT')
 THEN RAISE EXCEPTION 'CEREBRO_PROD_READER_SECURITY_GUARD_FAILED'; END IF;
END $verify_acl$;
