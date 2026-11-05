#!/usr/bin/env bash
# CUT15 isolated PostgreSQL identity acceptance: RLS + revoke + restore.
# Every identifier is synthetic. Never run against a production database.
set -euo pipefail
: "${PGHOST:?}"; : "${PGPASSWORD:?}"
export PGUSER=postgres PGDATABASE=postgres
PSQL=(psql -X -q -t -A -v ON_ERROR_STOP=1)
SCHEMA="zeus/jarvis/gates/20261105_cut13_b2_isolated_lab_schema.sql"
"${PSQL[@]}" -f "$SCHEMA" >/dev/null
"${PSQL[@]}" <<'SQL' >/dev/null
DO $block$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='jarvis_lab_reader') THEN
   CREATE ROLE jarvis_lab_reader NOLOGIN;
 END IF;
END $block$;
GRANT USAGE ON SCHEMA jarvis_lab_identity TO jarvis_lab_reader;
GRANT SELECT ON TABLE jarvis_lab_identity.owner_binding_v0 TO jarvis_lab_reader;
-- A scoped, active-only reader; revoked rows are not visible to this role.
CREATE POLICY jarvis_lab_reader_select ON jarvis_lab_identity.owner_binding_v0
 FOR SELECT TO jarvis_lab_reader
 USING (active IS TRUE AND channel = 'fenix-app' AND 'fenix'=ANY(authorized_companies));
INSERT INTO jarvis_lab_identity.owner_binding_v0
(channel,subject_hmac,owner_id,role,active,authorized_companies)
VALUES
('fenix-app',repeat('a',64),'synthetic-owner','OWNER_ROOT',true,ARRAY['fenix']),
('fenix-app',repeat('b',64),'revoked-owner','OWNER_ROOT',false,ARRAY['fenix']),
('fenix-app',repeat('c',64),'other-tenant-owner','OWNER_ROOT',true,ARRAY['aion']),
('other-channel',repeat('d',64),'wrong-channel-owner','OWNER_ROOT',true,ARRAY['fenix']);
SQL
reader_query(){
 "${PSQL[@]}" -c "SET ROLE jarvis_lab_reader; $1"
}
equals(){
 local actual="$1" expected="$2" test_name="$3"
 actual="$(printf '%s\n' "$actual" | tail -n 1 | tr -d '\r')"
 if [[ "$actual" != "$expected" ]]; then
   echo "FAIL $test_name: expected=$expected got=$actual" >&2; exit 1
 fi
}
equals "$(reader_query "SELECT count(*) FROM jarvis_lab_identity.owner_binding_v0;")" "1" "scoped_active_only"
equals "$(reader_query "SELECT owner_id FROM jarvis_lab_identity.owner_binding_v0 WHERE subject_hmac=repeat('b',64);")" "" "revoked_not_visible"
equals "$(reader_query "SELECT owner_id FROM jarvis_lab_identity.owner_binding_v0 WHERE subject_hmac=repeat('c',64);")" "" "other_tenant_not_visible"
equals "$(reader_query "SELECT owner_id FROM jarvis_lab_identity.owner_binding_v0 WHERE subject_hmac=repeat('d',64);")" "" "wrong_channel_not_visible"
if "${PSQL[@]}" -c "SET ROLE jarvis_lab_reader; INSERT INTO jarvis_lab_identity.owner_binding_v0(channel,subject_hmac,owner_id,role,active,authorized_companies) VALUES ('fenix-app',repeat('e',64),'forbidden','OWNER_ROOT',true,ARRAY['fenix']);" >/dev/null 2>&1; then
 echo "FAIL: reader INSERT allowed" >&2; exit 1
fi
if "${PSQL[@]}" -c "SET ROLE jarvis_lab_reader; UPDATE jarvis_lab_identity.owner_binding_v0 SET active=true WHERE subject_hmac=repeat('b',64);" >/dev/null 2>&1; then
 echo "FAIL: reader UPDATE allowed" >&2; exit 1
fi
# The privileged LAB operator simulates revocation in another connection.
"${PSQL[@]}" -c "UPDATE jarvis_lab_identity.owner_binding_v0 SET active=false WHERE subject_hmac=repeat('a',64);" >/dev/null
equals "$(reader_query "SELECT count(*) FROM jarvis_lab_identity.owner_binding_v0;")" "0" "revocation_cross_session"
# Re-activation is only for the synthetic backup/restore test.
"${PSQL[@]}" -c "UPDATE jarvis_lab_identity.owner_binding_v0 SET active=true WHERE subject_hmac=repeat('a',64);" >/dev/null
dump="$(mktemp)"
trap 'rm -f "$dump"' EXIT
pg_dump --no-owner --no-privileges --schema=jarvis_lab_identity -f "$dump"
createdb jarvis_cut15_restore
PGDATABASE=jarvis_cut15_restore "${PSQL[@]}" -f "$dump" >/dev/null
equals "$(PGDATABASE=jarvis_cut15_restore "${PSQL[@]}" -c "SELECT count(*) FROM jarvis_lab_identity.owner_binding_v0;")" "4" "backup_restore_row_count"
equals "$(PGDATABASE=jarvis_cut15_restore "${PSQL[@]}" -c "SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='jarvis_lab_identity.owner_binding_v0'::regclass;")" "true:true" "restore_rls_flags"
echo 'CUT15 PostgreSQL RLS scope, revocation, read-only privilege and snapshot restore: PASS'
