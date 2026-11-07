# CEREBRO OS · JARVIS V2 · CUT64 — Owner anonymous-denial E2E / Physical backup clone NO-GO

**Fecha:** 2026-11-07 · **Company ID:** `fenix` · **Engine ID:** `JARVIS` · **Environment:** `LAB` · **Version:** `CUT64-v0.1`.
**Rama:** `cerebro/jarvis-deepseek-weekend-lab-20261106` del repositorio `carlosjmunoz78/fenix-capital-inmo-map`.
**Objetivo final:** JARVIS V2 real PROD con gateway, B2/B3 Owner, voz, Factory y aprendizaje; protección de App/CRM/ANA/SEO/Supabase/Cloudflare CUT30/Trading.
**Resultado:** NEGATIVE ACCESS física observada; backup existente identificado, restore a otra instancia NO ejecutado; gates owner/B2/B3/PROD bloqueados. Sin escrituras ni nuevos servicios.

## 1. Prueba real externa y anónima · HECHO

Se construyó un runner Node 24 `cerebro/jarvis/boost-001/cut64-anonymous-owner-readonly-probe-v0.mjs`.
Implementa exactamente tres GETs a URLs allowlisted sin headers de Authorization, apikey, cookies, cuerpo, parámetros ni seguir redirects. No lee ni almacena cuerpo de respuesta; guarda solo código HTTP y si el destino del 302 corresponde a Cloudflare Access. **No ejecuta POST ni órdenes de negocio.**

