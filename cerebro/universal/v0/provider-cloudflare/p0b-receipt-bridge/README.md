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


### P0-B physical runner proof · same date · AFTER baseline
**VERIFIED IN REAL CLOUDFlARE LAB**, not merely mocks:
- Existing scheduled FACT-001 executor `cerebro-fact001-headless-operator-lab-20261111` consumed a single queued CREATE job. Terminal status: `COMPLETED / CREATED_V1_PRIVATE`, D1 `JOB_FINISHED`; Cloudflare showed Worker present, deployed version `10801551-eb14-4ce1-b947-1032cdda565c`, no public subdomain, preview URL, cron, bindings, or secrets.
- A second queued DELETE job was consumed by **the same existing executor**, terminal status `COMPLETED / OWNED_WORKER_REMOVED` and a second D1 `JOB_FINISHED`; D1 ownership is `DELETED` with `current_version_id=NULL`. Independent Cloudflare inventory confirms Worker absent and account `39 → 40 → 39`.
- D1 now has **8** completed FACT-001 command rows: 3 create / 3 delete / 1 update / 1 rollback. The original 6 are preserved; 2 new jobs are added as audit, not removed.
- Exact causal IDs, timestamps, version/deployment and flags: `FACT001_P0B_REAL_RUNNER_CREATE_DELETE_2026-11-16.json`.
- The true independent provider readback confirms actual action **through the normal FACT Runner**, but the existing runtime still does **not** emit a signed durable receipt with `receipt_id` and `message_digest`. The new pure code and signing helper are in this PR only, not on Cloudflare.
- Current gate: `P0B_FACT_RUNNER_PROVIDER_LIFECYCLE=PASS_PHYSICAL_LAB`, `P0B_SIGNED_DURABLE_RECEIPT=NOT_CERTIFIED`, `OPERATIVA_PROD=HOLD`.
- Rollback of test infrastructure physically succeeded; 39 Workers, no test resource or public route. No changes to existing Worker versions, GitHub main or production.

### Signing helper and CI update
`fact001-receipt-signature-lab.mjs` and its anti-replay tests use a deterministic HMAC-SHA256 envelope scoped to the one LAB company, engine, job, request, idempotency, resource, version, policy and provider readback fields; no real signing key in GitHub. The SQL candidate now reserves `signer_key_id`/`signature_hex` and remains **NOT DEPLOYED**. GitHub Action `CEREBRO Universal Gateway V0 LAB contract CI` explicitly tests all bridge and signing tests on Node 24; run `43934545534` **SUCCESS** on revision `6c8c30a1394742b58d25bfad69cf677fb9c5fad5`. The newer receipt-only commit does not change executable code. The signing code is not yet integrated into the Worker runtime.

**Next block:** exact old/new versioned Worker candidate with signing+provider readback behind disabled feature flag, isolated regression/rollback, ledger addition only after gate, then authenticated owner Gateway/UI integration and other P0 gates. Never promote a candidate with failing signing, provenance, security or owner acceptance tests.
