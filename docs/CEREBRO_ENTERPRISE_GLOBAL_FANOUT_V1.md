# CEREBRO OS · Enterprise Global Finite Fanout V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Prepare a governed global GitHub Actions fanout topology capable of 500 unique useful PREPROD work units once paid Enterprise Actions concurrency is actually entitled, while using the full documented standard-runner baseline during the current Enterprise trial.

## Existing components reused
- canonical Mission DAG from `mission-recursive-decomposer-v1.mjs`;
- bounded executor `mission-derived-useful-work-v1.mjs`;
- verified repository/organization policy;
- existing JOB-001/control-plane governance.

No second queue, scheduler, daemon or permanent Actions runtime is created.

## Available useful work
The Mission DAG exposes 28 macrofronts × 14 phases × 6 atomic/capability units = 2,352 selectable work units. V1 requires unique `work_unit_id` values and never fabricates empty jobs.

## Paid 500-job topology
The paid Enterprise standard-runner ceiling documented by GitHub is 500 concurrent jobs; a single matrix is capped at 256.
The physical planner additionally requires the currently observed live runner maximum. The policy records 180; therefore a paid-entitled physical plan is capped at `min(180, 500) = 180`. The published 500 is not treated as the current live entitlement. Update the live maximum only from fresh runner-settings evidence; missing or invalid values fail closed.

Prepared topology:
- Matrix A: up to 250 unique useful units.
- Matrix B: up to 250 unique useful units.
- Combined paid-readiness topology: 500.

This topology is statically and contract-tested even while physical 500 execution remains disabled.

## Current TRIAL gate
Live Enterprise state is TRIAL. GitHub documentation states that increased Actions job concurrency is not included in the Enterprise trial. GitHub's standard hosted-runner baseline without the Enterprise increase is 20 concurrent jobs.

Current policy therefore requires:
- `enterprise_organization_verified_for_canonical_repo=true`;
- `enterprise_actions_concurrency_entitlement_verified=false`;
- `global_500_fanout_enabled=false`;
- `cerebro_trial_safe_parallelism_cap=20`.

A physical request above 20 fails before matrix creation. The PR canary uses 20 real work units, split 10 + 10. The default manual dispatch is also 20 until paid entitlement is explicitly verified.

The issue reports that the account is paid, but the repository's versioned entitlement fields still state `TRIAL` and keep paid concurrency disabled. This change intentionally does not activate that entitlement; the checked-in plan therefore remains capped at 20 until the entitlement evidence and policy are reconciled. If entitlement is later verified while the live maximum remains 180, the planner allows at most 180. When the live maximum is verified at 500, no topology change is required.

## OLD vs NEW
- OLD: after both paid-entitlement flags were set, the planner accepted up to 500 physical units even if the live runner maximum was 180.
- NEW: the physical cap is `min(live_standard_runner_concurrent_jobs_max, entitlement cap)`. With verified paid entitlement and live max 180, requests above 180 fail before matrix creation; at live max 500, the existing two-matrix topology still supports 500 unique useful units. With the checked-in TRIAL flags, the cap remains 20.
- Existing Mission DAG selection, matrix split, executor, PREPROD boundary and no-empty-work behavior are unchanged.

## Paid activation gate
Physical 500 execution becomes eligible only after separate evidence that the account has paid Enterprise Actions concurrency, followed by a policy change setting:
- `enterprise_actions_concurrency_entitlement_verified=true`;
- `global_500_fanout_enabled=true`.

Activating a paid plan is `HUMAN_REQUIRED · MONEY_LIMIT`; CEREBRO must not purchase or activate it silently.

## Safety boundaries
Every selected unit is PREPROD, finite and non-self-refilling, with no PROD write, external write, Trading or paid AI authority. Workflow permissions remain read-only.

## Relationship to JOB-001
500 is a global paid-platform readiness ceiling, not a JOB-001 limit. JOB-001 retains `max_company_default=48` and `max_global_default=64`; during TRIAL it is additionally capped by CEREBRO at 20.

## Cost
The canonical repository is public. Standard GitHub-hosted runners are free for public repositories; larger runners remain separately billable and are not authorized by this capability.

## Rollback
If rollback is needed, first keep/set both paid-entitlement flags to `false`, then revert this change to:
- `cerebro/config/github-enterprise-execution.v1.json`
- `cerebro/runtime/enterprise-global-fanout-v1.mjs`
- `cerebro/tests/enterprise-global-fanout-v1.test.mjs`
- this document.

The rollback restores the pre-change planner; paid fanout must remain disabled while that planner is restored because it does not enforce the live runner maximum. No data migration is required. Existing workers/schedulers remain preserved.
