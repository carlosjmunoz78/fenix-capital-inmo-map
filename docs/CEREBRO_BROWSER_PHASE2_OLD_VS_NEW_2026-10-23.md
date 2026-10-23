# CEREBRO Browser 1 · Phase 2 · OLD vs NEW

Date: 2026-10-23
Environment evaluated: PREPROD
PROD promotion: NO
Phase 3: NOT STARTED

## OLD — Browser 1 V1 serial

Baseline remains preserved and available as rollback.

- Architecture: governed V1 queue → GitHub OIDC worker → Chromium/Playwright.
- Credential source: credential reference/binding → Supabase Vault → runtime memory only.
- Physical credential evidence: GitHub Actions run `39937419272`.
- Result: successful physical Browser 1 execution with `credential_materialized=true` and `secret_material_logged=false`.
- V1 dispatch remains ACTIVE in PREPROD as `cerebro-browser-dispatch-v1` version 3.
- No V1 file, queue, binding or Vault contract was replaced by Phase 2.

## NEW — Browser 1 Phase 2 V2

V2 wraps and scales Browser 1 rather than replacing it.

### Orchestration

- Separate V2 queue.
- Global, company and department quotas.
- Priority and fairness.
- Idempotency.
- Lease + heartbeat + retry/dead-letter.
- Cancel support.
- Exclusive one-writer-per-profile lease.
- Multi-company and multi-department isolation.
- Runtime metrics.
- PREPROD operational cap: 8 concurrent browsers globally, 4 per company, 2 per department.
- 16 concurrent Browser 1 instances are physically proven in LAB/PREPROD benchmark but intentionally not configured as the operational cap.

### Physical capacity evidence

- Distributed 4: run `39986972372` — GREEN.
- Single-host 8: run `39987189978` — 8/8 successful, 0 rejected, 0 NO_JOB, peak container memory 1,089,679,360 bytes.
- Single-host 16: run `39987396238` — 16/16 successful, 0 rejected, 0 NO_JOB, peak container memory 1,696,112,640 bytes.
- Incremental cost reported by benchmark: 0 €.

### Credential Broker V2

V2 reuses the V1 credential alias/binding and the same Supabase Vault. It creates no second secret store.

Before Vault access V2 additionally requires:

1. Active job lease.
2. Correct authenticated worker.
3. Active exclusive browser-profile lease.
4. Company match.
5. Identity match.
6. Account match.
7. Environment allowed.
8. Origin allowed.
9. Capability consistent with job mode and binding.
10. Binding active and not revoked.

Final physical evidence: run `39990778979` — GREEN.

- Alias-only seed: GREEN.
- Credential materialized in worker memory: GREEN.
- Browser 1 physical execution: SUCCEEDED.
- Secret material logged: false.
- Invalid/inactive lease probe: denied with HTTP 403.
- Secret returned for invalid lease: false.
- V2 audit rows observed after testing: 2; all reported `secret_material_logged=false`.

### Corrective evidence retained

Two red iterations were intentionally retained as QA evidence rather than hidden:

- First credential canary: broker denied materialization because the new broker used `company|environment|profile` while the scheduler lease contract used `company::environment::profile`. The security gate correctly denied the mismatch. Only the delimiter was corrected; no policy was relaxed.
- Second credential canary: materialization succeeded, but the browser timed out while navigating the public WordPress site. QA navigation was made deterministic with a `data:` document while the binding still validates the authorized `https://fenixcapital.es` origin. This removes external site uptime from the broker acceptance test without weakening credential policy.

## Physical rollback acceptance

With zero active V2 jobs and zero active profile leases:

1. PREPROD V2 was set to `enabled=false`.
2. A V2 lease probe returned `ok=true`, `job=null`, `backpressure=ORCHESTRATOR_DISABLED`.
3. No V2 job was leased.
4. PREPROD was restored in the same transaction to 8 global / 4 company / 2 department.
5. V1 remained ACTIVE throughout.
6. PROD V2 remained disabled.

This is the expected V2 backpressure contract: disabled is not an exception; it returns no job and the explicit `ORCHESTRATOR_DISABLED` reason.

## Rebuild / backup posture

- V2 runtime, tests, workflows, Edge source and SQL migrations are source-controlled.
- V2 SQL changes in PREPROD are additive; no V1 table/function was dropped or replaced.
- V1 remains the physical rollback path.
- No PROD Browser V2 change has been performed, so a PROD snapshot has not yet been taken. A fresh PROD snapshot is mandatory immediately before any future PROD promotion.

## Acceptance result

PREPROD OLD vs NEW: **GREEN**.

V2 adds concurrency, scheduling, isolation and stricter credential validation while preserving the V1 runtime/credential path as rollback. This document does not authorize PROD promotion and does not authorize Phase 3.
