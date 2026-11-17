# CEREBRO OS · P0-B · Recibo físico de invocaciones Cloudflare · 16-11-2026

**HECHO EN FUENTE CLOUDFARE REAL, SOLO GET · NO COMPARAR CON JOBS DE NEGOCIO NI AGENTES EN EJECUCIÓN INSTANTÁNEA.**

## Evidencia
La API Cloudflare `GET /accounts/{account_id}/analytics/sql/introspection` confirma dataset `events.workersInvocations`, con **muestreo adaptable** y campos `scriptName`, `status`, `invocationType`, `sampleInterval` y `timestamp`. El SQL de lectura acotado a cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e` y ventana UTC `2026-11-15 06:00`–`2026-11-16 06:00` devuelve **11 grupos, 10 scripts distintos, 992 filas muestreadas y 992 invocaciones ponderadas (SUM sampleInterval)**. No hubo fallos de estado entre los grupos devueltos (`status=success`). No significa 992 publicaciones ni acciones de negocio exitosas.

Tipos de invocación: **648 cron, 191 fetch, 153 queue**. Los scripts incluyen: Facebook Buffer cron (71), Facebook Knowledge fetch (71), Factory Headless cron (287), Factory Recovery cron (288), Instagram Knowledge queue (71), LinkedIn Ticker queue (72), LinkedIn Buffer fetch (120), Operativa control canary queue (2), UMS Multisource cron (1) + queue (8), UMS Polyhaven cron (1). `approx_max(timestamp)` marca el instante aproximado más reciente por grupo, no un heartbeat firmado.

### Frontera multiempresa
Se leyeron **solo bindings `plain_text` permitidos** en metadatos de scripts, sin pedir ni mostrar claves, tokens o secretos. **Cinco scripts llevan `COMPANY_ID=fenix-capital`, `ENVIRONMENT=LAB`, `ENGINE_ID` explícito** (Facebook Buffer, Facebook Knowledge, Instagram Knowledge, LinkedIn Ticker, LinkedIn Buffer), y suman **405 invocaciones ponderadas**. Esto es el valor textual del binding, **no prueba todavía de equivalencia canónica `company_id=fenix`** en Registry.

Otros cinco scripts, incluidos Factory, canario y UMS, **no declaran un COMPANY_ID en los bindings `plain_text` consultados**, y sus **587 invocaciones** permanecen en ámbito CUENTA CLOUDFLARE / TENANT NO ACREDITADO. No adjudicar esas 587 a Fénix por el nombre del script.

Los cuatro scripts prioritarios JARVIS original, JARVIS CUT32, Instagram AUTOQUAL y Facebook AUTOQUAL no devolvieron filas en esa consulta acotada; **no inferir cero ejecuciones absolutas**: muestreo, ventana, tipos de evento y otras fuentes pueden dejar huecos. En especial el canario, sin cron, muestra dos invocaciones por **queue**, acreditando que ausencia de cron no excluye otros triggers.

### Comparación con observabilidad
El otro endpoint, `workers/observability/usage`, arrojó **232 eventos** en una ventana cercana pero no idéntica (15/11 05:59:46 a 16/11 05:59:46 UTC) de dos scripts Facebook. Eventos y invocaciones **son unidades diferentes**; no sumarlos ni usarlos como ratio exacto de publicación.

### Gate de operador
Los resultados permiten marcar `CLOUDFLARE_INVOCATIONS_OBSERVED_IN_WINDOW=true` para los diez scripts, con last timestamp, y `STATUS_SUCCESS_IN_DATASET=true`; **no** marcar `AGENT_LIVE_NOW`, `JOB_SUCCESS`, `PUBLISHED`, `AUTONOMOUS` o `COST_ZERO`. El estado de ejecución en este instante requiere heartbeat firmado/TTL y recibo job correlacionado, más costes verificados. Operativa Preview aún no dispone de credencial dinámica server-only Cloudflare; esta auditoría manual no es un endpoint conectado.

**Evidencia estructurada sin identificadores de clientes:** `P0B_CLOUDFLARE_INVOCATIONS_2026-11-16.json`; validación de límites: `P0B_CLOUDFLARE_INVOCATIONS_2026-11-16.test.mjs`.

**Conservación:** ningún cron, queue, worker, secreto, ruta pública, App, CRM, Gateway, Supabase, DNS o Vercel modificado. PR DRAFT. Nuevo plan 0 €, coste marginal de consultas analíticas NO MEDIDO; no suponer acceso gratuito ilimitado.
