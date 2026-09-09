# CEREBRO OS · DEPENDENCY MAP

## Structural chain

`FACT-001 → GOV-001 → shared contracts/runtime → Phase 2 bindings → Phase 3 zero-cost platform → Phase 4 multi-company bootstrap → Phase 5 Console/Gateway`

## Existing-system preservation boundary

CEREBRO code under `cerebro/` wraps and references existing systems; it does not replace their runtime contracts. Existing-system bindings are read-only/contract-only until live evidence proves more.

## Phase 2 bindings

- `CORE-001` → existing core contracts, live state POR AUDITAR.
- `SUP-001` → supervisor contracts, live state POR AUDITAR.
- `TRN-001` → training contracts, live state POR AUDITAR.
- `APP-001` → App Fénix contracts, preserve existing behavior.
- `CRM-001` → CRM contracts, preserve existing behavior.
- `DOC-001` → document contracts, preserve existing behavior.
- `SEO-001` → SEO contracts, preserve existing behavior.
- `WEB-001` → web contracts, preserve existing behavior.
- `LAB-TRD` → Trading LAB, explicitly isolated from App/CRM/CEREBRO PROD credentials and execution.

## Phase 3

- `RUNTIME-001` supplies shared execution semantics for reference engines.
- `EVT-001` supplies reference event/outbox-inbox semantics.
- `JOB-001` supplies reference job semantics.
- `FINOPS-001` enforces additional-budget target 0 € and `MONEY_LIMIT` escalation.
- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` remain defined contracts/targets.

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

Every promoted engine must retain: contracts, permissions, tests, evaluation, tribunal, observability, backup, rollback, rebuild, measured cost, policy and PREPROD evidence. Green scaffold/reference status is not equivalent to autonomous production readiness.