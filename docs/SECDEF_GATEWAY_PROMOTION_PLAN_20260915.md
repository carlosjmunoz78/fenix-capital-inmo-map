# CEREBRO · SECDEF Gateway promotion plan · 2026-09-15

Status: **CANARY LIVE / PRIMARY NOT PROMOTED**

## Scope

This change reconciles 15 server-only SECURITY DEFINER wrappers already present in Supabase PROD with the canonical repository, and wires them behind authenticated `/v2/...` routes in `fenix-app-gateway` on the PR branch.

No legacy capability is retired by this change.

## Live evidence

- Supabase PROD project status: `ACTIVE_HEALTHY`.
- Primary deployed `fenix-app-gateway`: `ACTIVE`, version `17` at audit time.
- Primary Gateway v17 does **not** contain the new `/v2/...` routes.
- 15 prepared `*_server` wrappers exist live in PROD.
- All 15 grant `EXECUTE` to `service_role` and deny `authenticated` and `anon` EXECUTE.
- Legacy user/direct functions remain available to authenticated callers. This is the OLD rollback path and must stay available until parity is green.
- Isolated Edge Function `fenix-app-gateway-v2-canary` is deployed as ACTIVE v1. It does not replace the primary Gateway.
- Canary `/health` returns HTTP 200 with PROD configuration available.
- Canary protected routes fail closed without a user session: `/v2/profile` returned HTTP 401 `identity_not_linked`.

## OLD → NEW contract

Canonical contract: `supabase/secdef_gateway_route_contract_20260915.json`.

The contract defines 15 method/path/wrapper/legacy mappings and requires `old_vs_new_required=true` and `legacy_retirement=false` until promotion gates are completed.

## Read-only parity evidence

Using a single transaction-local auth context for an existing linked actor, OLD user functions were compared with NEW server wrappers without returning customer data.

Exact equality and matching payload hashes were confirmed for:

- profile full: **GREEN**;
- profile socials: **GREEN**;
- chat people: **GREEN**;
- chat conversations: **GREEN**.

No linked actor currently had a chat conversation available for a meaningful `chat_list_v2` payload comparison, so that case remains **POR AUDITAR** rather than being falsely marked green.

This SQL-level parity is supporting evidence only. Authenticated HTTP parity remains mandatory before primary promotion or legacy retirement.

## Promotion gates

Primary PROD promotion remains blocked until all of the following are satisfied:

1. exact-head CI remains green;
2. canary remains healthy and fail-closed;
3. authenticated HTTP smoke using a real user session JWT;
4. authenticated OLD-vs-NEW parity for the read routes;
5. controlled mutation E2E using isolated/reversible test records only;
6. rollback rehearsal to Gateway v17/main source plus legacy RPC path;
7. only then consider one-by-one legacy EXECUTE retirement;
8. security advisor and regression after each retirement batch.

## Rollback

Rollback target before primary promotion:

- Edge Function: primary `fenix-app-gateway` version `17`.
- Legacy RPC EXECUTE remains preserved during the entire parity phase.
- Canary is isolated and can be ignored/removed without changing the primary App path.

If any HTTP/E2E/parity check fails after primary promotion, restore the baseline Gateway and leave legacy EXECUTE untouched.

## Current classification

- WRAPPERS_PROD: **HECHO / LIVE**
- WRAPPER_PERMISSIONS: **GREEN**
- GATEWAY_V2_BRANCH_IMPLEMENTATION: **HECHO**
- GATEWAY_BRANCH_CI: **GREEN**
- GATEWAY_V2_CANARY: **HECHO / LIVE / ACTIVE v1**
- CANARY_HEALTH: **GREEN**
- CANARY_FAIL_CLOSED: **GREEN**
- SQL_READ_PARITY_4_CORE_PATHS: **GREEN**
- PRIMARY_PROD_GATEWAY_PROMOTION: **NOT DONE**
- AUTHENTICATED_HTTP_E2E: **POR AUDITAR**
- AUTHENTICATED_HTTP_OLD_VS_NEW: **POR AUDITAR**
- MUTATION_E2E: **POR AUDITAR**
- ROLLBACK_LIVE_REHEARSAL: **POR AUDITAR**
- LEGACY_RETIREMENT: **BLOCKED**
- SAFE_TO_MERGE: **NO_TODAVIA**
- SAFE_TO_PROMOTE_PRIMARY: **NO_TODAVIA**
- SAFE_TO_RETIRE_LEGACY: **NO**
