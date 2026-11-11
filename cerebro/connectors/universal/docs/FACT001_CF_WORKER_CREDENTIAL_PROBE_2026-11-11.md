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
