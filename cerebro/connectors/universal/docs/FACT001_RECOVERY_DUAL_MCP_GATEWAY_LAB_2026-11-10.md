# FACT-001 · Recovery / dual client MCP and CEREBRO Gateway · LAB

Fecha: 2026-11-10. Estado: **RECOVERY RUNNER V0 DESPLEGADO Y E2E REMOTO LAB VERIFICADO; GATEWAY/EXTERNAL PROVIDERS NO CONECTADOS**.
Objetivo: evitar que cortes temporales de Cloudflare/GitHub/Supabase/Notion/Vercel/Opera dupliquen operaciones, con mínimo coste y dos identidades independientes.

## Alcance existente, no sustituir
El módulo `src/core.mjs` ya exige `durable === true` antes de ejecutar mutaciones y ante outcomes ambiguos deja `PENDING`. No cambiarlo. El nuevo `src/recovery.mjs` es una capa opt-in posterior al verificable de identidades. `src/recovery-d1-ledger.mjs` implementa interfaz de almacenamiento D1 con SQL parametrizado `CAS` y tabla exclusiva `fact001_recovery_v1`. No importa librerías de pago ni se autodespliega. No captura token o credenciales. No modifica Supabase, App, CRM, main, DNS, Cloudflare Worker, CEREBRO Console v33 ni operadores anteriores.

