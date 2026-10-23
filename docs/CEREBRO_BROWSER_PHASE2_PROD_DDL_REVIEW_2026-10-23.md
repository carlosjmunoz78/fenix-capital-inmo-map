# CEREBRO Browser 1 · Phase 2 · PROD DDL review

Reviewed before promotion on 2026-10-23.

## Migration 20261023180000
- Adds V2 config, queue, profile lease, fairness and metric tables.
- Adds V2 enqueue/reap/lease/heartbeat/cancel/complete/status/metrics/credential functions.
- Keeps V1 objects intact.
- PROD seed is `enabled=false`, limits 1/1/1.
- RLS enabled; anon/authenticated revoked; service_role only.
- Rejects HIGH risk auto-enqueue and non-zero expected cost.
- Raw secret-shaped fields rejected in commands/authority/result.

## Migration 20261023194500
- Adds V2 credential audit table.
- Reuses V1 binding and Vault reference; no duplicate secret store.
- Requires lease, company, identity, account, environment, origin and capability checks.
- Contains the known PREPROD scope delimiter mismatch from the development history; it is immediately corrected by the next migration and must never be considered the final V2 contract.

## Migration 20261023195500
- Corrects V2 profile scope key to `company::environment::browser_profile_id`.
- No V1 change and no policy relaxation.
- This is the final credential materializer definition to validate after applying all three migrations.

## Promotion decision
All three migrations must be applied in order, with V2 still disabled in PROD. After migration, verify the final function definition behavior through governed canary/negative tests before raising concurrency.
