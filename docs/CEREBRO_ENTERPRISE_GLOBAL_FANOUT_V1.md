# CEREBRO OS · Enterprise Global Finite Fanout V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Run governed global GitHub Actions fanout using unique useful PREPROD work only, bounded by the current live runner maximum and the documented paid Enterprise ceiling.

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

This topology is statically and contract-tested. The current live physical maximum is 180; the 500-unit plan is only eligible after the live maximum is separately verified at 500.

## Current paid entitlement and live cap
Issue #1026 reports a paid `cerebro-os` Enterprise account and a live standard-runner maximum of 180. The policy records:

- `enterprise_account_state=PAID`;
- `enterprise_actions_concurrency_entitlement_verified=true`;
- `global_500_fanout_enabled=true`;
- `live_standard_runner_concurrent_jobs_max=180`.

The physical cap is `min(live_standard_runner_concurrent_jobs_max, paid Enterprise ceiling)`, currently 180. The manual dispatch default is 180. Pull-request canaries remain at 20 useful units, split 10 + 10, and the general regression test-shard workflow remains conservatively capped at 20.

If the paid gates are disabled or absent, the planner falls back to 20. A missing or invalid live maximum fails closed. Raising the physical cap to 500 requires fresh evidence that the live runner maximum has actually reached 500; changing the published ceiling alone is insufficient.

## OLD vs NEW
- OLD: paid gates were disabled, so the plan stayed at 20; if enabled, the planner could accept 500 even when the live runner maximum was 180.
- NEW: paid gates are enabled based on issue #1026 evidence and physical planning is capped at 180. Requests above 180 fail before matrix creation. If live settings are later verified at 500, the existing two-matrix topology supports 500 unique useful units. Disabling the paid gates returns to the 20-unit fallback.
- Existing Mission DAG selection, matrix split, executor, PREPROD boundary and no-empty-work behavior are unchanged.

## Future 500 promotion
No architecture change is needed for 500. Update the live maximum only after fresh runner-settings evidence, keep the 500 documented platform ceiling, and run the deterministic 500-plan contract tests. No workflow dispatch is implied by that policy update.

## Safety boundaries
Every selected unit is PREPROD, finite and non-self-refilling, with no PROD write, external write, Trading or paid AI authority. Workflow permissions remain read-only.

## Relationship to JOB-001
500 is a global paid-platform ceiling, not a JOB-001 limit. JOB-001 retains its independent contract (`max_company_default=48`, `max_global_default=64`) and conservative local entitlement gate; this fanout promotion does not change JOB-001 execution.

## Cost
The canonical repository is public. Standard GitHub-hosted runners are free for public repositories; larger runners remain separately billable and are not authorized by this capability.

## Rollback
If rollback is needed, disable `enterprise_actions_concurrency_entitlement_verified` and `global_500_fanout_enabled`, set the manual dispatch default back to 20, and keep the factual account state (`PAID`) and observed live maximum (180) intact. The planner then falls back to 20. If reverting code, do so only after disabling those gates.

No data migration is required. Existing workers/schedulers remain preserved.
