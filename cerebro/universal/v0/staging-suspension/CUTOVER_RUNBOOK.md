# CEREBRO LAB · PREPROD SEO-001 staging suspension, targeted controlled cutover

Owner directive: staging.fenixcapital.es suspended until explicit notice. Existing Hostinger JOB001 dispatch ID13 calls only `public.seo001_probe_wp_bridge_preprod()`; this function originally calls `net.http_get()` against staging and writes a DISPATCHED row. SQL dependency scan found exactly one public caller (`cerebro_job001_dispatch_preprod`).

PRE-CUTOVER current SQL definition hash md5: `078cdfaa118c036e9548ffb8b73dd77c`. Full original definition backed up alongside this file. Do not invoke backup function because it would contact staging.

Parallel candidate `seo001_probe_wp_bridge_suspended_lab_v0()` returns `ok=false`, `state=BLOCKED_DEPENDENCY`, `reason=STAGING_SUSPENDED_BY_OWNER`, same JSON result type, no URL or side effects. Only after success and rollback compile check may the existing PREPROD probe be replaced with the no-op blocked contract, preserving its name/signature and execution grants. No changes to dispatcher, scheduled cron entries, WordPress, DNS, PROD, App/CRM, or other job IDs.

Acceptance: manual direct call to guarded function, no new bridge-health DISPATCHED row, no new `net.http_get` request, unchanged original dispatcher, other jobs untouched. Do NOT call the original pre-cutover function for testing.

Rollback: only AFTER explicit owner instruction to resume staging and checks of target safety. Reapply original exact function definition from `original-probe-snapshot.sql` in one transaction after prerequisite checks. Reversion is NOT permitted automatically while suspension is active. Avoid deleting snapshots or test evidence.


## Lectura de continuidad · 2026-11-14

Estado de esta comprobación: **POR AUDITAR / read-only**, salvo el bloqueo del job 13 implantado en V0.15. No se hicieron llamadas de red a staging, no se ejecutó ninguna función de negocio, ni se cambiaron cron, Edge Functions o datos PROD.

### Evidencia viva en Supabase PREPROD `hnqlnvakzaywtafeiybt`
- La tabla `public.seo_cerebro_wp_bridge_health_preprod` contenía **5248** registros. Último `checked_at`: **2026-11-13T22:05:03.792583Z** (`NOT_READY`, HTTP 200). En la consulta de seguimiento del 14/11 no aparecían entradas posteriores. Esto es **compatible** con la eficacia del bloqueo de job 13, pero no demuestra bloqueo de *todos* los accesos a staging.
- `public.cerebro_job001_telemetry_preprod`: **0 filas**. Sigue sin existir evidencia de ejecución del dispatcher JOB-001 para todos los motores.
- `cron.job` 6, 22, 23, 25 siguen activos, como antes. Se observaron otros cron de SEO (61, 62, 65, 67, 68, 70) activos, que invocan **otras** funciones SQL; no se ha acreditado que llamen staging. **No desactivar ni alterar** por inferencia.
- Entre 11 funciones SQL públicas con literal staging se identifican **tres** rutas con capacidad HTTP pendiente de control:
  1. `seo001_dispatch_page_quality_for_city_v2_preprod(text,text)` → `net.http_post` a Edge `fenix-seo-page-quality-preprod`, entregando una URL de staging; el Edge v5 ACTIVE contiene `fetch` de la URL. **Riesgo indirecto vivo; invocación actual no demostrada.**
  2. `seo001_dispatch_render_qa_preprod(text,text,text,text,text)` → tres `net.http_get` sobre URL de landing y artículos, al menos una derivada de staging. **Riesgo directo; invocación actual no demostrada.**
  3. `seo001_wp_staging_http_preprod(text,text,jsonb)` → `net.http_get/delete/post` directo sobre staging. **Riesgo directo; invocación actual no demostrada.**
- El escaneo de definiciones SQL no encontró **llamadores SQL textuales** de estas tres funciones. Esto NO descarta RPC, funciones Edge, scripts, colas, SQL dinámico o llamadas externas. Hay que completar el mapa de consumidores antes de modificar sus contratos.
- La función `seo001_probe_wp_bridge_preprod()` permanece guardada con `BLOCKED_DEPENDENCY` y sin llamadas HTTP, conforme al bloqueo probado de JOB-001/13. Su SQL original permanece en snapshot y **no** debe reinstalarse durante suspensión.

