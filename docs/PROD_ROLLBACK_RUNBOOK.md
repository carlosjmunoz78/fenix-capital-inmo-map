# Fénix Capital · PROD rollback runbook

## Goal
Restore the last known-good application state without editing the live `gh-pages` branch by hand and without bypassing the canonical PROD pipeline.

## Invariants
- `main` remains the single source of truth for PROD.
- PRE-PROD never publishes the live channel.
- A rollback is performed by reverting the offending commit(s) on `main`, not by manually force-pushing an old static snapshot to `gh-pages`.
- The normal `PROD Live Deploy` workflow publishes the reverted state.
- `PROD Runtime Smoke` must finish green and must confirm that `app.fenixcapital.es` serves the exact new `main` SHA.
- No TEST/PRE-PROD Supabase endpoint may exist in the resulting bundle.

## Non-disruptive rehearsal
Before a rollback is ever needed, use the manual workflow `PROD Rollback Rehearsal` with a known-good historical commit SHA.

The rehearsal:
1. Checks out exactly the requested SHA.
2. Builds it with PROD configuration.
3. Rejects a bundle containing the PRE-PROD backend.
4. Requires the canonical PROD backend to be present.
5. Produces a static rollback candidate artifact for inspection.
6. Does **not** publish, push or modify `gh-pages`, `main`, Supabase or the live app.

## Emergency rollback procedure
1. Identify the last known-good `main` commit and the offending merge/commit.
2. Rehearse the known-good commit with `PROD Rollback Rehearsal` and require green.
3. Create a dedicated rollback branch from current `main`.
4. Revert only the offending commit(s); do not reset or rewrite `main` history.
5. Open a PR to `main`.
6. Require PRE-PROD build, Browser QA and smoke to be green.
7. Merge the rollback PR.
8. Wait for `PROD Live Deploy` to be green.
9. Wait for `PROD Runtime Smoke` to be green, including exact deployed SHA.
10. Verify the reported user-visible failure in the live app.

## Abort conditions
Stop and do not merge if any of the following is red:
- build or TypeScript
- Browser QA
- PROD-only backend assertion
- PRE-PROD isolation
- exact SHA check
- runtime smoke

## Forward recovery
Once the root cause is fixed, ship the correction through the same branch → PR → PRE-PROD → merge → PROD → smoke sequence. Never reapply the failed change directly in PROD.
