# RSI-RECOVERY-012 · Versioned Improvement Candidates

Date: 2026-10-08
Scope: CEREBRO OS / LRN-001 / PREPROD
Status at this commit: SOFTWARE_VERIFIED_PREMERGE · POSTMERGE_LIVE_ACCEPTANCE_PENDING
Additional cost: 0 EUR
PROD authority: false
Trading access: false

## Objective

Convert durable LRN-001 learning evidence into deterministic, tenant-local, versioned improvement candidates automatically, without manual JSON and without modifying current engine behavior.

The preservation rule remains mandatory:

CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

A learning candidate is not an authorization to change an engine. It is only an immutable proposal for the next OLD-vs-NEW experiment gate.

## Implemented path

Operational evidence
→ universal learning ingress
→ tenant-local PREPROD learning ledger
→ `improvement-candidate-factory.mjs`
→ append-only `improvement-candidates.v8`
→ `OLD_VS_NEW_EXPERIMENT`.

The bounded hostless LRN control plane invokes candidate materialization after the learning cycle. The same durable LRN state branch persists the resulting candidate journal; no separate paid runtime or Supabase workload is introduced.

## Candidate contract

Each generated candidate records at minimum:

- `company_id`
- target `engine_id`
- `environment=PREPROD`
- source learning/event identity
- source/baseline engine version when available
- deterministic candidate version
- hypothesis and change intent
- target metric and direction
- risk and confidence
- evidence refs
- preservation requirements
- OLD and NEW version identifiers
- rollback/rebuild requirements
- zero-cost and no-authority-expansion flags.

Candidate identity and version are derived deterministically from the learning evidence. Re-running the same evidence is idempotent and does not create a second logical candidate.

## Version preservation

Before LRN changes the record context to its PREPROD runtime version, `learning-preprod-pipeline.mjs` now preserves the source engine/event version as `source_version`.

New candidates therefore use the original source version as `baseline_version`. Legacy learning records that predate this field remain compatible and fall back to their persisted learning version rather than being destroyed or rewritten.

## Human-exception policy

Automatic candidate materialization is bounded to LOW/MEDIUM risk and confidence >= 0.60.

- HIGH or CRITICAL → `HUMAN_REQUIRED: HIGH_RISK`.
- Confidence < 0.60 → `HUMAN_REQUIRED: LOW_CONFIDENCE`.

No candidate can elevate permissions, budgets, policy authority, PROD write authority or Trading access.

## Persistence and isolation

Candidate persistence uses the existing atomic V8 journal mechanism outside Supabase. The candidate ledger is append-only, hash-validated and tenant-filtered. A control-plane execution for one `company_id` ignores learning records belonging to another company.

The candidate ledger path under each durable LRN company state is:

`<LRN_STATE_ROOT>/data/<company_id>/LRN-001/improvement-candidates.v8`

## Verification before merge

Exact-head gates must remain green for:

1. Improvement Candidate Factory contract/integration tests.
2. RSI Recovery runtime regression suite.
3. Hostless Learning Control Plane contract.
4. Promotion Readiness Shadow: FACT-001, independent tribunal boundary and App surface isolation/build.

The post-merge acceptance gate is not satisfied by CI alone. After merge, the main-branch Candidate Factory gate must succeed and automatically wake the main LRN control plane. Durable `last-control-plane-run.json` must then show the candidate stage without PROD/Trading authority.

## Rollback

Repository rollback: revert the Block 2 merge. Existing learning and candidate state is preserved for audit; do not delete the state branch or journal as part of rollback.

Runtime containment: LRN kill switch continues to stop learning/candidate execution. No rollback of App, CRM, Supabase, WordPress, SEO or production data is required because this block does not mutate those surfaces.

## Rebuild

The candidate journal can be reconstructed deterministically from the preserved learning ledger by re-running candidate materialization with the same source records and contract version. Rebuild must occur in PREPROD with the original ledger preserved as evidence; it must not overwrite or erase the old journal without a separate retention policy.

## Next gate

`RSI-RECOVERY-013 · AUTONOMOUS OLD VS NEW EXPERIMENT + INDEPENDENT EVALUATION + TRIBUNAL + ROLLBACK/REBUILD`.

No candidate may bypass that gate or self-promote to PROD.
