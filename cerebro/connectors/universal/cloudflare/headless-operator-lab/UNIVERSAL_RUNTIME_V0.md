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
