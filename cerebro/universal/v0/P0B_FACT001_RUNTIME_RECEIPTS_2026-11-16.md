# CEREBRO OS · P0-B · FACT-001 correlación física de runtime y recibos D1 · 16-11-2026

**HECHO · Auditoría de solo lectura, proyecto LAB.** Recibo `P0B_FACT001_RUNTIME_RECEIPTS_2026-11-16.json`. No se han escrito datos ni modificado Workers.

## Correlación temporal independiente: 288/288

Se cruzaron las filas individuales de `events.workersInvocations` de Cloudflare del script `cerebro-fact001-recovery-runner-lab` (cron, status success, `sampleInterval=1`) contra `fact001_runner_ticks_v1.started_at` de la D1 existente `cerebro-fact001-recovery-lab-eu` (jurisdicción EU). Período fijo y reproducible: **15/11 06:00:00–16/11 06:00:00 UTC**.

**Resultados físicos:** 288 invocaciones y 288 ciclos distintos D1, todos `EMPTY`; algoritmo greedy ordenado por timestamp (UTC), coincidencia uno-a-uno con tolerancia máxima 30 s: **288 emparejados, 0 huérfanos de Cloudflare, 0 huérfanos de D1**, mediana de diferencias absolutas **1,332 s**, p95 **2,007 s**, rango **0,955–2,242 s**. Esto demuestra una fuerte correlación operativa de ejecuciones cron ↔ escrituras de telemetría del Runner, **pero NO firma criptográfica ni coincidencia mediante `job_id`/`run_id`/receipt_id**. Todos los ciclos `EMPTY` no implican trabajos ejecutados. La actividad histórica no certifica agentes vivos a la hora de lectura.

La función pura `p0b-fact001-tick-correlator.mjs`, aislada en PR DRAFT, valida estrictamente la ventana, worker, tipo cron, `sampleInterval=1`, duplicados, timestamps y outcomes. Ante entrada incoherente devuelve null o estado incompleto; nunca afirma ejecución funcional. Pruebas en `p0b-fact001-tick-correlator.test.mjs`.

## Evidencia de jobs históricos y estado físico

`fact001_cf_command_jobs_v1`: **6 trabajos LAB `fenix-capital` COMPLETED**, cada uno con una fila `JOB_FINISHED / COMPLETED` en `fact001_cf_command_events_v1`, sin eventos huérfanos, con seis claves de idempotencia y seis request IDs diferentes. Operaciones: 2 `worker.create_private`, 2 `worker.delete_private`, 1 `worker.update_private`, 1 `worker.rollback_private`; fecha máxima 11/11 13:45:07 UTC. La bitácora no acredita por sí sola un resultado histórico de proveedor en cada paso.

Se cruzaron **dentro del conector privado, sin devolver nombres de recursos**, las dos filas de `fact001_cf_owned_workers_v1` (ambas `DELETED`) contra el listado real de **38 Workers** actual de Cloudflare. **2/2 recursos marcados eliminados están actualmente ausentes**, 0 discrepancias; esto acredita el estado final, no cada transición ni la causa de una eliminación pasada.

`fact001_cf_headless_worker_jobs_v1`: **1 fila COMPLETED** con intento asociado **RECONCILE/RECONCILE** en `fact001_cf_headless_attempt_history_v1`; no afirmar trabajo de negocio exitoso ni control real.

## AUTOQUAL social: diferenciación rigurosa

D1 `cerebro-instagram-autoqual-lab`: el estado de la propia base dice **OFF/NEW**, **0 intentos**, **0 recibos de batch**. Las 71 invocaciones `queue` del Worker **Instagram Knowledge** son un motor diferente y no prueban entrenamiento del Instagram AUTOQUAL aislado.

D1 `cerebro-facebook-autoqual-lab`: **3170 casos READY**, **0 candidate_sha256**, **0 review_sha256**, `mode=OFF`, `phase=NEW`. Es un stock de casos preparado, no 3170 ejecuciones. No ha habido llamadas de escritura para activarlo.

## Estado y siguiente gate

`P0B_FACT_CROSS_PROVIDER_TEMPORAL=PASS_LIMITED`, `P0B_FACT_D1_JOB_EVENT_JOIN=PASS_LIMITED`, `P0B_FACT_OWNED_RESOURCE_ABSENT_NOW=PASS`, `P0B_BUSINESS_RECEIPT_E2E=NOT_CERTIFIED`. Registro empresa `fenix-capital` no se equipara silenciosamente a `fenix` canónico sin Company Registry. El siguiente cambio correcto sería **instrumentar el runtime ya existente**, solo tras snapshot, contrato y rollback, para incluir un recibo mínimo idempotente con `company_id/engine_id/environment/version/run_id/job_id/message_digest/receipt_id/status/policy_version`, vinculado a operaciones de proveedor reales y coste medido. Sin nueva función Edge, cola, scheduler o suscripción por defecto.

**Preservación:** App/CRM, Supabase PROD, Gateway, DNS, Cloudflare Workers/cron/queues/D1, main, Trading, Vercel intactos. PR #66 DRAFT; nueva suscripción 0 €, consumo marginal NO_MEDIDO. P0-A revocación real y promoción PROD continúan BLOQUEADOS.
