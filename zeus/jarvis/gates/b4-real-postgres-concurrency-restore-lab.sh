#!/usr/bin/env bash
# Isolated PostgreSQL service; synthetic fixtures only; NEVER PROD.
set -euo pipefail
psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA zeus_jarvis;
CREATE TABLE zeus_jarvis.b4_memory_event (
 seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id uuid NOT NULL UNIQUE,
 owner_id text NOT NULL, company_id text NOT NULL, environment text NOT NULL,
 project_id text NOT NULL, idempotency_key text NOT NULL, fingerprint text NOT NULL,
 event jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,company_id,environment,project_id,idempotency_key)
);
SQL
psql -X -v ON_ERROR_STOP=1 -f zeus/jarvis/gates/20261104_jarvis_b4_concurrency_unique_indexes_candidate.sql
# Two independent processes compete to resolve same target.
psql -X -v ON_ERROR_STOP=1 -c "BEGIN; INSERT INTO zeus_jarvis.b4_memory_event(id,owner_id,company_id,environment,project_id,idempotency_key,fingerprint,event) VALUES('11111111-1111-4111-8111-111111111111','owner','fenix','LAB','project','idem-1','fp1','{\"kind\":\"CORRECTION\",\"targetId\":\"T1\"}'); SELECT pg_sleep(1); COMMIT;" >/tmp/b4a.log 2>&1 & a=$!
sleep .15
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO zeus_jarvis.b4_memory_event(id,owner_id,company_id,environment,project_id,idempotency_key,fingerprint,event) VALUES('22222222-2222-4222-8222-222222222222','owner','fenix','LAB','project','idem-2','fp2','{\"kind\":\"REVOCATION\",\"targetId\":\"T1\"}');" >/tmp/b4b.log 2>&1 & b=$!
set +e; wait "$a"; sa=$?; wait "$b"; sb=$?; set -e
if (( (sa == 0) + (sb == 0) != 1 )); then echo "CORRECTION_RACE_FAILURE"; exit 1; fi
n=$(psql -Atqc "SELECT count(*) FROM zeus_jarvis.b4_memory_event WHERE event->>'targetId'='T1';")
[[ "$n" == 1 ]] || exit 1
# Independent checkpoint processes with same sequence.
psql -X -v ON_ERROR_STOP=1 -c "BEGIN; INSERT INTO zeus_jarvis.b4_memory_event(id,owner_id,company_id,environment,project_id,idempotency_key,fingerprint,event) VALUES('33333333-3333-4333-8333-333333333333','owner','fenix','LAB','project','cp-1','fpc1','{\"kind\":\"CHECKPOINT\",\"missionId\":\"m1\",\"checkpoint\":{\"sequence\":1}}'); SELECT pg_sleep(1); COMMIT;" >/tmp/b4c.log 2>&1 & c=$!
sleep .15
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO zeus_jarvis.b4_memory_event(id,owner_id,company_id,environment,project_id,idempotency_key,fingerprint,event) VALUES('44444444-4444-4444-8444-444444444444','owner','fenix','LAB','project','cp-2','fpc2','{\"kind\":\"CHECKPOINT\",\"missionId\":\"m1\",\"checkpoint\":{\"sequence\":1}}');" >/tmp/b4d.log 2>&1 & d=$!
set +e; wait "$c"; sc=$?; wait "$d"; sd=$?; set -e
if (( (sc == 0) + (sd == 0) != 1 )); then echo "CHECKPOINT_RACE_FAILURE"; exit 1; fi
n=$(psql -Atqc "SELECT count(*) FROM zeus_jarvis.b4_memory_event WHERE event->>'kind'='CHECKPOINT';")
[[ "$n" == 1 ]] || exit 1
# Cross-company scope remains independent.
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO zeus_jarvis.b4_memory_event(id,owner_id,company_id,environment,project_id,idempotency_key,fingerprint,event) VALUES('55555555-5555-4555-8555-555555555555','owner','aion','LAB','project','idem-3','fp3','{\"kind\":\"CORRECTION\",\"targetId\":\"T1\"}');" >/dev/null
before=$(psql -Atqc 'SELECT count(*) FROM zeus_jarvis.b4_memory_event;')
[[ "$before" == 3 ]] || exit 1
# Physical dump/restore and index rollback in independent synthetic database.
pg_dump --format=custom --schema=zeus_jarvis --file=/tmp/b4-lab.dump
createdb jarvis_lab_restore
pg_restore --no-owner --dbname=jarvis_lab_restore /tmp/b4-lab.dump
after=$(psql -d jarvis_lab_restore -Atqc 'SELECT count(*) FROM zeus_jarvis.b4_memory_event;')
[[ "$after" == "$before" ]] || exit 1
psql -d jarvis_lab_restore -X -v ON_ERROR_STOP=1 -c 'DROP INDEX zeus_jarvis.b4_memory_event_one_resolution_per_target_uq; DROP INDEX zeus_jarvis.b4_memory_event_checkpoint_sequence_uq;' >/dev/null
after=$(psql -d jarvis_lab_restore -Atqc 'SELECT count(*) FROM zeus_jarvis.b4_memory_event;')
[[ "$after" == "$before" ]] || exit 1
echo 'B4_SYNTHETIC_REAL_POSTGRES_GREEN: concurrent target, checkpoint, tenant isolation, dump/restore, index rollback; PROD untouched.'
