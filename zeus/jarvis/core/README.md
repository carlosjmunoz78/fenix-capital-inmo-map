# SUPERAGENTE JARVIS · Universal Core V0 (BLOQUE 2)

**Status: LAB scaffold / NOT_OPERATIONAL.** This is a standalone ZEUS domain library, **not** the Jarvis user interface, and does not modify App, CRM, Supabase, Auth or other production services.

- Identity: one principal `OWNER_ROOT`, verified by an injected server-side identity provider. A device/channel does not mint privileges.
- Mission envelope: `coreId`, `ownerId`, `companyId`, `projectId`, `intent`, `idempotencyKey`, `channel`, `events`, `status`.
- Continuity: adapter interface for persistent event store. Bundled `MemoryEventStore` is **only in-process for unit testing**; it does not survive restart or provide cross-device persistence in production.
- Security: deny by default, tenant-scoped access, no handling of raw secrets, read-only deterministic capability registry, redacted responses, hard stop on mutations, no network or provider calls.
- No autonomous model or deepseek API in V0. DeepSeek, memory source-of-truth, durable idempotency, concurrency control, and policy-based authorization are follow-on B2/B3/B4 work.
- To run tests: `node --test core/jarvis-universal-core.test.mjs` (Node >= 22).

## Before production activation
Implement an encrypted server-side durable store with atomic unique `(ownerId, companyId, idempotencyKey)` constraints and CAS / leases; integrate authenticated session provider and permissions from ZEUS; map deterministic read-only capabilities to audited CEREBRO gateway; execute real cross-device and restart tests; add evidence and rollback; require security review. **Do not deploy/enable from this scaffold.**

## B2 lab durability increment
`jarvis-sqlite-store.mjs` adds an optional **local-only SQLite test adapter** based on Node 22 `node:sqlite` (currently experimental); it persists across process restart and enforces an atomic unique idempotency key for initial inserts. It **does not** establish safe cross-process concurrent CAS updates, multi-host HA, production durability, or server-authenticated cross-device sessions. Use this only in isolated LAB. The real ZEUS deployment needs a transactional persistent service and concurrency protocol.

Run all tests: `node --test core/*.test.mjs`.

## B2 corte 02 — bridge de identidad y store central (código preparado, NO desplegado)

- `jarvis-fenix-channel-identity.mjs`: **adaptador de un canal** autenticado mediante Supabase `getUser` + claims verificadas y el RPC `fenix_prod_actor_context_by_auth_server`. Rechaza `user_metadata` como autoridad. El `resolveCompanies` debe inyectarse desde un registro de ZEUS fiable y sujeto a autorización del propietario. **No es la identidad global ni ejecuta el login**.
- `jarvis-postgres-mission-store.mjs`: adaptador exclusivo de servidor; propone `createIfAbsent()` y actualizaciones CAS por revisión. **Nunca enviar service_role al navegador**. Solo metadatos de misión, no payloads pesados ni credenciales; cada llamada necesita validación de propietario en el Gateway.
- `../gates/20261103_jarvis_universal_mission_metadata_v0.sql`: propuesta aislada de tabla con RLS y sin grants anon/auth. **No aplicar automáticamente a PROD**. Revisar exposición de Data API, backups y políticas antes de habilitar.
- Núcleo: consume la inserción atómica si el store la ofrece; propaga la revisión devuelta por el store en cada transición para detectar escrituras concurrentes.
- `node --test core/*.test.mjs` en Node.js 22: 17 pruebas sin fallos.

**Gates pendientes:** integración con firma de sesión real y compañía autorizada desde ZEUS, revisión de seguridad (Auth/RLS/CAS, estados atascados/leases), migración versionada con rollback seguro, pruebas E2E multi-dispositivo, observabilidad y política de retención. No fusionar o desplegar como servicio autónomo sin estos gates. La persistencia central todavía no está activada.

## B2 corte 03 — HTTP Gateway V0 (LAB)

