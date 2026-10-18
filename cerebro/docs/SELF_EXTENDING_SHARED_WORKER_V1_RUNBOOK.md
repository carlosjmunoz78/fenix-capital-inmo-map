# SELF-EXTENDING SHARED WORKER V1 · RUNBOOK

## Goal

Run legacy blocked-capability resolution on the existing persistent CEREBRO host, using shared JOB-001 durability and an independent Tribunal. Do not create one server per engine.

## Activation

The existing `rsi-learning-auto-host.mjs` accepts an optional `self_extending` block. Default remains disabled, preserving current behavior. Governed PREPROD activation requires:

- `enabled=true`
- explicit evidence bindings for any capability allowed to resolve automatically
- an authorized persistent `company_root`
- no PROD authority
- no paid fallback

Each binding must identify the exact `capability_id`, an allowed strategy, an evidence reference, measured OLD/NEW metric values, an independent judge, and backup/rollback/rebuild references.

## Loop

1. Build the current legacy184 dispatch batch.
2. Idempotently enqueue into `DurableJobRuntimeV1`.
3. Reuse the existing journal from the RSI company root.
4. `DurableWorkerRunnerV1` claims only bounded PREPROD work.
5. Resolver tries reuse/wrap/scout/build order.
6. A selected dependency is not enough: `verify_and_resume` requires an explicit evidence binding.
7. Tribunal compares the predefined metric and rejects degradation/no-evidence.
8. Only Tribunal PASS can yield `FULL_SAFE_PREPROD` and then `RESUMED_GREEN`.
9. Durable result/checkpoint remains available after host restart.

## Fail-closed behavior

Missing evidence, missing recovery references, non-independent judge, wrong environment, paid fallback, PROD authority, or invalid binding never becomes green. Human-only dependencies remain in the canonical HUMAN_REQUIRED set.

## Verification

Run:

`node --test cerebro/tests/self-extending-shared-worker-v1.test.mjs`

`node --test cerebro/tests/rsi-learning-auto-host.test.mjs`

and the existing Self-Extending Repo Runtime workflow. Exact-head CI is required before PREPROD activation claims.

## Rollout

Keep PR #784 draft. Do not auto-merge. Do not promote to PROD. Physical persistent-host activation is a separate gate from code/CI readiness.
