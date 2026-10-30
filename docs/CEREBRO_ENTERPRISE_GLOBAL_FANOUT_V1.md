# CEREBRO OS · Enterprise Global Finite Fanout V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Run CEREBRO at the maximum physically verified GitHub Actions capacity while keeping the documented 500-job Enterprise topology ready for immediate promotion when GitHub exposes that full limit to this Enterprise account.

## Existing components reused
- canonical Mission DAG from `mission-recursive-decomposer-v1.mjs`;
- bounded executor `mission-derived-useful-work-v1.mjs`;
- paid Enterprise account `cerebro-os`;
- organization `fenix-cerebro`;
- existing JOB-001/control-plane governance.

No second queue, scheduler, daemon or permanent Actions runtime is created.

## Available useful work
The Mission DAG exposes 28 macrofronts × 14 phases × 6 atomic/capability units = 2,352 selectable work units. V1 requires unique `work_unit_id` values and never fabricates empty capacity jobs.

## Verified live state
Paid GitHub Enterprise is active and billed monthly. The live Enterprise GitHub-hosted runners page reports `All jobs usage 1/180` on 2026-10-30, so the physically verified concurrent runner cap is 180 now.

GitHub documentation separately publishes:
- Enterprise standard GitHub-hosted runner ceiling: 500 concurrent jobs;
- single workflow matrix ceiling: 256 jobs.

CEREBRO therefore distinguishes:
- `documented_enterprise_platform_ceiling=500`;
- `live_enterprise_runner_limit=180`;
- `effective_physical_cap=180`;
- `global_500_topology_prepared=true`;
- `global_500_fanout_enabled=false` until the live runner panel reports at least 500.

## Current physical topology
At the verified live cap of 180:
- Matrix A: 90 unique useful Mission DAG units.
- Matrix B: 90 unique useful Mission DAG units.
- Combined physical burst: 180.

A request above 180 fails before matrix creation.

## Prepared 500 topology
The same planner already supports:
- Matrix A: up to 250 unique useful units.
- Matrix B: up to 250 unique useful units.
- Combined: 500.

When GitHub raises the live runner limit to 500 or higher, promotion only requires updating the verified live limit and setting `global_500_fanout_enabled=true`; no new scheduler, queue, daemon or executor is required.

## Pull-request canary
PR validation stays deliberately bounded at 20 real work units so governance changes can be tested without occupying the whole Enterprise account before merge. This is a validation canary, not the production capacity limit.

## One-shot post-merge proof
The workflow accepts a tagged main push containing `[CEREBRO-LIVE-FANOUT]`. That tagged merge requests 180 real PREPROD Mission DAG units exactly once. Ordinary future pushes do not auto-launch the full burst.

## Safety boundaries
Every selected unit is PREPROD, finite and non-self-refilling, with:
- no PROD write;
- no external write;
- no Trading;
- no paid AI;
- read-only workflow permissions.

## Relationship to JOB-001
The global runner cap is not a JOB-001 limit. JOB-001 keeps its canonical contract:
- `max_global_default=64`;
- `max_company_default=48`;
- `max_deepseek_default=8`;
- `max_repo_write_default=1`.

With paid Enterprise verified, JOB-001 can use its full 48-company lane cap while the global fanout layer uses the wider Enterprise capacity for other independent work.

## Cost
Enterprise Cloud is already active as one paid seat. This capability does not authorize larger runners, extra seats, new subscriptions or silent overage. Standard public-repository Actions remain the preferred execution path.

## Rollback
Revert:
- `cerebro/config/github-enterprise-execution.v1.json`;
- `cerebro/runtime/enterprise-global-fanout-v1.mjs`;
- `cerebro/tests/enterprise-global-fanout-v1.test.mjs`;
- `.github/workflows/cerebro-enterprise-global-fanout-v1.yml`;
- this document.

Rollback returns physical fanout to the previous bounded state without deleting existing queues, workers, schedulers or production services.
