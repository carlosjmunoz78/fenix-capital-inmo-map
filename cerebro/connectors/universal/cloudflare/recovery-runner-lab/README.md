# FACT-001 · RECOVERY-RUNNER-001 · Cloudflare D1 + Cron LAB 10/11/2026

Estado: **DESPLEGADO AISLADO / CRON CONFIGURADO / SMOKE EN COLA PENDIENTE DE EJECUCIÓN FÍSICA**.
Contexto 4D: `company_id=fenix-capital`, `engine_id=FACT-001`, `environment=LAB`, `version=1.0.0`.
PR #44: `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109` **DRAFT**; no merge a main.

## Inventario inmutable, dependencias y coste
- Cuenta Cloudflare: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- D1 NUEVA `cerebro-fact001-recovery-lab-eu`, UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, `jurisdiction=eu`. Número de bases pasó **8 → 9** de máximo 10 en Workers Free. Ninguna D1 existente modificada.
- Worker NUEVO `cerebro-fact001-recovery-runner-lab`, código único `worker.mjs`, única vinculación `RECOVERY_DB` al UUID anterior, compatibilidad 2026-11-10. **workers.dev=false** y **previews_enabled=false** comprobados por GET API. Sin ruta a DNS, zonas, dominios personalizados ni App/CRM.
- Triggers previos de cuenta: cero. Nuevo Cron Trigger exclusivo `* * * * *` SOLO durante aceptación inicial, a reducir a `*/5 * * * *` tras smoke. Hasta entonces ≤1440 invocaciones/día si está siempre habilitado; por debajo de 100.000 solicitudes/día Workers Free. **No se ha contratado suscripción nueva ni autorizaciones de coste**. Configuración de destino en `wrangler.lab.jsonc`: `*/5 * * * *`.
- SQL nuevo `schema.sql`: `fact001_runner_config_v1` (OFF por defecto, activado SOLO tras seed para smoke), `fact001_runner_jobs_v1`, `fact001_runner_ticks_v1`. D1 comprobada por API HTTP 200, tres tablas e índice, antes cero jobs. Sin filas de App, CRM, leads ni clientes.
- Job de humo fijo `FACT001-RUNNER-SMOKE-20261110-001`, `client_id=cerebro`, tipo `fact001.lab.heartbeat`, SHA256 de prueba; sin payload externo, token, API, dinero, publicaciones ni órdenes a terceros. Seed y `enabled=1,max_jobs_per_tick=1` verificados por API.
- Code/CI: `worker.mjs`, `worker.test.mjs`, `schema.sql`; workflow `.github/workflows/fact001-recovery-physical-runner-lab.yml`, run [#42795875733](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42795875733) **SUCCESS 11/11**, sólo SQLite local temporal. Reintentos previos validados en 22/22 pruebas [#42793926401](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42793926401). Esto NO equivale a prueba de Cron remoto.

## Contrato y decisiones de seguridad
- `scheduled()` es el único consumidor operacional: `fetch()` siempre devuelve 404 y no existe ruta pública. No se pueden encolar tareas mediante HTTP.
- Antes de ejecutar lee `config.enabled` y `max_jobs_per_tick===1`, registra una marca por `scheduledTime` para impedir doble ejecución y convierte leases expirados de `RUNNING` a `RECONCILE`.
- CLAIM por SQL atómico, `company_id`, `engine_id`, `environment=LAB`, `version`, `client_id=cerebro` y operación enumerada fija. Completar heartbeat sin llamadas externas; ningún provider arbitrario.
- **ChatGPT** opera con su OAuth MCP oficial independiente; no usa la D1 ni es dueño de los jobs CEREBRO. **CEREBRO** tiene ejecutor Cron independiente con datos estrictamente LAB; todavía no hay autenticación CEREBRO Gateway → enqueue ni Core Recovery → Worker enlazada.
- El token emisor Cloudflare guardado en Supabase Vault conserva permisos demasiado amplios: no se ha utilizado en este despliegue (se ha usado OAuth del conector oficial de ChatGPT). Requerida reducción de permisos antes de auto-administración general.
- Las credenciales del Worker: ninguna. No hay identidades de clientes reales ni secretos. No crear enlaces de red sin Access y pruebas.

## Verificación y rollback
1. Comprobar Worker scripts, GET `/subdomain` → ambos false, GET `/schedules` → cron exacto, GET `/settings` → única D1 binding.
2. Consultar **exclusivamente** en D1 nueva:
   `SELECT id,state,attempts FROM fact001_runner_jobs_v1 WHERE id='FACT001-RUNNER-SMOKE-20261110-001';`.
   `SELECT tick_key,outcome FROM fact001_runner_ticks_v1 ORDER BY started_at DESC LIMIT 3;`.
   Aceptación sólo si `state='COMPLETED'`, `attempts=1`, tick `COMPLETED`; de lo contrario `CRON_PHYSICAL_PENDING`/error, nunca verde.
3. Reducir cron a `*/5 * * * *`. Verificar GET. Confirmar plan Free y límites antes de uso sostenido.
4. **Rollback seguro:** PUT schedules `[]` de Worker NUEVO, `UPDATE fact001_runner_config_v1 SET enabled=0 WHERE id=1` en D1 NUEVA, verificar; nunca borrar Worker/D1 sin dependencias y backup. La rama DRAFT conserva fuente, migración y configuración rebuild.
5. Reparación antes de funciones externas: credencial/service identity CEREBRO separada, auth del enqueue, job catalog firmado, D1 durable recovery ledger, pruebas físicas de corte de red y reconciliación, política presupuestaria real, backup, tribunal y observabilidad. Ningún job `facebook.*`, `instagram.*`, `github.write`, `supabase.write` ni PROD habilitado.

## Estado por componente
- Cloudflare OAuth ChatGPT → crear D1 y Worker nuevos: **HECHO**.
- D1 EU, esquema y cola: **HECHO**.
- Worker Cron sin HTTP público: **HECHO**.
- Ejecución física del heartbeat remoto: **POR VERIFICAR**.
- CEREBRO autónomo para orquestación real de proveedores y restauración de sesiones: **PARCIAL / NO ACTIVO**.
- Coste adicional de suscripción: **0 EUR**; uso gratuito sujeto a límites del plan vigente.

Documentos oficiales: https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/workers/configuration/cron-triggers/ .
