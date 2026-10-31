# CEREBRO NEURONAL · SUPERPARALLEL V1

Date: 2026-10-31  
Status: `PREPROD_CANDIDATE / 4X_PHYSICAL_BATCHING`
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
- Normal operational NEURONAL wave: **100 logical evidence units**.
- Standard GitHub runner batching: up to **4 logical evidence units per physical runner**.
- Physical runner cap for a 100-unit wave: **25**.
- Physical runner saving at a full wave versus the previous 1:1 topology: **75**.
- PR validation target: **20 logical units**, using at most **5 physical runners**.
- The underlying deterministic planner remains backward-compatible with bounded explicit unit requests; the shared 360 controller uses **100 logical units** as the normal NEURONAL fair-share wave.
- No submission is marked complete merely because discovery evidence was produced.
- Every logical unit keeps its unique submission ID and writes an independent bounded evidence artifact.
- The four evidence processes inside a runner are waited as a group; any child failure makes that physical batch fail.

### Critical-control pressure
NEURONAL shares the same control-pressure policy as the global 360 pool. Before self-refilling it checks the critical CEREBRO CI, repair, promotion and **FACT-001 Engine Factory** workflows. If a critical gate is queued, pending, waiting or requested, NEURONAL does not start the next wave. Running useful work is not killed; only new background refill is paused. When critical pressure disappears, normal self-refill resumes.

### DeepSeek planning
- Maximum concurrency: **8**.
- Existing prepaid credit only.
- Auto recharge: **false**.
- Explicit opt-in only.
- Candidate/planning output only; it is never its own judge or PROD authority.

### Enterprise physical capacity
GitHub support confirmed a **360-job live company cap**, including up to **50 simultaneous macOS jobs**. CEREBRO's shared contract is **350 useful physical jobs + 10 control reserve = 360**.

NEURONAL therefore reserves logical work, not a permanently fixed block of 100 physical runners. At the normal 100-logical-unit wave and 4× batching it needs at most **25 physical runners**. Physical capacity not consumed by NEURONAL remains available to the shared pool for priority work, repair, CI and promotion.

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

## Backup / rollback / rebuild
- Source of truth remains Git.
- Rollback is a normal revert of the NEURONAL workflow/test/documentation commit; no campaign source is deleted.
- Rebuild uses the canonical 6,449-submission source and existing deterministic materializer.
- Logical batching changes only physical execution packing; submission IDs, campaign offsets and evidence semantics remain canonical.

## Truth and evidence
Every submission must preserve the NEURONAL truth contract: visual activity may only represent live evidence, explicit simulation, inference or prediction with its state made clear. Missing telemetry is `UNKNOWN/SIN DATOS`, never decorative activity.

## Promotion
This campaign may produce LAB and PREPROD candidates. Any promotion to PROD remains a separate gate requiring contracts, permissions, tests, evaluation, tribunal, observability, cost, backup, rollback, rebuild, OLD vs NEW and live acceptance evidence.

## Definition of launch
`LAUNCHED` means the canonical 6,449-submission campaign is materialized and governed fanout is physically running. It does **not** mean all 6,449 submissions are complete.

## Change history
### 2026-10-31 · 4× standard-runner batching candidate
- Preserved 100 logical NEURONAL evidence units per normal wave.
- Repacked them into at most 25 physical standard runners, four deterministic processes per runner.
- Added exact contract tests for 4× batching and child-process completion.
- Added critical-control-pressure pause before self-refill, including FACT-001 as Factory First.
- Preserved PREPROD-only discovery, no automatic paid DeepSeek, no PROD writes, no Trading and additional infrastructure cost 0 EUR.