`jarvis-gateway-handler.mjs` provides a **framework-neutral Request -> Response** contract for `/v1/missions`, `/v1/missions/:id`, `/v1/missions/:id/execute` and `/v1/health`. All mission actions require bearer authentication through injected `JarvisUniversalCore`; no client sees service-role credentials. Health reports `ready:false` until a real provider and durable store are configured. Its tests exercise simulated mobile/desktop sessions, denial paths and replay.

Not exposed on the internet. Before public access: trusted issuer and session verification, rate limits, body size checks beyond create endpoints, permitted origins/CORS, audit retention, scrubbed free-text payloads (V0 only redacts by sensitive *field names*), secure observability, lock/lease recovery and system integration tests.

## B2 security increment 2026-11-03: ZEUS global principal

`jarvis-global-identity.mjs` resolves a single global owner identity **from trusted server-bound channel issuers**. All identity mappings must come from a ZEUS registry controlled server-side (`registry.resolve`); never trust a user-supplied `ownerId`, company or role. A company's authority is the **intersection** of the channel entitlement and ZEUS binding. A revoked binding denies access. Local unit tests demonstrate the *contract* only: no live real issuer or production registry is configured.

`createJarvisGatewayHandler({core,trustedAuthChannel:'fenix'})` binds the actual authentication provider from the trusted endpoint configuration, not the `channel` field in the UI payload (that field is a display/provenance label). A second device can read the same mission only if its provider authenticates an identity that ZEUS has independently bound to the same global owner.

`jarvis-concurrency.test.mjs` proves an optimistic revision-aware store permits at most one competing read-only executor to start. The losing request reports a revision conflict (409 through the Gateway); retries may re-read terminal status. The existing in-memory and SQLite adapters are **LAB-only** and DO NOT offer this distributed concurrency guarantee.

**Remaining mandatory gates**: real ZEUS identity binding registry and signed session validation, atomic durable store with row revision/lease and backup, authenticated cross-device E2E, crash-recovery for in-flight `AUTHORIZED` missions, explicit safe capability routing via CEREBRO, rollback test, security review. Never serve the LAB handler openly. No migration has been executed; no traffic has been switched from the current frontend/orchestrator.

## B2 corte 05 — identity registry and recovery (LAB, not live)

- `jarvis-zeus-binding-registry.mjs`: server-side ZEUS identity-binding lookup. The service uses keyed HMAC-SHA256 of `(trusted_channel, verified_subject)`, never a raw subject or bearer token in the binding table. The signing key **must** live in the server-side vault, not in source, database, app or browser. Revoked and missing records fail closed.
- `../gates/20261103_jarvis_zeus_identity_binding_v0.sql`: DDL proposal for a default-inactive, service-role-only identity registry. Not applied in PROD; owner binding must **not** be implicitly granted based on an email, a client-side claim, or being logged in to Fénix.
- `jarvis-recovery.test.mjs`: fail-closed on stale `AUTHORIZED` missions. At 5 minutes the mission is marked `FAILED` with `EXECUTION_INTERRUPTED` under CAS; no replay or automatic money/mutation/external side effects. No distributed lease/scheduler implemented yet; dedicated worker crash remains an operational gate.
- Local Node 22 execution: **33 tests passed** (`node --test zeus/jarvis/core/*.test.mjs`). This includes mocked storage and identity; NOT cross-device authenticated PROD E2E.

**Explicit NO-GO for B2 operational closure:** independent ZEUS registry not provisioned or seeded with validated owner binding; mission table not migrated; no real owner JWT E2E, persistent service endpoint or restart/device test. Do not enable the runtime or mark B2 `CONFIRMED_OPERATIONAL` without these proofs and observed rollback. All work remains on PR #13, draft, with NO changes to App or CRM routes.

`jarvis-cross-channel-sqlite-e2e.test.mjs` proves two separately authenticated **mock** channel adapters can create/read the same mission after physically closing/reopening a SQLite file; 34/34 tests now pass. Not real mobile/PC owner JWT E2E, does not grant a PROD go-live.