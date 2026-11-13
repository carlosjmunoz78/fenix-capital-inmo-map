# CEREBRO OS · Operativa V0.6 LAB · acceptance, dependency map and rollback

## Scope and evidence statuses

- **HECHO / CI:** `list_capabilities`, `invoke_read fact.registry.summary`, `list_work_activity` and new `list_owner_sources` share owner server authentication, environment LAB, company Fénix and preview-only API.
- **EXISTENTE:** owner verified through GET `fenix-app-gateway/session/context` (`CARLOS-ADMIN`).
- **EXISTENTE:** GitHub Actions status through `cerebro-console-activity-v0` with one bounded, unauthenticated GitHub API GET fallback when stale; never JOB-001.
- **EXISTENTE:** owner-universe owner registry + factory GitOps through `cerebro-console-gateway-v36-followups-lab/owner-universe?company_id=fenix`. New adapter sanitizes, caps records at 256, does not return raw rows or grant new rights.
- **PARCIAL:** interfaces share SDK/protocol and six simulated client contract tests; real physical integrations to JARVIS/Neuronal/Browser/mobile are not complete.
- **POR AUDITAR:** JOB-001 live runtime provider; tables `cerebro_job001_telemetry_preprod` and `cerebro_company_engine_state_preprod` returned zero rows at inspection. Empty database tables do not prove the job runner is stopped elsewhere.
- **BLOQUEADO:** no write executor, no durable audit/rollback, no privileged JOB-001 link, no promotion authorization, no runtime proof for 179 registry IDs.

## Dependency map

Operativa PREVIEW → existing Supabase Auth token → owner resolver GET (always) → Universal Gateway LAB → FACT Git registry snapshot / existing Activity Edge (or public GitHub REST metadata fallback) / existing Owner Universe LAB → restricted display. `company_id`, `engine_id`, `environment`, `version` remain required for actual engine/job contracts. This is an observe-only path, not a shadow scheduler.

## Controls and validation

Run `node --test cerebro/universal/v0/*.test.mjs`, `npm run build`, existing FACT registry validation, and GitHub Actions anonymous SSO negative security probe on exact Preview deployment. Gate is green only when all return success. Check owner E2E in a single existing Opera tab **only when the user is ready**; do not open more tabs or interrupt login.

Before declaring any motor connected: match `engine_id` to a real registered source, version/environment/company grants, evidence, jobs and failures; then verify observability, backup, rollback, rebuild, tribunal, costs and humans-by-exception. Defined IDs are not active workers.

## Rebuild and rollback

**Backup:** retained V4 base commit `a51dd14eac11f02424dce5db426346b041c1824f`, V0.5 Preview deployment `dpl_8ak6mV6rryCP5YZaXAXwEkVC9j6d`, PR #66 Git commit history. No API migration or secret copied.

**LAB rollback:** stop using the latest immutable preview URL; keep the previous Preview as is; revert the isolated PR commit or close PR #66. To rebuild, deploy a named SHA into the same isolated Vercel Preview project, never production. Vercel preview rollback is procedural until physically tested.

**PROD rollback:** not applicable: no PROD changes permitted.

## Economics and autonomy

No new paid subscriptions or dedicated worker infrastructure. GitHub CI and Vercel Preview consume existing plan allowance; invoice amount not verified. `HUMAN_REQUIRED` for legal, signature, low confidence, high risk, policy conflict, security, money limit, customer human request. Promotion: **NOT AUTHORIZED**. Never create 179 physical servers, new scheduler, or second queue.

## Changelog

2026-11-13: Added existing owner-universe read adapter, read-only metadata summary panel, six-interface SDK `readOwnerSources()` and negative tests; no modifications to main, Supabase, App/CRM, SEO, Trading or PROD.

## V0.6 operator dry-run / physical deployment (13 Nov 2026)

