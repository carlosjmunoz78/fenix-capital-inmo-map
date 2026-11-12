# FACT001 · Cloudflare headless · Prueba de credencial en ejecución (11/11/2026)

Estado actual comprobado: **PARCIAL, aún no VERIFIED_FULL ni VERIFIED_LAB del ejecutor**.

### Resultado del primer cron autónomo
- Worker `cerebro-fact001-headless-operator-lab-20261111` privado, sin subdominio ni preview, D1 existente `1305f791-7c44-47f9-946b-f330a09c88aa`.
- Token de cuenta `CEREBRO-FACT001-CF-WORKERS-LAB-V2`: `active`, 1 política, 1 grupo `Workers Scripts Write`, recurso solo cuenta Cloudflare e39a57e1ac42650ca5a6d5307cf0ac8e, `expires_on=null`.
- Binding dentro del Worker `CF_WORKERS_TOKEN`: `secret_text` (comprobado por Cloudflare GET), no se ha leído ni transferido su valor.
- Primer cron desplegado 2026-11-11T12:38Z sí ejecutó `scheduled`, D1 job `FACT001-CF-HEADLESS-CRON-E2E-20261111-001` final `RECONCILE`, `attempts=1`, `UNEXPECTED_OPERATOR_ERROR`.
- Inventario confirmó **sin Worker objetivo sobrante**, ningún cambio en App, CRM, DNS, gateway existente o producción.
- Cron original detenido, sin reintento automático. Error de la fase preflight en el código inicial estaba enmascarado por un catch genérico, corregido en rama PR #44, todavía no promovido.

### Diagnóstico no destructivo preparado
- D1 compartida: bookmark **pre-DDL** `0000014f-00000008-00005120-f680c187ff225758cb284a8748134e65`. Nunca restaurar toda la D1.
- Tabla propia `fact001_cf_token_probe_20261111`, orden única `FACT001-CF-TOKEN-READONLY-20261111-001`, inicialmente QUEUED y attempts=0.
- Código de prueba `cloudflare/headless-operator-lab/diagnostic.mjs` revisado y CI PASS. Solo GET `/accounts/{id}/workers/scripts` usando secreto del entorno; no registra token ni respuesta, solo `http_status` y código clasificado.
- Versión original Worker desplegada antes del diagnóstico: `0865da83-2a03-457d-a515-d89aa78d5bdc`.
- Nueva versión diagnóstica `f2b6d32a-14e8-472e-b97c-de0f0876a7bf`, publicada mediante Cloudflare Version API con **inherit strict** de `CF_WORKERS_TOKEN` y `RECOVERY_DB` comprobado, y despliegue 100%. Cron mínimo `* * * * *` habilitado temporalmente para el test.
- Cloudflare documenta hasta **15 minutos** de propagación del cron; orden única garantiza que no se repite por más disparos.

### Gates de cierre
- **HTTP 200**: clave válida desde Worker; analizar error original no enmascarado y ejecutar un job nuevo controlado.
- **HTTP 401/403**: credencial vinculada no puede acceder (valor erróneo o permiso operativo distinto); no manipular ni extraer el secreto. Requiere corrección directamente desde el dashboard si procede.
- **Sin ejecución**: verificar propagación y eventos; no afirmar que CEREBRO terminó.
- Tras diagnóstico, parar cron, restaurar versión original, comprobar bindings y ausencia de routes, persistir evidencia y resultado. No pedir al propietario claves por chat.
- `CEREBRO FULL` incluye también cola duradera con nuevas órdenes, políticas y proveedor Pages; un único cron de prueba no lo acredita.

Sin costes de suscripción nuevos y sin modificaciones en `main`.

