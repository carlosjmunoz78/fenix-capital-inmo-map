-- CEREBRO P0-A deliberate rollback: ONLY new issuer PROD function.
-- Run only after verifying no new dependencies; NEVER use CASCADE or touch auth.sessions.
-- Exact target cluhljgonannaafpmblx; no App/CRM schema or Auth configuration changes.
DO $guard$
DECLARE fn oid;
BEGIN
 SELECT to_regprocedure('public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)')::oid INTO fn;
 IF fn IS NULL THEN RAISE EXCEPTION 'CEREBRO_READER_NOT_INSTALLED'; END IF;
 IF EXISTS (SELECT 1 FROM pg_depend d WHERE d.refclassid='pg_proc'::regclass
   AND d.refobjid=fn AND d.classid='pg_proc'::regclass AND d.deptype='n')
 THEN RAISE EXCEPTION 'CEREBRO_READER_USED_BY_OTHER_FUNCTION_STOP'; END IF;
END $guard$;
DROP FUNCTION public.cerebro_operativa_session_guard_prod_v0(uuid,uuid) RESTRICT;
