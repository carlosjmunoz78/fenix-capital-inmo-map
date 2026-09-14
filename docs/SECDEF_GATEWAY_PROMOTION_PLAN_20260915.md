# CEREBRO · SECDEF Gateway promotion plan · 2026-09-15

Status: **PREPARED / NOT PROMOTED**

## Scope

This change reconciles 15 server-only SECURITY DEFINER wrappers already present in Supabase PROD with the canonical repository, and wires them behind authenticated `/v2/...` routes in `fenix-app-gateway` on the PR branch.

No legacy capability is retired by this change.

## Live evidence

- Supabase PROD project status: `ACTIVE_HEALTHY`.
- Deployed `fenix-app-gateway`: `ACTIVE`, version `17` at audit time.
- Deployed Gateway v17 does **not** contain the new `/v2/...` routes.
- Current canonical main Gateway source blob before this branch change: `015b196f2b5d9daf2a37be7a6cccc46d6e569ce1`.
- 15 prepared `*_server` wrappers exist live in PROD.
- All 15 grant `EXECUTE` to `service_role` and deny `authenticated` and `anon` EXECUTE.
- Legacy user/direct functions remain available to authenticated callers. This is the OLD rollback path and must stay available until parity is green.

## Branch evidence

PR: `#382`

Prepared Gateway implementation commit: `505de3eab621af306fc7eef731948788f3f1c094`.

CI hardening head at evidence time: `f6e5abeab8f024903c8fcc07d2920d6c09dcda9c`.

GitHub Actions run `34905887748` completed SUCCESS with:

- wrapper files present;
- additive server-only boundary preserved;
- identity/idempotency guards present;
- route contract valid;
- all 15 wrappers covered by route contract;
- all 15 wrappers referenced by Gateway implementation;
- repository build successful;
- no legacy authenticated retirement.

## OLD → NEW contract

Canonical contract: `supabase/secdef_gateway_route_contract_20260915.json`.

The contract defines 15 method/path/wrapper/legacy mappings and requires `old_vs_new_required=true` and `legacy_retirement=false` until promotion gates are completed.

## Promotion gates

A PROD deployment is blocked until all of the following are explicitly satisfied:

1. exact-head CI remains green;
2. explicit human authorization to promote the Gateway;
3. deploy new Gateway version without revoking any legacy EXECUTE;
4. authenticated HTTP smoke for identity resolution and all read-only v2 routes;
5. controlled OLD-vs-NEW parity for read paths;
6. controlled mutation E2E using isolated/reversible test records only;
7. rollback rehearsal to Gateway v17/main source plus legacy RPC path;
8. only then consider one-by-one legacy EXECUTE retirement;
9. security advisor and regression after each retirement batch.

## Rollback

Rollback target before promotion:

- Edge Function: `fenix-app-gateway` version `17` (live audit baseline).
- Repository source baseline: main Gateway blob `015b196f2b5d9daf2a37be7a6cccc46d6e569ce1`.
- Legacy RPC EXECUTE remains preserved during the entire parity phase.

If any HTTP/E2E/parity check fails after promotion, restore the baseline Gateway and leave legacy EXECUTE untouched.

## Current classification

- WRAPPERS_PROD: **HECHO / LIVE**
- WRAPPER_PERMISSIONS: **GREEN**
- GATEWAY_V2_BRANCH_IMPLEMENTATION: **HECHO**
- GATEWAY_BRANCH_CI: **GREEN**
- PROD_GATEWAY_DEPLOYMENT: **NOT DONE**
- AUTHENTICATED_HTTP_E2E: **POR AUDITAR**
- OLD_VS_NEW_PARITY: **POR AUDITAR**
- ROLLBACK_LIVE_REHEARSAL: **POR AUDITAR**
- LEGACY_RETIREMENT: **BLOCKED**
- SAFE_TO_MERGE: **NO_TODAVIA**
- SAFE_TO_DEPLOY_PROD: **NO_TODAVIA**
- SAFE_TO_RETIRE_LEGACY: **NO**
