# SELF-EXTENDING SHARED WORKER V1 · BACKUP / ROLLBACK / REBUILD / AUTONOMY

## Backup

This block is additive. Source of truth is Git history. Runtime durable state is the existing host-local `job001-self-extending.v1.journal`; before changing/removing a live persistent-host deployment, preserve that file together with its host config using the same protected runtime-state backup policy already used by LRN-001.

## Rollback

1. Set `self_extending.enabled=false` in the PREPROD host configuration.
2. Stop claiming new self-extending jobs; existing RSI learning remains unchanged.
3. Revert the additive worker/host-integration commits if required.
4. Retain the journal for audit/recovery; do not delete it as part of rollback.
5. Verify the original RSI host tests and learning workflow remain GREEN.

No rollback requires touching PROD, CRM, App, Supabase, WordPress, SEO, Notion, Training or Trading.

## Rebuild

Recreate from repository source:

- `universal-skill-legacy184-self-extending-reopen-v0.mjs`
- `self-extending-mission-job-bridge-v0.mjs`
- `durable-job-runtime-v1.mjs`
- `durable-worker-runner-v1.mjs`
- `self-extending-capability-resolver-v0.mjs`
- `evaluation-tribunal.mjs`
- `self-extending-shared-worker-v1.mjs`
- `rsi-learning-auto-host.mjs`

Then run focused tests and exact-head CI. A new empty journal is valid for a new PREPROD state only; restoring an existing host must restore its prior journal instead of silently forgetting outstanding work.

## Autonomy state

- Code composition: `IMPLEMENTED`.
- Shared-host hook: `IMPLEMENTED`, default disabled.
- Durable local restart semantics: `TESTED_IN_CANDIDATE`.
- Evidence-bound resolver/Tribunal: `TESTED_IN_CANDIDATE`.
- Physical persistent-host activation: `POR_AUDITAR` until execution-time evidence exists.
- Legacy184 fully resolved: `NO`.
- PROD autonomous promotion: `NO`.
- HUMAN_REQUIRED remains exception-only and canonical.
- Additional cost: `0 €`.
