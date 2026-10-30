# CEREBRO OS · JOB-001 GitHub Actions Finite Burst V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Purpose
Replace wasteful permanent GitHub Actions occupancy with bounded bursts while preserving the canonical JOB-001 runtime, work pump, safety contract and rollback path.

## Existing preserved path
The existing `CEREBRO Continuous Useful Worker V1` remains available as the OLD rollback path, but its PREPROD self-rearm has been drained to zero by the promoted capacity-relief change. This drain is intentional and remains in place even though Enterprise entitlement is now verified, because CEREBRO prefers finite bursts over permanent runner occupancy. PROD and Browser PROD are untouched.

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

## Physical PREPROD evidence
Run `41036983202` completed the governed plan, 8 finite burst lanes x 2 useful-work units, evidence upload and final acceptance successfully. NEW therefore has physical evidence that mission-derived work can execute and release runners without self-refill.

## Capacity
Enterprise entitlement for the canonical repository is now verified after transfer to `fenix-cerebro/fenix-capital-inmo-map` inside Enterprise account `cerebro-os`.

The platform can expose up to 500 concurrent standard-runner jobs globally, while a single matrix remains capped at 256. JOB-001 does not inherit 500 as its own per-company limit: its canonical contract remains `max_global_default=64` and `max_company_default=48`, so a 500-lane request is accepted as platform intent but clamps to 48 JOB-001 lanes for Fénix.

This preserves the principle that platform capacity is a shared global budget across engines/workflows/companies and never overrides engine-specific safety contracts.

## OLD vs NEW
OLD:
- continuous worker lease;
- self-refill drained to zero in PREPROD;
- retained only as rollback evidence/path;
- canonical 48/64 contract remains preserved.

NEW V1:
- same mission-derived useful-work implementation;
- same PREPROD and zero-paid safety boundary;
- finite lanes;
- no self-refill;
- releases GitHub runners after completion;
- Enterprise entitlement verified;
- up to 48 lanes for the current Fénix JOB-001 company contract;
- physical PREPROD acceptance GREEN.

Full deletion of the OLD path is not part of this change. Retirement still requires inventory, dependency map, OLD-vs-NEW evidence and tested rollback.

## Rollback
V1 is additive. Rollback is deletion/revert of:
- `cerebro/config/github-actions-burst.v1.json`
- `cerebro/runtime/job001-actions-burst-router-v1.mjs`
- `cerebro/tests/job001-actions-burst-router-v1.test.mjs`
- `.github/workflows/cerebro-job001-actions-burst-v1.yml`
- this document.

Entitlement rollback is fail-closed: setting `enterprise_organization_verified_for_canonical_repo=false` restores the 16-lane safety cap without reactivating the old continuous workers.

No data migration or external mutation is performed.