## Estados de ejecución y comportamiento
- `RUNNING` lease temporal, un dueño por `key_hash` y `fingerprint`.
- `COMPLETED` respuesta aceptada: los replays se informan como `ALREADY_COMPLETED`; la respuesta anterior **no** se guarda; cuando el consumidor necesita resultado original debe recuperar desde recurso origen por ID tras reconciliar, nunca inventarlo.
- `BACKOFF`: únicamente operaciones `GET` sin efectos secundarios, códigos `ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, `HTTP_408/429/500/502/503/504`. Hasta 3 intentos y retrasos 1 s, 2 s en configuración estándar. Contrato de red debe aportar timeouts reales (la capa no corta una llamada colgada por sí sola).
- `AUTH_REQUIRED`: `HTTP_401/403` o OAuth expirado. Sin reintentos mudos; debe reautorizarse conforme al proveedor y origen, sin permisos excesivos.
- `RECONCILE`: escritura que expiró, devolvió un resultado ambiguo o se interrumpió. No repetir automáticamente; hay que inspeccionar el recurso objetivo y su identificador. Al resolver, registrar aceptación de resultado en la fase futura del supervisor.
- `CONFLICT`, `STOPPED`, `EXHAUSTED`: fail closed.

## 4D / seguridad / multiempresa
Huella independiente por `company_id`, `engine_id`, `environment`, `version`, `client_id`, `identity_ref`, `request_id` y digest del comando. Prohibido identidad autoafirmada del payload; cada cliente debe presentar identidad verificada por un gateway externo. El ledger D1 solo tiene hashes SHA256, estado, flag read, contador, lease y marcas temporales. No se registran parámetros, bodies, tokens ni respuestas. `environment=LAB` obligatorio. Políticas y permisos verdaderos siguen siendo responsabilidad de `UniversalConnectorCore`, no de este módulo aislado.

## Evidencia física de pruebas
- Run **#42792868537** SUCCESS: 14/14 pruebas de lógica para retry GET, 401, 429, unknown error, timeout, crash, concurrencia, key conflict, reintento no permitido, identidades separadas, exclusión de secretos.
- Run **#42793926401** SUCCESS: 22/22 pruebas incluyendo ocho adicionales sobre SQLite real in-memory con `node:sqlite`; esquema SQL D1 ejecutable, estado persiste cuando se reconstruye el guard sobre la **misma conexión SQLite temporal**, CAS en escritura, retries y leases. Esto es **persistencia simulada de almacén**, **no un ensayo remoto Cloudflare D1**.
- Código `src/recovery.mjs`, `src/recovery-d1-ledger.mjs`; tests `tests/recovery.test.mjs`, `tests/recovery-d1-ledger.test.mjs`; pipeline `.github/workflows/fact001-connector-recovery-guard-lab.yml`.
- No D1 nueva creada. Inventario read-only Cloudflare a fecha 10/11: **8 D1**, sin un espacio creado para Recovery. No se consumió cuota Free nueva.

## Gates para conectar al runtime CEREBRO (NO HECHO)
1. Inventario de Gateway y de implementación actual de jobs/colas; no crear duplicados.
2. Elegir D1 LAB nueva o backend de estado ya existente *no transaccional*, sólo cuando exista un ejecutor. Verificar free quota real, aislamiento UE y no pasar a coste positivo.
3. Crear schema exclusivamente en recurso nuevo, backup export, credenciales del motor específicas en Vault, snapshot, tests negativos y rollback.
4. Implementar bridge no público firmado para `client_id=cerebro`, y endpoint OAuth MCP independiente para `client_id=chatgpt`, con credenciales independientes y acceso denegado por defecto. Ninguno pasa credenciales al modelo.
5. Probar E2E físicamente con red desconectada, reintentos GET, ambigüedad write, recuperación después del reinicio, TTL/lease expirado y reconciliación.
6. Poner LAB executor con schedule, métricas y coste 0 € medido; no habilitar PROD hasta seguridad, permisos, auditoría, rollback, backup y gates de promoción.

## Limitaciones explícitas
Esto **no arregla** las desconexiones del transporte o la UI de ChatGPT por sí solo. No es un watchdog ejecutándose ni un agente autónomo ya desplegado. No renueva OAuth automáticamente sin permiso del proveedor. No se debe confiar en la bandera `durable` de un almacén falso; antes de PROD se necesita garantizar que el adaptador D1 se use realmente y cubrir amenazas de falsificación del store. El reinicio de procesos debe probarse en servicio físico separado. Los dos conectores de herramientas en ChatGPT **no equivalen** a la identidad de servicio del CEREBRO Console.

## Actualización física FACT-001 · 10/11/2026

- D1 exclusiva nueva `cerebro-fact001-recovery-lab-eu` (UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, jurisdicción europea), creada con OAuth MCP oficial desde ChatGPT sin usar emisor de token privilegiado. Es la novena D1 de la cuenta (límite gratuito: 10). Esquema independiente, con `fact001_runner_config_v1`, `fact001_runner_jobs_v1`, `fact001_runner_ticks_v1` y `fact001_recovery_v1`.
- Worker independiente `cerebro-fact001-recovery-runner-lab` desplegado por API oficial, ligado **únicamente** a dicha D1. Subdomain y previews FALSE, GET settings verificado. `fetch` devuelve 404; ejecutor único `scheduled`, cero APIs externas y solamente `fact001.lab.heartbeat` sobre `client_id=cerebro`/4D/LAB. Capacidad max_jobs_per_tick=1 y `enabled` OFF por defecto en schema.
- Test Worker local por [GitHub Actions #42795875733](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42795875733) y versión con ledger por [#42797398734](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42797398734), 11 tests cada uno, SUCCESS.
- **PHYSICAL E2E remoto:** Cron real se disparó y tarea de humo `FACT001-RUNNER-SMOKE-20261110-001` quedó `COMPLETED` con `attempts=1` y timestamp `2026-11-10T10:15:36.628Z`. D1 registró un tick `COMPLETED` y el siguiente `EMPTY`; `fact001_recovery_v1` tiene estado `COMPLETED`, attempt=1, sin cuerpo ni credenciales. Versión Worker activa `a9caa600-c26d-4368-b060-57275f983963` al comprobar.
- Cron temporal 1 minuto reducido a **`*/5 * * * *`** tras prueba, verificado por API. Hasta 288 invocaciones por día contra el presupuesto Workers Free; no suscripciones nuevas. APP/CRM/PROD/main/DNS/no-scope Worker sin cambios por esta operación.
- [Runbook, manifest y rollback](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/tree/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109/cerebro/connectors/universal/cloudflare/recovery-runner-lab). Estos resultados sustituyen **solo** los anteriores `NO DESPLEGADO` y `PENDIENTE CRON` de este documento. El módulo `src/recovery.mjs` existe pero la ejecución actual utiliza una vía Worker/D1 exclusivamente LAB para heartbeat; aún no hay generalización de su API a los proveedores, autenticación de enqueue ni CEREBRO Console PROD.
- **Siguiente gate:** autenticación service-to-service del Gateway y registro de tareas sin secretos, catálogo allowlist por proveedor, políticas/tribunal/budgets/rollback y pruebas de interrupción de conexión; no habilitar escrituras a terceros en producción. La cuenta Cloudflare aún tiene token emisor con permisos sobrantes que requiere rotación segura.
