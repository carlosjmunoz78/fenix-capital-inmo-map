#!/usr/bin/env bash
# ZEUS/JARVIS B6 CUT01 — real PostgreSQL claim collision, recovery policy and rollback.
# STRICTLY SYNTHETIC LAB. No Supabase PROD DDL, writes, or secrets.
set -euo pipefail
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
psql -X -v ON_ERROR_STOP=1 -f zeus/jarvis/gates/b6-pg17-idempotency-journal-candidate.sql >/dev/null
finger="$(printf '%064d' 1)"
other="$(printf '%064d' 2)"
evidence="$(printf '%064d' 9)"
claim(){
 psql -X -Atqc "SELECT zeus_jarvis_b6_lab.claim_read('$1','$2','$3','$4','$5','$6','$7','$8');"
}
complete(){
 psql -X -Atqc "SELECT zeus_jarvis_b6_lab.complete_read('$1','$2','$3','$4','$5','$6','$7','$8','$9');"
}
failed(){
 psql -X -Atqc "SELECT zeus_jarvis_b6_lab.fail_read('$1','$2','$3','$4','$5','$6','$7','$8','$9');"
}
expect(){
 if [[ "$1" != "$2" ]]; then echo "B6_PG17_FAIL $3 got=$1 expected=$2"; exit 1; fi
}
# Two independent Postgres sessions compete for same owner/company/mission/key.
psql -X -Atqc "BEGIN; SELECT zeus_jarvis_b6_lab.claim_read('owner','fenix','LAB','mission','GITHUB_FILE_READ','github-fixture','same-key','$finger'); SELECT pg_sleep(1); COMMIT;" >"$work/first" 2>&1 &
one=$!
sleep .15
psql -X -Atqc "SELECT zeus_jarvis_b6_lab.claim_read('owner','fenix','LAB','mission','GITHUB_FILE_READ','github-fixture','same-key','$finger');" >"$work/second" 2>&1 &
two=$!
wait "$one"
wait "$two"
grep -qx 'CLAIMED' "$work/first" || { echo 'B6_PG17_FIRST_CLAIM_FAILED'; exit 1; }
grep -qx 'IN_PROGRESS' "$work/second" || { echo 'B6_PG17_DOUBLE_CLAIM'; exit 1; }
expect "$(claim owner fenix LAB mission GITHUB_FILE_READ github-fixture same-key "$other")" 'CONFLICT' 'FINGERPRINT_CONFLICT'
expect "$(complete owner fenix LAB mission GITHUB_FILE_READ github-fixture same-key "$finger" "$evidence")" 'COMPLETED' 'COMPLETION'
expect "$(claim owner fenix LAB mission GITHUB_FILE_READ github-fixture same-key "$finger")" 'ALREADY_COMPLETED' 'REPLAY'
expect "$(complete owner fenix LAB mission GITHUB_FILE_READ github-fixture same-key "$finger" "$evidence")" 'DENY_NOT_CLAIMED' 'DOUBLE_COMPLETION'
expect "$(complete owner fenix LAB mission GITHUB_FILE_READ github-fixture same-key "$other" "$evidence")" 'DENY_NOT_CLAIMED' 'WRONG_FINGERPRINT'
expect "$(claim owner aion LAB mission GITHUB_FILE_READ github-fixture same-key "$finger")" 'CLAIMED' 'CROSS_COMPANY_ISOLATED'
expect "$(claim otherowner fenix LAB mission GITHUB_FILE_READ github-fixture same-key "$finger")" 'CLAIMED' 'CROSS_OWNER_ISOLATED'
expect "$(claim owner fenix PROD mission GITHUB_FILE_READ github-fixture prod-attempt "$finger")" 'DENY_INVALID_REQUEST' 'PROD_OFF'
expect "$(claim owner fenix LAB mission GITHUB_FILE_READ github-fixture failure "$finger")" 'CLAIMED' 'FAILURE_CLAIM'
expect "$(failed owner fenix LAB mission GITHUB_FILE_READ github-fixture failure "$finger" CONNECTOR_DOWN)" 'FAILED' 'FAIL'
expect "$(claim owner fenix LAB mission GITHUB_FILE_READ github-fixture failure "$finger")" 'PREVIOUS_FAILED_NO_AUTORETRY' 'ANTI_LOOP_NO_AUTO_RETRY'
expect "$(failed owner fenix LAB mission GITHUB_FILE_READ github-fixture failure "$finger" CONNECTOR_DOWN)" 'DENY_NOT_CLAIMED' 'DOUBLE_FAIL'
expect "$(claim owner fenix LAB mission GITHUB_FILE_READ github-fixture malformed bad)" 'DENY_INVALID_REQUEST' 'BAD_FINGERPRINT'
expected="$(psql -X -Atqc 'select count(*) from zeus_jarvis_b6_lab.execution_claim;')"
expect "$expected" 4 'ROW_COUNT'
pg_dump --format=custom --schema=zeus_jarvis_b6_lab --file="$work/journal-lab.dump"
createdb jarvis_b6_journal_restore
pg_restore --no-owner --dbname=jarvis_b6_journal_restore "$work/journal-lab.dump"
actual="$(psql -d jarvis_b6_journal_restore -X -Atqc 'select count(*) from zeus_jarvis_b6_lab.execution_claim;')"
expect "$actual" "$expected" 'BACKUP_RESTORE'
psql -d jarvis_b6_journal_restore -X -v ON_ERROR_STOP=1 -c 'DROP SCHEMA zeus_jarvis_b6_lab CASCADE;' >/dev/null 2>&1
expect "$(psql -d jarvis_b6_journal_restore -X -Atqc "SELECT count(*) FROM information_schema.schemata WHERE schema_name='zeus_jarvis_b6_lab';")" '0' 'RESTORED_DB_ROLLBACK'
echo 'B6_PG17_DURABLE_JOURNAL_LAB_GREEN: concurrent claim, no duplicate execution, cross-company/owner scoping, finish/fail, no automatic retry, physical backup/restore and isolated rollback. PROD UNTOUCHED.'
