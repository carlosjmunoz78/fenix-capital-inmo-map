# CEREBRO OS · Enterprise Global Finite Fanout V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Use the verified GitHub Enterprise standard-runner ceiling of 500 concurrent jobs as a governed global capacity budget for useful CEREBRO PREPROD work, without creating another queue, scheduler, daemon or permanent Actions runtime.

## Existing components reused
- `mission-recursive-decomposer-v1.mjs` as the canonical Mission DAG source.
- `mission-derived-useful-work-v1.mjs` as the bounded useful-work executor.
- `github-enterprise-execution.v1.json` as the verified Enterprise entitlement and platform policy.
- Existing CEREBRO JOB-001/control-plane governance remains authoritative for JOB-001-specific work.

This V1 is a finite GitHub fanout layer only. It is not a second scheduler and it does not replace the durable runtime or adaptive work pump.

## Available useful work
The canonical Mission DAG contains 28 macrofronts. Each macrofront has 14 phases, each with 6 atomic/capability units, yielding 2,352 selectable atomic/capability work units.

The V1 planner maps deterministic `(lane, cycle)` pairs through the existing `selectMissionUnit()` selector, requires unique `work_unit_id` values and refuses to fabricate empty capacity jobs.

## 500-job topology
GitHub Enterprise platform ceiling: 500 standard-runner concurrent jobs.
GitHub matrix ceiling: 256 jobs per matrix.

V1 therefore uses two independent matrices:
- Matrix A: up to 250 useful work units.
- Matrix B: up to 250 useful work units.
- Combined governed ceiling: 500.

The split alternates work slots so both matrices are exercised even by small canaries.

## Safety boundaries
Every selected unit must be:
- `environment=PREPROD`;
- no PROD write authority;
- no Trading access;
- no paid AI;
- zero additional subscription cost;
- finite;
- non-self-refilling.

Workflow permissions are read-only (`contents: read`). The fanout cannot deploy PROD or write external systems.

## Relationship to JOB-001
The 500 ceiling is global GitHub platform capacity, not a JOB-001 company limit. JOB-001 retains its own canonical `max_company_default=48` and `max_global_default=64` contract.

Global Fanout V1 is intended for independent hostless Mission DAG work. Engine/company-specific limits remain authoritative and cannot be bypassed by the platform ceiling.

## PR acceptance
Pull requests run a physical 32-unit canary:
- 16 units in Matrix A;
- 16 units in Matrix B;
- unique Mission DAG work;
- same PREPROD executor used by the existing finite burst path.

The default manual dispatch after promotion requests 500 useful units. The planner will produce exactly 250+250 only when 500 unique governed units exist; otherwise planning fails closed rather than creating placeholders.

## Rollback
Revert/delete only:
- `cerebro/runtime/enterprise-global-fanout-v1.mjs`
- `cerebro/tests/enterprise-global-fanout-v1.test.mjs`
- `.github/workflows/cerebro-enterprise-global-fanout-v1.yml`
- this document.

No data migration is required. No existing worker or scheduler is removed or reactivated.
