# FACT-001 · Recovery / dual client MCP and CEREBRO Gateway · LAB

Fecha: 2026-11-10. Estado: **CÓDIGO Y TESTS HECHOS, INTEGRACIÓN NO DESPLEGADA**.
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
