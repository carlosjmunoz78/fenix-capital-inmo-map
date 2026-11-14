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