- Strict Preview API allowlist now accepts `submit_command` **only** when `dry_run:true`, company `fenix`, environment `LAB`, engine `FACT-001`, capability `fact.registry.summary`, exact version and empty payload; every other command is rejected before owner calls. Owner is verified again server-side. `executed:false`, `prod_execution_enabled:false`, `durable_audit:false`, `idempotency_persisted:false` are explicit, so never claim a real order was scheduled or an audited idempotency guarantee. No separate queue or writes.
- Isolated Vercel Preview deployment `dpl_BsTNGRzGfaHNYHW3JMFfkZtPFBkx` at `fenix-capital-preprod-qs5nvwkj9.vercel.app`, code SHA `d057465846a038c25c5e74b8a610452b85aeef3c`, `target=null`, status READY. **Do not navigate or open another Opera tab**; user remains in existing authenticated older Preview. This is not an E2E of the latest UI.
- Current login/physical acceptance remains PENDING. No movement to main, production or DNS.


## V0.7 PREPROD JOB-001 real control inventory · 13/11/2026

**HECHO:** `Supabase PREPROD hnqlnvakzaywtafeiybt` contains 20 `cerebro_job001_control_preprod` rows (SEO-001, FENIX_CAPITAL, all enabled, last modified Sept 28), 2 `cerebro_external_job_control_preprod` rows (disabled, last modified Sept 28), 17 `cerebro_company_engine_state_preprod` rows (fenix, last modified Oct 13), **0 telemetry rows**. These are SOURCE RECORDS, not verified running workers or a deployed real JOB001 queue.

**New side-by-side read-only Edge Function:** `cerebro-operativa-job001-read-lab-v0`, project `hnqlnvakzaywtafeiybt`, version 2 ACTIVE. Auth from existing PROD owner session/context GET verified server-side, legacy mapping `fenix` → `FENIX_CAPITAL` only within this read service, four bounded existing SELECT tables, secret stays in PREPROD environment, server returns metadata only. Existing `cerebro-job001-gateway-preprod` remains version 11 ACTIVE and unchanged; original scheduler/Hostinger secret not imported into the Universal Gateway.

**LAB Universal Gateway action:** `get_job001_controls` returns only counts of job controls, enabled records, external records, engine-state declarations, telemetry, stale records, original source PREPROD and `job001_queue_connected:false`, `live_execution_verified:false`. Both upstream and Gateway authenticate owner; wrong company/environment, forged running claims and POST dispatch are denied.

**Physical evidence:** GitHub Actions `45/45` tests, isolated PREPROD Edge anonymous GET **HTTP 401**, and Preview `dpl_4D9T2JdF2o7Z7EJiyuqzw1CqmXdh` READY `https://fenix-capital-preprod-pkalcpwre.vercel.app/`, with Vercel SSO enabled. Full owner session E2E latest Preview **PENDING** because Opera stays on the user's existing older Preview without switching tabs or re-logging. No PROD migration or execution tested.

**Rollback:** stop using new Preview URL; new PREPROD Edge function is an isolated side-by-side reader with no scheduler modification. Rebuild from `cerebro/universal/v0/preprod-job001-reader/index.ts` and `job001-projection.mjs`, never from the original secret-protected JOB001 scheduler. Removing the new function requires confirming it has no consumers; not done. Existing PREPROD/PROD remain intact. No direct evidence of job execution or audit yet.

## V0.8 · Preview estable y evidencias por motor (13 nov 2026)

- Despliegue aislado Vercel **READY** `dpl_C8XwLVpDTdYwHBFoHiywBw42tEBK` (SHA `fefce1bd0566de36db028c04abca0cfc1165585f`) en la dirección estable `fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app`, verificada mediante `list_deployment_aliases`. No es `app.fenixcapital.es` ni tiene dominio PROD.
- Una misma dirección evita alternar hostnames. La sesión actual de Opera sigue en el host antiguo; no se abrió otra pestaña ni se cambió la existente. La validación de propietario en el origen estable queda PENDIENTE, porque las cookies no se comparten automáticamente.
- Seguridad física negativa de alias estable: GitHub Actions run 43483810816 pasó 45/45 pruebas, build OK y redirección SSO anónima. La nueva Edge JOB-001 PREPROD devolvió HTTP 401 sin credenciales.
- El adaptador `job001-control-reader.mjs` ahora incluye vínculos históricos por `engine_id`, con estado PREPROD, versión, antigüedad y `runtime_verified:false`. La interfaz no considera `enabled` o `GREEN` equivalentes a ejecución.
- Mantener bloqueada la promoción hasta owner E2E, evidencia reciente de trabajo JOB-001, auditoría durable, evaluación, backup y rollback físico. No hubo merge ni PROD deploy; consumo de plataformas existentes sin importe auditado.

