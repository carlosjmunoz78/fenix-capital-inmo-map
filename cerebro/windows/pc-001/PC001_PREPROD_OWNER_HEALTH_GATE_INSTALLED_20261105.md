# CEREBRO OS · PC-001 · Owner health gate PREPROD installed (2026-11-05)

**Scope:** `fenix / PREPROD / PC-001 / pc001-windows-v1`. **Control de escritorio:** NOT OPERATIONAL.

## Installed and independently read back
- Supabase PREPROD project `hnqlnvakzaywtafeiybt` migration `20261105111034_pc001_owner_health_private_grants_v1_20261105`: **APPLIED**, private schema `cerebro_pc001_private`, two RLS-enabled tables, three `SECURITY INVOKER` RPCs (`authorize`, `enqueue`, `revoke`). `anon` and `authenticated` have **no EXECUTE**; `service_role` has EXECUTE; zero owner grants and issues after validation.
- Edge `cerebro-pc001-health-issuer-preprod-v1` **ACTIVE v1**, `verify_jwt=true`, separate from existing `cerebro-device-gateway-preprod` v9 and `cerebro-owner-decision-gateway-v0` v1, both unchanged.
- One PREPROD authentication user is linked to the verified actor `CARLOS-ADMIN / Direccion / active`, as counted by read-only server query; no user tokens, passwords or IDs exported.
- Original PC-001 `78ca78cf158b3cda329cf39e0270f0a5`: ONLINE during last read-back; no queued/delivered commands, no created grants.
- Three PostgreSQL tests used `ROLLBACK`: DDL parse/install rehearsal, temporary owner-grant idempotency/revocation/denial, and positive atomic enqueue/replay/budget assertion. **No synthetic queue command committed or delivered**.
- Source baseline static tests: 55/55 PASS locally; legacy owner/command-envelope CI on previous feature branch 46/46 PASS. The new Edge + SQL candidate does NOT yet have a canonical GH CI run.

## Explicitly NOT verified / release gates
1. A genuine PREPROD Supabase **owner-authenticated browser session** must call the new Edge; current ChatGPT session cannot supply such a session. Do not synthesize or impersonate an owner JWT or issue a grant by privileged SQL.
2. Verify one actual `READ_HEALTH` issued via the new Edge and delivered to the original Windows worker, with `COMPLETED` and `semantic_verified=true`, followed by replay and revocation negative controls.
3. Independently exercise simultaneous distinct requests from separate connections, record rollback, cost, error logs and scoped canary receipt.
4. Physical remote mouse/keyboard/screen/files broker remains uninstalled and untested. It requires reversible original-worker handoff, visible local consent, kill switch and synthetic-only fixture.
5. PROD/Trading/APP/CRM changes **DENIED** until independent physical evidence, full tests, OLD vs NEW and rollback are GREEN.

## Preservation and rollback
- Existing device Gateway v9, owner decision Gateway v1, original Windows worker, 8765-8768 ports, DPAPI vault, App/CRM/Trading PROD all unchanged.
- In an incident, disable **only** the new isolated Edge function and revoke new grants via verified owner path; retain private audit rows. No uncontrolled drop or global revoke. Rollback of temporary schema rehearsals already PASS; durable migration rollback requires snapshot, dependency audit and change control.
- No additional subscription created. Real provider consumption is not independently measured.

**Status:** `PREPROD_ISSUER_INFRA_INSTALLED_DB_TESTS_PASS_OWNER_E2E_PENDING_WINDOWS_REMOTE_HOLD`.
