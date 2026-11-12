# FACT001 · Cloudflare Workers: reutilización autónoma física LAB (2026-11-11)

**HECHO Y VERIFICADO EN CLOUDFARE LAB (Workers)**, no confundir con universal FULL.

## Funcionamiento
- Worker privado `cerebro-fact001-headless-operator-lab-20261111`, versión física `647b73cf-53b7-48bd-8b5d-9c089dc7f6e6`, con `CF_WORKERS_TOKEN` secreto tipo `secret_text`, D1 `RECOVERY_DB`, sin `workers.dev`, previews ni rutas. Cron **`*/5 * * * *`** activo después de pruebas; lee una orden máxima por tick y no se expone por HTTP.
- D1 existente, sin nueva base. Tablas aditivas y aisladas: `fact001_cf_command_jobs_v1`, `fact001_cf_owned_workers_v1`, `fact001_cf_command_events_v1`. La cola acepta 4 operaciones cerradas y limita estrictamente recurso `cerebro-fact001-managed-lab-[a-z0-9]{4,20}`, `company_id=fenix-capital`, `engine_id=FACT-001`, `environment=LAB`, `version=1.0.0`, `max_cost_eur=0`.
- Seguridad: intento único, `idempotency_key` UNIQUE, D1 claim transaccional, recuento `attempts=1`, token no expuesto, readback de versión/bindings/subdominio/crons y ledger de propiedad exigido antes de update/rollback/delete. Los errores terminan en `RECONCILE`, sin bucles ciegos.
- ChatGPT (vía Cloudflare OAuth y con orden del propietario) puede encolar órdenes del catálogo en la D1. CEREBRO las ejecuta después por su propia identidad de servicio.
- Entrada independiente **nueva** `cerebro-fact001-cf-command-intake-lab` Supabase Edge v1, con GitHub OIDC exacto repo/rama/workflow/actor, D1 Writer ya conservado en Vault, sin credenciales mostradas. Solo inserta órdenes validadas y devuelve estado. Sin rutas de escritura a Workers ni acceso a App/CRM. CI política: [#43031006610](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43031006610).

## Pruebas físicas en el proveedor
- Ordenadas por ChatGPT en D1: `worker.create_private` → `worker.update_private` → `worker.rollback_private` → `worker.delete_private`, sobre el nombre estrictamente temporal `cerebro-fact001-managed-lab-a001`. **4/4 COMPLETED, 4 intentos, cero errores, Worker final ausente y owned ledger DELETED**.
- Órdenes enviadas por GitHub OIDC a la nueva entrada de servicio, con D1 readback e idempotencia: [creación #43031323409](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43031323409), [eliminación #43031829238](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43031829238), nombre `cerebro-fact001-managed-lab-s001`. **2/2 COMPLETED, 2 intentos, cero errores, Worker final ausente**.
- Final: **6/6 completadas y registradas**, sin recursos sobrantes; 14 Workers totales (13 preexistentes + el motor privado). Cron de ensayo `* * * * *` sustituido por `*/5 * * * *`, comprobado con GET. Ninguna otra D1 creada ni suscripción contratada.

## Backups/rollback
- Bookmark D1 preesquema: `00000152-00000000-00005120-a9c93f0f297d6218ae506ed1511920e5`. **Nunca restaurar toda la D1 compartida**.
- Código previous Worker `9550cc16-7e8a-49db-9369-a0bb68b8b608` preservado, restauración permitida exclusivamente en recurso propio y con cron apagado previo. Antes de rollback exportar tabla propia y estado de su cola; no borrar auditoría. Los recursos preexistentes de otras áreas quedan intactos.
- CI tests versión universal runner + intake ejecutados y PASS. No se promovió a PROD ni a `main`.

## Pendiente para Cloudflare Universal FULL
- Pages headless con **credencial propia Pages Write** aún no disponible, más prueba deployment/rollback real en proyecto LAB nuevo.
- D1: escritor acotado al Recovery LAB funciona; operación universal D1 multiempresa y gate de backup/restore aún no.
- El token del Worker carece de caducidad programada; necesita política de rotación y revisión de permisos. Sin acceso automático universal a DNS, zonas, KV, R2, otros productos ni recursos PROD. No afirmar que el único motor cubra todo Cloudflare.
- Model router, supervisión, costes medidos con uso real, API de gateway CEREBRO general multiempresa, y posteriormente Console; se deja el executor en LAB para operaciones ya aprobadas.

**Estado:** `WORKERS_HEADLESS_REUSABLE=VERIFIED_LAB`, `SIGNED_INGRESS=VERIFIED_LAB`, `CLOUDFLARE_UNIVERSAL=PARTIAL`.