## V0.9 · Aceptación física en Opera y mejora visual (13 nov 2026)

- **HECHO y observado físicamente:** alias estable del proyecto Vercel Preview, misma pestaña Opera id `1381967780` (sin pestañas nuevas), ruta Operativa → Motores. El Gateway Universal muestra lectura FACT-001 acreditada y el propietario entra sin la pantalla genérica `/inicio`.
- **Causa y reparación:** cinco rutas de autorización (owner UI, owner API, proxy de chat, acceso del chat y fuentes existentes) aún autorizaban un alias antiguo. Se normalizaron al alias estable manteniendo `CARLOS-ADMIN` y los bloqueos de PRODUCCIÓN. Compilación y 49/49 tests exitosos.
- **Diseño LAB:** mejora visual limitada al panel `op-uni-lab`: tarjetas en cuadrícula, tipografía legible, espaciado, foco accesible, estados distinguibles y diseño responsive. No se modifica el diseño de la App/CRM real.
- **Causa del 403 JOB-001:** la función aislada de PREPROD verificaba además `raw.ok===true` y `raw.context.actor_code`, más estrictamente que el formato existente aceptado por el owner resolver canónico. Se reutilizó la misma comprobación estricta del propietario: `actor_code==='CARLOS-ADMIN'` en objeto plano o `context`, rechazando explícitamente `raw.ok===false`. Sin permisos nuevos y sin omitir autenticación.
- **Supabase PREPROD:** función aislada `cerebro-operativa-job001-read-lab-v0` versión **3**, ACTIVE. Solo GET y SELECT; no se toca el Gateway preexistente de JOB-001 ni el programador original.
- **E2E REAL (Opera misma pestaña):** `JOB-001 · controles existentes (PREPROD)` aparece con `Lectura: OK`, 20 controles configurados, **20 habilitados**, 2 controles externos, 17 estados históricos de motores, 0 registros de telemetría, 22 configuraciones antiguas. `SEO-001` tiene 21 referencias de control (incluye control externo), `SOCIAL-001` una referencia externa. Estos números NO acreditan trabajos ejecutándose.
- **CI tras reparación:** [GitHub run 43488382871](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43488382871) con **51/51 tests** correctos. Último Vercel Preview `dpl_Eyz5HVkwe85s7L7AwYPWs6Xe3h5v` READY, código `64cb3c5a5fa809d9a4a6506ea34818e823876033`; la función PREPROD desplegada después aplica la reparación de identidad. No nuevos dominios ni suscripciones.
- **Pendientes genuinos:** telemetría real de ejecución, auditoría duradera, cola de ejecución JOB-001 plenamente enlazada, OLD vs NEW, pruebas físicas de rollback, canary, interfaz móvil/JARVIS/Neuronal real, tribunal y autorización de PROD. Mantener `promotion.allowed=false`.


## V0.10 · pg_cron + auditoría duradera FACT en PREPROD (13 nov 2026)

### HECHO / físicamente verificado
- Proyecto separado Supabase PREPROD `hnqlnvakzaywtafeiybt`: módulo de consulta `public.cerebro_job001_pgcron_observation_lab_v0()` con función segura interna `cerebro_lab_private.job001_pgcron_observe_v0()`. Únicamente service_role puede ejecutar la consulta pública; `anon` y `authenticated` no, comprobado por SQL. No expone el texto de comandos de pg_cron, no añade jobs/crons.
- Cuatro ejecuciones cron observables por IDs 6, 22, 23, 25, activos, último `succeeded` en 2026-11-13 19:17–19:22 UTC en la pestaña Opera 1381967780. **No son pruebas de ejecución del planificador maestro Hostinger ni resultados de los motores SEO.** Los demás 16 controles antiguos no aparecen como estos cuatro cron activos.
- Nueva tabla `public.cerebro_operativa_lab_audit_v0` con RLS y columnas CHECK fijas a LAB, FACT-001, propietario, `executed=false`, producción bloqueada y coste adicional registrado cero; escritura de service_role solamente. Nueva Edge `cerebro-operativa-lab-audit-v0` v1 ACTIVE, owner autenticado de forma independiente.
- Vercel Preview aislado `dpl_DosHmz7iEVra2SPmJjcu9xfunreT` READY, SHA `6a875253a0663c702897f345e12d1184e72ac62d`, asignado al alias estable con protección SSO. No se ha modificado la App/CRM real, main, PROD ni DNS.
- E2E con sesión real en **la misma pestaña Opera**: Gateway valida simulación FACT-001, audita en Supabase PREPROD a las 19:36:23 UTC. SQL confirma **1 registro**, **0 ejecutados**, **0 producción autorizada**, **0 importe adicional registrado**. Repetir el mismo idempotency key conserva **1 registro**, sin duplicados.
- Última CI de implementación: GitHub Actions 43493420966, 58/58 pruebas, build OK, Vercel Preview SSO negativo y auditoría Edge rechaza POST anónimo con HTTP 401.