### Siguiente bloque único
1. Auditar **solo en lectura** consumidores de las tres rutas HTTP (Edge/cron/RPC/scripts), y los seis cron SEO observados, sin tocar staging.
2. Para cada ruta verdaderamente ejecutable, documentar firma exacta, consumidores, efectos y salida esperada; guardar snapshot de definición antes de cualquier corrección; preparar **paralelo fail-closed** que devuelva `BLOCKED_DEPENDENCY / STAGING_SUSPENDED_BY_OWNER`.
3. Probar rechazo sintético sin tráfico externo, ausencia de nuevas filas en tablas correspondientes, invariancia de otros trabajos y reversión controlada; aplicar protección a una sola ruta por iteración si las dependencias y contratos lo permiten.
4. Publicar el estado de dependencia de lectura en Operativa LAB (claro: **SUSPENDIDO · aislamiento global PARCIAL**) a través del Gateway existente, sin crear segundo control-plane ni una cola nueva.
5. No promover a PROD ni habilitar ejecución arbitraria desde Operativa mientras falten permisos específicos, auditoría durable, observabilidad de trabajo real, OLD vs NEW, rollback probado y tribunal.

**Política permanente:** staging suspendido por el propietario hasta instrucción explícita; no probarlo, visitarlo, reiniciarlo ni reactivarlo. App, CRM, WordPress PROD, DNS, main y Trading LAB fuera de alcance. Coste adicional autorizado 0 €.


### Ampliación de cadena cron → Edge · 2026-11-14

**Hallazgo posterior en SOLO LECTURA:** seis cron SEO adicionales siguen activos en `cron.job`, y cinco de sus funciones SQL invocan Edge Functions que contienen la URL literal `staging.fenixcapital.es` y llamadas `fetch`. **Riesgo de acceso indirecto**, NO evidencia de que hayan accedido realmente a staging ni de que se hayan ejecutado cambios web.

| cron jobid | plan | SQL dispatch | Edge destino | estado |
|---|---|---|---|---|
| 61 | cada minuto | `seo001_dispatch_elementor_safe_writer_batch_preprod()` | `fenix-seo-elementor-safe-writer-preprod` v8 | ACTIVE |
| 62 | cada minuto | `seo001_dispatch_sitewide_regression_preprod()` | `fenix-seo-sitewide-regression-preprod` v7 | ACTIVE |
| 65 | cada minuto | `seo001_dispatch_infrastructure_autopilot_preprod()` | `fenix-seo-infrastructure-autopilot-preprod` v4 | ACTIVE |
| 67 | cada minuto | `seo001_dispatch_web_content_ux_audit_v1_preprod()` | `fenix-web-content-ux-audit-v1-preprod` v5 | ACTIVE |
| 68 | a las :17 cada 6 h | `seo001_dispatch_all_landing_contract_audits_preprod()` | derivación SQL a auditar | ACTIVE |
| 70 | minuto :12 cada hora | `seo001_dispatch_blog_visual_audit_preprod()` | `fenix-blog-visual-audit-preprod` v2 | ACTIVE |

La última inspección de `cron.job_run_details` arrojó `succeeded` en los seis cron (cuatro de ellos a **2026-11-14 07:47 UTC**), **pero esto acredita SOLO la finalización del comando SQL, no la respuesta downstream de Edge, WordPress ni una llamada a staging**. Ningún cron fue pausado, reprogramado ni ejecutado manualmente.

**Gate P0 adicional:** antes de permitir ejecuciones desde Operativa, revisar en lectura el código, los guardas, las llamadas `fetch`, el estado de la cola y los efectos externos para estos cinco Edge. Determinar si invocan staging en operación ordinaria y si hay un interruptor seguro aislado. Documentar snapshots/contratos y probar bloqueos fail-closed en paralelo sin llamadas exteriores; no sobrescribir Edge ni desactivar cron sin demostrar dependencias, no ejecutar probing. Un cron SQL `succeeded` nunca equivale a motor `CONFIRMED_OPERATIONAL`.

Continuar LAB Universal/Operativa mediante Gateway existente; no alterar otros sistemas.


### Evidencia adicional · Edge ejecutadas durante suspensión

Se consultaron registros **solo lectura** de `function_edge_logs` del 14/11/2026 entre 06:00 y 08:00 UTC. Se observó tráfico **HTTP 200 del endpoint Edge**, que no acredita HTTP 200 contra staging ni una publicación:
- `fenix-seo-sitewide-regression-preprod`: 111 invocaciones; última 07:50:02 UTC.
- `fenix-web-content-ux-audit-v1-preprod`: 111 invocaciones; última 07:50:05 UTC.
- `fenix-seo-page-quality-preprod`: 7 invocaciones; última 07:38:05 UTC.
- `fenix-blog-visual-audit-preprod`: 2 invocaciones; última 07:12:04 UTC.
- No se hallaron invocaciones en este intervalo para los dos restantes del filtro (`fenix-seo-elementor-safe-writer-preprod`, `fenix-seo-infrastructure-autopilot-preprod`).

Inspección del código desplegado: las cinco Edge del mapa cron contienen literal `staging.fenixcapital.es` y llamadas `fetch`, **sin guardia explícita `STAGING_SUSPENDED_BY_OWNER`**. En base SQL los registros de auditoría/páginas del sitewide se actualizaron incluso hasta 07:49 UTC; se desconoce si como resultado de un acceso HTTP real a staging. **No afirmar aislamiento global ni inferir visita web confirmada a partir de HTTP 200 del Edge.**

