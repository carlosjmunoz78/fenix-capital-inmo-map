#!/usr/bin/env bash
# ZEUS/JARVIS B5 CUT04: synthetic PG17 prepaid reservation race/restore LAB, no PROD/provider.
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
psql -X -v ON_ERROR_STOP=1 -f zeus/jarvis/finops-lab/b5-atomic-prepaid-ledger-candidate.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO zeus_jarvis_b5_lab.prepaid_account
(company_id,environment,provider,currency,balance_verified,verified_at,available_cents,owner_limit_cents)
VALUES
('fenix','LAB','DEEPSEEK','EUR',true,now(),100,100),
('aion','LAB','DEEPSEEK','EUR',true,now(),100,100);
SQL
expect(){
 local got="$1" expected="$2" label="$3"
 if [[ "$got" != "$expected" ]]; then
  echo "B5_BUDGET_LAB_FAIL $label expected=$expected got=$got"
  exit 1
 fi
}
reserve(){ psql -X -Atqc "SELECT zeus_jarvis_b5_lab.reserve_prepaid('$1','$2','$3',$4);"; }
finalize(){ psql -X -Atqc "SELECT zeus_jarvis_b5_lab.finalize_prepaid('$1','$2','$3',$4,$5);"; }
# Two independent transactions attempt to reserve 70 cents against 100 cents.
psql -X -qAtc "BEGIN; SELECT zeus_jarvis_b5_lab.reserve_prepaid('fenix','LAB','race-A',70); SELECT pg_sleep(1); COMMIT;" >"$tmp/a" 2>&1 &
a=$!
sleep .15
psql -X -qAtc "SELECT zeus_jarvis_b5_lab.reserve_prepaid('fenix','LAB','race-B',70);" >"$tmp/b" 2>&1 &
b=$!
wait "$a"
wait "$b"
grep -qx 'RESERVED' "$tmp/a" || { echo 'B5_FIRST_RESERVATION_NOT_COMMITTED'; exit 1; }
grep -qx 'DENY_BUDGET_LIMIT' "$tmp/b" || { echo 'B5_CONCURRENT_OVERSPEND_NOT_STOPPED'; exit 1; }
expect "$(psql -X -Atqc "SELECT reserved_cents FROM zeus_jarvis_b5_lab.prepaid_account WHERE company_id='fenix';")" '70' 'SERIALIZED_BALANCE'
expect "$(reserve fenix LAB race-A 70)" 'ALREADY_RESERVED' 'DUPLICATE_SAME_AMOUNT'
expect "$(reserve fenix LAB race-A 80)" 'DENY_IDEMPOTENCY_CONFLICT' 'DUPLICATE_DIFFERENT_AMOUNT'
expect "$(finalize fenix LAB race-A 30 false)" 'SETTLED' 'ACTUAL_SPEND_SETTLED'
expect "$(finalize fenix LAB race-A 30 false)" 'DENY_RESERVATION_INACTIVE' 'DOUBLE_SETTLE_BLOCKED'
expect "$(reserve fenix LAB release-C 65)" 'RESERVED' 'REMAINING_BUDGET_RESERVE'
expect "$(finalize fenix LAB release-C 0 true)" 'RELEASED' 'FAILED_CALL_RELEASE'
expect "$(finalize fenix LAB release-C 0 true)" 'DENY_RESERVATION_INACTIVE' 'DOUBLE_RELEASE_BLOCKED'
expect "$(reserve fenix LAB exceed-D 71)" 'DENY_BUDGET_LIMIT' 'HARD_CEILING'
expect "$(finalize fenix LAB no-such 1 false)" 'DENY_RESERVATION_INACTIVE' 'NO_FABRICATED_RESERVATION'
expect "$(reserve aion LAB race-A 90)" 'RESERVED' 'MULTI_COMPANY_ISOLATION'
expect "$(reserve aion LAB race-A 20)" 'DENY_IDEMPOTENCY_CONFLICT' 'OTHER_COMPANY_IDEMPOTENCY'
expect "$(reserve other LAB race-A 10)" 'DENY_NO_BUDGET' 'UNKNOWN_TENANT'
expect "$(reserve fenix PROD forbidden 10)" 'DENY_INVALID_REQUEST' 'PROD_FORBIDDEN_IN_LAB_SCHEMA'
expect "$(reserve fenix LAB bad-request 6000)" 'DENY_INVALID_REQUEST' 'MAX_REQUEST_50_EUR'
expect "$(finalize aion LAB race-A 100 false)" 'DENY_OVER_RESERVED_SPEND' 'PROVIDER_OVERAGE_REJECTED'
expect "$(finalize aion LAB race-A 1 true)" 'DENY_RELEASE_MUST_BE_ZERO' 'INVALID_RELEASE'
psql -X -v ON_ERROR_STOP=1 -c "UPDATE zeus_jarvis_b5_lab.prepaid_account SET verified_at=now()-interval '60 minutes' WHERE company_id='fenix';" >/dev/null
expect "$(reserve fenix LAB stale-E 10)" 'DENY_BALANCE_UNVERIFIED' 'STALE_PROOF_BLOCKED'
psql -X -v ON_ERROR_STOP=1 -c "UPDATE zeus_jarvis_b5_lab.prepaid_account SET verified_at=now()+interval '60 minutes' WHERE company_id='fenix';" >/dev/null
expect "$(reserve fenix LAB future-F 10)" 'DENY_BALANCE_UNVERIFIED' 'FUTURE_PROOF_BLOCKED'
psql -X -v ON_ERROR_STOP=1 -c "UPDATE zeus_jarvis_b5_lab.prepaid_account SET verified_at=now() WHERE company_id='fenix';" >/dev/null
expect "$(psql -X -Atqc "SELECT concat(spent_cents,':',reserved_cents) FROM zeus_jarvis_b5_lab.prepaid_account WHERE company_id='fenix';")" '30:0' 'SETTLEMENT_LEDGER'
expect "$(psql -X -Atqc "SELECT count(*) FROM zeus_jarvis_b5_lab.reservation;")" '3' 'RECORD_COUNT'
pg_dump --format=custom --schema=zeus_jarvis_b5_lab --file="$tmp/finops-lab.dump"
createdb jarvis_finops_restore
pg_restore --no-owner --dbname=jarvis_finops_restore "$tmp/finops-lab.dump"
expect "$(psql -d jarvis_finops_restore -X -Atqc "SELECT count(*) FROM zeus_jarvis_b5_lab.reservation;")" '3' 'DUMP_RESTORE'
psql -d jarvis_finops_restore -X -v ON_ERROR_STOP=1 -c 'DROP SCHEMA zeus_jarvis_b5_lab CASCADE;' >/dev/null 2>&1
expect "$(psql -d jarvis_finops_restore -X -Atqc "SELECT count(*) FROM information_schema.schemata WHERE schema_name='zeus_jarvis_b5_lab';")" '0' 'ISOLATED_ROLLBACK'
echo 'B5_FINOPS_PG17_LAB_GREEN: real concurrent atomic reservation, idempotency, release, settlement, tenant isolation, stale balance, synthetic backup/restore and rollback; PROD untouched.'