### LIMITACIONES / bloqueos genuinos
- El planificador maestro de Hostinger y sus credenciales siguen sin evidencia de instalación y actividad. La escritura duradera es exclusivamente para orden de SIMULACIÓN de FACT-001; no se ha activado despacho de JOB-001 ni producción.
- JOB-001 tiene controles históricos, pero tabla de telemetría PREPROD sigue en cero; los cuatro pg_cron observados no equivalen a veinte motores de JOB-001. Mantener `live_adapter_connected=false` y `promotion.allowed=false`.
- Auditoría de comandos de ejecución real, comparación OLD vs NEW, backup/rebuild de todo el runtime, rollback físico de la App y canary de PROD **no están completados**. No confundir este test de idempotencia con un rollback de producción.

### Backup y rollback aislados
- Snapshot lógico en PR #66: migraciones `preprod-job001-reader/cron-observation-v0.sql` y `audit-lab-v0/migration.sql`, códigos Edge versiones v4 (lector) y v1 (auditoría), y SHA del último Vercel Preview. No hay ninguna migración de tablas legadas.
- Si hay fallo: detener uso del Preview; mantener el Gateway original. No borrar nada hasta inventariar consumidores. Para revertir la observación cron, retirar el uso de la RPC y después eliminar wrapper + función interna; para revertir auditoría, exportar y respaldar previamente registros y después retirar Edge y tabla aislados con control de dependencias. NO ejecutado ese borrado, porque el entorno ya contiene evidencia válida.

## V0.11 · cierre de auditoría idempotente en la misma pestaña (13 nov 2026)

- El despliegue Vercel Preview `dpl_Dr5a4AdAihaEQ758vD3rviDarH8M` está READY, SHA `6dff0330a9a93326b72be8ff210263459aaca666`, alias LAB estable. No se ha cambiado App/CRM/PROD/DNS ni fusionado PR #66.
- En Opera pestaña `1381967780`, la comprobación autorizada FACT-001 devolvió **simulación validada y auditada en PREPROD**, sin ejecución. La marca de aceptación de un solo uso se eliminó automáticamente de la URL mediante history.replaceState (sin nueva pestaña y sin recargar la pantalla).
- SQL de aceptación: `public.cerebro_operativa_lab_audit_v0` conserva **1 registro**, **1 clave única**, **0 filas con executed/prod_execution_enabled o coste adicional distinto de cero**, incluso después de repetir la operación con la misma clave. Esto acredita persistencia e idempotencia de la simulación, NO ejecución de motores.
- Seguridad negativa de auditoría: HTTP 401 a POST anónimo; RLS activo, `anon/authenticated` sin SELECT, escritura solo del servicio interno; pruebas UI/API/Gateway + build y smoke en GitHub Actions `43494561862` con resultado SUCCESS. No se han transmitido claves por el chat.
- En PREPROD los cuatro pg_cron activos muestran ejecuciones SQL correctas, pero el planificador maestro Hostinger y la telemetría completa de JOB-001 **siguen sin certificarse**. Los 179 ID del catálogo continúan siendo definiciones, no 179 motores ejecutándose.
- El contrato multiinterfaz SDK está implementado en LAB, pero no acredita que JARVIS, Neuronal, Navegador y móvil estén conectados físicamente. Ninguna promoción a PROD está autorizada sin tribunal, backup, OLD vs NEW y rollback.

