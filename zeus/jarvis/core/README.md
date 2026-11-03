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