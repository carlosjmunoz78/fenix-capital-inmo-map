# P0-B · FACT-001 · Primer ciclo real de Cloudflare con readback y rollback · 16/11/2026

**RESULTADO: PASS_LIMITED_PROVIDER_LIFECYCLE.** Se ha realizado **una operación física de creación y eliminación** mediante la API autenticada de Cloudflare, exclusivamente sobre el Worker de prueba **NUEVO** `cerebro-fact001-p0b-proof-20261116-lab`. No se ha modificado ningún Worker preexistente ni la D1 histórica.

## Evidencia del proveedor
- Inventario previo: **39 Workers**, nombre objetivo inexistente, 0 rutas/dominios vinculados. D1 histórica `cerebro-fact001-recovery-lab-eu` consultada **solo en lectura**: esquema de `fact001_cf_command_jobs_v1` inspeccionado, sin insertar eventos.
- CREATE: API PUT OK; lectura Cloudflare posterior encuentra el Worker, **40** scripts; `created_on=2026-11-16T16:56:38.580101Z`; versión real `ac121573-2b78-4e54-91f5-23c6fa2bcac9`; despliegue real `36f267e8-d973-42d2-9a01-57b650f24984` con 100 % de esa versión.
- Puerta privada: `workers.dev=false`, `preview_urls=false`, 0 bindings, 0 secrets, 0 cron, 0 custom routes, 0 custom domains. `fetch()` siempre HTTP 404, ninguna petición saliente, DB, Queue, token, tarea automática ni IA.
- ROLLBACK: nuevo GET antes del borrado verificó nombre exacto, fecha de alta, **única versión** original, ausencia de rutas, bindings, secretos y horarios. DELETE solo al recurso recién creado, `force=false`, API devuelve éxito.
- Lectura posterior independiente: **39 Workers**, nombre exacto **ausente**, 0 dominios y 0 rutas; `rollback_provider_readback_verified=true`.

## Correlación y límites de la afirmación
El archivo `provider-receipt.json` conserva `run_id/job_id/request_id/receipt_id` como **identificadores de auditoría locales**, digest SHA-256 de fuente local, versión, política nominal, IDs concretos devueltos por el proveedor, pre/post/readback y coste. **Estos IDs NO fueron enviados por FACT-001 ni devueltos por Cloudflare y no constituyen firma de proveedor.**

Esta prueba es la primera **operación de ciclo de vida real del proveedor** con rollback verificable realizada en este corte, pero el actor fue el operador Cloudflare autorizado desde ChatGPT, **NO** el Runner FACT-001 existente. Por ello `provider_create_readback_verified=true` y `provider_delete_readback_verified=true`, mientras **`historical_fact001_job_correlated=false`, `business_result_receipt_verified=false`, `owner_gateway_policy_authorized=false` y `OPERATIVA_PROD=HOLD`**.

El `company_id` utilizado es el literal histórico `fenix-capital`, **sin asumir** equivalencia canónica con `fenix`. El `policy_version` es una etiqueta de contrato de ensayo, **no** evidencia de tribunal o política remota ejecutada.

## Pruebas y reproducibilidad
Archivos en este directorio: `worker.mjs`, `worker.test.mjs`, `provider-receipt.json`, `provider-receipt.test.mjs`. Node v22 `node --check worker.mjs` OK y `node --test worker.test.mjs provider-receipt.test.mjs` **8/8 PASS local**. Digest SHA-256 fuente local `b88c0e7e182965488b34b31eb93adeed2377b603e07b8e84b36e6270400985d3`. El digest es **local**, no un hash firmado retornado por Cloudflare. No se han probado de nuevo todos los tests preexistentes del PR.

## Preservación y siguientes pasos
**SIN CAMBIOS:** D1 `cerebro-fact001-recovery-lab-eu`, el FACT Runner, Cloudflare Workers de JARVIS/Instagram/Facebook/SEO, DNS, Hostinger, Supabase LAB/PROD, App/CRM/WordPress, Trading, main o Vercel. PR #66 permanece DRAFT. **0 € en nuevas suscripciones**; el coste real de recursos/cuota de la operación **NO_MEDIDO**.

**Gate siguiente P0-B:** incorporar este contrato de correlación directamente en el ejecutor FACT-001 LAB EXISTENTE en una implementación paralela/feature flag, con recibo durable autenticado por job, comprobación contra proveedor y doble lectura; inventario, snapshot, tests OLD vs NEW y rollback antes de desplegar. El recibo actual no debe contarse como ejecución de negocio ni justificar producción.
