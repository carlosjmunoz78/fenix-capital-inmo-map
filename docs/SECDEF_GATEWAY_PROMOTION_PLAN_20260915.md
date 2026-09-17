# CEREBRO · SECDEF Gateway promotion plan · refreshed 2026-09-17

Status: **READINESS GREEN / PRIMARY V2 NOT PROMOTED**

## Scope

This plan governs the 15 server-only SECURITY DEFINER wrappers and their authenticated `/v2/...` routes. It preserves the current primary Gateway and all legacy capabilities until authenticated HTTP parity, controlled mutation tests and rollback are demonstrated.

No legacy capability is retired by this change.

The frontend App remains frozen on the restored `gh-pages` PROD snapshot. `main` can advance without implicitly publishing the frontend; `PROD Live Deploy` is manual-only and requires explicit confirmation. Runtime Smoke is freeze-aware and no longer assumes every `main` push equals the live frontend SHA.

## Live evidence refreshed 2026-09-17

- Repository main: `973a9e9daca35008c9b6ddd3f716519eb4b5694b`.
- `PROD Runtime Smoke` run `#251` / `35200851398`: **SUCCESS** on that exact main SHA.
- Canonical main source `supabase/functions/fenix-app-gateway/index.ts` contains all 15 `/v2/...` route mappings.
- Supabase PROD primary `fenix-app-gateway`: `ACTIVE`, version `18`, `verify_jwt=false`; custom bearer identity validation remains in the function body.
- Live primary version 18 source does **not** contain the 15 `/v2/...` routes. Repository source is ahead of the primary deployed runtime.
- Isolated `fenix-app-gateway-v2-canary`: `ACTIVE`, version `1`, `verify_jwt=false`; its source contains the 15 contracted `/v2/...` routes.
- All 15 `*_server` wrappers exist live in schema `public` and remain service-role-only.
- All mapped legacy functions remain available to authenticated callers as the OLD rollback path.
- Secret hygiene V2 is integrated on main and required secrets are referenced from GitHub Actions secrets.
- Runtime Smoke security/availability checks are green, including APP 200, Gateway health, anonymous fail-closed checks, CORS and Ana Knowledge fail-closed auth semantics.

## OLD → NEW contract

Canonical contract: `supabase/secdef_gateway_route_contract_20260915.json`.

Contract invariants: `contract_version=1`, `environment=PROD`, `legacy_retirement=false`, `old_vs_new_required=true`, exactly 15 method/path/wrapper/legacy mappings.

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

- Authentication: protected routes require a Bearer token resolved server-side.
- Authorization boundary: user identity is mapped to actor context; `*_server` wrappers execute only through the server-side service-role client.
- Anonymous direct wrapper execution: denied.
- Authenticated direct wrapper execution: denied.
- Legacy rollback: preserved until parity is complete.
- Idempotency: explicit on `/v2/chat/messages`.
- Optimistic concurrency: explicit `expected_version` on inmobiliaria follow-up.

## Existing parity evidence

Supporting SQL-level parity remains GREEN for profile full, profile socials, chat people and chat conversations. `chat_list_v2` payload parity remains POR AUDITAR because no meaningful linked conversation was available in that audit.

SQL-level parity is supporting evidence only. Authenticated HTTP parity remains mandatory.

## Promotion sequence

Primary promotion is HIGH_RISK and requires explicit human authorization immediately before deployment.

After authorization:

1. capture primary v18 metadata/source hash as rollback baseline;
2. confirm canary v1 metadata and source;
3. confirm frontend `gh-pages` snapshot remains unchanged and manual-only deploy guard is active;
4. deploy canonical main Gateway source as a new primary version without touching legacy grants or frontend hosting;
5. verify `/health`, environment and configuration;
6. run authenticated and denied HTTP checks for all 15 contracted capabilities;
7. run OLD-vs-NEW parity for read routes;
8. run controlled mutation E2E only with isolated/reversible test records;
9. on any failure, restore the captured primary v18 source and leave legacy grants and frontend snapshot untouched;
10. after successful rollback proof, recover/promote NEW and re-run health/parity;
11. only after this entire sequence is GREEN may legacy retirement be considered separately.

## Rollback baseline

- Edge Function: `fenix-app-gateway` version `18`.
- Status: `ACTIVE`.
- `verify_jwt=false` with custom authentication in source.
- Legacy RPC EXECUTE remains preserved for authenticated callers.
- Canary v1 remains isolated.
- Frontend remains independently recoverable through the frozen `gh-pages` snapshot.

Re-fetch immediately before deployment in case another actor changes the live version.

## Current classification

- WRAPPERS_PROD: **HECHO / LIVE 15/15**
- WRAPPER_PERMISSIONS: **GREEN 15/15**
- LEGACY_ROLLBACK_GRANTS: **GREEN 15/15**
- REPOSITORY_V2_ROUTE_IMPLEMENTATION: **HECHO 15/15**
- FRONTEND_PROD_FREEZE: **HECHO / MANUAL-ONLY DEPLOY**
- SECRET_HYGIENE_V2: **HECHO / GREEN**
- RUNTIME_SMOKE_FREEZE_AWARE: **HECHO / GREEN #251**
- PRIMARY_GATEWAY_LIVE: **ACTIVE v18 / OLD BEHAVIOR**
- GATEWAY_V2_CANARY: **ACTIVE v1 / 15 ROUTES**
- PRIMARY_PROD_GATEWAY_PROMOTION: **NOT DONE**
- AUTHENTICATED_HTTP_E2E: **POR AUDITAR**
- AUTHENTICATED_HTTP_OLD_VS_NEW: **POR AUDITAR**
- MUTATION_E2E: **POR AUDITAR**
- ROLLBACK_LIVE_REHEARSAL: **POR AUDITAR**
- LEGACY_RETIREMENT: **BLOCKED UNTIL LOTE 3 GREEN**
- SAFE_TO_RETIRE_LEGACY: **NO**
