# CEREBRO OS · GitHub Enterprise Acceleration V0

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Exploit already-contracted GitHub capacity to accelerate CEREBRO engineering, tests, evaluation, generation and finite batch work without turning GitHub Actions into a permanent application runtime and without removing existing services before equivalence is proven.

## Verified live state
- Canonical repository: `fenix-cerebro/fenix-capital-inmo-map`.
- Repository owner type: organization `fenix-cerebro`.
- Organization `fenix-cerebro` is part of Enterprise account `cerebro-os`.
- The ChatGPT GitHub connector has a dedicated installation for organization `fenix-cerebro` and can write to the canonical repository.
- Repository transfer preserved the same repository identity while moving ownership from the personal account to the Enterprise organization.
- OIDC compatibility was prepared OLD + NEW before transfer and the post-transfer repository runs under the new owner.
- Enterprise repository entitlement is therefore VERIFIED for the canonical repository.

## Capacity model
- GitHub Enterprise standard-runner platform ceiling: 500 concurrent jobs globally, subject to the contracted account/platform limit.
- A single workflow matrix is capped at 256 jobs.
- This V0 acceleration workflow caps PREPROD test sharding at 128 parallel jobs.
- Jobs are created only for discovered independent work; CEREBRO never spawns empty capacity jobs just to occupy the ceiling.
- Per-engine and per-company contracts remain authoritative below the platform ceiling.
- JOB-001, for example, remains capped by its canonical `max_company_default=48` even when a request expresses 500-lane platform intent.
- The 500-job ceiling is therefore a global capacity budget across independent engines/workflows/companies, not permission for one engine to bypass its own safety contract.

## What GitHub Actions should absorb first
Candidate workloads, only after tests prove equivalence:
1. CI and regression suites.
2. Engine/skill scaffolding and deterministic generation.
3. Evaluation/tribunal test batches.
4. Repository audits and policy checks.
5. Scheduled finite research/data refresh jobs where terms and duration fit.
6. Build/package/release candidate generation.
7. Static analysis, dependency checks and evidence generation.
8. PREPROD smoke orchestration where the workflow itself does not become the production runtime.

## What GitHub Actions must not replace
- Supabase transactional App/CRM/Auth core merely to consolidate vendors.
- Permanent APIs/web servers.
- Databases.
- Always-on or customer-facing transactional queues.
- Stateful long-running production workers that require durable runtime semantics.
- Browser/PC/device runtimes requiring a physical continuous presence.
- Any service for which OLD vs NEW, PREPROD and rollback have not passed.

## Acceleration model
- Discover actual independent units of work.
- Generate dynamic matrices only for those units.
- One matrix never exceeds 256 jobs.
- PREPROD acceleration workflow uses at most 128 parallel shards.
- Preserve a full baseline regression job so sharded execution is checked against existing behavior.
- Cancel stale branch/PR runs so obsolete work does not consume capacity.
- Use Linux runners by default; macOS only when the artifact genuinely requires it.
- Keep old continuous PREPROD workers drained; verified Enterprise entitlement does not reactivate permanent runner occupancy.

## Copilot integration
Repository-level instructions live at `.github/copilot-instructions.md` and encode CEREBRO governance, PREPROD-first behavior, zero-cost preference, anti-loop rules and rollback requirements.

Copilot is an engineering accelerator, not a generic runtime API dependency. Generated code must still pass normal contracts, tests, evaluation and promotion policy.

## Service consolidation gate
No existing paid/external service is removed by this V0.

For each candidate service:
`INVENTORY -> DEPENDENCIES -> CURRENT CONTRACT -> COST -> REPLACEMENT CONTRACT -> PARALLEL IMPLEMENTATION -> PREPROD -> OLD vs NEW -> ROLLBACK -> DECISION`

Only then classify:
- KEEP
- REDUCE
- REPLACE
- RETIRE

## Acceptance criteria for V0
1. Copilot repository instructions present.
2. Execution policy is machine-readable.
3. Enterprise organization/repository entitlement is evidence-backed and marked verified.
4. Dynamic parallel test workflow passes on a PR under `fenix-cerebro`.
5. Full existing CEREBRO regression also passes in the same PR.
6. No PROD deployment or external writes are performed.
7. No existing service is removed.
8. Capacity claims distinguish global platform ceiling (500), single-matrix ceiling (256), workflow cap (128) and engine-specific caps.

## Rollback
This V0 remains additive. Rollback is revert of:
- `.github/copilot-instructions.md`
- `cerebro/config/github-enterprise-execution.v1.json`
- `.github/workflows/cerebro-enterprise-acceleration-v0.yml`
- this runbook

Entitlement rollback is fail-closed: set `enterprise_organization_verified_for_canonical_repo=false` and restore the previous bounded policy if organization/repository evidence is lost.

No data migration is required.
