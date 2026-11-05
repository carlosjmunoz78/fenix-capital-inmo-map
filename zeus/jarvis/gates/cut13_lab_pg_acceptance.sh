#!/usr/bin/env bash
# CUT13 isolated PostgreSQL acceptance test. Synthetic identifiers only.
set -euo pipefail
: "${PGHOST:?}"; : "${PGPASSWORD:?}"
export PGUSER=postgres PGDATABASE=postgres
psql -X -v ON_ERROR_STOP=1 -f zeus/jarvis/gates/20261105_cut13_b2_isolated_lab_schema.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $block$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='jarvis_lab_reader') THEN
   CREATE ROLE jarvis_lab_reader NOLOGIN;
 END IF;
END $block$;
GRANT USAGE ON SCHEMA jarvis_lab_identity TO jarvis_lab_reader;
GRANT SELECT ON TABLE jarvis_lab_identity.owner_binding_v0 TO jarvis_lab_reader;
CREATE POLICY jarvis_lab_reader_select ON jarvis_lab_identity.owner_binding_v0
 FOR SELECT TO jarvis_lab_reader USING (true);
INSERT INTO jarvis_lab_identity.owner_binding_v0
(channel,subject_hmac,owner_id,role,active,authorized_companies)
VALUES
('fenix-app',repeat('a',64),'synthetic-owner','OWNER_ROOT',true,ARRAY['fenix']),
('fenix-app',repeat('b',64),'revoked-owner','OWNER_ROOT',false,ARRAY['fenix']);
SQL
readable=$(psql -X -A -t -c "SET ROLE jarvis_lab_reader; SELECT count(*) FROM jarvis_lab_identity.owner_binding_v0;")
[[ "$readable" == *"2" ]] || { echo 'Reader SELECT failed'; exit 1; }
if psql -X -v ON_ERROR_STOP=1 -c "SET ROLE jarvis_lab_reader; INSERT INTO jarvis_lab_identity.owner_binding_v0(channel,subject_hmac,owner_id,role,active,authorized_companies) VALUES ('fenix-app',repeat('c',64),'forbidden','OWNER_ROOT',true,ARRAY['fenix']);" >/dev/null 2>&1; then
 echo 'FAILED: reader can write'; exit 1
fi
# Schema+data snapshot and restore to a different disposable DB, never to source.
pg_dump --no-owner --no-privileges --schema=jarvis_lab_identity -f /tmp/jarvis_cut13_lab_dump.sql
createdb jarvis_cut13_restore
PGDATABASE=jarvis_cut13_restore psql -X -v ON_ERROR_STOP=1 -f /tmp/jarvis_cut13_lab_dump.sql >/dev/null
restore_count=$(PGDATABASE=jarvis_cut13_restore psql -X -t -A -c "SELECT count(*) FROM jarvis_lab_identity.owner_binding_v0")
[[ "$restore_count" == "2" ]] || { echo 'Backup restore mismatch'; exit 1; }
echo 'CUT13 PostgreSQL isolation, read-only RLS and snapshot restore: PASS'
