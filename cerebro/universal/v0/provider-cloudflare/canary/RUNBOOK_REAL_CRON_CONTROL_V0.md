# LAB-CF-CANARY-001 · PRUEBA FÍSICA DE CRON EN CLOUDFLARE
Fecha: 15 noviembre 2026 · PR #66 DRAFT · Cloudflare LAB (cuenta e39a57e1ac42650ca5a6d5307cf0ac8e).

## Inventario y contrato
Worker exclusivo: cerebro-operativa-control-canary-lab. Ausencia confirmada con GET antes de crear. Identity fenix / LAB-CF-CANARY-001 / LAB / 0.1.0.
Source: worker.mjs. No peticiones salientes, secretos, DB, servicios, colas, APIs, publicaciones ni IA. Fetch siempre 404; scheduled solo logging neutral.
V0 final OBLIGATORIO: workers.dev OFF, preview_urls OFF, cron [] y sin rutas, dominio público o cron adicional.
Sin tocar Workers existentes, App/CRM, DNS, SEO, WordPress, Trading, PROD ni staging suspendida.

## Plan de aceptación
1. Certificar worker inexistente; conservar snapshot de cuenta y dependencia antes del alta.
2. Crear Worker nuevo, desactivar inmediatamente subdomain y preview_urls, comprobar cero cron.
3. Prueba RESUME_CRON: añadir temporalmente cron */30 * * * * únicamente a este canario neutro; comparar GET de schedules exacto.
4. Prueba PAUSE_CRON: restaurar [] y comprobar mediante GET (dos lecturas). Si falla revertir inmediatamente a [] y BLOQUEAR.
5. Confirmar que ningún otro Worker ni cron fue alterado; guardar before / after / timestamps / resultados.
6. No existe control autenticado desde consola Vercel hasta disponer de conector server-side de permisos mínimos. No exagerar prueba API como E2E de UI.

## Semántica
CRON_CONFIGURED no equivale a ACTIVE_AGENT, JOB_FINISHED, ni WORKER_OFF. El cron canario puede disparar un evento neutral sin efectos mientras se ensaya.
Worker sin cron sigue pudiendo recibir otros tipos de eventos; los controles empresariales requieren contratos de cada runtime, snapshot, rollback y permiso estricto.

## Rollback
Conservar el nuevo canario inerte con schedule vacío y subdomain OFF; nunca destruir datos, eliminar recursos ni publicar sin procedimiento de recuperación.
Si no se confirma el estado final: HUMAN_REQUIRED SECURITY_INCIDENT y detener nuevos cambios Cloudflare.

## Evidencia física del 15/11/2026 (15:41–15:43 UTC)
- HECHO: Worker creado con el código fuente versionado y respuesta de Cloudflare CREATE_SAFE. Subdominio workers.dev false, preview_urls false, schedules [] en GET.
- BLOQUEADO POR CUOTA ECONÓMICA: Cloudflare rechazó PUT de cron nuevo */30 * * * * con HTTP 400, error 10072: el plan Workers Free limita a 5 cron triggers por cuenta. La cuenta ya tenía los cinco ocupados.
- RECUPERACIÓN VERIFICADA: se consultó otra vez el canario, schedules [] y subdominios false. Los cinco crons originales conservaron sus expresiones, verificados con GET nominal posterior.
- El canario nuevo lleva el total de Workers a 38, pero sólo se han verificado cinco cron configurados. No se ejecutaron trabajos empresariales ni se habilitaron rutas públicas. No hay evidencia de scheduled() ejecutado.
- La prueba de RESUME_CRON fue RECHAZADA y no se puede declarar ejecutada ni validada. PAUSE_CRON no cambió ningún cron activo; el estado objetivo OFF ya estaba aplicado y se releyó.
- No eliminar ni suspender uno de los cinco crons existentes para liberar el cupo. No contratar Workers Paid sin autorización económica explícita.
- Evidencia JSON: ../observations/cloudflare-free-cron-capacity-2026-11-15.json.
- PLAN ALTERNATIVO: diseñar un único scheduler compartido dentro del cupo existente con estudio de dependencias, backup, comparación OLD vs NEW, pruebas, rollback físico y tribunal. No intervenir staging suspendida.

**ESTADO FINAL: BLOQUEADO PARA RESUME_CRON, PRIVADO + PAUSADO PARA EL CANARIO, SIN CAMBIOS EN CRONS EXISTENTES.**

