# JARVIS CUT20 · Cloudflare Workers + D1 candidate · 2026-11-05

**STATE: PARCIAL / LAB_TEST_GREEN / CLOUD_REMOTE_NOT_PROVISIONED / PROD_NO_GO**

## Objective and architecture boundary
Continue CUT15–CUT18 without replacing any existing runtime. A NEW dedicated Cloudflare D1 database and Worker, if later authorized and verified, could provide always-available JARVIS metadata and read-only mission access without a powered-on local computer. D1 uses SQLite, **not PostgreSQL**; its data access is **not** protected by Postgres RLS. No claim of equivalent DB privileges is permitted.

Conservative, isolated route:

`CEREBRO Console (future authentic session) → separated JARVIS LAB Worker → existing perimeter gate → existing B2 verified identity/session → B3 MISSION_INSPECT audited grant → D1 server binding → previously created mission`

Mutative HTTP routes: **OFF**. Cloudflare account, bindings, real Vault, real sessions and production authorization: **NOT VERIFIED**.

## Files and contracts
- `zeus/jarvis/cloudflare-lab/0001_jarvis_d1_mission_lab.sql`: dedicated `jarvis_lab_mission_v0`, explicit environment LAB, engine, owner, company, version, idempotency, revision, JSON size bound; no credentials/grants.
- `zeus/jarvis/core/jarvis-d1-mission-store.mjs`: D1 binding adapter implementing existing `get`, `findByIdempotency`, `createIfAbsent`, `put`; additionally scoped `getForScope`. Atomic `ON CONFLICT DO NOTHING RETURNING`, CAS revision. All SQL with prepared bindings and error redaction. Never exposed directly to clients.
- `zeus/jarvis/core/jarvis-d1-mission-store.test.mjs`: SQLite-backed emulated D1 adapter; validates reconnect, two synthetic sessions, dedupe, concurrency, cross-company, invalid environment, size cap, SQL safety.
- `zeus/jarvis/core/jarvis-cloudflare-lab-read-gateway.mjs`: **NOT auto-deploy entrypoint**, factory OFF by default; chains existing `JarvisUniversalCore`, `createJarvisGatewayHandler`, B2/B3 read gate and perimeter; GET only.
- `zeus/jarvis/core/jarvis-cloudflare-lab-read-gateway.test.mjs`: simulated valid owner session + B3 only-read grant and adverse authorization tests.

## CI
Code SHA `55d6514505b1584586ef5baae4d9bca77e42a8e2`, run `42118128087`: **613 tests PASS, 0 FAIL**. CUT15/CUT17 disposable PostgreSQL security/restore remain PASS. B4 `42118128083`, B7 `42118128097`, Governed Integration `42118128084`: SUCCESS. Promotion not executed.
The D1 adapter is tested through local SQLite with a D1-shaped interface. **No live Cloudflare D1 traffic or persistent remote backup has been certified.**

## Actual user-owned infrastructure inventory
- Two Supabase projects accessible: `cluhljgonannaafpmblx` PROD protected and `hnqlnvakzaywtafeiybt` alternate active and nonempty. No writes.
- Vercel project `fenix-capital-preprod` presently holds domain `app.fenixcapital.es`; do not repurpose even though its name contains "preprod". Second Vercel project `fenix-capital-preprod-app` not verified as idle.
- Existing GitHub Actions runner for tests is ephemeral; repository settings showed no self-hosted runners.
- Cloudflare login was not available via the connected Opera tab, so account plan, free D1 quota headroom, database count, existing Workers, account access and Vault secrets remain unverified.
- No PC-on premise. No Cloudflare deploy, subscription, DNS, new D1 DB or Worker created.

## Cloudflare prerequisites for physical cloud acceptance
1. Inventory the exact Cloudflare account/plan and existing resources, costs, D1 database count and worker routes **read-only**. Use current published quotas; Free may have 10 DBs, 500 MB/database, 7-day Time Travel, 100,000 Worker requests/day and 10ms CPU/request. Fail closed on quota exhaustion. Confirm actual account before creating anything.
2. Confirm an isolated NEW database and Worker will not overlap existing Cloudflare assets or domains. Capture inventory and rollback. Deploy **only to a new LAB-only address**, never to `app.fenixcapital.es`.
3. Obtain real server-only secret bindings and trusted B2 owner authentication using a legitimate session, verify session revocation, and register B3 `MISSION_INSPECT` with minimal, auditable rights only after legitimate owner verification. No secrets/JWT in GitHub/Library/chat.
4. Deploy the existing gate wrapped by the CUT20 factory, under a kill switch initially OFF. Test unauthorized/missing JWT, cross tenant, stale session, expired/revoked grant, Cloudflare quota/DB outage, same mission from two **physical** devices, restart and request concurrency.
5. Export initial D1 DB to a separate controlled archive, verify restore to an independent LAB DB; Cloudflare Time Travel is time-limited (7 days Free) and a destructive in-place restore alone is not a sufficient rehearsal.
6. OLD vs NEW parity, security tribunal B10, cost measurement, rollback rehearsal, then independent authorization for gradual promotion. No automatic PROD on CI GREEN.

