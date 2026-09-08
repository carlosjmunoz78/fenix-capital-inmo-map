# CEREBRO OS · CHANGELOG

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

A merge/deploy entry records structural/reference evidence for that scope. It must not be read as proof that every named engine is operational or autonomous in production.