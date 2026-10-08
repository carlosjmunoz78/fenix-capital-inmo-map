# CEREBRO OS · CHANGELOG

## 2026-10-08 · COMP-ONB-001 Structural Onboarding V0 candidate

- Added an additive multi-company structural adapter that composes the existing Phase 4 dependency graph with verified FACT-001 AutoFactory; no new canonical engine ID is introduced.
- A bounded new-company structural request now prepares the 17 canonical Phase 4 engine scaffolds in tenant-scoped evidence while preserving the generic 18-file FACT scaffold bytes.
- Expected structural output is 17 engines × 18 canonical files = 306 files.
- Structural generation is explicitly forbidden from marking business engines GREEN; after registration the existing READY/BLOCKED Phase 4 state remains authoritative until real PREPROD execution evidence exists.
- Added hostless GitHub automation for push self-check, explicit dispatch and future `repository_dispatch: cerebro_new_company_scaffold`, with repository `contents: read` only.
- PREPROD adapter / SCAFFOLD sub-generation only; cost 0; PROD/PROD-write/Trading/Supabase-write/external-code authority false.
- Small optional structural profile metadata is fingerprinted rather than persisted in result evidence; credential/secret/bank-like fields fail closed to `SECURITY_INCIDENT`.
- Autonomy overlay records `AUTOMATIC_COMPANY_SCAFFOLD_SOFTWARE_READY_LIVE_ACCEPTANCE_PENDING`; no automatic/live claim will be made until exact-head gates, merge, automatic main run and deterministic rerun succeed.
- Real scanning, keyword research, SEO, social/local audit, marketing, knowledge, CRM, App, automations, Training, TENANT activation and PROD remain downstream and are not claimed by this candidate.

## 2026-10-08 · FACT-001 AutoFactory V0 accepted

- FACT-001 bounded request contract remains scoped by canonical `company_id`, `engine_id`, `environment`, `version` context and wraps the existing factory authority instead of replacing it.
- PR #507 merged the hostless/event-driven AutoFactory implementation to `main` as `a20b98ac9ff006ebbbd9a6fbd51f16d8cdf8cee4` after exact-head promotion/readiness gates passed.
- Merge to `main` automatically triggered run `37830400943` attempt 1 without manual launch: `FACTORY_SCAFFOLD_GREEN`, 18 structural files, 634 regression tests passed / 0 failed, no HUMAN_REQUIRED, cost 0, PROD/Trading false.
- Deterministic rerun `37830400943` attempt 2 completed SUCCESS against the same immutable source/request.
- Both attempts produced the same idempotency key `fact001:9d7a6ad8651866e85f7199b3cfdf38928a09a302fa29cf2e6a962853dfac6427`, same generated bundle SHA-256 `e55c45943dba3cf084c0f657cc1cb529a3a23e5b293e2549b2b51ffb36675b74` and same registry SHA-256 `92717b6109caade90e9c3c89940536122d8583cd8fe8695a4118119febe2caf8`.
- FACT-001 autonomy state is promoted to `AUTOMATIC_SCAFFOLD_VERIFIED` only for connected canonical SCAFFOLD request generation.
- Generated target engines remain SCAFFOLD-only: target behavioral evaluation, tribunal, PREPROD and any PROD promotion remain downstream gates.
- ACTGW-001 → `repository_dispatch` support is defined but remains POR AUDITAR LIVE; Git-backed automatic request execution is verified.
- Workflow permission remains `contents: read`; no new credentials, Supabase writes, production writes, Trading access or paid path were introduced.

## 2026-10-07 · Skill Supply Chain Step 4 PREPROD GREEN

- Evidence head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`; workflow `37647914902` SUCCESS; artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.
- Ejecutado PREPROD runtime OLD vs NEW sobre `SharedRuntime`: 18 ejecuciones, 2 packages, fixtures sintéticos no cliente, coste adicional medido 0 €.
- Observabilidad/audit/FinOps persistentes locales activos; rollback físico del binding y rebuild default-disabled GREEN.
- Independent PREPROD Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`; blockers=[].
- `HUMAN_REQUIRED=HIGH_RISK`, `merge_authorized=false`, `prod_authorized=false`, `autonomous_promotion_authorized=false`.
- Sin datos PROD/cliente, código externo de skills, writes PROD, Trading ni paid fallback.
- Step 4 no ejecuta side effects externos de las skills: continúan como guidance no confiable detrás de wrappers CEREBRO.

## 2026-10-07 · Skill Supply Chain Step 3 closure

- PR #486 permanece DRAFT y sin autorización de merge/PROD.
- Congelada evidencia behavioral en `135fc29a9b41d7257381c08efea49015db1e71d9` antes del commit documental.
- Supabase/Postgres run `37642814017`: Behavioral proxy 6/6, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN y `READY_FOR_PREPROD_PROMOTION_REVIEW`; artifact `11492473830`, digest `sha256:2837ab122a2efbab92536f32519c971d7967c071ada5594dff2258f78796c3e0`.
- agent-browser run `37644374137`: Behavioral proxy 6/6, raw `STATIC_LAB_HOLD` preservado, normalized wrapper GREEN, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN y `READY_FOR_PREPROD_PROMOTION_REVIEW`; artifact `11494440533`, digest `sha256:0a1f97bf1e7271454627eb7553147dfa5930c28a26fac20232fd1acd58e06d5c`.
- Ambos quedaron `HUMAN_REQUIRED=HIGH_RISK`, sin merge/PROD/autopromotion.