## Actualización diferencial · causa identificada y prueba de clave superada
- Error de origen: `redirect:'error'` no soportado en el `fetch()` del runtime Cloudflare Workers (la API de Request admite `manual` o `follow`); provocaba `TypeError` antes de que el token se utilizase. Fuente Cloudflare: https://developers.cloudflare.com/workers/runtime-apis/request/
- Fix seguro en rama PR #44: `redirect:'manual'` con validación de respuesta y rechazo de redirecciones. Código y tests CI verificados en GitHub commit `83e99e22af60c4d9e94806bad827822e85fe730c`.
- El primer diagnóstico `UPSTREAM_FETCH_FAILED` attempts=1 se archivó en `fact001_cf_token_probe_history_v1` antes de una repetición controlada, sin perder evidencia.
- Worker diagnóstico corregido `14f41492-71d8-476c-ae4d-d22d2b51b95d`, conservando secret_text/D1 mediante herencia strict. Prueba física D1 `fact001_cf_token_probe_20261111`: **VERIFIED, attempts=1, HTTP200, CLOUDFARE_READ_HTTP_200**; token Cloudflare registra `last_used_on=2026-11-11T12:59:57Z`. Nunca se expuso el secreto.
- Reinstalada versión de ejecución headless corregida `9550cc16-7e8a-49db-9369-a0bb68b8b608` con herencia estricta; ninguna ruta pública ni previews, bindings confirmados.
- Primer fallo de trabajo autónomo guardado en tabla `fact001_cf_headless_attempt_history_v1`; D1 bookmark previo `00000150-00000018-00005120-efb996fd1248c95d86b3b4404390777c`.
- Segundo intento real `fact001_cf_headless_worker_jobs_v1` reencolado **solo tras verificar GET200, no existencia de Worker objetivo y corrección activa**. Cron `* * * * *` temporal; aceptación del subgate **pendiente** hasta ver `COMPLETED` y limpieza.
- Token `CEREBRO-FACT001-CF-WORKERS-LAB-V2` está activo, 1 grupo Workers Scripts Write y `expires_on=null` (sin vencimiento programado; no garantiza validez infinita).

**No declarar FULL ni afirmar que la consola esté conectada.**


## RESULTADO FÍSICO · Cloudflare CEREBRO headless · 11/11/2026

**WORKERS ONE-SHOT VERIFIED_LAB**. Se ejecutó físicamente el cron aislado del Worker `cerebro-fact001-headless-operator-lab-20261111`, con secreto Cloudflare `CF_WORKERS_TOKEN` de tipo `secret_text` introducido por el propietario, unido a la D1 LAB preexistente. El primer fallo inicial quedó archivado; se corrigió `fetch` `redirect:'error'` → `redirect:'manual'` (runtime Workers) y se acreditó previamente un GET HTTP 200 desde el Worker con el secreto sin revelar su valor. Se reencoló una única vez tras reconciliación y comparación de estado.

**D1 result**: `fact001_cf_headless_worker_jobs_v1`, `FACT001-CF-HEADLESS-CRON-E2E-20261111-001`, `state=COMPLETED`, `attempts=1`, `phase=CREATE_UPDATE_ROLLBACK_DELETE_REBUILD_DELETE`, `error_code=NULL`. API Cloudflare GET final: Worker desechable `cerebro-fact001-owned-worker-lab-20261111` ausente; 14 Workers totales, incluyendo el nuevo ejecutor privado. Cron de prueba `/schedules` explícitamente desactivado y verificado vacío; `workers.dev` y previews OFF. Token de servicio `CEREBRO-FACT001-CF-WORKERS-LAB-V2` activo con único grupo `Workers Scripts Write`, cuenta fija y `expires_on=null` (sin vencimiento programado, **no** garantiza disponibilidad de por vida). No nuevas D1 ni suscripciones; no cambios en App/CRM/DNS/main ni otros Workers.

**Aún PENDIENTE**: dispatcher genérico de órdenes CEREBRO multiempresa, Pages deployment/rollback vía headless, política de PROD, recuperación/observabilidad longitudinal, gestión de rotación de tokens. **Cloudflare Universal FULL sigue PARTIAL.** No confundir verificación del *subgate Workers one-shot* con producto terminado.