## Recovery/rollback
The candidate commits live only in PR #25 DRAFT. Revert CUT19/CUT20 branch commits to remove the adapter. No cloud/DNS changes require rollback yet. If later provisioned, disable Worker route first, preserve its D1 export, then restore verified snapshot/rollback in LAB. Never drop a D1 database with missions before confirming export and consumers.

## Source references
Cloudflare official: https://developers.cloudflare.com/d1/worker-api/ ; https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/d1/reference/time-travel/ ; https://developers.cloudflare.com/workers/platform/limits/

**NEXT_BLOCK:** Cloudflare account authorization+inventory and isolated free plan LAB provisioning, real B2/B3+Vault/cloud E2E, B10. Preserve PROD and all existing systems.

## CUT21 · Auditoría física Cloudflare FREE y prueba Wrangler oficial (2026-11-05)
Esta sección actualiza expresamente el inventario anterior CUT20. No modifica el historial de lo ya certificado.

**HECHO / EXISTENTE (lectura real de Cloudflare autenticado en Opera):**
- Plan de **Workers actual: GRATUITO, 0 US$/mes** (no plan de pago nuevo).
- **0 bases de datos D1 existentes**; límite publicado Free = 10 por cuenta, 500 MB por DB, 5 GB total.
- **2 Workers preexistentes** `fenix-capital-inmo-maps` y `fenix-capital-inmo-map`. Ambos protegidos, no alterados.
- Página de creación D1 autenticada inspeccionada. Aún no hay base remota creada. Cuenta Cloudflare accesible con navegación/lectura, pero el conector Opera en este chat **NO tiene operaciones de clic, escritura o envío de formularios**. No confundir con fallo de autenticación.
- Jurisdicción aconsejada al crear base: **EU**; no se puede modificar después de la creación. Crear solo `cerebro-jarvis-lab-cut21` si se elige esa ubicación y se mantienen límites gratuitos.
- Workers Free: 100.000 solicitudes/día y CPU por solicitud limitado; D1 Free: 5 millones de filas leídas/día, 100.000 escritas/día; Time Travel hasta 7 días. Sobrecarga/cuota debe denegar en vez de contratar.
- Fuente: https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/ ; https://developers.cloudflare.com/d1/configuration/data-location/ ; https://developers.cloudflare.com/workers/platform/pricing/

**HECHO LAB / CERTIFICACIÓN OFICIAL:**
- `cloudflare-lab/wrangler.jsonc`: configuración nueva con **workers_dev=false**, **routes=[]**, database UUID deliberadamente ficticio todo ceros, observabilidad OFF. No ruta pública ni referencia DB real.
- `cloudflare-lab/worker-off.mjs`: respuesta 503 incondicional; no es la versión LIVE del superagente.
- `cloudflare-lab/verify-cut21-config.mjs`: verifica aislamiento, configuración OFF y ausencia de esquema destructivo.
- GitHub workflow `.github/workflows/jarvis-cut21-cloudflare-d1-local.yml` usa Wrangler 4.157.0 oficial, sin tokens Cloudflare; inicia base D1 **local** en GitHub Actions, crea tabla, escribe/lee registro sintético, exporta backup, restaura a una **segunda instancia local independiente** y verifica dato.
- Workflow de prueba `42120560916` SUCCESS para SHA `4ea57288de4cd2071add53349266f8d439778efe`; Wrangler `deploy --dry-run` empaqueta la **implementación OFF** (NO despliega ni verifica aún la compilación del Gateway B2/B3 completo). Prueba D1 real en cloud **no ejecutada**.
- Core `42120560865`: **613 PASS / 0 FAIL**; B4 `42120560863`, B7 `42120560913`, Governed `42120561109` SUCCESS, PROD promotion no ejecutada.

**PROTECCIONES Y PENDIENTES:**
- Cloudflare remote D1 provision: **PENDIENTE** por ausencia de operación de envío en el conector, no por coste ni recursos (cuenta verificada Free, 0 D1).
- No se ha creado Worker nuevo, configurado ningún secreto, alterado DNS, tocado App/CRM/ANA/Trading/Supabase/SEO ni `main`.
- Al obtener una D1 remota se requiere inventario/UUID, backup original, migración solo sobre nueva base, y restore separado. Identidad OWNER_ROOT física, B2 session/RLS-equivalent design, Vault, grants B3, Gateway real read-only, dos dispositivos físicos, auditoría y tribunal B10 siguen **SIN CERTIFICACIÓN**.
- D1 es SQLite, **no aporta RLS PostgreSQL**. No promocionar por CI GREEN.
- Rollback actual: revertir cambios CUT21 de la PR DRAFT; no existen cambios remotos que revertir.
- Próximo bloqueo: completar creación de D1 `cerebro-jarvis-lab-cut21` con **jurisdicción EU** en el formulario abierto, obtener UUID, vincular únicamente el Worker LAB (OFF), verificar operaciones reales y costes, y sólo después autenticación/cutover B10.

**Autonomía:** PARCIAL_LAB; PROD_NO_GO. Coste contratado adicional: **0**. Consumo de cuotas de GitHub Actions: no cuantificado.
