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


### Corte D1 · 16/11/2026, 20:25 UTC · instalación física verificada
- Baseline previo: el ejecutor Cloudflare `cerebro-fact001-headless-operator-lab-20261111` continuaba en versión `543b68e8-cd59-4960-9f17-d66276416389`, cron original `*/5 * * * *` y tres bindings existentes (dos secretos y RECOVERY_DB); sin lecturas de valores de credenciales.
- D1 histórica EU `cerebro-fact001-recovery-lab-eu`: 8 jobs completados, 0 QUEUED/RUNNING, sin objetos de recibo preexistentes.
- **Punto de recuperación Time Travel PRE-CHANGE:** `0000074d-00000000-00005125-5647742514d7faf3ee1c4307e079923a`. No ejecutar restauración global: revertir solamente nuevos objetos si fuese preciso para no perder otros eventos de D1.
- **HECHO:** tabla `fact001_provider_receipts_lab_v0`, índice `idx_fact001_receipts_observed_lab_v0`, triggers `fact001_receipts_lab_no_update_v0` y `fact001_receipts_lab_no_delete_v0` creados físicamente mediante cuatro llamadas D1. Lectura `sqlite_master` confirma 4/4 objetos y SELECT COUNT = 0.
- Antes de aplicar, SQL SQLite local ejecutado y cuatro negativos confirmados (UPDATE / DELETE / INSERT duplicado / tenant incorrecto rechazados). La tabla está vacía, no se ha alterado el registro anterior y **ningún Worker ha cambiado de versión**.
- Este D1 schema es infraestructura de auditoría LAB, **no evidencia de recibo real emitido o firmado**. `P0B_SIGNED_DURABLE_RECEIPT=NOT_CERTIFIED`; `OPERATIVA_PROD=HOLD`.
- Rollback preciso: con tabla vacía y sin consumidores, suprimir únicamente los dos triggers, índice y tabla mencionados; no tocar otras tablas, workers, crons ni secretos. Actualizar runbook tras cada paso.


### P0-B · Firma real LAB y reconciliación fail-closed · 16/11/2026
**No declarar P0-B GREEN ni promover OPERATIVA PROD.**

**Hecho físico (Cloudflare API + D1):**
- Tabla de recibos `fact001_provider_receipts_lab_v0` instalada con índice y triggers de inmutabilidad. Punto de recuperación anterior `0000074d-00000000-00005125-5647742514d7faf3ee1c4307e079923a`. Sin backfill histórico.
- FACT Runner original `cerebro-fact001-headless-operator-lab-20261111` versión `543b68e8-cd59-4960-9f17-d66276416389` conservado. Se prepararon en paralelo versiones de 11–13 módulos con firmador HMAC privado y flag de prueba, sin revelar secreto.
- Prueba real firma ON: CREATE `FACT001-OPERATIVA-P0B-261116-SIGNED-CREATE-01` `COMPLETED/CREATED_V1_PRIVATE`, Worker nuevo privado efectivamente presente. **Recibo D1: 0 filas. Firma E2E: NO CERTIFICADA**.
- DELETE `FACT001-OPERATIVA-P0B-261116-SIGNED-DELETE-01` fue marcado por el ejecutor `RECONCILE / EXTERNAL_CHANGE_DETECTED`. La API Cloudflare confirmó independientemente **ausencia del Worker por inventario y GET HTTP 404**, cero rutas/dominios y regreso a 39 scripts. Es consistente con un rechazo por la lectura inmediata posterior al DELETE; la causa temporal precisa sigue por auditar.
- Tras comprobar propiedad y versión, el estado de ownership D1 se reconcilió como `DELETED`, `current_version_id=NULL`. **Se mantuvo el job original RECONCILE** y se añadió el evento distinto `PROVIDER_ABSENCE_RECONCILED`. No se fabricó ningún `JOB_FINISHED COMPLETED` falso.
- Se restauró físicamente la versión original a 100% tras el test firmado, y nuevamente tras una sonda de permisos solo GET; rollback final deployment `ddcd9e40-fb52-42d1-82a6-f09b01a8fec0`. Worker original privado y cron `*/5 * * * *` intactos.
- Sonda de permisos con flag de una sola ejecución: versión `a8c9415d-8027-463b-b41b-e12446b6aae3` llegó a estar desplegada, pero la tabla `fact001_p0b_permission_probe_lab_v0` **no recibió ningún resultado** durante la ventana observada. No inferir que el token permite o deniega endpoints; estado **UNVERIFIED**. El código quedó en el PR y el Worker volvió al baseline.
- El paquete contiene un registrador de fallos estrictamente sanitizado, un probe GET-only y sus tests. Todo es LAB. No se incorporó un emisor de recibos operativo a producción.

**Recibo exacto:** `FACT001_P0B_SIGNED_RECEIPT_FAIL_CLOSED_ROLLBACK_2026-11-16.json`.

