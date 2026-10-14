# CEREBRO OS · Multiempresa · Durable PREPROD Live Acceptance

Fecha: 2026-10-14  
Estado: `DURABLE_PREPROD_BOOTSTRAP_TIER_GREEN`  
Coste adicional: `0 EUR`

## HECHO

Se ha cerrado físicamente en el proyecto Supabase existente el tramo PREPROD:

`COMP-REG-001 -> TENANT-001 -> COMP-ONB-001 -> SCAN-001 -> [KW-001 + WAUD-001 + SOCAUD-001 + LOCALP-001] -> [KBOOT-001 + SEOBOOT-001 + SOCBOOT-001]`

Se reutilizaron sin rediseño los runtimes, migraciones y rollback ya versionados. Supabase actúa exclusivamente como **control plane transaccional ligero**.

Migraciones aplicadas de forma aditiva:

- `20261013075000_cerebro_company_registry_preprod_persistence_v1.sql`;
- `20261013083000_cerebro_company_onboarding_preprod_persistence_v1.sql`;
- `20261013093000_cerebro_scan001_preprod_persistence_v1.sql`;
- `20261013101500_cerebro_post_scan_parallel_preprod_v1.sql`;
- `cerebro/multicompany/sql/bootstrap-tier-preprod-v1.sql` como migración `cerebro_bootstrap_tier_preprod_v1`.

## VERIFICACIÓN FÍSICA

Los objetos PREPROD auditados tienen RLS y acceso acotado a `service_role`; `anon` y `authenticated` no tienen SELECT sobre las tablas ni EXECUTE sobre las funciones de control plane verificadas.

Self-check GREEN transaccional, completamente revertido después:

- 11 motores GREEN: `TENANT-001`, `COMP-REG-001`, `COMP-ONB-001`, `SCAN-001`, `KW-001`, `WAUD-001`, `SOCAUD-001`, `LOCALP-001`, `KBOOT-001`, `SEOBOOT-001`, `SOCBOOT-001`;
- 2 motores READY: `MKTBOOT-001`, `CRMBOOT-001`;
- 4 motores todavía BLOCKED: `APPBOOT-001`, `AUTBOOT-001`, `TRNBOOT-001`, `ENGACT-001`;
- 3 receipts bootstrap tier;
- cross-company = `403 cross_company_access_denied`;
- siguiente gate = `MARKETING_CRM_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED`.

Se probó además el camino de excepción canónico del tier: `KBOOT-001` con `LOW_CONFIDENCE` pasa a `HUMAN_REQUIRED`, mientras `CRMBOOT-001` y `MKTBOOT-001` permanecen bloqueados. No existe desbloqueo silencioso.

Todas las empresas sintéticas se ejecutaron dentro de una transacción con `ROLLBACK`. Verificación posterior: **0 filas sintéticas** en engine state, receipts post-SCAN y receipts bootstrap.

## SUPABASE NO SOPORTA LO PESADO

Supabase solo persiste estado transaccional mínimo, hashes, contadores y receipts. No se guardan cuerpos web, señales sociales crudas, resultados extensos de keywords, evidencias locales pesadas, artefactos bootstrap, logs masivos, credenciales ni payloads de cliente.

Los runtimes producen evidencia fuera del control plane; únicamente el resumen gobernado entra en Supabase.

## EXISTENTE / CONSERVADO

No se modifica App Fénix, CRM, datos de negocio `fenix_prod`, WordPress, SEO productivo, Notion, Training, Trading ni gateways PROD. No se crea un servidor por motor: los motores lógicos comparten runtime y persistencia gobernada.

Los rollback exactos ya versionados permanecen disponibles, incluido `bootstrap-tier-preprod-v1.rollback.sql`.

## PARCIAL

Esto todavía **no** significa que los 17 motores de onboarding estén operativos de extremo a extremo.

Estado probado ahora:

- stages 0–10: durable PREPROD verificado;
- stages 11–12 (`MKTBOOT/CRMBOOT`): READY y siguiente bloque a cerrar;
- stages 13–16: bloqueados por dependencias canónicas.

Tampoco se declara aún continuación multiempresa autónoma de `LRN-001` ni autonomía PROD.

## SIGUIENTE GATE

`MARKETING_CRM_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED`

Primero hay que buscar y reutilizar cualquier runtime/SQL/rollback existente para `MKTBOOT-001` y `CRMBOOT-001`. Solo si no existe se construirá un wrapper compartido mínimo, PREPROD-only, idempotente, tenant-bound y con receipts ligeros. No crear motores duplicados ni introducir servicios de pago.

## ROLLBACK

Orden inverso del tramo actualmente instalado:

1. `bootstrap-tier-preprod-v1.rollback.sql`;
2. `post-scan-parallel-preprod-v1.rollback.sql`;
3. `scan001-preprod-persistence-v1.rollback.sql`;
4. `company-onboarding-preprod-persistence-v1.rollback.sql`;
5. `company-registry-preprod-persistence-v1.rollback.sql`.

No se dejó ninguna mutación destructiva ni dato de self-check persistido.

## AUTORIDAD

- PROD autónomo: no autorizado.
- PROD write nuevo: no autorizado.
- Trading: aislado.
- Customer data: no usado.
- Coste adicional: 0 EUR.
