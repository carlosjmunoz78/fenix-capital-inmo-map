# L7 Foundation Wave 1 Runbook

Scope: L7 only, LAB/PREPROD. Preserve `EXP-001`; WRAP_PRESERVE `INN-001`, `LAB-MKT`, `EXPAND-001`; create deterministic foundation behavior for the remaining L7 engines.

## Safety
- Never write PROD or promote to PROD.
- `LAB-TRD` is an isolation/control-plane guard only: no Trading credentials, orders, execution logic, network calls, or shared critical resources.
- Cross-company access is denied by default.
- New spend above the preauthorized amount emits `HUMAN_REQUIRED/MONEY_LIMIT`.

## Gate
Run `node --test cerebro/tests/l7-foundation-wave1.test.mjs`, Registry/Factory validation, full regression excluding only the two intentionally paused continuous-worker tests, connection analyzer, deterministic audit/rebuild twice, secret/PROD/Trading boundary scan, and OLD vs NEW verification.

## Rollback
Repoint the isolated mission branch to the pre-L7 implementation commit `fafdeac4adbed5dfc5febbd11ffac25fcddb1951`. No PROD rollback is required because PROD is not touched.

## Backup/Rebuild
Git is the durable backup. `audit-priority-l789-v1.mjs --layer L7` is run twice and outputs must compare byte-for-byte.