**Gates pendientes:** comprobar causa física de `NO_RECEIPT` y observabilidad del cron; controlar latencia del GET posterior a DELETE mediante pruebas de eventual consistency; verificar HMAC firmado + lector independiente; resolver Company Registry `fenix-capital` vs `fenix`; conectar Gateway propietario y panel OPERATIVA; completar QA/tribunal/FinOps/rollback/release E2E antes de PROD.

**Estado:** `FACT_RUNNER_CREATE_PROVIDER=PASS`, `FACT_WORKER_PHYSICALLY_REMOVED=PASS`, `SIGNED_RECEIPT_REAL=FAIL_NOT_CERTIFIED`, `P0B_RECONCILIATION=PARTIAL`, `OPERATIVA_PROD=HOLD`. Nueva suscripción 0 €, consumo marginal de plataforma no medido. Ninguna modificación a App, CRM, DNS, Supabase PROD, WordPress o main.


### Diagnóstico preciso · 16/11/2026 22:05 UTC
**EVIDENCIA FÍSICA DE CREDENCIAL, NO INFERENCIA:** segunda ejecución programada del Worker LAB, versión sonda `a8c9415d-8027-463b-b41b-e12446b6aae3`, guardó el resultado de cuatro peticiones GET en D1 `fact001_p0b_permission_probe_lab_v0`: `scripts_http=200`, **`routes_http=403`**, `domains_http=200`, `settings_http=200` (fila `COMPLETE`). La prueba requirió atravesar realmente el cron `*/5 * * * *` y se hizo sin leer ni imprimir valores de secretos. La falta de permiso `Workers Routes Read` en el token actual impide la comprobación privada del emisor, y el diseño **falla cerrado** correctamente.

**Corrección en Git (NO DESPLEGADA):** separar el token de mutación existente (`CF_WORKERS_TOKEN`) del futuro token de lectura de rutas (`FACT001_ROUTES_READ_TOKEN`). Grupo exacto de Cloudflare `Workers Routes Read`: `2072033d694d415a936eaeb94e6405b8`, recurso único `com.cloudflare.api.account.zone.a00ec81375b4acb02f9bd6e0fd64942f` (zona activa `fenixcapital.es`), solo **READ**. No ampliar el token que permite escribir/borrar Workers. Código y pruebas actualizados en `fact001-provider-readback-lab.mjs`, `fact001-runner-receipt-hook-lab.mjs` y sus tests; la ausencia del token nuevo bloquea antes de efectuar I/O.

**BLOQUEO DE SEGURIDAD VERIFICADO:** la creación automática de la credencial de lectura independiente ha sido rechazada por un control de seguridad de la plataforma; no se intentó eludir. Una comprobación posterior de solo lectura constató **cero tokens nuevos** bajo el nombre objetivo `CEREBRO-FACT001-WORKERS-ROUTES-READ-LAB-20261116`, ningún nuevo upload a Workers y versión estable restaurada. Requiere intervención autorizada en Cloudflare para obtener e instalar el secreto únicamente mediante interfaz segura, nunca pegarlo en chat, repositorio, logs ni D1. El sistema no puede atribuirse el gate de firmas hasta probarlo físicamente.

**Mejora paralela en Git (NO DESPLEGADA):** `fact001-delete-readback-retry-lab.mjs` con cinco comprobaciones máximas y exigencia de dos lecturas consecutivas independientes (listado sin Worker + HTTP 404) antes de declarar su eliminación. `patch-existing-fact001-delete-readback-lab.mjs` produce parche reversible de OLD vs NEW y tests negativos; no crea recursos ni cambia Worker PROD.

**Conservación:** D1 historiales y eventos intactos, `fact001_provider_receipts_lab_v0` sigue con 0 recibos, Worker `cerebro-fact001-headless-operator-lab-20261111` despliegue **`543b68e8-cd59-4960-9f17-d66276416389` al 100%**, privado, cron original. PR #66 DRAFT, no merge. `SIGNED_DURABLE_RECEIPT=BLOCKED_MISSING_ROUTE_READ`; `OPERATIVA_PROD=HOLD`.

**NEXT:** completar token limitado por ruta autorizada; staging con feature flag OFF y herencia estricta de bindings; comprobar ruta HTTP 200 desde el mismo Worker y 403 para permisos no concedidos; firmar una nueva operación CREATE/DELETE LAB y verificar D1, pruebas OLD vs NEW, rollback, owner Gateway e interfaz OPERATIVA. Coste de nueva suscripción 0 €, consumo marginal no medido.


