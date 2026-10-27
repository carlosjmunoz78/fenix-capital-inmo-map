# JARVIS BOOST 001 · RUNBOOK DE ACTIVACIÓN

Date target: 2026-10-27
Current state before funding: `PREPARED_NOT_FUNDED`
Reconciled main baseline: `a907ffbfdfee10dd39192e74711077da71f5194b`

## Goal
The first paid DeepSeek call must happen only after secrets, hard-cost controls, evidence baseline and rollback boundaries are ready. Paid inference begins with a tiny connectivity canary, then a bounded read-only audit batch.

## Step 0 · re-check main before activation
`main` moved while this bootstrap was being prepared and was reconciled without overwriting its newer Browser work. Before using this branch tomorrow:
- read current `main` SHA;
- compare it with reconciled baseline `a907ffbfdfee10dd39192e74711077da71f5194b`;
- if main moved again, inspect delta and reconcile rather than overwriting newer work;
- preserve all existing App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading/Browser/Voice/Learning behaviour.

## Step 1 · funding
- Add intended DeepSeek credit. Initial target: **100 EUR**.
- Do not enable automatic recharge.
- Keep **200 EUR** as the absolute initial BOOST-001 hard cap; the second 100 EUR is reserve, not an automatic spend target.
- After bootstrap, paid AI variable ceiling is **10 EUR/month**, with no mandatory monthly spend.

## Step 2 · secret
Create/store the DeepSeek API key in the approved runtime secret mechanism under the reference expected as `DEEPSEEK_API_KEY`.

Never paste the key into:
- source control;
- ordinary chat prompts;
- Notion;
- logs;
- audit evidence;
- general database tables.

Only record that the secret reference exists and has been validated.

## Step 3 · official contract revalidation
Immediately before first live call, re-check DeepSeek official documentation for:
- base URL;
- active model IDs;
- Responses API contract;
- tool/function calling contract;
- pricing;
- Search/Fetch pricing if used;
- rate limits/status.

If provider contract differs from `deepseek-provider-contract.v1.json`, update the candidate branch and tests before live use.

## Step 4 · local/CI tests before paid call
Run the existing CEREBRO tests including `tests/deepseek-provider-v0.test.mjs`.
Required: all prior tests stay green; no existing regression may be waived just to connect DeepSeek.

## Step 5 · tiny paid canary
Invoke `DeepSeekProviderV0.tinyCanary()` with `deepseek-flash` and a deliberately small output bound.
Record only:
- request_id;
- provider/model;
- success/failure;
- token usage;
- calculated cost from a dated pricing snapshot;
- latency;
- response ID if useful.

Do not record the API key or Authorization header.

Expected semantic result: `DEEPSEEK_CANARY_OK`.

If canary fails: STOP paid queue, diagnose without repeated blind retries.

## Step 6 · cost-telemetry canary
Before SUPER AUDIT, prove:
- usage is captured;
- cost can be calculated from current official price snapshot;
- 50/75/90/100% alert thresholds are representable;
- auto-recharge is OFF;
- reaching a hard stop prevents a new paid job.

## Step 7 · read-only audit batch A00-A04
Start only:
- A00 baseline/evidence inventory;
- A01 Factory/Registry/Governance;
- A02 Learning/RSI;
- A03 Runtime/Jobs/Router/FinOps;
- A04 IAM/secrets/standing permissions.

Use parallelism only for independent read-only tasks. Do not let independent model sessions share conclusions before producing their first report; this preserves useful disagreement.

## Step 8 · tribunal/reconciliation
For each structural finding:
1. evidence supporting the finding;
2. affected dependencies/contracts;
3. severity/benefit;
4. candidate action: KEEP / WRAP / FIX / DEFER / REJECT;
5. test required;
6. rollback/rebuild route;
7. cost/risk.

A DeepSeek opinion alone cannot mutate CEREBRO.

## Step 9 · Jarvis build batches A05-A12
Only after the core audit has a reconciled gap map:
- Console/Gateway/Context;
- Voice/conversational presence;
- Browser/Computer Use;
- knowledge/memory;
- business-system preservation;
- Jarvis executive identity;
- adversarial simulations;
- PREPROD promotion candidates.

## Stop conditions
Stop automatically on:
- `MONEY_LIMIT`;
- secret/security incident;
- provider contract drift that invalidates the adapter;
- cross-company leakage;
- inability to verify a destructive candidate;
- critical regression;
- required external legal/signature/human control.

## Definition of BOOST-001 success
Not “we spent 100 EUR”. Success means:
- current CEREBRO is audited against live evidence;
- real Jarvis gaps are identified and dispositioned;
- DeepSeek is a replaceable provider behind CEREBRO, not the architecture;
- permanent tests/rules/skills/procedures/evidence are created;
- Jarvis evals demonstrate measurable improvement;
- no existing production capability is silently lost;
- all remaining non-green items are explicitly classified.
