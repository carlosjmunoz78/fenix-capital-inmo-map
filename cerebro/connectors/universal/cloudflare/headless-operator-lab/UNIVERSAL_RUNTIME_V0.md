# FACT001 Cloudflare · Motor de órdenes reutilizable LAB v0.1
Estado: **CANDIDATO NO IMPLEMENTADO EN PROD** hasta deploy e I/O físico.
- Reutiliza Worker `cerebro-fact001-headless-operator-lab-20261111` con secreto ya instalado (`CF_WORKERS_TOKEN`, `secret_text`) y D1 `RECOVERY_DB` compartida, mediante carga de nueva versión con herencia estricta. Conserva versión anterior para rollback.
- Tres tablas exclusivamente nuevas: `fact001_cf_command_jobs_v1`, `fact001_cf_owned_workers_v1`, `fact001_cf_command_events_v1`.
- 4 operaciones estrictas sobre Worker que el propio motor creó, con nombre `cerebro-fact001-managed-lab-...`: create private, update private V2, rollback V1, delete private. No código arbitrario, ni URL, DNS, Pages, App, CRM, PROD o recursos externos.
- Identidades: operator Cloudflare secret propio; **ingreso ChatGPT** mediante D1 API administrativo, **ingreso futuro independiente CEREBRO** debe cumplir firmas y verificación de identidad, no basta con el campo `submitted_by` literal.
- Un job por tick, claim atómico `QUEUED`→`RUNNING`, cierre `COMPLETED`/`RECONCILE`, attempts=1, idempotency key UNIQUE. Audit event separado de registro final y ownership ledger.
- La infraestructura tiene en principio límites gratuitos, medir en proveedor antes de afirmar coste operativo 0 € con volumen real; ninguna suscripción nueva.
- No habilitar cron hasta tests, preflight, D1 snapshot y versión preservada. Cron periódicamente solo cuando esté probado y no comprometa cuota.
- Cuatro dimensiones company_id, engine_id, environment, version; empresa LAB inicial fenix-capital. Nuevas empresas requieren policy registrada, segregación D1 y permisos explícitos.

## Snapshot pre-DDL verificado · 11/11/2026

D1 existente `1305f791-7c44-47f9-946b-f330a09c88aa`, bookmark **`00000152-00000000-00005120-a9c93f0f297d6218ae506ed1511920e5`**. Ninguna tabla `fact001_cf_command_*` ni `fact001_cf_owned_workers_v1` existía. Worker base desplegado versión **`9550cc16-7e8a-49db-9369-a0bb68b8b608`**, sin cron, subdominio ni preview; bindings exactos `CF_WORKERS_TOKEN:secret_text` y `RECOVERY_DB:d1`. Inventario 14 Workers, objetivo `cerebro-fact001-managed-lab-a001` inexistente. **Prohibido restaurar bookmark de toda la D1 compartida**; rollback solo de recursos propios, sin alterar tablas ajenas.