### Corte 17/11/2026 · Candidate 14 modules · STAGED / NO DEPLOY
- Baseline físico leído en Cloudflare LAB: `cerebro-fact001-headless-operator-lab-20261111` activo al **100% en `543b68e8-cd59-4960-9f17-d66276416389`**, Worker privado, cron original `*/5 * * * *`, sin trabajos QUEUED/RUNNING, secretos heredados por referencia.
- **NUEVA VERSION CANDIDATA** `2e8b797f-4e64-46d5-b32a-52732cd54469` creada físicamente en Cloudflare, 14 módulos; mantiene los módulos originales y prepara dos comprobaciones READ adicionales y la corrección del borrado mediante doble lectura y un máximo de cinco intentos. `FACT001_RECEIPTS_ENABLED=false`, `FACT001_P0B_SCOPE_PROBE_ENABLED=false`. No se asignó credencial de rutas inexistente. No se abrió ruta pública ni se activó firma.
- **PRUEBA FÍSICA DE ROLLBACK:** promovida temporalmente la candidata al 100% solo para comprobación técnica con funciones nuevas desactivadas y restaurada en el mismo bloque la versión original `543b68e8-cd59-4960-9f17-d66276416389` al **100%**, ambas versiones verificadas por GET Cloudflare. Este smoke **NO** certifica la emisión de recibos.
- Prueba real de permisos anterior preservada en D1: `scripts=200`, `routes=403`, `domains=200`, `settings=200`. Código corregido en PR para **`FACT001_ROUTES_READ_TOKEN` dedicado**, únicamente `Workers Routes Read` sobre zona `fenixcapital.es`, sin alterar el token de ejecución. La plataforma bloqueó creación automatizada; GET posterior confirmó que aún **no existe** el token nuevo.
- Inventario actual de cuenta Cloudflare: 42 Workers (distinto de los 39 registrados el 16/11/2026); no atribuir la diferencia a este corte, ni eliminar Workers de terceros. Ambos nombres temporales de este circuito (rproof y sig261116a) ausentes, sin nuevos jobs.
- Gate `FACT001_PROVIDER_LIFECYCLE`: PASS en prueba anterior; `P0B_SIGNED_RECEIPT`: **BLOCKED_MISSING_ROUTES_READ_TOKEN**; `P0B_DELETE_CONVERGENCE`: probado con tests/smoke OFF, **no ejecutado E2E con operación delete nueva**; `OPERATIVA_PROD`: **HOLD**.
- CI propia `CEREBRO Universal Gateway V0 LAB contract CI`: SUCCESS en último HEAD de documentación antes de este corte. Suite de aceleración independiente registró un fallo de carga `PROD_MAX 50 jobs` (6 frente a 50) pendiente de evaluación. No se declara el conjunto entero verde.
- Permisos mínimos pendientes: crear el token READ por flujo administrativo autorizado y asociarlo como secret `FACT001_ROUTES_READ_TOKEN` a una versión aislada, nunca copiar valores a chat/GitHub/D1. Después, prueba física CREATE/readback/firma/D1/DELETE/readback/rollback y validación del Gateway propietario a OPERATIVA.
- **Conservar:** GitHub main, PROD App/CRM, Supabase PROD, DNS, WordPress, JARVIS, Social, Trading intactos. No nuevas suscripciones, consumo de infraestructura en euros NO MEDIDO.


### Lectura de recibos para OPERATIVA · 17/11/2026
**PARCIAL · Código de lector autenticado preparado; fuente física NO conectada.**

- `fact001-signed-receipt-owner-reader-lab.mjs` realiza exclusivamente SELECT sobre el recibo HMAC LAB, el trabajo FACT-001 y su evento terminal único; comprueba integridad de firma y digest con la clave que permanece **solo en servidor**. No expone HMAC, digest ni secreto en su resultado.
- Antes de acceder a D1 exige `verifyOwnerSession` (función autenticadora confiable del servidor, conectada al adaptador existente `createFenixOwnerContextResolverV0`) y `sessionToken`; verifica que el resultado tenga `auth_source=SERVER_VERIFIED_FENIX_CONTEXT`, `actor_id=CARLOS-ADMIN`, empresa `fenix` y scope `cerebro:audit:read`. **No acepta objetos `ownerContext` del cliente**, y falla cerrado antes de leer D1 si falta o falla la comprobación de sesión. Incluye tests de suplantación, sesión inválida, firma falsificada, tenant/engine/environment, evento terminal inválido y errores de lectura.
- Una firma HMAC válida produce **`HMAC_VALID_LAB_ONLY`**, nunca certificación nativa del proveedor ni permiso PROD. Los registros pueden ser históricos, y el mapeo `fenix` (Gateway) ↔ `fenix-capital` (D1 FACT-001) sigue sin resolverse en Company Registry.
- `src/CerebroUniversalOperativaLabPanel.tsx` presenta, únicamente tras conexión LAB autenticada, un aviso explícito: *certificación desde este Gateway no verificada; promoción PROD bloqueada*. No consulta Cloudflare desde el navegador y no introduce secretos.
- **NO OPERATIVO:** el Gateway no tiene todavía un lector Cloudflare D1 autenticado conectado ni un recibo real firmado que enseñar. La D1 se mantiene con 0 recibos y `FACT001_ROUTES_READ_TOKEN` sigue ausente. No crear un resultado verde sintético ni afirmar que este código está desplegado al usuario.
- Orden de gate futuro: credencial zone Routes Read → emisión real de recibo vía FACT Runner → relectura HMAC desde servicio autenticado → verificación independiente del proveedor y mapeo multiempresa → conexión al Gateway propietario → QA de interfaz, rollback y tribunal → promoción gradual. Mantener PR #66 DRAFT.