**RIESGO ABIERTO P0:** la suspensión central del Gateway y JOB-001/13 no gobierna estas rutas heredadas vivas. No hay permiso para reactivar staging, y no se ha cambiado ningún scheduler o Edge sin prueba de dependencias. Cerrar este circuito en controles de ejecución de Edge, con snapshots, pruebas fallidas seguras y rollback, ANTES de declarar Operativa globalmente lista.


## 2026-11-14 · Suspensión física extendida autorizada por el propietario

El propietario confirma: **TODO staging debe permanecer pausado hasta nueva orden**. Se aplicaron cambios exclusivamente sobre rutas de PREPROD asociadas a staging, manteniendo App, CRM, WordPress PROD, DNS, GitHub main y Trading sin modificar.

**Snapshots previos registrados:**
- Cron originales: `CRON_ACTIVE_SNAPSHOT_2026-11-14.md` (seis IDs).
- Tabla privada Supabase `cerebro_lab_private.staging_suspension_snapshot_v1`: tres definiciones SQL y siete versiones originales de Edge, con SHA-256 y versión de origen; RLS enabled; permisos PUBLIC/anon/authenticated/service_role revocados. Migración `cerebro_lab_staging_suspension_private_snapshots_v1_20261114`.
- Para los tres SQL se conservaron los argumentos con valores DEFAULT, el `SECURITY DEFINER`, `search_path` y los grants originales. Hubo un intento de migración fallido transaccional por defaults faltantes que no aplicó cambios; segunda migración con defaults preservados dio `success=true`.

**Parada de cron efectiva:**
- Jobs `61,62,65,67,68,70`: `cron.alter_job(job_id:=...,active:=false)` después de comparar `active=true`, cron schedule y SQL exacto; confirmación directa `active=false` en los seis, sin borrar ni modificar command/schedule.
- JOB-001/13 conserva el bloqueo `seo001_probe_wp_bridge_preprod` del bloque anterior.

**Guards SQL efectivos:**
- `seo001_dispatch_page_quality_for_city_v2_preprod(text,text)`
- `seo001_dispatch_render_qa_preprod(text,text,text,text,text)`
- `seo001_wp_staging_http_preprod(text,text,jsonb)`
  
Migración: `cerebro_lab_suspend_three_staging_sql_http_paths_v2_20261114`. Ejecutados los tres en una transacción `BEGIN READ ONLY`: `ok=false`, `BLOCKED_DEPENDENCY`, `STAGING_SUSPENDED_BY_OWNER`, `side_effects=false`, `request_id=null`. No llamadas HTTP ni escrituras desde sus nuevas definiciones.

**Guards Edge efectivos:**
1. `fenix-seo-page-quality-preprod` original v5 → guard v6
2. `fenix-blog-visual-audit-preprod` original v2 → guard v3
3. `fenix-seo-elementor-safe-writer-preprod` original v8 → guard v9
4. `fenix-seo-infrastructure-autopilot-preprod` original v4 → guard v5
5. `fenix-seo-sitewide-regression-preprod` original v7 → guard v8
6. `fenix-web-content-ux-audit-v1-preprod` original v5 → guard v6
7. `fenix-seo-landing-contract-audit-preprod` original v4 → guard v5

Cada redeploy se hizo después de comparar igualdad exacta entre código fuente vivo y snapshot privado, manteniendo `verify_jwt`; guard `HTTP 423`, JSON `BLOCKED_DEPENDENCY`, `executed=false`, `side_effects=false`, sin `fetch`, secretos, storage ni DB. No se probó mediante peticiones externas ni visita a staging. `ACTIVE` en Supabase significa que **está sirviendo el guard**, no que el procesamiento staging esté activo.

**Reversión:** PROHIBIDA mientras dure suspensión. Tras orden explícita de reanudar, recuperar `source_sql_or_code` por clave (SQL_FUNCTION/SUPABASE_EDGE) de la tabla privada, verificar SHA-256, versionar, ejecutar pruebas y restaurar las funciones por migración y despliegue Edge. Reactivar crons originales únicamente después de gates. No reactivar por accidente al fusionar PR o al promover otro runtime.

**Alcance limitado:** pueden existir otros Edge, automatizaciones Hostinger, scripts remotos, llamadas HTTP directas a host, o vías a staging fuera de estos controles. Por tanto el estado global sigue **PARCIAL / POR AUDITAR**, no CERTIFICADO, hasta inventario de todas las rutas y verificación egress. El dominio staging está en Cloudflare DNS-only (proxied=false), por lo que un WAF de Cloudflare no bloquearía su tráfico actualmente. Se preservó DNS.
