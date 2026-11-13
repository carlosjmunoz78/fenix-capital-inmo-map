# CEREBRO Universal Gateway V0 · parallel LAB

Status: **LAB implementation, NOT production certified**.

**Current V0.4 addendum (13-Nov-2026):** Earlier V0-only notes below describe the in-process starting point. Since V0.2, a **private Vercel Preview-only** read endpoint exists; it is NOT a PROD/public execution endpoint. See [INTERFACE_AUTOCONNECT_V04.md](./INTERFACE_AUTOCONNECT_V04.md) and PR #66 for the verified 26/26 tests and deployment evidence. A separate existing GitHub Actions activity source is now wrapped as `list_work_activity`; it is **not JOB-001**. The owner-authenticated Preview E2E for this latest activity reader remains PENDING because the new hostname displays the login page. Factory FACT-001 read owner E2E from earlier V0.3 is verified. No new subscriptions or PROD migrations. Future UI contracts do not certify six live UI connections.

## Existing preserved systems
Reuses the actual FACT-001 V1 179-engine registry, preserving 177 base IDs plus HCI-001 and MOTION-001. Also preserves existing Action Gateway, JOB-001 Durable Runtime, Dynamic Concurrency Policy, V4 and its deployment. Nothing in their source files was changed.

## FACT-001 proof-of-capability
One executable **read-only** deterministic capability is exposed: fact.registry.summary. It reports 179 registered definitions and explicitly NOT_VERIFIED for operational count. Data source is REPOSITORY_SNAPSHOT_NOT_LIVE, not a live PROD state.

## One protocol
Authenticated server -> session resolver -> UniversalGatewayLabV0 -> FACT-001 Registry read wrapper / optional JOB-001 read adapter -> audit -> SDK. Same SDK contract for Operativa, JARVIS, Neuronal, Browser, App and mobile. The Gateway is in-process only; NO new public endpoint is deployed.

Methods: list_capabilities, get_capability, get_engine_status, list_jobs, get_job, get_evidence, submit_command, invoke_read and audit_log. Submit_command supports dry_run=true ONLY; no write executor registered. No secrets and no new provider calls. Identity scopes are resolved on server; changing UI company cannot grant rights.

## Scheduler boundary
The concurrency-shadow module is a pure diagnostic planner: DAG dependencies, priorities, per-company/global/provider concurrency, resource locks, hard additional-cost stop. It does not enqueue/start jobs. Any real execution must be wrapped onto preexisting JOB-001, not a second queue.

## Acceptance & recovery
- CI: node 24, FACT-001 registry validation + explicit 10 contract tests.
- Explicit negative tests: unauthorized scope/tenant, PROD denies, idempotent dryrun, payload validation, missing job adapter, cross-tenant filtering, audit redaction, concurrency resource locks, zero-cost.
- OLD vs NEW: compare only metadata/contract to existing FACT V1 and V4; no production behaviors changed. Integration E2E pending.
- Backup: immutable V4 source SHA a51dd14eac11f02424dce5db426346b041c1824f retained.
- Rollback: revert the new isolated LAB commit/close draft PR; no PROD rollback operation required.
- Next: server-auth binding to an isolated non-PROD listener, read-only JOB-001 adapter, compare output, physical E2E and rollback; no App alias changes.

## GitHub Actions queue snapshot
At 13-Nov-2026 10:21 UTC: 26 queued runs all on 11-Nov-2026 20:18:20 UTC from UMS-001 PR45. Example run 43095209609 shows zero materialized jobs, so there is no proof of runner saturation. Browser1 workflow on main was in progress; its named concurrency group intentionally serializes that workflow's runs. UMS root cause remains unproven. This is GitHub's queue only, NOT Cloudflare/DB/CEREBRO total jobs.


## V0.6 Owner Universe metadata · 13/11/2026

**ADAPTER IMPLEMENTED AND CI TESTED, NOT PHYSICALLY ACCEPTED IN PREVIEW YET:** the `list_owner_sources` action wraps the existing server-verified GET `cerebro-console-gateway-v36-followups-lab/owner-universe?company_id=fenix`, returning only bounded Fénix registry/FACT GitOps counts and source provenance. It never returns customer records, credentials, other-company data, or grants. If registry/factory is partial or unavailable, the UI shows that state, not false zero. There is **no new Edge Function**, no SQL write, no runtime execution.

**Live read-only verification:** `public.cerebro_job001_telemetry_preprod` and `public.cerebro_company_engine_state_preprod` returned no rows in inspected Supabase project on 13/11/2026. No live JOB-001 adapter is connected. It would be incorrect to state all engines work. Existing App/CRM and Production remain untouched.

**Client compatibility:** `createUniversalInterfaceAutoConnectV0` now exposes `readOwnerSources()` for six interface types (Operativa, JARVIS, Neuronal, Navigator, App, Mobile), subject to server owner grants. This is a reusable SDK contract, not proof that six physical UI applications are deployed.

**Production promotion gate:** blocked until physical E2E owner read, traceable engine-to-source bindings, durable audit/job runtime, OLD vs NEW, preflight/rollback tests and canary. PR #66 stays DRAFT.

## V0.8 Stable Preview and engine historical bindings

Stable LAB hostname: `fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app`, mapped to the isolated Vercel deployment `dpl_C8XwLVpDTdYwHBFoHiywBw42tEBK`. `get_job001_controls` emits bounded, historical per-engine PREPROD evidence only, not runtime proof. The owner's active Opera tab has not been navigated; physical owner E2E on the stable alias remains pending. No PROD promotion and no extra subscription.

## V0.11 Owner audit acceptance

FACT-001 dry-run policy check now writes an owner-verified idempotent audit record exclusively in isolated PREPROD. E2E verified with the same authenticated Opera tab; 1 durable row after repeated replay, 0 executions, 0 PROD authorizations. One-time QA marker removed from URL after confirmation without a tab reload. **JOB-001 Hostinger master still unverified and autonomous PROD dispatch disabled.**
