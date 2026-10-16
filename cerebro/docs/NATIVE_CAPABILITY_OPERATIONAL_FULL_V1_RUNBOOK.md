# CEREBRO Native Capability Operational FULL V1

## Purpose

This closes the gap between `NATIVE_FULL_PREPROD` and the project meaning of **FULL**: a capability must be technically complete, bound to every required consumer, automatically exercised, observable, zero-cost by default and feeding evidence-backed outcomes to `LRN-001`.

Scope is exactly the eight native capabilities from Lote Móvil 1 and Lote Móvil 2:

`FACT-SKILL-NATIVE`, `GH-SAFE-NATIVE`, `DB-SAFE-NATIVE`, `EVT-001`, `TECH-CAP-SCOUT-NATIVE`, `COMPET-NATIVE`, `CAP-NATIVE`, `LEAD-NATIVE`.

## Preserve-first boundary

This implementation is additive. It does not replace or modify the eight native runtimes, App, CRM, Supabase, WordPress, SEO production behavior, Trading or Android. Existing capability registries remain the technical source of truth. The operational adoption registry adds consumer bindings and recurring execution evidence.

Rollback is to disable/remove the operational workflow/runtime/registry. The underlying native capabilities remain unchanged.

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

## FULL states

`NATIVE_FULL_PREPROD` means the native capability itself is complete. `ADOPTED_FULL_PREPROD` means every declared required consumer binding has passed. `ACTIVE_CONTINUOUS_PREPROD` means the daily operational loop is configured and has produced a GREEN execution with usage telemetry and LRN feedback. The aggregate closure may be called `OPERATIONAL_FULL_PREPROD` only when all eight meet those conditions.

The continuous **soak** is tracked separately. A configured recurring job plus a successful main execution can close initial operational FULL, but it must not be described as a multi-day soak until scheduled executions have actually accumulated.

## Authority

No PROD authority. No PROD writes. No provider writes. No CRM writes. No database mutation. No new spend. No Trading access. No Android changes. Added cost target and measured control-plane cost are 0 €.

Any future request to cross those boundaries must pass the canonical policy/HUMAN_REQUIRED gates; this V1 does not grant that authority.

## Evidence and promotion

Before the adoption registry can move out of `ADOPTION_CANDIDATE_PREPROD`, require:

1. operational targeted CI GREEN on the exact branch head;
2. preservation diff GREEN for all eight native runtimes;
3. Governed Main Integration and RSI Promotion Readiness GREEN on the exact PR head;
4. merge to `main`;
5. automatic `main` execution of the operational workflow GREEN;
6. evidence artifact recorded with all eight capabilities, all consumer bindings, all-engine EVT coverage and `LRN-001` outbox GREEN.

Only after item 5 is observed should the operational closure be marked `OPERATIONAL_FULL_PREPROD`. Scheduled soak continues afterwards as an independent health signal.
