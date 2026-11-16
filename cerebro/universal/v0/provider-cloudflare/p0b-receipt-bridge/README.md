# OPERATIVA · P0-B · FACT-001 · Receipt Bridge V0 · 16/11/2026

**Estado: IMPLEMENTADO EN CÓDIGO LAB / NO DESPLEGADO.** PR #66 DRAFT. No mezclar este contrato con el recibo físico del operador Cloudflare creado/eliminado en el corte anterior.

## Baseline verificada en vivo antes de cambios
- Cloudflare Account e39a57e1ac42650ca5a6d5307cf0ac8e: **39 Workers** tras rollback P0-B.
- Worker existente del ejecutor: cerebro-fact001-headless-operator-lab-20261111, con cron existente */5 * * * *, D1 RECOVERY_DB y secretos CF_WORKERS_TOKEN/CF_PAGES_TOKEN. **Ningún valor de secreto leído o copiado.**
- Código vivo universal-runtime.mjs: procesa **1 trabajo FACT-001 como máximo por tick**, solo nombres cerebro-fact001-managed-lab-[a-z0-9]{4,20} en compañía histórica literal fenix-capital, LAB, versión 1.0.0; soporta create/update/rollback/delete privados. Escribe fact001_cf_command_jobs_v1, fact001_cf_command_events_v1, fact001_cf_owned_workers_v1. No almacena aún un recibo causal firmado con todos los IDs.
- D1 LAB EU cerebro-fact001-recovery-lab-eu UUID 1305f791-7c44-47f9-946b-f330a09c88aa: **6 trabajos históricos COMPLETED** (2 create, 2 delete, 1 update, 1 rollback), **0 QUEUED** en la relectura. La tabla de recibos propuesta todavía **no existe por esta entrega**. No se han creado nuevos jobs.
- No equiparar fenix-capital a fenix sin Company Registry y prueba de aislamiento.

## Archivos de este cambio aislado
- fact001-provider-receipt-bridge.mjs: validación pura, fail-closed de job/event/ownership/readback fresco del proveedor; valida además correlación de recibos propuestos run_id/job_id/request_id/receipt_id/idempotency_key/message_digest/policy_version desde D1. No usa red, tokens, IA ni escritura.
- fact001-provider-receipt-bridge.test.mjs: **9/9 tests Node 22 locales PASS**; casos hostiles (otro tenant, PROD, nombre ajeno, API no privada, versión inconsistente, lectura obsoleta, suplantación del operador y recibo mezclado).
- fact001-provider-receipts-lab-v0.sql: **propuesta NO APLICADA** de tabla D1 aditiva, única por job_id, con aislamiento de entorno, status no certificante, trigger de inmovilidad e índice. Parser SQLite OK, pruebas locales de UPDATE/DELETE, duplicado y tenant incorrecto rechazadas; no se inserta dato en D1 real.

## Qué certifica y qué no
La función acepta como máximo READBACK_MATCHED_UNATTESTED o DURABLE_RECEIPT_UNATTESTED. **Nunca devuelve estado de ejecución certificada, clave de firma comprobada ni autorización PROD.** Un SHA256 local no demuestra una firma de identidad del ejecutor ni equivale a un ID eco/firma del proveedor. Una fila COMPLETED del ledger tampoco demuestra por sí sola operación externa.

La interfaz OPERATIVA **no recibe aún datos de este bridge**. Este corte añade la puerta de aceptación paralela, no un nuevo endpoint, scheduler, Worker, preview, cola ni modelo IA.

## Gate de conexión física (siguiente operación, NO realizada aquí)
1. Congelar versión actual de Worker + configuración/secret refs y snapshot D1; inventariar consumidores y rollback.
2. En paralelo, integrar el bridge en una copia LAB del **mismo** universal-runtime.mjs, bajo flag OFF, generando recibos desde las observaciones reales del ejecutor, no desde ChatGPT.
3. Evaluar política y firma del recibo con identidad propia; incluir message_digest, policy_version y receipt_id **persistido**. Contrastar OLD vs NEW, idempotencia y pruebas negativas.
4. Aplicar SQL aditivo únicamente tras gate, en D1 LAB; realizar **1 job create** con recibo durable, GET de Cloudflare, **1 job delete** con readback de ausencia, relectura SQL y rollback total; no dejar Worker huérfano.
5. Exponer a OPERATIVA mediante **Gateway propietario server-side**, sin secretos en frontend, y mostrar estado separado PROVIDER_VERIFIED vs DURABLE_RECEIPT_UNATTESTED vs NOT_CERTIFIED.
6. Confirmar FinOps, observabilidad y gates restantes P0-C..H antes de evaluar promoción. No relajar Auth/RBAC ni reactivar staging.

**Rollback de este corte:** revertir solo los commits de archivos nuevos en PR #66. No hay rollback de Cloudflare/Supabase que ejecutar: **no se desplegó ni alteró ninguno**. Producción, App, CRM, WordPress, DNS, JARVIS, Instagram, Facebook, Trading y main intactos.

**Coste:** 0 € de nuevas suscripciones; consumo de las herramientas ya contratadas **NO_MEDIDO**.
