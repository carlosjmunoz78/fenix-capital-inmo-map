# CEREBRO OS · DEPENDENCY MAP

## Structural chain

`FACT-001 → GOV-001 → shared contracts/runtime → Phase 2 bindings → Phase 3 zero-cost platform → Phase 4 multi-company bootstrap → Phase 5 Console/Gateway → Governance V0 → persistent EVT/JOB reference`

## Existing-system preservation boundary

CEREBRO code under `cerebro/` wraps and references existing systems; it does not replace their runtime contracts. Evidence status is tracked separately from binding existence in `evidence/phase2-existing-bindings-audit.json`.

## Phase 2 bindings + current evidence state

- `CORE-001` → existing core/app contracts → `DOCUMENTED_PARTIAL`; no formal live CEREBRO Core claim.
- `SUP-001` → governance/supervision source surfaces → `DOCUMENTED_PARTIAL`; dedicated live supervisor audit still required.
- `TRN-001` → knowledge/training source surfaces → `DOCUMENTED_PARTIAL`; no autonomous training-engine claim.
- `APP-001` → existing App Fénix contracts → `CONFIRMED_OPERATIONAL` for the existing App surface only, via exact-SHA PROD deploy/smoke on `6bf6af92c1106884da87fb9a659f807093d47e0a`; this is not CEREBRO autonomy.
- `CRM-001` → CRM/Supabase boundary → `UNKNOWN_REQUIRES_AUDIT`.
- `DOC-001` → document contracts and previously green document/backfill scope → `DOCUMENTED_PARTIAL`; full DOC engine not proven.
- `SEO-001` → SEO contract target → `UNKNOWN_REQUIRES_AUDIT`.
- `WEB-001` → WordPress/web contract target → `UNKNOWN_REQUIRES_AUDIT` and must be audited in its own system/repository.
- `LAB-TRD` → Trading LAB → `UNKNOWN_REQUIRES_AUDIT`, explicitly isolated from App/CRM/CEREBRO PROD credentials and execution.

## Phase 3

- `RUNTIME-001` supplies shared execution semantics for reference engines.
- `EVT-001` supplies event/outbox-inbox semantics and now has an additive persistent local/self-hosted PREPROD single-writer adapter. It is not yet wired as a replacement for the in-memory runtime.
- `JOB-001` supplies job semantics and now has an additive persistent local/self-hosted PREPROD single-writer adapter with durable abandoned-claim recovery on reopen. It is not yet wired as a replacement for the in-memory runtime.
- `FINOPS-001` enforces additional-budget target 0 € and `MONEY_LIMIT` escalation.
- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` remain defined contracts/targets.

## Governance V0

- `POL-001` evaluates versioned policy deterministically and fail-closed in PREPROD reference scope.
- `HEX-001` routes canonical HUMAN_REQUIRED exceptions with stable event identity and tenant isolation.
- Governance does not by itself authorize autonomous PROD execution.

## Phase 4 graph

The multi-company bootstrap contains exactly 17 canonical engines. `ENGACT-001` depends on `TENANT-001` being GREEN before activation becomes READY. All Phase 4 execution remains PREPROD-only in V0 and cannot autonomously promote to PROD.

## Phase 5 graph

- `CONSOLE-001`: console/session surface.
- `CTX-001`: company/context selection boundary.
- `CMD-001`: command execution surface.
- `CHAT-001`: chat surface.
- `ACTGW-001`: mandatory CEREBRO Gateway mediation boundary.

Commands and chat are Gateway-mediated; direct model access is forbidden by contract. Session `company_id`, `environment`, and `version` are authoritative and cannot be overridden by caller context.

## Shared safety dependencies

Every promoted engine must retain: contracts, permissions, tests, evaluation, tribunal, observability, backup, rollback, rebuild, measured cost, policy and PREPROD evidence. Green scaffold/reference or read-only audit status is not equivalent to autonomous production readiness.

Before wiring persistent `EVT-001`/`JOB-001` into `SharedRuntime`, require explicit OLD-vs-NEW comparison, rollback path, dependency review and multi-process/shared-worker safety design. The current persistent adapters remain parallel by design.
