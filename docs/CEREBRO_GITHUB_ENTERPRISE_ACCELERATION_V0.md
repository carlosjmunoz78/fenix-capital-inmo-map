# CEREBRO OS · GitHub Enterprise Acceleration V0

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Exploit already-contracted GitHub capacity to accelerate CEREBRO engineering, tests, evaluation, generation and finite batch work without turning GitHub Actions into a permanent application runtime and without removing existing services before equivalence is proven.

## Live findings at creation time
- Canonical repository: `carlosjmunoz78/fenix-capital-inmo-map`.
- Repository owner type observed through the connected GitHub account: personal `User`, not an organization.
- Authenticated GitHub connection reported zero organization memberships.
- Therefore the Enterprise 500-job ceiling is treated as PLATFORM_AVAILABLE_BUT_REPO_ENTITLEMENT_UNVERIFIED until the canonical repository is governed by the purchased Enterprise organization/account.
- Current CEREBRO workflows include substantial sequential `node --test` regression work, so test-file sharding can create a real speedup without changing product behavior.

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
- Default PREPROD parallelism is bounded below the platform ceiling until Enterprise entitlement for the canonical repository is verified.
- Preserve a full baseline regression job during V0 so sharded execution is checked against the existing behavior.
- Cancel stale branch/PR runs so obsolete work does not consume capacity.
- Use Linux runners by default; macOS only when the artifact genuinely requires it.

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
3. Dynamic parallel test workflow passes on a draft PR.
4. Full existing CEREBRO regression also passes in the same PR.
5. No PROD deployment or external writes are performed.
6. No existing service is removed.
7. Enterprise organization/repository entitlement is explicitly verified before claiming 500 jobs are usable by this canonical repository.

## Rollback
This entire V0 is additive. Rollback is deletion/revert of:
- `.github/copilot-instructions.md`
- `cerebro/config/github-enterprise-execution.v1.json`
- `.github/workflows/cerebro-enterprise-acceleration-v0.yml`
- this runbook

No data migration is required.
