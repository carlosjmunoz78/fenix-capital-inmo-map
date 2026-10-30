# CEREBRO OS · JOB-001 GitHub Actions Finite Burst V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Purpose
Replace wasteful permanent GitHub Actions occupancy with bounded bursts while preserving the canonical JOB-001 runtime, work pump, safety contract and rollback path.

## Existing preserved path
`CEREBRO Continuous Useful Worker V1` remains available as the OLD rollback path, but PREPROD self-rearm is drained to zero. PROD and Browser PROD are untouched.

## NEW path
`CEREBRO JOB-001 Finite Burst V1` reuses the canonical JOB-001 control plane and `mission-derived-useful-work-v1.mjs`, creates no second queue/scheduler/daemon, is finite, PREPROD-only, non-self-refilling and denies PROD writes, Trading and paid fan-out.

## Physical evidence
Run `41036983202` proved the finite useful-work path with 8 lanes x 2 units and final acceptance GREEN.

## Capacity and entitlement
Repository/organization governance is verified under `fenix-cerebro` / `cerebro-os`, but the Enterprise account is still TRIAL. GitHub documents that increased Actions job concurrency is not included in the trial and that the standard hosted-runner baseline is 20 concurrent jobs.

Therefore JOB-001 separates:
- organization verified: `true`;
- paid Actions concurrency entitlement verified: `false`;
- CEREBRO trial-safe lane cap: `20`.

A request for 64 or 500 lanes during TRIAL clamps to 20. Only after paid Actions concurrency entitlement is separately verified may JOB-001 rise above 20, and even then the canonical JOB-001 safety contract still caps Fénix at `max_company_default=48` and `max_global_default=64`.

Thus the paid Enterprise 500-job ceiling can never be used to bypass JOB-001's own safety contract.

## Cost
The canonical repository is public, so standard GitHub-hosted runners are free. Larger runners are not authorized by this capability.

## OLD vs NEW
OLD remains preserved for rollback but does not self-refill in PREPROD.
NEW uses the same useful-work implementation with finite leases, releases runners after completion and stays fail-closed on cost/authority.

## Rollback
Revert:
- `cerebro/config/github-actions-burst.v1.json`
- `cerebro/runtime/job001-actions-burst-router-v1.mjs`
- `cerebro/tests/job001-actions-burst-router-v1.test.mjs`
- `.github/workflows/cerebro-job001-actions-burst-v1.yml`
- this document.

If paid Actions entitlement evidence is absent, keep `enterprise_actions_concurrency_entitlement_verified=false`; this restores/maintains the 20-lane safety cap without reactivating old continuous workers.

No data migration or external mutation is performed.
