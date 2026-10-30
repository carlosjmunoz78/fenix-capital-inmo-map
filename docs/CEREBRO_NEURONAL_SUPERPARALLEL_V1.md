# CEREBRO NEURONAL · SUPERPARALLEL V1

Date: 2026-10-31  
Status: `PREPROD_CANDIDATE / LAUNCHABLE`
Campaign: `NEURONAL-SUPERPARALLEL-V1`

## Objective
Ingest the approved NEURONAL vision into the existing CEREBRO Mission/JOB-001/Enterprise execution fabric without creating a second queue, scheduler, daemon, control plane or PROD authority.

## Canonical scope
- Approved NEURONAL requirements: **493**.
- Deterministic submissions: **6,449**.
- Foundation submissions: **40**.
- Requirement lifecycle per feature: **13 phases** (`AUDIT → CONTRACT → DATA → UX/VISUAL → BUILD → TESTS → EVIDENCE → EVAL → PREPROD CANDIDATE`).
- Skill policy: Registry first; reuse/extend before build; if absent, route to FACT-001 in LAB and require tests, evaluation, impact analysis and OLD vs NEW before use.

## Execution strategy
The campaign separates discovery/evidence from write authority and shares Enterprise fairly with the rest of CEREBRO.

### Enterprise discovery fanout
- NEURONAL fair-share target: **100** independent read-only evidence workers concurrently.
- Self-refill wave size: **100** until the deterministic 6,449-submission campaign is exhausted.
- PR validation target: **20**.
- No submission is marked complete merely because discovery evidence was produced.
- Each worker receives one unique submission and produces a bounded evidence artifact.

### DeepSeek planning
- Maximum concurrency: **8**.
- Existing prepaid credit only.
- Auto recharge: **false**.
- Explicit opt-in only.
- Candidate/planning output only; it is never its own judge or PROD authority.

### Enterprise physical capacity
GitHub support confirmed a **360-job live company cap**, including up to **50 simultaneous macOS jobs**. NEURONAL intentionally does not monopolize that pool.

Fair-share target:
- NEURONAL: **100**;
- multi-front portfolio W00-W24: **250**;
- control reserve: **10**;
- total: **360**.

The 500-job topology remains prepared but physical 500 execution stays fail-closed because the verified live entitlement is 360, not 500.

## Preservation
- Existing 28 macrofront Mission DAG remains canonical.
- Existing JOB-001 / Mission DAG / Adaptive Work Pump / Enterprise fanout are reused.
- No second scheduler.
- No second queue.
- No second daemon.
- No direct PROD writes.
- No Trading access.
- No silent new subscription.
- Existing App Fénix, JARVIS, OPERATIVA, NAVEGADOR and MOTION/NEURONAL prototypes remain baselines for OLD vs NEW.

## Truth and evidence
Every submission must preserve the NEURONAL truth contract: visual activity may only represent live evidence, explicit simulation, inference or prediction with its state made clear. Missing telemetry is `UNKNOWN/SIN DATOS`, never decorative activity.

## Promotion
This campaign may produce LAB and PREPROD candidates. Any promotion to PROD remains a separate gate requiring contracts, permissions, tests, evaluation, tribunal, observability, cost, backup, rollback, rebuild, OLD vs NEW and live acceptance evidence.

## Definition of launch
`LAUNCHED` means the canonical 6,449-submission campaign is materialized and governed fanout is physically running. It does **not** mean all 6,449 submissions are complete.
