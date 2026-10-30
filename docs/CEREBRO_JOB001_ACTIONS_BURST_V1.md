# CEREBRO OS · JOB-001 GitHub Actions Finite Burst V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Purpose
Replace wasteful permanent GitHub Actions occupancy with bounded bursts while preserving the canonical JOB-001 runtime, work pump, safety contract and rollback path.

## Existing preserved path
The existing `CEREBRO Continuous Useful Worker V1` remains unchanged in this V1. It is the OLD path and can continue to self-refill until NEW has passed physical PREPROD and OLD-vs-NEW acceptance.

## NEW path
`CEREBRO JOB-001 Finite Burst V1`:
- reuses `JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT`;
- reuses `mission-derived-useful-work-v1.mjs`;
- creates no queue, scheduler or daemon;
- performs a finite number of units and exits;
- never self-dispatches;
- is PREPROD-only;
- denies PROD writes, Trading and paid fan-out;
- uploads one-day bounded evidence per lane.

## Capacity
Current account/repository Enterprise entitlement remains unverified. Therefore V1 caps standard-runner fan-out at 16 lanes even if a larger request is supplied.

When `enterprise_organization_verified_for_canonical_repo` is evidence-backed and changed to `true`, the router can increase capacity, but JOB-001 still respects its canonical `max_global_default=64` and `max_company_default=48`. Enterprise's platform ceiling is not authority to exceed JOB-001's own safety limits.

## OLD vs NEW
OLD:
- continuous worker lease;
- self-refill;
- intended sustained 48/64 occupancy.

NEW V1:
- same mission-derived useful-work implementation;
- same PREPROD and zero-paid safety boundary;
- finite lanes;
- no self-refill;
- releases GitHub runners after completion.

The old path is not disabled by this PR. Retirement requires physical PREPROD evidence and a separate promotion change with rollback.

## Rollback
V1 is additive. Rollback is deletion/revert of:
- `cerebro/config/github-actions-burst.v1.json`
- `cerebro/runtime/job001-actions-burst-router-v1.mjs`
- `cerebro/tests/job001-actions-burst-router-v1.test.mjs`
- `.github/workflows/cerebro-job001-actions-burst-v1.yml`
- this document.

No data migration or external mutation is performed.
