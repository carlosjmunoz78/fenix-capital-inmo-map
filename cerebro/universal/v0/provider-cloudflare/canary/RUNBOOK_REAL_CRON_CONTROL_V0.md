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
