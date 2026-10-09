# CEREBRO · ROUTE001 · Zero-Cost Execution / Model Router V0

Date: 2026-10-09
Company: `fenix`
Primary engine: `ROUTE-001`
Supporting engines: `FREE-001`, `AIBUD-001`, `LOCAL-001`, `IAM-001`
Incremental cost target: `0 EUR`

## Preserve-first migration

A prior branch already contained `cerebro/router/model-router.mjs`:

`cerebro-model-router-v0-20260911`

That implementation established three useful behaviors:

1. deterministic tasks do not require AI;
2. free AI is preferred before paid AI;
3. non-zero paid cost becomes `HUMAN_REQUIRED / MONEY_LIMIT`.

The old branch was not merged into current `main` and did not cover the current IAM/lifecycle, privacy, browser, risk, confidence, observability or zero-cost resource-selection contracts. This V0 therefore **wraps and extends the behavior conceptually** rather than blindly copying the old branch.

## Canonical routing order

`DETERMINISTIC_LOCAL -> EXISTING_ENGINE -> REGISTERED_API -> GITHUB_ACTIONS -> LOCAL_AI -> FREE_AI -> BROWSER_COMPUTER_USE -> PAID_EXTERNAL`

The final paid class is never selected automatically in this V0.

## Decision dimensions

The router evaluates:

- task type;
- whether AI is actually needed;
- risk;
- confidence;
- privacy/customer-data constraints;
- IAM connector registration;
- credential lifecycle health;
- environment;
- incremental cost;
- browser binding state;
- deterministic resource priority and latency.

## Deterministic-before-AI

Canonical deterministic task types:

- `sql`
- `python`
- `typescript`
- `rule`
- `api`
- `local_tool`
- `engine_call`

Canonical interpretive task types:

- `interpretation`
- `reasoning`
- `comparison`
- `redaction`
- `research`

AI is allowed only for the interpretive set. Even then, a deterministic/local candidate that explicitly supports the task remains preferable.

## Zero-cost broker behavior

Every candidate declares:

- `resource_id`
- `resource_class`
- capabilities
- availability
- incremental cost
- privacy class
- optional registered connector
- optional latency metadata

A candidate with incremental cost above `0 EUR` is rejected from autonomous routing.

If only a paid route remains, the router returns:

`HUMAN_REQUIRED / MONEY_LIMIT`

It never performs silent spend and never authorizes the paid execution itself.

If no free route exists and no paid route has been requested or discovered, the router returns:

`HOLD_NO_ZERO_COST_ROUTE`

This avoids unnecessary human noise.

## IAM and lifecycle integration

Registered API, external free-AI and browser candidates require a registered IAM connector.

The router reuses:

- `identity-credential-broker.mjs`
- `identity-session-lifecycle.mjs`

For connector credential references, current lifecycle metadata must allow use. Missing/expired/disabled references fail closed on that candidate.

The router never resolves or receives credential values.

## Privacy

Customer data may not be routed to external free AI or browser/computer-use in this V0.

Sensitive data requires either:

- `LOCAL`, or
- a `REGISTERED_EXISTING_PATH` already governed by IAM and existing data policy.

Raw secrets in router payloads are forbidden.

## Browser/computer-use

Browser remains fallback-only.

To even become eligible it requires:

- LAB or PREPROD;
- lifecycle/browser binding status `BROWSER_SESSION_BINDING_HEALTHY`;
- registered IAM connector.

Current IAM evidence still marks the real browser connector binding as not operational, so browser routing remains HOLD even if a caller falsely claims a healthy binding. This preserves the previous gate instead of weakening it.

No CAPTCHA bypass and no MFA bypass are permitted.

## Human exceptions

Only canonical exceptions are emitted:

- `HIGH_RISK`
- `LOW_CONFIDENCE`
- `MONEY_LIMIT`

Other unavailable/failing resources normally produce HOLD/BLOCKED rather than inventing new human-required reasons.

## Authority boundary

The router selects a **route**, not execution authority.

Always false in V0:

- PROD authority
- PROD write authority
- business execution authority
- Trading access
- MULTIEMPRESA continuation
- automatic paid fallback

The downstream policy/execution layer must still authorize the actual action.

## Acceptance

GREEN requires:

1. the old router branch is explicitly inventoried;
2. `ROUTE-001`, `FREE-001`, `AIBUD-001`, `LOCAL-001`, `IAM-001` exist in the canonical Engine Registry;
3. deterministic tasks prefer deterministic resources;
4. local AI outranks free cloud AI;
5. external free AI cannot receive customer data;
6. IAM/lifecycle mismatch removes that candidate;
7. paid-only route returns `MONEY_LIMIT` and no execution authority;
8. high risk/low confidence use canonical human exceptions;
9. browser remains HOLD while real binding is not evidenced;
10. zero-cost exhaustion becomes HOLD without unnecessary owner notification;
11. PR exact-head tests pass;
12. post-merge certification is GREEN;
13. PROD Runtime Smoke remains GREEN;
14. PROD Live Deploy is not activated by this block.

## Next gate

`ROUTE001_REAL_RESOURCE_DISCOVERY_AND_PREPROD_LOOP_V0`

That block should discover actual currently available resources/quotas from existing infrastructure, feed the router a live candidate set, execute only allowed PREPROD/LAB routes, collect outcome/cost/latency evidence, and return the observations into RSI/LRN. It must not fabricate availability and must not introduce a paid provider merely to satisfy a route.