## 2026-09-09 · Persistent EVT-001 / JOB-001 V0

- PR #168 merged as `26fb9c75b9a7361afccccdc111761ad10aac5fa4` after exact-head review of `16484fdf50760afbd98e1d85824ed352dd3a5585`.
- Added local/self-hosted PREPROD persistence for `EVT-001` and `JOB-001` as parallel single-writer adapters; existing in-memory EventBus/JobQueue remain preserved.
- Added exact persisted payload checksum, atomic temp-write/fsync/rename/directory-fsync, ancestor-directory fsync, deterministic replay, restart idempotency and corruption/kind fail-closed handling.
- Hardened caller-input snapshots, exact PREPROD operation boundaries, ambiguous post-rename durability poisoning and tenant/context isolation.
- Added durable restart recovery for jobs abandoned in `RUNNING`: retry to `QUEUED` when attempts remain, otherwise terminal `FAILED`.
- PREPROD Factory `34337677363` and App Build `34337677429` success on exact reviewed head.
- Codex exact-head review closed with no remaining P1/P2 suggestions.
- PROD Live Deploy `34340279918` and PROD Runtime Smoke `34340279922` success on exact merge SHA.
- `autonomous_prod=false`, `prod_writes=false`, no Supabase dependency and no new paid service.

## 2026-09-09 · Governance V0

- PR #167 merged as `c523da8f11dbf1a2618982aeeb5940670317bb6e`.
- `POL-001` and `HEX-001` structural/reference V0 completed with deterministic PREPROD-only policy evaluation and canonical HUMAN_REQUIRED exception routing.
- Hardened fail-closed policy inputs, isolation, priority/tie semantics, stable exception event identity and replay/idempotency behavior through iterative exact-head review.
- PROD Live Deploy `34330670776` and PROD Runtime Smoke `34330670550` success on exact merge SHA.
- No autonomous PROD promotion was enabled.

## 2026-09-09 · Phase 2 read-only evidence audit V0

- Audited all nine existing-engine bindings without activation, writes or new cost.
- `APP-001` moved at evidence level to `CONFIRMED_OPERATIONAL` for the existing App surface only, based on exact-SHA PROD Live Deploy `34293941974` and PROD Runtime Smoke `34293942069` on `6bf6af92c1106884da87fb9a659f807093d47e0a`.
- `CORE-001`, `SUP-001`, `TRN-001`, `DOC-001` remain `DOCUMENTED_PARTIAL`.
- `CRM-001`, `SEO-001`, `WEB-001`, `LAB-TRD` remain `UNKNOWN_REQUIRES_AUDIT`; Trading stays isolated and requires separate audit.
- Added machine-validated evidence ledger and tests preventing partial/source-only evidence from being mislabeled as live confirmation.
- No binding was enabled for autonomous PROD execution.

## 2026-09-09 · Documentation closure

- PR #165 merged as `6bf6af92c1106884da87fb9a659f807093d47e0a`.
- Canonical state, dependency map, runbook, evidence, changelog, backup/rebuild and autonomy documentation aligned with Phase 4/5 evidence.
- Added explicit emergency rollback procedure tied to `docs/PROD_ROLLBACK_RUNBOOK.md`.
- PROD Live Deploy `34293941974` and PROD Runtime Smoke `34293942069` success on exact merge SHA.

## 2026-09-09 · Phase 5 Console/Gateway V0

- PR #164 merged as `c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9`.
- Added Console/Gateway V0 for `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.
- Added company-bound sessions/context, history, audit, engine consultation, Gateway-mediated command/chat.
- Hardened recursive cloning against shared memory, `WebAssembly.Memory` and accessors.
- Preserved authoritative `company_id/environment/version` and async operation context snapshots.
- Added separate failure audit and canonical HUMAN_REQUIRED escalation classification.
- PREPROD Factory/App green on exact reviewed head `2180258a3ae91697d6bd988361996afa62032f72`.
- Codex exact-head review found no major issues.
- PROD Live Deploy `34292739019` success and PROD Runtime Smoke `34292739031` success on merge SHA.

## 2026-09-09 · Phase 4 Multi-company Bootstrap V0

- PR #163 merged as `cd04fa8ccdbbb5c4945258d579e6bfb8efe1ea01`.
- Added deterministic bootstrap for 17 canonical multi-company engines.
- Enforced PREPROD-only, tenant isolation, canonical HUMAN_REQUIRED and no autonomous PROD promotion.
- Added shared-memory/WebAssembly guards and atomic evidence state transitions.
- Enforced `ENGACT-001` dependency on `TENANT-001` GREEN.
- PREPROD and exact-SHA PROD deploy/smoke gates green.

## Earlier structural milestones

- PR #162: Phase 2 existing-engine wrappers + Phase 3 shared runtime/zero-cost reference.
- PR #161: FACT-001 Factory V0 + GOV-001 Registry V0, 177 canonical IDs and reproducible scaffold generation.
- PR #160: Intervinientes/existing-document backfill production scope, already green and not to be redone.

## Status semantics

A merge/deploy entry records evidence only for its stated scope. `CONFIRMED_OPERATIONAL` for an existing surface does not grant autonomous CEREBRO PROD status.
