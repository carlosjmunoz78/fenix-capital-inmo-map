# CEREBRO · ROUTE001_REAL_RESOURCE_DISCOVERY_AND_PREPROD_LOOP_V0

Date: 2026-10-09
Company: `fenix`
Engine: `ROUTE-001`
Environment: `LAB/PREPROD`
Incremental cost target: `0 EUR`

## Objective

Close the gap between a certified routing policy and **real, current, evidence-backed zero-cost resources**.

This block does not invent availability from static catalogs. It probes the current runtime, feeds only observed candidates into `ROUTE-001`, executes one tightly allowlisted synthetic deterministic fixture in LAB/PREPROD, persists metadata-only resource state, and sends the resulting operational evidence into the already-existing RSI universal learning ingress.

## Preserve-first inventory

### Legacy Free Resource Broker

Historical branch:

`cerebro-free-resource-broker-v0-20260911`

Useful behaviors preserved conceptually:

- `FREE-001` zero-additional-cost objective;
- preference for local/existing/GitHub/free-tier resources;
- paid route requires `MONEY_LIMIT`;
- Trading reuse forbidden.

Stale behavior **not** copied blindly: legacy no-resource logic escalated to `LOW_CONFIDENCE`; current `ROUTE-001` correctly uses `HOLD_NO_ZERO_COST_ROUTE` when there is no genuine human exception.

### Legacy connector selection

Historical branch:

`cerebro-connector-selection-fallback-v0-20260911`

Useful preference preserved by current architecture:

`official/API/MCP/webhook/script/CLI -> browser/computer use -> factory build`

Current IAM and ROUTE-001 contracts supersede legacy identity, lifecycle, privacy and cost assumptions.

### Existing provider evidence

Current main already contains:

`cerebro/skills/zero-cost-provider-evidence.v0.json`

That file is retained as **historical/static evidence**, not as a live availability oracle.

It contains prior evidence for:

- standard public GitHub-hosted Actions runners;
- ephemeral OSS inference on GitHub Actions;
- Gemini free-tier synthetic inference;
- Cloudflare Workers AI free allocation;
- Mistral free mode;
- retired GitHub Models.

The registry itself explicitly does not contain credentials and does not authorize inference.

## Current evidence rule

A resource is `available=true` only when the current run has enough evidence for that exact resource class.

### Deterministic GitHub Actions runtime

The current repository is public and the workflow verifies it again at runtime. Current runner probes must observe:

- Node runtime;
- Python runtime;
- GitHub CLI when the GitHub control-plane candidate is considered.

Node/Python become deterministic-local candidates only from these current probes.

The GitHub Actions control-plane candidate additionally requires current repository visibility `public` so the zero-additional-cost claim is not silently reused for a private repository.

### External/free AI

Secret/reference presence is **not enough**.

A free-AI provider is current-available only when all are explicit in the observation:

- registered reference present;
- policy green;
- free-quota guard green;
- current zero-cost probe green;
- positive remaining bounded calls.

The 2026-10-07 Gemini success remains valid historical evidence, but it is not silently treated as proof that quota/availability is still current on 2026-10-09.

This V0 therefore does **not** make a new Gemini/Cloudflare/Mistral call merely to satisfy the router. No paid or potentially billable probe is introduced.

### Browser / computer use

Browser remains fallback-only.

A real browser candidate requires a fresh current attestation plus IAM connector binding. Current canonical IAM evidence does not yet provide that live binding, therefore browser remains:

`HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT`

Synthetic `agent-browser` behavioral tests are not treated as real account/session identity evidence.

## Real safe PREPROD loop

The first real loop deliberately uses a deterministic current runtime, not AI.

Allowlisted fixture:

`canonical-json-hash-v0`

The fixture:

- uses fixed synthetic data only;
- performs no business operation;
- reads no customer data;
- reads no secret;
- performs no business network write;
- performs no PROD write;
- performs no Trading action;
- has no arbitrary shell/input execution surface.

`ROUTE-001` must first select an eligible `DETERMINISTIC_LOCAL` resource. Only then may the fixture run.

The router still returns `execution_authorized=false`: route selection does not become general business execution authority. The loop has a separate hardcoded fixture allowlist.

## Persistent resource state

Branch:

`cerebro-route001-resource-state-v0`

Path:

`cerebro/runtime/route001-resource-state.v0.json`

Only evidence metadata is stored:

- current runtime/resource availability;
- current/historical/hold state;
- source run and head SHA;
- last safe synthetic loop summary;
- cost/authority invariants.

No raw secret values, customer data or business payloads are stored.

## RSI/LRN feedback

The loop reuses the existing exact ingress:

Repository dispatch:

`cerebro_learning_signal`

Payload:

`client_payload.signal`

The loop emits three canonical signal families:

1. `ENGINE_RESULT`
2. `METRIC_OBSERVATION`
3. `COST_OBSERVATION`

The signals are locally validated through `buildUniversalLearningEventReport` before dispatch and retain:

- `contains_customer_data=false`
- `contains_secrets=false`
- `prod_authorized=false`
- `prod_write_authorized=false`
- `trading_access=false`
- `additional_cost_eur=0`

The existing universal ingress then normalizes them into PREPROD candidates and appends them to the tenant-local LRN outbox. No parallel learning schema is introduced.

## Automation cadence

After merge, the live discovery + safe loop runs every six hours, aligned with IAM lifecycle monitoring, and can also run manually.

PR validation is dry-run/certification only:

- no persistent resource-state advance;
- no RSI dispatch;
- no external AI call;
- no business execution.

Main/scheduled execution may write only CEREBRO control-plane metadata and dispatch the safe learning signal batch.

## Safety boundary

- business PROD authority: FALSE
- business PROD write: FALSE
- general execution authority: FALSE
- Trading: FALSE
- MULTIEMPRESA continuation: FALSE
- customer data: FALSE
- secret values: FALSE
- automatic paid fallback: FALSE
- incremental cost target: 0 EUR
- browser real binding: PARCIAL / POR AUDITAR
- external free-AI current availability: only when live zero-cost evidence exists; otherwise HOLD/historical only

## Acceptance

GREEN requires:

1. exact-head PR tests pass;
2. repository public visibility is verified, not assumed;
3. current Node/Python/GitHub runtime probes are evidence-backed;
4. historical provider evidence never becomes current availability by itself;
5. Gemini reference presence alone remains insufficient;
6. browser remains HOLD without a fresh real attestation;
7. `ROUTE-001` selects the observed deterministic Node route for the safe fixture;
8. the fixture completes with a deterministic GREEN marker;
9. no business/customer/secret/PROD/Trading authority is introduced;
10. metadata-only resource state advances physically;
11. the emitted signal batch passes the existing universal learning ingress contract;
12. the RSI learning workflow receives the dispatched observations;
13. post-merge ROUTE resource-loop certification is GREEN;
14. PROD Runtime Smoke remains GREEN;
15. PROD Live Deploy is not activated by this block.

## Next bounded gate

`ROUTE001_REPEATABLE_AUTONOMOUS_PREPROD_CYCLES_V0`

The next gate must prove several consecutive autonomous discovery -> route -> safe execution -> evidence -> learning cycles, including an intentional resource-loss/fallback scenario, before using this pattern as a reusable template for real engine domains.
