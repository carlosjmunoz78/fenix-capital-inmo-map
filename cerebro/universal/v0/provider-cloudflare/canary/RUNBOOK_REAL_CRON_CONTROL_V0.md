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

Estado inicial: DEFINIDO; actualizar a HECHO con pruebas físicas y SHA de origen después de ejecutar.
