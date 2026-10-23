# CEREBRO Browser 1 · Phase 2 · PROD pre-change snapshot

Observed: 2026-10-23 17:05 UTC / 19:05 Europe/Madrid
Project: `cluhljgonannaafpmblx` (`fenix-capital-prod`)
Promotion target: Browser 1 Phase 2 V2

## Git baseline

- `main`: `0a0f4c13cbd635a3fd04d2245e3c24c40adbf708`
- Phase 2 branch was 31 commits ahead / 0 behind at snapshot time.
- V1 Browser implementation remains unchanged by the Phase 2 branch.

## PROD Browser baseline before V2 DDL

- `public.cerebro_browser_job_v1`: EXISTS
- `public.cerebro_browser_job_v2`: ABSENT
- `public.cerebro_browser_orchestrator_config_v2`: ABSENT
- `public.cerebro_browser_profile_lease_v2`: ABSENT
- `public.cerebro_credential_lease_audit_v2`: ABSENT
- V1 active jobs (`QUEUED|LEASED|RETRY_WAIT`): 0
- V1 live leases: 0
- Active Fenix credential bindings V1: 1
- V1 audit rows with `secret_material_logged=true`: 0

## Edge Function baseline

- `cerebro-browser-dispatch-v1`: ACTIVE, version 1, `verify_jwt=false` (function performs its own governed authentication contract).
- `cerebro-browser-dispatch-v2`: ABSENT.

## Migration baseline

V2 Phase 2 migrations are not yet present in PROD at this snapshot. Latest observed Browser V1 migrations are:
- `20261023101511_cerebro_browser_dispatch_v1`
- `20261023101526_cerebro_browser_credential_broker_v1`

## Rollback contract

Phase 2 is additive. Rollback does not require deleting V2 objects:
1. Set PROD V2 orchestrator `enabled=false`.
2. Confirm V2 active jobs/leases are zero or drain/cancel governed canaries.
3. Route execution through Browser V1.
4. Preserve V2 evidence for audit/rebuild.

No V1 tables, functions, Edge Functions, bindings, Vault secrets, or credentials are modified by this promotion path.

## Cost / authority

- Additional service subscription: 0 EUR.
- PROD mutation authority remains governed by existing Browser/ACTGW policy.
- Initial V2 promotion is canary-first and starts at concurrency 1.
- Phase 3 is explicitly out of scope.
