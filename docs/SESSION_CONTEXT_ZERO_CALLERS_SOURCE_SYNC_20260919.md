# Session context · PROD source sync · 2026-09-19

Status: SOURCE_SYNC_CANDIDATE_CI_GREEN_BEFORE_FINAL_DOC_REFRESH.

Purpose: prevent a future repo-driven deployment from reintroducing the retired direct authenticated boundary `fenix_prod_session_context()`, while preserving the App repository behavior and historical rollback contracts.

## Live PROD evidence used as source of truth for the identity boundary

The following LIVE PROD Edge Functions were verified before merge work:

- `fenix-document-auto-ingest` live v3 · SHA-256 `50af0b9cb947b46c467d699559d0b123541214e936ed4bf4437fddb2f4ab7a2e`
- `fenix-document-existing-backfill` live v8 · SHA-256 `cfe78207a52d5edaab2a02c1938394d55cd8e28aeef0c1acea2edcfc907de810`
- `fenix-document-extract` live v13 · SHA-256 `29000645966a35e2553cc575d4ec0e8221ec811cbc9226389921fa4c9a542a3f`
- `fenix-document-intelligence` live v13 · SHA-256 `9f3c9042711d64fe071dd8c5ddd76867c51652c773a0b1158538270457872947`
- `fenix-evidence-api` live v14 · SHA-256 `e60f373ac261bff2ffda161397f67bfcaa5b4a93797a42f8e19bcc02ebe8675d`

The repository sync started from the LIVE PROD sources. During CI reconciliation, two repository-side behavioral contracts that must not be lost were retained/fixed in parallel rather than blindly replacing them:

- `fenix-document-intelligence`: keeps the existing longest-name-first test/prod route handling, confidence normalization and labor-field projection, while replacing the direct legacy session-context caller with `auth.getUser` → service-role `fenix_prod_actor_context_by_auth_server`.
- `fenix-document-existing-backfill`: keeps the LIVE server-identity boundary and identity-repair path, and prevents ordinary non-`expediente` sessions from falling through into the normal auto-ingest route.

Therefore this PR is a **source reconciliation**, not a claim that every resulting repository file remains byte-for-byte identical to LIVE PROD. No Edge Function is deployed by this PR.

## Rollback / extractor evidence

Historical rollback snapshots remain historical and are not silently rewritten.

- Historical v12 rollback source pin remains `c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9`.
- Current synchronized repository source pin for `fenix-document-extract/index.ts` is `2f1bf1e8a0d1272135948e46b07e438ec89b10abf9804af1fde035e93446c063`.
- Candidate build/verify and rollback audit distinguish rollback vs current candidate explicitly.

## Frontend boundary evidence

Current `src/supabase.ts` routes authenticated application calls through Edge Functions using `authenticatedEdgeFetch`, and `src/appRpcCompat.ts` maps legacy logical RPC names to `fenix-app-gateway` HTTP routes.

A CI regression guard fails if:
- any exact direct `rpc('fenix_prod_session_context')` or double-quoted equivalent appears under `src` or `supabase/functions`;
- any of the five synchronized/reconciled functions loses `auth.getUser` or `fenix_prod_actor_context_by_auth_server`;
- the application no longer builds.

## CI evidence before this documentation-only refresh

For head `d38c3e1d1d51a50c46ed4b3f0c17cabe79f41d1d`:
- CEREBRO Session Context Regression Guard #8 · run `35404203268` · SUCCESS.
- App Restoration Build Gate #288 · run `35404203314` · SUCCESS.
- Restoration contracts, isolated visual runtime, five-flow regression and TypeScript/Vite build all passed.

A documentation-only commit after this evidence may create a new PR head; required checks must still be evaluated against the final mergeable head according to GitHub's branch/check rules.

## Safety

No PROD data, SQL ACL, RLS, secrets, environment variables, or runtime deployment is changed by this source-sync/reconciliation PR. LIVE PROD hashes above must remain unchanged until an explicitly authorized deployment is performed.