## Prueba física adicional · Cloudflare Worker CONTROL_PAUSED · 15/11/2026 16:27–16:30 UTC
**HECHO:** Nuevo módulo de canario `worker.control-v0.mjs` (V0.2) conserva fetch 404, scheduled inerte, sin red externa, bases de datos ni colas. Falta de binding o valor desconocido = PAUSED. Una versión `CONTROL_PAUSED=false` sólo permite una **invocación programada sin trabajo externo**, que en este canario no puede suceder porque no tiene cron. Nunca interpretar este flag como permiso para publicar.

**Prueba real / versiones inmutables:**
- Baseline antiguo Worker: `99aeccb9-190f-4110-8267-ff58de59ae8e`, sin bindings, cron [], workers.dev OFF, previews OFF.
- Versión preparada PAUSED `1a6d2051-e14e-4ed9-ae04-04f642b3d56c`; subida sin activar y después desplegada con recibo Cloudflare `79cf7555-0b7b-42d9-bda9-55a0c71217d8`. GET deployment+deployed-version+cron+subdominio confirmó CONTROL_PAUSED=true.
- Versión candidata RESUMED `44d92703-d66c-467f-b59d-eba113e2d954`; se subió y verificó sin despliegue. GET de `/settings` indicó CONTROL_PAUSED=false **ANTES** de cambiar el deployment, mientras la versión activa anterior seguía true: **el valor de GET /settings es de la versión más reciente y no necesariamente de la que sirve tráfico.** Se detectó y se detuvo la prueba para corregir el guard. Esta distinción es esencial en cualquier futuro control real de CEREBRO.
- Se corrigió el guard para leer `GET /deployments` → identificador de versión activa → `GET /versions/{id}`. Después se desplegó RESUMED al 100%, recibo `4464f9d2-93a0-4ed2-941b-a3eaee487ce4`. GET físico 16:29:09 UTC: active version correcta, CONTROL_PAUSED=false, cron [], subdominio OFF, previews OFF.
- Se ejecutó inmediatamente PAUSE con rollback a la versión PAUSED inmutable; recibo `fe57b5f7-48b7-44a9-8cbc-ddbbcbca5134`. GET físico 16:29:49 UTC: active version `1a6d2051-e14e-4ed9-ae04-04f642b3d56c`, CONTROL_PAUSED=true, cron [], workers.dev OFF, previews OFF.
- Se verificaron otra vez con GET los **cinco cron originales exactos**, sin cambios y sin nuevo scheduler. Cero versiones o rutas de otros Workers modificadas.

**Evidencia auditable:** `physical-provider-control-2026-11-15.json` contiene versiones, receipts IDs, tiempos, estado final, crons preservados y controles que no se han demostrado.

**Rollback:** `RESUME_INTERNAL_CONFIG` → volver a desplegar version PAUSED `1a6d2051-e14e-4ed9-ae04-04f642b3d56c` al 100%, siempre después de preflight de despliegue, binds, subdominio, cron y alcance del proveedor; procedimiento probado físicamente. La versión original `99aeccb9-190f-4110-8267-ff58de59ae8e` permanece disponible para recuperación de código, pero **su reimplantación no se ha ensayado**. Nunca repetir despliegue automático sin comparar versión preexistente y scope.

**Límites precisos:** La API Cloudflare ha ejecutado y confirmado un cambio de configuración de un Worker de pruebas, no un trabajo empresarial. El canario no ha procesado ni una sola tarea programada. No existe todavía adaptador Cloudflare de escritura conectado desde la consola Preview porque la credencial server-side no puede transferirse entre conectores sin autorización de seguridad. No debe mostrarse botón Cloudflare empresarial como activo ni declararse automación universal lograda.

## Fábrica · adaptador de programación compartida paralelo
`../shared-scheduler-shadow.mjs` implementa prioridad determinista y paused para trabajos estrictamente Fénix/LAB, presupuesto extra 0 €, máximo dos seleccionados por tick, concurrencia 1, sin I/O. Sus gates incluyen snapshot OLD, dependencias, pruebas de regresión y rollback seco en verde. El resultado es **SHADOW_PLAN_ONLY**, nunca ejecuta. Esta V0 no altera el Worker `cerebro-fact001-headless-operator-lab-20261111` ni sus actuales trabajos; vincularlo a ese cron exige tests OLD vs NEW y rollback físico adicionales, evitando degradar D1, Vercel, Pages o recovery.
