# CEREBRO · HUMAN_EXCEPTION_SUPERVISOR_V0

Date: 2026-10-09
Engine: `HEX-001`
Company: `fenix`
Control environment: `PROD_CONTROL_PLANE`

## Status target

This block adds the missing deterministic bridge between engine-level human exceptions and the already-existing CEREBRO Human Communication V1 layer.

It does **not** create a new notification stack and does **not** grant execution authority. It reuses the current private owner-mail transport, exact approval commands, quiet-hours logic, batching, dedupe, digest, and communication state.

## Canonical HUMAN_REQUIRED policy

Only these reasons may enter the supervisor queue:

- `LEGAL_REQUIRED`
- `SIGNATURE_REQUIRED`
- `LOW_CONFIDENCE`
- `HIGH_RISK`
- `POLICY_CONFLICT`
- `SECURITY_INCIDENT`
- `MONEY_LIMIT`
- `CUSTOMER_HUMAN_REQUEST`

A generic workflow failure, HOLD, red test, timeout, warning, or missing telemetry is **not** automatically converted into HUMAN_REQUIRED.

Unknown human reasons are recorded as rejected ingress and produce no owner notification.

## Ingress

Accepted repository dispatch event:

`cerebro-human-required-v0`

The already-existing `cerebro-domain-evidence-v0` channel is also observed, but only when its explicit payload already contains `human_required`. No inference from a domain failure is performed.

Required safety declarations:

- `company_id = fenix`
- canonical `engine_id`
- canonical `human_required`
- stable `event_id`
- immutable `observed_at`
- `contains_customer_data = false`
- `contains_secrets = false`
- `prod_authorized = false`
- `prod_write_authorized = false`
- `trading_access = false`
- `additional_cost_eur = 0`

The supervisor rejects payloads that attempt to carry secrets/customer data or grant authority/cost.

## Persistent state

Branch:

`cerebro-human-exception-state-v0`

Path:

`cerebro/runtime/human-exception-supervisor-state.v0.json`

The queue is append/dedupe oriented by stable `event_id`. It contains only sanitized decision metadata and evidence references, not customer records or secrets.

## Existing communication reuse

The existing `.github/workflows/cerebro-human-communication-v1.yml` now loads:

1. existing Skill AutoLoop HUMAN_REQUIRED state;
2. `HUMAN_EXCEPTION_SUPERVISOR_V0` state;
3. merges both into the already-certified communication ingress;
4. leaves approval semantics unchanged.

A newly accepted canonical exception emits only a wake event:

`cerebro-human-communication-wake-v0`

The existing Human Communication V1 workflow remains the sole delivery layer. It retains:

- private mail transport;
- exact `AUTORIZO <approval_id>` / `NO AUTORIZO <approval_id>` / `EXPLICAME <approval_id>` commands;
- Europe/Madrid quiet hours;
- batching and dedupe;
- daily digest;
- fail-closed behavior when delivery transport is unavailable.

The notification itself never authorizes the gated action.

## Anti-noise contract

- no alert for generic failures;
- no alert for noncanonical reason;
- stable event dedupe;
- existing quiet hours and batching are preserved;
- a repeated state poll does not generate a new owner decision item;
- automatic remediation remains preferred before escalating to a human.

## Safety envelope

- PROD authority: FALSE
- PROD write authority: FALSE
- Trading access: FALSE
- MULTIEMPRESA continuation: FALSE
- customer data in supervisor payload: FALSE
- secrets in supervisor payload: FALSE
- incremental cost: 0 EUR

## Acceptance

The block is GREEN only when:

1. all eight canonical reasons are accepted by deterministic tests;
2. a noncanonical reason produces zero pending owner notification;
3. duplicate `event_id` produces one queue item;
4. customer-data/secret/authority/cost violations fail closed;
5. the physical state branch validates;
6. Human Communication V1 consumes the merged queue without changing its approval contract;
7. PR branch validation sends no real mail;
8. post-merge exact-head workflow is GREEN;
9. PROD deploy remains unaffected / unauthorized;
10. a synthetic canonical PREPROD exception can be ingested and observed in communication state without granting business execution authority.

## Next block after certification

`IDENTITY_CREDENTIAL_BROKER_V0_AUDIT_AND_FOUNDATION`

That next block must inventory existing identities, accounts, sessions, credential stores and connectors before introducing any new vault/broker component.