Evidencia: [GitHub Actions #42397967804](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42397967804), **SUCCESS, 6/6 tests PASS**.

| Endpoint examinado | Resultado GET sin sesión | Interpretación segura |
| --- | --- | --- |
| `jarvis-work-gateway-v1/health` en `cluhljgonannaafpmblx.supabase.co` | **403** | Solicitud anónima denegada por alguna capa; no prueba owner e2e |
| `jarvis-git-gateway-v1/health` en `cluhljgonannaafpmblx.supabase.co` | **403** | Solicitud anónima denegada por alguna capa; no prueba owner e2e |
| `cerebro-jarvis-lab-eu...workers.dev/__jarvis/owner-check` (Worker CUT30 original) | **302** redirige a Cloudflare Access login | Access intercepta peticiones anónimas; la identidad Owner no se verificó en este test |

- Artifact `jarvis-cut64-anonymous-owner-denial-42397967804`, ID **13583943286**, SHA256 ZIP `13b8885e748da08eb10a670653f1b8257989c84127e6659f900be1e06340f259`.
- `run_has_production_release_authority=false` incluso cuando todos los GETs son denegados.
- El test no pudo certificar B2 ni B3 porque **no había sesión de propietario autenticada**. En CUT61 Opera también había sido redirigido a login de Cloudflare.
- Los dos gateways revisados estáticamente en CUT63 realizan chequeo de identidad Owner previo al `GET /health`; un 403 puede provenir de plataforma, API key requerida u otra capa. **No atribuir la capa sin evidencia**.
- CUT30 original: exclusivamente lectura de GET; sin modificación de Worker/Access. CUT32 paralelo: no se ha comprobado exposición pública durante CUT64, ni se ha activado.

## 2. Backup PROD y riesgo real de clonación · HECHO auditoría, BLOQUEADA restauración

- En CUT63 se observó mediante Supabase Pro + Opera autenticada **8 entradas de backups PHYSICAL**, 31 octubre—7 noviembre 2026; última visible **2026-11-07 02:59:58 UTC**.
- La documentación actual de Supabase `https://supabase.com/docs/guides/platform/clone-project` explica que **Restore to a new project** crea un proyecto separado con recursos y gasto de compute adicional. No clonar sin revisar y aprobar coste; no está incluido en la política 0€ adicional.
- El clon físico replica toda la base, incluidas extensiones externas `pg_cron`, `pg_net` y sus jobs, que pueden comenzar a ejecutarse al restaurar. Se requiere aislar antes cualquier tarea de red para no duplicar notificaciones, tareas o escrituras externas. Supabase documenta que esos jobs se reanudan en el destino al restaurar.
- SQL SELECT en Supabase destino `cluhljgonannaafpmblx` verificó:
  - Base `postgres`: **49.769.619 bytes** (unos 49,8 MB).
  - **38 tablas public**, **259 funciones public**, **37 triggers no internos**.
  - Extensiones instaladas: `pg_cron 1.6.4`, `pg_net 0.20.4`.
  - Tabla `cron.job`: **2 jobs, 2 ACTIVE**, 0 inactivos.
  - Storage: **3 buckets**. Los bytes de objetos Storage no vienen en backup de base de datos.
  - No se copiaron ni expusieron definiciones de cron, datos de clientes, logs HTTP, contraseñas, ni contenido de buckets.
- Restauración física de DB PROD en instancia aislada **NO REALIZADA**. Tampoco existe evidencia de snapshot independiente que incluya todos los objetos Storage. CUT62 sí certificó **pg_dump/pg_restore físico sintético** PostgreSQL 17 en GitHub Actions con 3 registros, nunca datos PROD.
- No se pulsó `Restore`, ni se creó proyecto, ni se instaló backup pago, ni se activó PITR.

## 3. Gate independiente de falsificaciones · HECHO

Nuevo código `cerebro/jarvis/boost-001/cut64-prod-recovery-readiness-v0.mjs` y tests `...v0.test.mjs`.

Valida inmutabilidad de la evidencia de GET sin identidad, B3 OFF, tenant, recuentos, backup UI, cron, pg_net, Storage, ausencia de permisos y coste. Se niega a certificar restauración, clon, registro de tenant, LRN, PROD, permiso de publicar, de escribir o de modificar Worker únicamente por dichas observaciones.

- Workflow: [GitHub Actions #42398400704](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42398400704) **SUCCESS, 6/6 PASS, 0 FAIL**.
- Snapshot auditable `cerebro/jarvis/boost-001/cut64-prod-recovery-owner-readonly-observation-20261107.json` (commit actualizado `9ac09eb24c1db5c389f2c29d4eef579819a29fb7`).
- Gate final `NO_GO_PHYSICAL_OWNER_AND_ISOLATED_BACKUP_RESTORE_PENDING`; `prod_write_authorized=false`; `clone_restore_authorized=false`.
- No "GREEN" artificial ni transición a producción autónoma.

## 4. Estado verificado y próximo bloque CUT65

| Control | Estado |
| --- | --- |
| 2 rutas JARVIS sin sesión | **403 + 403** observado; E2E Owner NO |
| Worker original CUT30 sin sesión | **302 Cloudflare Access login**; Worker intacto |
| B2 dos dispositivos / revocación | No acreditado |
| B3 `MISSION_INSPECT` / Owner ROOT | 0 grants, `enabled=false`, `kill_switch=true` |
| CUT32 paralelo en Cloudflare | No expuesto/activado en este corte; estado de acceso actual pendiente de revalidación |
| 8 entradas PHYSICAL Supabase Pro | Visualizadas |
| Restore de backup real en instancia aislada | BLOQUEADO por coste, side-effects y contrato |
| 2 cron activos + pg_net | Confirmados, NO clonar en caliente |
| Recuperación objetos Storage | No acreditada, 3 buckets |
| LRN-001 en proyecto destino | 0 recibos; compañía `fenix` sin alta |
| DeepSeek piloto coste | PAUSED; no se hicieron llamadas nuevas |
| App / CRM / PROD / DNS / Cloudflare / main | Sin cambios |

### Próxima acción que sí desbloquea

**CUT65 Owner E2E:** usuario inicia sesión de Cloudflare Access interactivamente en Opera; tras ello, GET del endpoint Owner existente y comprobaciones permitidas de identidad B2 (dos dispositivos), permisos mínimos B3 y denegación por revocación. No guardar credenciales, cookies ni códigos en GitHub.

**CUT65 Backup seguro:** elegir destino de restauración aislado y coste de infraestructura aprobado. Antes de cualquier clon real, revisar jobs activos y preparar aislamiento `pg_cron`/`pg_net`, Edge Functions, credenciales, webhooks y Storage; test OLD-vs-NEW y rollback. La operación de duplicación automática Supabase no puede garantizar cero side effects y se mantendrá BLOQUEADA por política.

**No inventar simultáneamente que E2E de identidad y restore estén verdes**: fueron bloqueos demostrados, no pendientes cosméticos.

## 5. Recuperación / rollback

Archivos CUT64 solo en rama de GitHub LAB; deshacer con revert específico y tests, no hace falta rollback de DB porque no hubo cambios. Artifacts GitHub son evidencia temporal, no backups de datos. No fusionar a main sin aprobación de corte y gates de producción.

**Coste adicional contratado 0 €; las pruebas GitHub consumen minutos existentes cuyo coste eventual no se ha conciliado.**
