# CEREBRO · SECDEF Gateway promotion plan · refreshed 2026-09-17

Status: **READINESS GREEN / PRIMARY V2 NOT PROMOTED**

## Scope

This plan governs the 15 server-only SECURITY DEFINER wrappers and their authenticated `/v2/...` routes. It preserves the current primary Gateway and all legacy capabilities until authenticated HTTP parity, controlled mutation tests and rollback are demonstrated.

No legacy capability is retired by this change.

The visible App is frozen on the restored `gh-pages` snapshot. Changes in `main` must not publish the App automatically; PROD publication is manual-only under the deployment freeze recorded in `docs/ops/PROD_DEPLOY_FREEZE_2026-09-17.md`.

## Live evidence refreshed 2026-09-17

- Repository main at reconciliation time: `ead01136645008d7e223fd78c99b96c1224a4514`.
- Canonical main source `supabase/functions/fenix-app-gateway/index.ts` contains all 15 `/v2/...` route mappings.
- Supabase PROD primary `fenix-app-gateway`: `ACTIVE`, version `18`, `verify_jwt=false`; custom bearer identity validation remains in the function body.
- Live primary version 18 source does **not** contain the 15 `/v2/...` routes. Therefore repository source is ahead of the primary deployed runtime.
- Isolated `fenix-app-gateway-v2-canary`: `ACTIVE`, version `1`, `verify_jwt=false`; its source contains exactly the 15 contracted `/v2/...` routes and custom bearer identity validation.
- Canary and primary both use server-side service-role access; the service credential is not returned to browser callers.
- All 15 `*_server` wrappers exist live in schema `public`.
- Revalidated grants: all 15 server wrappers grant `EXECUTE` to `service_role`; no `anon` or `authenticated` EXECUTE grants are present for those wrappers.
- Revalidated rollback path: all 15 mapped legacy functions still grant `EXECUTE` to `authenticated` and `service_role`. OLD therefore remains available.
- The visible App rollback snapshot is `gh-pages=f3cfec750d81bf6a9e6412990786a5a5913d1113`, sourced from application code `d7f270c520417b5aba2ca5ea45c1ceb5def31ac7`.

## OLD → NEW contract

Canonical contract: `supabase/secdef_gateway_route_contract_20260915.json`.

Contract invariants:

- `contract_version=1`
- `environment=PROD`
- `legacy_retirement=false`
- `old_vs_new_required=true`
- exactly 15 method/path/wrapper/legacy mappings

The 15 capabilities are:

1. POST `/v2/ana/knowledge/answer`
2. GET `/v2/chat/conversations`
3. GET `/v2/chat/conversations/{conversation_code}/messages`
4. GET `/v2/chat/people`
5. GET `/v2/profile`
6. GET `/v2/profile/socials`
7. POST `/v2/chat/attachments`
8. POST `/v2/chat/attachments-v2`
9. POST `/v2/chat/conversations`
10. POST `/v2/chat/groups`
11. POST `/v2/chat/messages`
12. POST `/v2/contactos`
13. PATCH `/v2/inmobiliarias/{inmobiliaria_code}/followup`
14. PATCH `/v2/profile/socials`
15. PATCH `/v2/profile`

## Security mapping

- Authentication: every protected route requires a Bearer token resolved with `auth.getUser`; unresolved identity returns `401 identity_not_linked`.
- Authorization boundary: browser/user identity is converted to an actor context, while `*_server` wrappers execute only through the server-side service-role client.
- Anonymous direct wrapper execution: denied by grants.
- Authenticated direct wrapper execution: denied by grants.
- Legacy rollback: preserved for authenticated callers until parity is complete.
- Idempotency: explicit on `/v2/chat/messages`; other mutation semantics remain defined by their wrapper/legacy contracts.
- Optimistic concurrency: explicit `expected_version` on inmobiliaria follow-up; other mutation semantics remain defined by their wrapper/legacy contracts.

## Existing parity evidence

Supporting SQL-level parity from the previous audit remains recorded as GREEN for:

- profile full;
- profile socials;
- chat people;
- chat conversations.

`chat_list_v2` payload parity remains POR AUDITAR because no meaningful linked conversation was available in that audit.

SQL-level parity is supporting evidence only. Authenticated HTTP parity remains mandatory.

## Promotion sequence

Primary promotion is HIGH_RISK and requires explicit human authorization immediately before deployment.

After authorization:

1. capture primary v18 metadata/source hash as rollback baseline;
2. confirm canary v1 metadata and source;
3. verify the visible App remains on the frozen `gh-pages` snapshot and that no main-push auto-deploy path is active;
4. deploy canonical Gateway source as a new primary version without touching legacy grants and without publishing the App frontend;
5. verify `/health`, environment and configuration;
6. run authenticated and denied HTTP checks for all 15 contracted capabilities;
7. run OLD-vs-NEW parity for read routes;
8. run controlled mutation E2E only with isolated/reversible test records;
9. on any failure, restore the captured primary v18 source and leave legacy grants untouched;
10. after successful rollback proof, recover/promote NEW and re-run health/parity;
11. only after this entire sequence is GREEN may legacy retirement be considered in a separate lot.

## Rollback baseline

Current live rollback target before primary promotion:

- Edge Function: `fenix-app-gateway` version `18`.
- Status: `ACTIVE`.
- `verify_jwt=false` with custom authentication in source.
- Legacy RPC EXECUTE remains preserved for authenticated callers.
- Canary v1 remains isolated and does not replace the primary App path.
- Frontend PROD remains independently recoverable via the frozen `gh-pages` snapshot.

Never hardcode version 17 again: version 18 is the live baseline verified on 2026-09-17. Re-fetch immediately before deployment in case another actor changes it.

## Current classification

- WRAPPERS_PROD: **HECHO / LIVE 15/15**
- WRAPPER_PERMISSIONS: **GREEN 15/15**
- LEGACY_ROLLBACK_GRANTS: **GREEN 15/15**
- REPOSITORY_V2_ROUTE_IMPLEMENTATION: **HECHO 15/15**
- PRIMARY_GATEWAY_LIVE: **ACTIVE v18 / OLD BEHAVIOR**
- GATEWAY_V2_CANARY: **ACTIVE v1 / 15 ROUTES**
- FRONTEND_PROD_DEPLOYMENT: **FROZEN / MANUAL ONLY**
- PRIMARY_PROD_GATEWAY_PROMOTION: **NOT DONE**
- AUTHENTICATED_HTTP_E2E: **POR AUDITAR**
- AUTHENTICATED_HTTP_OLD_VS_NEW: **POR AUDITAR**
- MUTATION_E2E: **POR AUDITAR**
- ROLLBACK_LIVE_REHEARSAL: **POR AUDITAR**
- LEGACY_RETIREMENT: **BLOCKED UNTIL LOTE 3 GREEN**
- SAFE_TO_RETIRE_LEGACY: **NO**
