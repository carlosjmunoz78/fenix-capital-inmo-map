# CEREBRO OS · CHANGELOG

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