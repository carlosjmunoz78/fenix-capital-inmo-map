# CEREBRO Native Capability Operational FULL V1

## Purpose

This closes the gap between `NATIVE_FULL_PREPROD` and the project meaning of **FULL**: a capability must be technically complete, bound to every required consumer, automatically exercised, observable, zero-cost by default and feeding evidence-backed outcomes to `LRN-001`.

Scope is exactly the eight native capabilities from Lote Móvil 1 and Lote Móvil 2:

`FACT-SKILL-NATIVE`, `GH-SAFE-NATIVE`, `DB-SAFE-NATIVE`, `EVT-001`, `TECH-CAP-SCOUT-NATIVE`, `COMPET-NATIVE`, `CAP-NATIVE`, `LEAD-NATIVE`.

## Preserve-first boundary

This implementation is additive. It does not replace or modify the eight native runtimes, App, CRM, Supabase, WordPress, SEO production behavior, Trading or Android. Existing capability registries remain the technical source of truth. The operational adoption registry adds consumer bindings and recurring execution evidence.

Rollback is to disable/remove the operational workflow/runtime/registry and the persistent learning-state artifact chain. The underlying native capabilities and pre-existing learning runtimes remain unchanged.

## Consumer binding model

Each capability has one owner plus an evidence-backed set of required consumers. Consumers are classified as direct, governance, learning or telemetry consumers. `EVT-001` is special: its shared-bus contract is exercised against **every engine in the canonical engine registry**, so adding an engine to the registry automatically expands the event-bus coverage gate.

The binding matrix is `cerebro/registry/native-capability-operational-adoption-v1.json`. Every explicit engine reference must exist in `engine-registry.seed.json`; the test suite fails on unknown or missing bindings.

## Daily operational loop

`cerebro/runtime/native-capability-operational-loop-v1.mjs` executes once per day and on governed CI changes. It uses PREPROD/shadow-safe work only:

- FACT-001 evaluates a first-party synthetic skill candidate through the real FACT native gate.
- GH-SAFE runs a read-only inventory against the checked-out repository through the real safe wrapper.
- DB-SAFE runs a read-only transactional contract inspection through the real safe wrapper; no database mutation occurs.
- EVT-001 publishes, delivers and replay-verifies a heartbeat for every canonical engine using its durable local journals.
- Technology Scout ingests public first-party evidence and builds/replay-verifies a deterministic dossier.
- COMPET runs its deterministic shadow cycle/dossier; the separate real Fénix public-competitor cron remains intact and its soak is not overclaimed.
- CAP scores zero-spend shadow channel evidence, plans an experiment and produces a no-provider-write acquisition plan.
- LEAD scores/prioritizes shadow lead snapshots and produces a next action without CRM writes.

Every owner invocation produces output evidence. Every required consumer receives a deterministic consumption receipt over the output hash. Usage/outcome/improvement events are persisted through the existing `rsi-event-outbox.mjs` path to the existing Fénix `LRN-001` subscriber.

## Persistent continuous-improvement loop

`cerebro/runtime/native-capability-continuous-improvement-v1.mjs` consumes the improvement feedback produced by the operational outbox and converts it into the existing continuous-improvement contract expected by `LRN-001`. It does not create a second learning system. It deliberately reuses:

- `rsi-learning-auto-host.mjs` and `rsi-learning-host.mjs` for governed ingestion and idempotent persistence;
- `rsi-learning-worker.mjs` plus `skill-rsi-shadow-bridge.mjs` for the LAB → PREPROD learning boundary;
- `improvement-candidate-factory.mjs` for versioned improvement candidates;
- `learning-orchestrator.mjs` and `learning-horizon-executor.mjs` for DAILY/WEEKLY/MONTHLY review cycles;
- meta-observability for learning-loop timing/health.

Each of the eight operational capabilities produces an `ENGINE_RESULT` learning event owned by the actual capability owner. The event carries the operational evidence hash, output fingerprint, consumer coverage, the required downstream bindings and a LOW-risk hypothesis: preserve or improve the observed outcome without authority expansion, quality regression or added cost.

The first governed run must persist the learning records and materialize versioned candidates with `next_gate=OLD_VS_NEW_EXPERIMENT`. Candidates are **not** code changes and are **not** authorized for PROD. Any actual improvement must still pass OLD vs NEW, evaluation, independent Tribunal, rollback/rebuild and the normal promotion policy. A no-improvement/no-evidence result is therefore allowed to remain a governed candidate or `MORE_EVIDENCE`; continuous improvement must never mean continuous uncontrolled mutation.

## Persistence between automatic runs

GitHub-hosted runners are ephemeral, so the LRN ledger cannot live only under `/tmp`. The workflow therefore persists the safe PREPROD learning host state as the fixed artifact `native-capability-learning-state` and, on the next successful `main` or scheduled execution, restores the latest successful state before the learning host runs.

The artifact contains only the local PREPROD learning/candidate/orchestration state created by this shadow loop. It contains no customer payloads, no credentials and no production authority. Retention is 30 days; if no valid prior artifact exists, the loop deterministically rebuilds/bootstrap from the current operational evidence. This preserves continuity without adding a database subscription or forcing heavy learning state into Supabase.

## FULL states

`NATIVE_FULL_PREPROD` means the native capability itself is complete. `ADOPTED_FULL_PREPROD` means every declared required consumer binding has passed. `ACTIVE_CONTINUOUS_PREPROD` means the daily operational loop is configured and has produced a GREEN execution with usage telemetry and LRN feedback. `CONTINUOUS_IMPROVEMENT_GREEN_PREPROD` additionally means operational feedback has been persisted by LRN-001, governed improvement candidates have been materialized, learning horizons have executed, meta-observability is GREEN and state is persisted for the next automatic run.

The aggregate may be called **FULL under the project/user definition** only after the exact PR head is GREEN, the change is merged, and an automatic `main` execution proves both operational use and continuous-improvement consumption. The continuous multi-day **soak** is tracked separately and must never be overclaimed.

## Authority

No PROD authority. No PROD writes. No provider writes. No CRM writes. No database mutation. No new spend. No Trading access. No Android changes. Added cost target and measured control-plane cost are 0 €.

Any future request to cross those boundaries must pass the canonical policy/HUMAN_REQUIRED gates; this V1 does not grant that authority.

## Evidence and promotion

For technical + adopted + continuous FULL require:

1. all eight native registries remain `NATIVE_FULL_PREPROD`;
2. operational targeted CI GREEN and 100% required-consumer binding coverage;
3. EVT-001 publish/deliver/replay coverage across the entire canonical engine registry;
4. LRN outbox GREEN with eight capability improvement feedback events;
5. continuous-improvement host GREEN with persisted learning, candidates, daily horizon and meta-observability;
6. same-input idempotency proof GREEN;
7. persistent learning-state artifact uploaded successfully;
8. preservation diff GREEN for all eight native runtimes;
9. Governed Main Integration and RSI Promotion Readiness GREEN on the exact PR head;
10. merge to `main` and automatic `main` workflow execution GREEN;
11. next scheduled execution restores the previous learning-state artifact when one exists; multi-day soak remains a separate health gate.

Only after item 10 is observed may the aggregate registry be promoted to the final project-level FULL state. Item 11 proves continuity over time and is recorded as soak/continuity evidence rather than silently assumed.
