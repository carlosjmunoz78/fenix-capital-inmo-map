# SOURCE AUDIT V1 · Fixed physical provenance (LAB only)

Status: **candidate / no production deployment**. Branch created from main at `902022f5d4dcc4aab29e6d35411a63c38fe438e7`.

## Observed failure
The read-only workflow `CEREBRO PROD Source Audit V1` fails at “Read and verify physical PROD source stamp” (runs 44481227840 and 44393772348). The active Vercel deployment has no `public/PROD_SOURCE_SHA.txt`. The project rewrites unknown paths to `index.html`, which cannot be parsed as the required Git SHA.

## Candidate
After the existing Vite build, `scripts/emit-prod-source-stamp.mjs` emits `dist/PROD_SOURCE_SHA.txt` from a 40-hex-character source revision. Valid sources: explicit `CEREBRO_BUILD_SOURCE_SHA`, `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA`, or `git rev-parse HEAD`. Conflicting metadata fails closed; an unidentified production build fails closed. Non-production local builds without metadata do not invent provenance.

This changes no runtime endpoints, no auth, no DNS, no DATA, and no UI; the historical PROD Source Audit workflow is unchanged.

## Evidence
Five local Node.js tests passed before push. The build needs a separate exact-SHA isolated build and HTTP smoke on a non-production URL before any promotion. Required: `200` on `/PROD_SOURCE_SHA.txt` with exact 40-hex SHA matching GitHub and the Vercel deployment; `content-type: text/plain`, and no HTML rewrite. Check negative/contradictory SHA cases, complete OLD-vs-NEW regression, immutable artifact, backup and full rollback. **No merge or promotion until all pass**.

## Rollback
The change is isolated in this branch; abandoning or closing the DRAFT PR leaves production untouched. To roll back a future deployment, restore the previously verified Vercel deployment by exact ID and verify the domain mapping. Do not auto-promote on CI green alone.

Known caveat: CI or Vercel CLI builds that lack both Git metadata and an explicit SHA will stop rather than publish a counterfeit stamp. Supply the exact immutable commit identity securely in the release pipeline; never hard-code a prior SHA.
