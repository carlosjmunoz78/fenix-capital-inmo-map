import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=new URL('./security-prod/',import.meta.url);
const install=fs.readFileSync(new URL('20261116_cerebro_operativa_session_guard_prod_v0.sql',base),'utf8');
const rollback=fs.readFileSync(new URL('20261116_cerebro_operativa_session_guard_prod_v0_rollback.sql',base),'utf8');
test('issuer PROD migration is additive, fixed name, pinned and independent of App/CRM',()=>{
 assert.match(install,/cluhljgonannaafpmblx/);
 assert.match(install,/CREATE FUNCTION public\.cerebro_operativa_session_guard_prod_v0/);
 assert.doesNotMatch(install,/CREATE OR REPLACE FUNCTION|CREATE TRIGGER|ALTER TABLE|DROP TABLE|TRUNCATE|DELETE\s+FROM|UPDATE\s+[a-z]|INSERT\s+INTO/i);
 assert.doesNotMatch(install,/fenix_prod\.|storage\.|app\.fenixcapital\.es|service_role.*VITE_|password/i);
 assert.match(install,/REVOKE ALL ON FUNCTION public\.cerebro_operativa_session_guard_prod_v0\(uuid,uuid\)[\s\S]+?FROM PUBLIC, anon, authenticated;/);
 assert.match(install,/GRANT EXECUTE ON FUNCTION public\.cerebro_operativa_session_guard_prod_v0\(uuid,uuid\)[\s\S]+?TO service_role;/);
});
test('issuer-side guard checks exact UUID pair and expiry, no caller identity or config mutation',()=>{
 assert.match(install,/LANGUAGE sql STABLE SECURITY DEFINER/);
 assert.match(install,/SET search_path=''/);
 assert.match(install,/s\.id=p_session_id AND s\.user_id=p_user_id/);
 assert.match(install,/s\.not_after IS NULL OR s\.not_after>pg_catalog\.now\(\)/);
 assert.match(install,/ISSUER_SESSION_SCHEMA_DRIFT/);
 assert.match(install,/CEREBRO_PROD_READER_SECURITY_GUARD_FAILED/);
 assert.doesNotMatch(install,/GRANT\s+(?:SELECT|UPDATE|INSERT|DELETE)\s+ON\s+(?:auth|public)/i);
});
test('rollback removes ONLY this named function, blocks dependencies and never cascades',()=>{
 assert.match(rollback,/DROP FUNCTION public\.cerebro_operativa_session_guard_prod_v0\(uuid,uuid\) RESTRICT;/);
 assert.match(rollback,/CEREBRO_READER_USED_BY_OTHER_FUNCTION_STOP/);
 assert.doesNotMatch(rollback.replace(/^--.*$/gm,''),/CASCADE|DROP TABLE|DROP SCHEMA|ALTER TABLE|TRUNCATE|DELETE\s+FROM|UPDATE\s+[a-z]/i);
});
