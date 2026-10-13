# CEREBRO · LIVE EVENT BACKBONE V0 · STATUS

Date: 2026-10-13
Branch: `cerebro-visual-lab`
Environment: LAB / PREPROD
PROD_AUTHORIZED: **FALSE**
Additional cost: **0 EUR**

## AUDIT RESULT
Existing event/runtime infrastructure is preserved:
- `cerebro/runtime/runtime.mjs` provides in-memory `EventBus` and `JobQueue` with canonical `company_id · engine_id · environment · version` context.
- `cerebro/runtime/persistent-runtime.mjs` provides additive PREPROD local atomic persistence for `EVT-001` and `JOB-001`; it remains single-writer reference and is not wired as a SharedRuntime replacement.
- `cerebro/runtime/universal-learning-ingress.mjs` already normalizes safe learning signals into governed PREPROD candidate events with secret/customer-data rejection and zero-cost authority boundaries.
- `cerebro/runtime/rsi-event-outbox.mjs` persists localized LRN-001 batches but is not a universal operational bus.

No existing runtime or persistent adapter was modified.

## HECHO · READ-ONLY EVENT PROJECTION SIDECAR
Added `cerebro/runtime/live-event-projection-v0.mjs`.

It can normalize, without writes:
- EVT-001 event shape,
- Universal Learning event shape,
- RSI outbox event shape,
- explicitly labelled synthetic LAB events.

Truth rules:
- source must explicitly declare whether it is synthetic;
- synthetic events never mark an engine as live;
- real events and synthetic QA remain separately counted;
- duplicate event IDs with conflicting bodies fail closed;
- secret-like payload keys are filtered from the visual projection;
- PROD authority remains false.

## HECHO · ENGINE ACTIVITY SNAPSHOT CONTRACT
The sidecar can build a canonical per-engine activity snapshot from a registry ID list.

Only `REAL_EVIDENCE` events can produce `live_activity=true`.
No event evidence produces `NO_REAL_EVENT_EVIDENCE`, not IDLE or GREEN.

## HECHO · GATEWAY READ COMMAND DEFINED
Added `cerebro/console/visual-state-command-v0.mjs`.

Command contract: `visual.snapshot`.
- must be registered on CEREBRO Gateway;
- read-only;
- PREPROD only;
- no direct model access;
- no business writes;
- no Trading access;
- no automatic promotion;
- unknown fields remain `NOT_PROVEN`.

The snapshot returns canonical engine identity, evidence state, verified dependencies and real-event activity when an event projection is supplied.
It does not invent `current_job`, `health_state`, artifacts or confidence.

## TESTS AUTHORED
- `tests/live-event-projection-v0.test.mjs`
- `tests/visual-state-command-v0.test.mjs`

Coverage includes:
- real vs synthetic activity truth;
- secret-key filtering;
- duplicate identity conflict;
- unknown-is-not-live;
- no invented job/artifact state;
- Gateway PREPROD read-only command behavior.

### CI status
No GitHub Actions workflow run was automatically associated with the branch test commit at the time of this status document. Therefore tests are **AUTHORED / NOT YET CI-EXECUTED** and are not claimed GREEN from CI.

## PARCIAL · PHYSICAL LIVE SOURCE BINDING
Still missing:
1. a continuously reachable PREPROD source that exposes actual EVT-001/runtime events to the Gateway command;
2. read-only current-job projection for JOB-001 without altering existing queue semantics;
3. live artifact references;
4. universal health state;
5. browser binding of `visual.snapshot` instead of the current versioned evidence snapshot.

Until those are physically connected, the visual candidate remains `REAL_REGISTRY_BOUND_SNAPSHOT`, not `LIVE_RUNTIME_TELEMETRY_CONFIRMED`.

## NEXT BLOCK
`PREPROD_LIVE_STATE_SOURCE_BINDING_V0`

Execution order:
1. locate existing hosted Gateway/runtime surface before creating any new server;
2. if a reusable hosted surface exists, wrap it with `visual.snapshot` read-only output;
3. otherwise hold rather than create a parallel server prematurely;
4. add current-job read projection only through public/stable queue semantics or a parallel observer;
5. bind the browser candidate to Gateway output with snapshot fallback clearly labelled;
6. run OLD vs NEW + rollback + target-PC QA.

## STATUS
- Existing EVT/JOB preserved: **YES**
- Universal read projection: **HECHO EN CÓDIGO**
- Gateway snapshot command: **HECHO EN CÓDIGO**
- CI test execution: **PENDIENTE**
- Hosted PREPROD live source: **POR AUDITAR / CONECTAR**
- PROD: **FALSE**
- HUMAN_REQUIRED: **FALSE**
