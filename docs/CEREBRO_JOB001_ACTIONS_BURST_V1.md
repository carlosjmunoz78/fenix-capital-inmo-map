# CEREBRO OS · JOB-001 GitHub Actions Finite Burst V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Purpose
Replace wasteful permanent GitHub Actions occupancy with bounded bursts while preserving the canonical JOB-001 runtime, work pump, safety contract and rollback path.

## Existing preserved path
`CEREBRO Continuous Useful Worker V1` remains available as the OLD rollback path, but PREPROD self-rearm is drained to zero. PROD and Browser PROD are untouched.

## NEW path
`CEREBRO JOB-001 Finite Burst V1` reuses the canonical JOB-001 control plane and `mission-derived-useful-work-v1.mjs`, creates no second queue/scheduler/daemon, is finite, PREPROD-only, non-self-refilling and denies PROD writes, Trading and uncontrolled paid fan-out.

## Physical evidence
Run `41036983202` proved the finite useful-work path with 8 lanes x 2 units and final acceptance GREEN. The paid-Enterprise update keeps the same runtime and only changes the entitlement ceiling available to it.

## Capacity and entitlement
Repository/organization governance is verified under `fenix-cerebro` / `cerebro-os`. GitHub Enterprise is now PAID and Actions concurrency entitlement is verified.

The live Enterprise runner panel currently exposes 180 total standard hosted jobs. JOB-001 does not consume that whole platform allowance because its own canonical safety contract is stricter:
- `max_global_default=64`;
- `max_company_default=48`;
- `max_deepseek_default=8`;
- `max_repo_write_default=1`.

Therefore a request for 64, 180 or 500 JOB-001 lanes clamps to 48 for company `fenix`. The wider Enterprise capacity is reserved for other independent engines/workflows through the global fanout layer.

If paid Actions entitlement is lost, JOB-001 falls back to the standard 20-lane gate without reactivating continuous workers.

## Cost
Enterprise is already active as one paid seat. This capability adds no new subscription, larger runner or silent overage. The canonical repository is public and standard GitHub-hosted runners remain the preferred path.

## OLD vs NEW
OLD remains preserved for rollback but does not self-refill in PREPROD.
NEW uses the same useful-work implementation with finite leases, releases runners after completion and stays fail-closed on authority and cost.

## Rollback
Revert:
- `cerebro/config/github-actions-burst.v1.json`
- `cerebro/runtime/job001-actions-burst-router-v1.mjs`
- `cerebro/tests/job001-actions-burst-router-v1.test.mjs`
- `.github/workflows/cerebro-job001-actions-burst-v1.yml`
- this document.

If paid entitlement evidence disappears, set `enterprise_actions_concurrency_entitlement_verified=false`; the router returns to the 20-lane safety cap.

No data migration or external mutation is performed.
