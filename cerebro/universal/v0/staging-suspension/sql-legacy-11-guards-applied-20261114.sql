-- CEREBRO OS | PREPROD-only | applied 2026-11-14
-- Migration name: cerebro_owner_suspended_staging_11_legacy_sql_guards_20261114
-- WARNING: ONE-SHOT. Already applied. Do NOT re-run to restore staging.
-- Preconditions require identical SHA-256 verified originals privately saved in
-- cerebro_lab_private.staging_suspension_snapshot_v1.
-- No staging HTTP, PROD, DNS, App, CRM or Trading calls.
DO $outer$
DECLARE r record; current_def text; header text; ddl text; applied int:=0;
BEGIN
 FOR r IN
   SELECT artifact_name,source_sql_or_code,sha256
   FROM cerebro_lab_private.staging_suspension_snapshot_v1
   WHERE artifact_type='SQL_FUNCTION'
     AND reason='OWNER_STAGING_PAUSE_2026_11_14_ADDENDUM_SQL'
   ORDER BY artifact_name
 LOOP
  SELECT pg_get_functiondef(p.oid) INTO current_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname=r.artifact_name AND p.prokind='f';
  IF current_def IS NULL OR current_def<>r.source_sql_or_code THEN
   RAISE EXCEPTION 'CONCURRENT_FUNCTION_CHANGE: %',r.artifact_name;
  END IF;
  IF r.sha256<>encode(extensions.digest(convert_to(r.source_sql_or_code,'UTF8'),'sha256'),'hex')
    OR position('AS $function$' IN r.source_sql_or_code)=0
    OR position('SECURITY DEFINER' IN r.source_sql_or_code)=0 THEN
   RAISE EXCEPTION 'ORIGINAL_SNAPSHOT_NOT_VALID: %',r.artifact_name;
  END IF;
  header:=split_part(r.source_sql_or_code,'AS $function$',1);
  ddl:=header || E'AS $function$\nBEGIN\n RETURN jsonb_build_object(' ||
   '''ok'',false,''state'',''BLOCKED_DEPENDENCY'',' ||
   '''reason'',''STAGING_SUSPENDED_BY_OWNER'',' ||
   '''dependency_id'',''wordpress_staging'',' ||
   '''environment'',''PREPROD'',' ||
   '''executed'',false,''side_effects'',false,' ||
   '''request_id'',NULL,''target_url'',NULL,' ||
   '''can_reactivate_automatically'',false);' ||
   E'\nEND;\n$function$;';
  EXECUTE ddl;
  applied:=applied+1;
 END LOOP;
 IF applied<>11 THEN RAISE EXCEPTION 'COUNT_INCORRECT %',applied; END IF;
END $outer$;

-- Acceptance (verified after applying):
-- 11/11 original private SHA-256 valid; 11/11 SECURITY DEFINER retained;
-- 11/11 bodies contain BLOCKED_DEPENDENCY and no HTTP/network source;
-- 11/11 direct safe dummy-argument calls return executed=false,
-- side_effects=false, request_id=null, target_url=null.
-- Rollback: NEVER while owner suspension remains active. Only after
-- explicit owner reactivation and gate verification, restore the exact
-- private original definitions in controlled transaction and review grants.
