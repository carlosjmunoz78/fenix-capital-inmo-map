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
