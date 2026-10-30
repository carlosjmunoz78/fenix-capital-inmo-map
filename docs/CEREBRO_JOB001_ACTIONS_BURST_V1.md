# CEREBRO OS · JOB-001 GitHub Actions Finite Burst V1

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Purpose
Replace wasteful permanent GitHub Actions occupancy with bounded bursts while preserving the canonical JOB-001 runtime, work pump, safety contract and rollback path.

## Existing preserved path
The existing `CEREBRO Continuous Useful Worker V1` remains available as the OLD path. A separate PREPROD capacity-relief canary has now been promoted to `main` at `bd8eb55d0c27f442d32ca7a5fc83bdc06a12e1a9`: while GitHub Enterprise entitlement remains unverified, only OLD lanes 0..15 may self-refill; lanes 16..63 drain after their next governed cycle. PROD and Browser PROD are untouched.

## Remaining Actions worker audit

| Workflow/path | Classification | Treatment |
| --- | --- | --- |
| `cerebro-continuous-work-factory-v0.yml` → `cerebro-cloud-useful-continuous-worker-v1.yml` | PREPROD scheduler/watchdog plus self-rearming useful-work lanes; not a bridge | Watchdog now seeds only lanes 0..15, matching the existing unverified-entitlement rearm limit. |
| `cerebro-cloud-useful-continuous-worker-v0.yml` | One-run legacy drain/migration into V1 | Preserved; it is not itself a self-rearming loop. |
| `cerebro-cloud-useful-worker-v0.yml` | Bounded deterministic work, capped at pass 7 | Finite; no migration needed. |
| `cerebro-mission-sustained-preprod-v1.yml` | Finite 28-lane PREPROD wave, three work units per lane | Finite; no migration needed. |
| `cerebro-browser-job-runner-v2-live.yml`, `cerebro-browser-work-total-v1-prod.yml` | PROD queue consumers with bounded invocations and schedule/workflow rearming | Existing queue bridges; PROD behavior is explicitly out of scope and unchanged. |
| `cerebro-browser-interactive-v3-preprod.yml`, `cerebro-browser-work-total-v1-preprod.yml` | PREPROD queue consumers; wait up to 45 minutes for work, execute at most one job, then dispatch another cycle | Self-rearming bridge candidates for finite/event-driven wakeups. Do not change without live queue and wake-contract evidence; HUMAN_REQUIRED before migration to avoid stranding work. |
| `cerebro-skill-adoption-sla-v1.yml` | Workflow-run SLA watchdog with a 600-second hard stop | Event-driven and bounded, not a permanent worker. |
| `cerebro-skill-chain-driver-v0.yml` | Sequential child-workflow coordinator with a configured step bound | Bounded orchestration, not a permanent worker. |
| `cerebro-human-qa-hourly-trigger-v0.yml` | Hourly event/schedule trigger for finite QA work | Finite scheduled bridge; no self-refill. |

Other `schedule`-triggered workflows are finite scheduled jobs unless they dispatch/refill work; a schedule alone is not evidence of permanent runner occupancy.
This is a repository-static audit; it does not assert which workflows are currently enabled or running, nor measured runner minutes.

## PREPROD watchdog correction: OLD vs NEW

OLD watchdog: every five minutes, scan for lanes 0..67 and dispatch any missing lane. However, the existing entitlement canary allows only lanes 0..15 to self-refill; lanes 16..67 drain on completion. Thus up to 52 drain-only lanes could be restarted by each watchdog pass, undermining the canary's capacity relief.

NEW watchdog: scan and maintain only lanes 0..15. This preserves the existing 16-lane continuous path and leaves the finite burst as the bounded alternative; no worker, queue, scheduler, or PROD behavior is deleted or disabled.

Capacity impact: 52 fewer potential lane dispatches per watchdog pass (68 to 16, a 76.5% reduction in the targeted lane set). With the V1 maximum lease of 420 seconds, a full 52-lane drain-only fan-out represents up to 21,840 runner-seconds (364 runner-minutes) per pass. These are upper-bound capacity figures, not observed runner usage; actual dispatches and lease duration depend on live run state and useful work.

Further reducing the 16 allowed lanes or migrating all sustained work to burst requires fresh OLD-vs-NEW useful-work and live-demand evidence, plus confirmation of entitlement and queue ownership. Until then, that decision is **HUMAN_REQUIRED**; this change does not guess at a lower capacity target.

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
The watchdog correction is rolled back by reverting its lane target/loop and regression test in this PR. That restores the previous 68-lane target; no live queue or database rollback is needed. The finite burst V1 remains additive. If separately rolling it back, revert:
- `cerebro/config/github-actions-burst.v1.json`
- `cerebro/runtime/job001-actions-burst-router-v1.mjs`
- `cerebro/tests/job001-actions-burst-router-v1.test.mjs`
- `.github/workflows/cerebro-job001-actions-burst-v1.yml`
- this document.

No data migration or external mutation is performed.
