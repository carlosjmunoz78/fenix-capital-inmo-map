# CEREBRO OS · JOB-001 GitHub Actions Finite Burst V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Purpose
Replace wasteful permanent GitHub Actions occupancy with bounded bursts while preserving the canonical JOB-001 runtime, work pump, safety contract and rollback path.

## Existing preserved path
The existing `CEREBRO Continuous Useful Worker V1` remains available as the OLD path. A separate PREPROD capacity-relief canary has now been promoted to `main` at `bd8eb55d0c27f442d32ca7a5fc83bdc06a12e1a9`: while GitHub Enterprise entitlement remains unverified, only OLD lanes 0..15 may self-refill; lanes 16..63 drain after their next governed cycle. PROD and Browser PROD are untouched.

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
Current account/repository Enterprise entitlement remains unverified. Therefore V1 caps standard-runner fan-out at 16 lanes even if a larger request is supplied.

When `enterprise_organization_verified_for_canonical_repo` is evidence-backed and changed to `true`, the router can increase capacity, but JOB-001 still respects its canonical `max_global_default=64` and `max_company_default=48`. Enterprise's platform ceiling is not authority to exceed JOB-001's own safety limits.

## OLD vs NEW
OLD:
- continuous worker lease;
- self-refill now bounded to lanes 0..15 by the promoted PREPROD canary while entitlement is unverified;
- canonical 48/64 remains the contract maximum and rollback target.

NEW V1:
- same mission-derived useful-work implementation;
- same PREPROD and zero-paid safety boundary;
- finite lanes;
- no self-refill;
- releases GitHub runners after completion;
- physical PREPROD acceptance GREEN.

Full retirement of the OLD path is not part of this PR. Further reduction requires fresh OLD-vs-NEW evidence after the drain and remains reversible.

## Rollback
V1 is additive. Rollback is deletion/revert of:
- `cerebro/config/github-actions-burst.v1.json`
- `cerebro/runtime/job001-actions-burst-router-v1.mjs`
- `cerebro/tests/job001-actions-burst-router-v1.test.mjs`
- `.github/workflows/cerebro-job001-actions-burst-v1.yml`
- this document.

No data migration or external mutation is performed.
