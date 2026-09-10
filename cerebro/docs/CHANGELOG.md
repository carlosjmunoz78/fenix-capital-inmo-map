# CEREBRO OS · CHANGELOG

## 2026-09-10 · FACT-001 E2E structural closure

- Added semantic end-to-end validation for all 177 canonical Factory scaffolds and all 18 generated components per engine.
- Verified canonical context fields, deny-by-default permissions, cross-company deny, HUMAN_REQUIRED policy set, Gateway-only API, evaluation/tribunal states, observability, FinOps zero-cost default, backup/rollback/rebuild declarations, training hooks and non-autonomous documentation.
- Hardened `validateRegistry()` so FACT-001 V0 accepts only exact `SCAFFOLD` engine environments; `PREPROD` and `PROD`-labelled registry inputs fail closed before generation.
- Added negative regressions for `PROD` and `PREPROD` registry environments and full-output reproducibility across clean directories.
- Initial exact-head Codex review found one P2 (environment self-validation); it was corrected and the review thread resolved.
- Exact code head `dd68098752b9a3429e18ba9bf13548f5543ba337`: CEREBRO Factory PREPROD #169 success and Codex exact-head review reported no major issues.
- This closure proves Factory V0 structural generation capability only; it does not mark the 177 generated engines operational or autonomous PROD.
- No App/web/Trading/PROD change and no merge to `main` is part of this closure.

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
