# RSI-RECOVERY-012 · Versioned Improvement Candidates

Date: 2026-10-08
Scope: CEREBRO OS / LRN-001 / PREPROD
Status at this commit: REOBSERVATION_IDEMPOTENCY_FIX_PREMERGE · LIVE_DURABLE_STATE_ACCEPTANCE_PENDING
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
- baseline version plus explicit provenance
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

## Durable-ledger compatibility and version provenance

The PREPROD LearningLedger is append-only and uses deterministic `learning_id` values. Its already-persisted payload shape is therefore part of the current runtime contract and must not be silently rewritten.

The first Block 2 merge attempted to add `source_version` directly to PREPROD learning records. The post-merge live control-plane acceptance run `37850249250` correctly rejected that mutation with `learning_id conflict with different payload`: an existing deterministic learning ID was being presented with a different payload. No state was deleted or rewritten and no PROD deployment occurred.

The first compatibility correction removed that schema mutation. A second live durable-state run, `37850898761`, still failed closed with the same error family. Investigation showed a different causal variable: the outbox had added a new batch containing some already-known deterministic event IDs. Those events are valid re-observations, but the bridge assigns a new processing-time `observed_at` when the source event has no explicit observation timestamp. The resulting learning record therefore kept the same deterministic `learning_id` while differing only in `observed_at`.

The second correction changes strategy at the ledger boundary without weakening conflict detection:

- exact same-ID/same-payload records remain ordinary duplicates;
- same-ID records whose complete semantic payload is identical except `observed_at` are treated as `semantic_duplicate=true`;
- the immutable first-seen record and original `observed_at` are preserved; no journal entry is rewritten or appended;
- any same-ID difference in hypothesis, evidence, risk, policy/authority fields or any other semantic field remains a hard `learning_id conflict with different payload` error.

This keeps first-seen audit evidence immutable while allowing repeated observations of the same deterministic event to be idempotent across later discovery batches.

Version provenance remains handled at the improvement-candidate layer:

- when a learning/evidence contract already provides an explicit `source_version`, the candidate records `baseline_version_source=SOURCE_EVIDENCE_VERSION` and no baseline verification is required;
- for current/legacy learning records without that field, the candidate uses the persisted learning context version only as a provisional baseline label, records `baseline_version_source=LEARNING_CONTEXT_VERSION_REQUIRES_OLD_CONTRACT_RESOLUTION`, and sets `baseline_verification_required=true` plus `experiment_contract.baseline_resolution_required=true`.

Therefore no historical learning journal migration is required. Block 3 must resolve and verify the exact OLD engine contract/version before executing OLD-vs-NEW whenever the baseline is provisional; it must never guess or overwrite history.

## Human-exception policy

Automatic candidate materialization is bounded to LOW/MEDIUM risk and confidence >= 0.60.

- HIGH or CRITICAL → `HUMAN_REQUIRED: HIGH_RISK`.
- Confidence < 0.60 → `HUMAN_REQUIRED: LOW_CONFIDENCE`.

No candidate can elevate permissions, budgets, policy authority, PROD write authority or Trading access.

## Persistence and isolation

Candidate persistence uses the existing atomic V8 journal mechanism outside Supabase. The candidate ledger is append-only, hash-validated and tenant-filtered. A control-plane execution for one `company_id` ignores learning records belonging to another company.

The candidate ledger path under each durable LRN company state is:

`<LRN_STATE_ROOT>/data/<company_id>/LRN-001/improvement-candidates.v8`

The LearningLedger duplicate policy is intentionally narrower than generic conflict suppression: only a pure re-observation-time difference is compatible. All semantic mutations continue to fail closed.

## Verification required before closeout

Exact-head gates must remain green for:

1. Improvement Candidate Factory contract/integration tests.
2. LearningLedger exact duplicate + re-observation semantic duplicate + real payload-conflict tests.
3. PREPROD learning-payload backward-compatibility regression.
4. RSI Recovery runtime regression suite.
5. Hostless Learning Control Plane contract.
6. Promotion Readiness Shadow boundary tests where triggered.

The post-merge acceptance gate is not satisfied by CI alone. After this correction merges, the main-branch Candidate Factory gate must succeed and automatically wake the main LRN control plane against the existing durable state. Durable `last-control-plane-run.json` must then show the candidate stage without PROD/Trading authority and `improvement-candidates.v8` must exist.

## Rollback

Repository rollback: revert the Block 2 runtime merges. Existing learning and candidate state is preserved for audit; do not delete the state branch or journal as part of rollback.

Runtime containment: LRN kill switch continues to stop learning/candidate execution. No rollback of App, CRM, Supabase, WordPress, SEO or production data is required because this block does not mutate those surfaces.

## Rebuild

The candidate journal can be reconstructed deterministically from the preserved learning ledger by re-running candidate materialization with the same source records and contract version. Rebuild must occur in PREPROD with the original ledger preserved as evidence; it must not overwrite or erase the old journal without a separate retention policy.

## Next gate

`RSI-RECOVERY-013 · AUTONOMOUS OLD VS NEW EXPERIMENT + INDEPENDENT EVALUATION + TRIBUNAL + ROLLBACK/REBUILD`.

No candidate may bypass that gate or self-promote to PROD.
