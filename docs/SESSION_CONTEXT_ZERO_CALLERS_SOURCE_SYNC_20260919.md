# Session context · PROD source sync · 2026-09-19

Status: SOURCE_SYNC_PREPARED_FOR_REVIEW.

Purpose: prevent a future repo-driven deployment from reintroducing the retired direct authenticated boundary `fenix_prod_session_context()`.

## Live PROD sources copied exactly into repository branch

The following repository files were stale and still called the legacy RPC directly while their live PROD Edge Functions had already been migrated:

- `fenix-document-auto-ingest` live v3 · SHA-256 `50af0b9cb947b46c467d699559d0b123541214e936ed4bf4437fddb2f4ab7a2e`
- `fenix-document-existing-backfill` live v8 · SHA-256 `cfe78207a52d5edaab2a02c1938394d55cd8e28aeef0c1acea2edcfc907de810`
- `fenix-document-extract` live v13 · SHA-256 `29000645966a35e2553cc575d4ec0e8221ec811cbc9226389921fa4c9a542a3f`
- `fenix-document-intelligence` live v13 · SHA-256 `9f3c9042711d64fe071dd8c5ddd76867c51652c773a0b1158538270457872947`
- `fenix-evidence-api` live v14 · SHA-256 `e60f373ac261bff2ffda161397f67bfcaa5b4a93797a42f8e19bcc02ebe8675d`

Each file in this branch was replaced with the exact current live `index.ts` source from Supabase PROD. This is repository synchronization only; it does not deploy or execute any Edge Function.

## Frontend boundary evidence

Current `src/supabase.ts` routes authenticated application calls through Edge Functions using `authenticatedEdgeFetch`, and `src/appRpcCompat.ts` maps legacy logical RPC names to `fenix-app-gateway` HTTP routes.

A CI regression guard is added to fail if:
- any exact direct `rpc('fenix_prod_session_context')` or double-quoted equivalent appears under `src` or `supabase/functions`;
- any of the five synchronized functions loses `auth.getUser` or `fenix_prod_actor_context_by_auth_server`;
- the application no longer builds.

## Safety

No PROD data, SQL ACL, RLS, secrets, environment variables, or runtime deployment is changed by this source-sync PR.
