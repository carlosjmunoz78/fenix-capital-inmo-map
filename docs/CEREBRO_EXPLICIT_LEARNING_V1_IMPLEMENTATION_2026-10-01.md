# CEREBRO Explicit Learning V1 · implementation evidence

Date: 2026-10-01
Company: fenix
Environment path: isolated PREPROD test -> guarded PROD promotion
Cost target: 0 EUR additional

## Inventory / preserve-existing

Existing systems audited before implementation:
- CEREBRO Console frontend and VOICE-001.
- CEREBRO Gateway `cerebro-console-gateway-v0`.
- PROD Gateway live snapshot before this change: version 24, SHA `4078b2ac9bd8b8a83a05767026574436d2c7e6376b006f4437c8c32513e21699`.
- Existing `fenix-memory-api` version 10.

The existing memory API is preserved unchanged. It stores entity/CRM relationship memory in Notion and requires an operational origin entity. It is not overloaded for global user interaction preferences.

## New bounded contract

A small transactional preference store is added for explicit user preferences only:
- actor_code
- company_id
- scope
- category
- preference_key
- value
- source = explicit_user_instruction
- active/version/supersedes
- timestamps

No audio, transcripts, heavy logs, training data or long-running jobs are stored in this table.

Direct access by anon/authenticated is revoked. Only service-role server RPCs are granted.

## Learning semantics

Session correction:
1. user gives a supported correction;
2. correction applies immediately in the current conversation;
3. Gateway returns an ephemeral `learning_candidate`;
4. nothing durable is written yet.

Durable correction:
- `guárdalo`, `recuérdalo`, or equivalent explicit instruction persists the pending candidate; or
- `a partir de ahora ...` persists the supported correction directly.

Forget:
- explicit forget/replace commands deactivate the active preference while history remains auditable.

## PREPROD evidence

An isolated transactional test was executed in project `hnqlnvakzaywtafeiybt` using a temporary preference table.

Observed:
- total rows after replacement: 2
- active rows: 1
- version advanced to 2
- active value: `warm_close_caring`
- explicit provenance guard: true

The temporary test object was configured with `ON COMMIT DROP`; no persistent PREPROD test table was required.

## Frontend behavior

Default spoken profile:
- tone: warm / close / caring / professional
- speech rate: 0.96
- pitch: 1.04
- spoken answer length: concise by default

Persisted preferences are loaded from the Gateway on Console startup. Full on-screen text remains available; spoken output may be shortened for ordinary responses while action proposals retain full detail.

## Safety boundaries

Preference learning cannot alter:
- authentication or authorization;
- action confirmation rules;
- money limits;
- legal/signature gates;
- security policy;
- HUMAN_REQUIRED reasons;
- production execution permissions.

The existing low-confidence spoken confirmation guard remains unchanged.

## Rollback

Code rollback:
- revert the frontend/Gateway commits to the previous known-good source.

Data rollback:
- do NOT drop the additive preference table during ordinary rollback.
- leaving it dormant preserves audit/history and does not affect existing App/CRM flows.
- destructive removal would require a separate export/snapshot and explicit change.

This follows CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR.