## V0.12 · Hostinger gateway evidence, SQL dispatch and WordPress staging gate (13 nov 2026)

**HECHO — Real 24h HTTP traffic:** Supabase PREPROD function_edge_logs show 1725 POST requests to the existing `cerebro-job001-gateway-preprod` bearing the user-agent `CEREBRO-JOB-001-Hostinger-Master/0.1`; 1723 HTTP 200, 2 HTTP 500. Recent 2-hour observation: 144 HTTP 200 and zero HTTP 500. Attribution by user-agent alone, not signed Hostinger machine identity; physical hPanel cron configuration was not certified. Existing gateway version 11, its scheduler code, secrets and deployment remain unchanged.
**HECHO — Real cumulative dispatch RPC calls:** service-role-only SQL observation `public.cerebro_operativa_job001_rpc_observation_lab_v0()` returns PostgREST normalized SQL invocation counter (80,001 physically observed in owner Opera LAB) since pg_stat_statements reset 14 August 2026. The reader is v5 ACTIVE. This DOES NOT certify downstream effects or successful jobs. The four separate pg_cron database jobs are also still observable.
**HECHO — Downstream partial activity:** existing SEO expansion jobs table has 270 historical `DONE` records, with exactly one `DONE` row updated during the latest 24-hour observation. Existing SEO health and supervisor were last measured 2 November 2026; supervisor state is DEGRADED. Do not equate job row state with public publication.
**BLOCKED — WordPress bridge:** staging plugin `/wp-json/fenix-guard/v1/cerebro/status` physically responded `ok:true`, `plugin_version:1.0.0-rc22`, `mode:observer`, `operations_locked:true`, `pending_jobs:0`, all base checks true. Existing SEO WP bridge health logs in last 24 hours show 93 `NOT_READY` checks with HTTP 200 and 2 `DISPATCHED` entries without HTTP status. This is a deliberate write gate, not a network 404. Never bypass operations_locked, publish to PROD, or loosen policies without OLD/NEW, backup, test and rollback acceptance.
**Limits:** Actor can read and simulate with persistent audit; JOB001 real autonomous publication end-to-end remains unapproved, WordPress PROD unchanged. Owner did not ask to change DNS, App/CRM, trading, other companies, or paid services.

## V0.13 · Suspensión expresa de WordPress STAGING por el propietario — 13 nov 2026

**ORDEN DEL PROPIETARIO:** «staging está caída hasta nuevo aviso». Desde esta orden, `staging.fenixcapital.es` queda formalmente **SUSPENDIDA** para CEREBRO. NO consultar, abrir, probar, publicar, modificar, intentar recuperar, reiniciar ni utilizar ese host en nuevas ejecuciones hasta autorización posterior explícita. La lectura previa del endpoint (respuesta 200 en modo observer) queda como evidencia HISTÓRICA, y no prueba disponibilidad actual.

**GATE OBLIGATORIO:** `can_probe=false`, `can_publish=false`, `can_modify=false`, `can_reactivate_automatically=false`; dependencia de WordPress staging marcada `SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE`. Las operaciones que requieren esa web deben clasificarse `BLOCKED_DEPENDENCY` o `HUMAN_REQUIRED` solo si hace falta una decisión humana real. No sortear la caída redirigiendo a `fenixcapital.es` PROD, WPVibe, Make, otros hosts o conexiones sin permiso.

**ÁREAS QUE PUEDEN SEGUIR:** Operativa LAB (consulta de registro, evidencias, estado), Supabase PREPROD (solo lectura), telemetría y auditoría persistente FACT de simulaciones, análisis de gateway Hostinger sin ejecutar despachos ni llamar staging. Ninguna reactivación de SEO o modificación a automatizaciones existentes sin inventario y pruebas OLD/NEW/rollback. Mantener PR #66 DRAFT sin merge a PROD.

**NOTA:** La suspensión ha sido registrada en documentos/manifest LAB, pero NO certifica que todos los ejecutores externos ya hayan dejado de hacer peticiones al staging; sus cron y políticas deben inventariarse sin tocarlos a ciegas. Evitar confundir este registro con un cortacircuitos instalado en todos los runtimes.
