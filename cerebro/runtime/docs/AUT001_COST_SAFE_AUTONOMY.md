# AUT-001 · Cost-safe autonomy activation contract

Status: DEFINED / PREPROD / fail-closed

Purpose: prevent Supervisor, meta-learning, PC Bridge, Universal Plugin, browser
extension or future engines from becoming high-frequency or paid consumers merely
because connectivity becomes available.

## Mandatory behavior

1. Every component starts PARKED unless an explicit policy promotes it.
2. Supervisor starts SHADOW, maximum one run/hour, and only on a change signal.
3. Meta-learning starts PARKED.
4. Paid AI and metered external APIs default to disabled with hard daily budget 0 EUR.
5. Any attempt to exceed a spend gate returns HUMAN_REQUIRED=MONEY_LIMIT.
6. Connector availability is not authorization to execute.
7. Idle PC/plugin/extension connectivity must not trigger inference, research or paid calls.
8. Background polling, when technically required, carries no AI/model call and is capped by policy.
9. Repeated identical work must use idempotency/delta detection before execution.
10. Promotion to autonomous ACTIVE requires measured cost plus the normal CEREBRO production gates.

## Intended supervisor pattern

EVENT/DELTA -> deterministic checks -> local/cache/rules -> anomaly threshold ->
(optional model route only when policy permits) -> action/evidence.

Not:

timer -> read everything -> call AI -> rewrite everything -> repeat.

## Current default component policy

- SUPERVISOR-001: SHADOW, <=1 run/hour, change signal required, 0 paid calls.
- METALEARN-001: PARKED.
- PC-BRIDGE-001: PARKED; idle transport may poll at >=300 s only, no model calls.
- PLUGIN-UNIVERSAL-001: PARKED.
- BROWSER-EXTENSION-001: PARKED.

These defaults are preparation only. They do not claim that the Supervisor,
universal plugin, browser extension or PC connection is operational.
