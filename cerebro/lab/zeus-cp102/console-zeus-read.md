# Console → ZEUS · Live Read V0 · LAB
- Uses the **existing** Cloudflare D1, no new database and no new scheduler.
- Authenticated GET only, pinned GitHub OIDC identity, workflow SHA, repo IDs and branch.
- Exactly two allowed view scopes: `fenix/LRN-001/PREPROD` and `fenix-capital/FACT-001/LAB`; **do not equate company IDs**.
- No write endpoint, no customer data, no new secrets, no engine execution; permissions remain existing.
- Source of truth: `zeus_scoped_observations_v1` + canonical LRN daily cursor + separate CP106 publication counter. Data is real LAB data.
- This is a Console read adapter, **not a production console**, nor an authorization to promote Learning or FACT to PROD.
- Deployment: one isolated Cloudflare Worker `cerebro-console-zeus-live-lab-eu`, route enabled only for authenticated OIDC clients, no cron, and `ZEUS_DB` read path. Rollback: disable its workers.dev subdomain and delete this isolated Worker. Do not alter the existing `cerebro-console-nia-binding-lab-eu`.
- One GitHub Actions proof should reject anonymous and cross-tenant reads and read both scopes. No extra subscriptions.


## BLOQUE CONSOLE OWNER LAB · 23/11/2026 · VERIFICACIÓN FÍSICA

HECHO · Creada de forma aditiva la aplicación Cloudflare Access `c12a1e49-3627-4bfd-91eb-2cbbc90eeb07`, audiencia `ac414c8dea7fe07ee74fb9aa9bf62de5f11acf131bafbcaebeb8fe555cc97665`, política Allow única para el propietario. Su dominio exacto es `cerebro-console-zeus-owner-lab-eu.carlosj-munozcabeza.workers.dev`. No se ampliaron políticas de FACT, JARVIS ni UMS.

HECHO · Worker separado `cerebro-console-zeus-owner-lab-eu`, versión `7ac5b486-128a-491a-af4b-bf4cb6d8294e`, con binding D1 `ZEUS_DB`; código fuente `console-owner-access-worker.mjs`. Requiere firma RSA del JWT de Cloudflare Access, coincidencia estricta de `iss`, `aud`, identidad propietaria, validez temporal y firma. Solo admite GET de la vista y health autenticado. El HTML establece CSP sin scripts, X-Frame-Options DENY y Cache-Control no-store; sin POST, secretos, clientes, credenciales ni D1 writes.

E2E REAL · Abierto en Opera con sesión del propietario: página `CEREBRO · ZEUS LAB` devolvió FACT-001 `fenix-capital/LAB` = `LAB_GREEN` y LRN-001 `fenix/PREPROD` = `GREEN_AT_OBSERVATION`; cursor diario 1, un recibo de publicación, ambos `promotion_allowed=false`. Acceso privado, fuente D1 en vivo.

UI EXISTENTE · Operativa `src/CerebroOperativaUniverseViews.tsx` incorporó enlace a ZEUS desde el apartado Motores únicamente en contexto Fénix. PR `#85` a la rama `cerebro/operativa-live-evidence-bridge-lab-20261118`, fusionado en `4550efa052debcb1f06ed0cc587e05bee3cfbd9f`. Build GitHub `45236530290` SUCCESS. Vercel proyecto existente `fenix-capital-preprod-app`: preview `dpl_HrkGAvptnAgWc1Rx4K3wrib5cvAT`, READY en `https://fenix-capital-preprod-64fm73lp1.vercel.app`, target null (no alias PROD). Login de propietario en esa preview pendiente para verificar el clic en Motores; el código del enlace está integrado en la rama LAB, no main.

PARCIAL · No es Console PROD, no habilita órdenes de ejecución, no resuelve la ingesta recurrente de LRN, no unifica indebidamente `fenix` y `fenix-capital`. La aplicación comercial PROD, CRM, DNS, main, TechScout y crons quedaron intactos. El Access owner LAB usa el plan existente, sin suscripción nueva; consumo por peticiones sujeto al plan de Cloudflare.

RECUPERACIÓN · Si falla la interfaz protegida, desactivar el subdominio workers.dev exclusivamente de `cerebro-console-zeus-owner-lab-eu` y retirar el enlace en la rama LAB. No tocar las vistas ni las tablas D1 canónicas. La vista anterior de GitHub OIDC `cerebro-console-zeus-live-lab-eu` sigue independiente.
