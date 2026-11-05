#!/usr/bin/env bash
# CUT17: isolated temporary PostgreSQL, synthetic identities only.
set -euo pipefail
: "${PGHOST:?}"; : "${PGPASSWORD:?}"
export PGUSER=postgres PGDATABASE=postgres
PSQL=(psql -X -q -t -A -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f zeus/jarvis/gates/20261105_cut17_b2_session_isolated_lab_schema.sql >/dev/null
"${PSQL[@]}" <<'SQL' >/dev/null
DO $block$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='jarvis_lab_session_reader') THEN
   CREATE ROLE jarvis_lab_session_reader NOLOGIN NOBYPASSRLS;
 END IF;
END $block$;
GRANT USAGE ON SCHEMA jarvis_lab_identity TO jarvis_lab_session_reader;
GRANT SELECT ON jarvis_lab_identity.session_binding_v0 TO jarvis_lab_session_reader;
CREATE POLICY cut17_session_scope ON jarvis_lab_identity.session_binding_v0
 FOR SELECT TO jarvis_lab_session_reader USING (
  active IS TRUE AND revoked IS FALSE AND environment='LAB' AND expires_at>now()
  AND owner_id=current_setting('jarvis_lab.owner_id',true)
  AND channel=current_setting('jarvis_lab.channel',true)
  AND current_setting('jarvis_lab.company_id',true)=ANY(authorized_companies)
 );
INSERT INTO jarvis_lab_identity.session_binding_v0
 (owner_id,session_hmac,environment,channel,role,active,revoked,authorized_companies,expires_at)
VALUES
 ('synthetic-owner',repeat('a',64),'LAB','fenix-app','OWNER_ROOT',true,false,ARRAY['fenix'],now()+interval '1 hour'),
 ('synthetic-owner',repeat('b',64),'LAB','fenix-app','OWNER_ROOT',true,true,ARRAY['fenix'],now()+interval '1 hour'),
 ('synthetic-owner',repeat('c',64),'LAB','fenix-app','OWNER_ROOT',true,false,ARRAY['aion'],now()+interval '1 hour'),
 ('synthetic-owner',repeat('d',64),'LAB','fenix-app','OWNER_ROOT',true,false,ARRAY['fenix'],now()-interval '1 minute'),
 ('other-owner',repeat('e',64),'LAB','fenix-app','OWNER_ROOT',true,false,ARRAY['fenix'],now()+interval '1 hour');
SQL
reader_query(){
 "${PSQL[@]}" -c "SET ROLE jarvis_lab_session_reader;
 SET jarvis_lab.owner_id='${1}'; SET jarvis_lab.company_id='${2}';
 SET jarvis_lab.channel='${3}'; SELECT count(*) FROM jarvis_lab_identity.session_binding_v0;" | tail -n 1
}
equals(){
 local actual="$1" expected="$2" label="$3"
 actual="$(printf '%s' "$actual" | tr -d '\r\n')"
 if [[ "$actual" != "$expected" ]]; then echo "FAIL ${label}: expected=${expected}, actual=${actual}" >&2;exit 1;fi
}
equals "$(reader_query synthetic-owner fenix fenix-app)" "1" active_scoped
equals "$(reader_query synthetic-owner other-tenant fenix-app)" "0" denied_wrong_company
equals "$(reader_query synthetic-owner fenix wrong-channel)" "0" denied_wrong_channel
equals "$(reader_query missing-owner fenix fenix-app)" "0" denied_wrong_owner
equals "$("${PSQL[@]}" -c 'SET ROLE jarvis_lab_session_reader; SELECT count(*) FROM jarvis_lab_identity.session_binding_v0;' | tail -n 1)" "0" denied_missing_scope
if "${PSQL[@]}" -c "SET ROLE jarvis_lab_session_reader; INSERT INTO jarvis_lab_identity.session_binding_v0(owner_id,session_hmac,environment,channel,role,authorized_companies,expires_at) VALUES('synthetic-owner',repeat('f',64),'LAB','fenix-app','OWNER_ROOT',ARRAY['fenix'],now()+interval '1 hour');" >/dev/null 2>&1; then
 echo 'FAIL reader INSERT allowed' >&2;exit 1
fi
if "${PSQL[@]}" -c "SET ROLE jarvis_lab_session_reader; UPDATE jarvis_lab_identity.session_binding_v0 SET revoked=false;" >/dev/null 2>&1; then
 echo 'FAIL reader UPDATE allowed' >&2;exit 1
fi
"${PSQL[@]}" -c "UPDATE jarvis_lab_identity.session_binding_v0 SET revoked=true WHERE owner_id='synthetic-owner' AND session_hmac=repeat('a',64);" >/dev/null
equals "$(reader_query synthetic-owner fenix fenix-app)" "0" revocation_observed_new_connection
dump="$(mktemp)";trap 'rm -f "$dump"' EXIT
pg_dump --no-owner --no-privileges --schema=jarvis_lab_identity -f "$dump"
createdb jarvis_cut17_restore
PGDATABASE=jarvis_cut17_restore "${PSQL[@]}" -f "$dump" >/dev/null
equals "$(PGDATABASE=jarvis_cut17_restore "${PSQL[@]}" -c 'SELECT count(*) FROM jarvis_lab_identity.session_binding_v0;' | tail -n 1)" "5" restore_session_rows
equals "$(PGDATABASE=jarvis_cut17_restore "${PSQL[@]}" -c "SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='jarvis_lab_identity.session_binding_v0'::regclass;" | tail -n 1)" "true:true" restored_rls_force
echo 'CUT17 PostgreSQL LAB session RLS, expiry, revocation, denied writes and snapshot restore: PASS'
