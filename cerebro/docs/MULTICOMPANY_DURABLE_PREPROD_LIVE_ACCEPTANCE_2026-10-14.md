# CEREBRO OS · Multiempresa · Durable PREPROD Live Acceptance

Fecha: 2026-10-14  
Estado: `DURABLE_PREPROD_POST_SCAN_GREEN`  
Coste adicional: `0 EUR`

## HECHO

Se ha cerrado físicamente en el proyecto Supabase existente el tramo PREPROD:

`COMP-REG-001 -> TENANT-001 -> COMP-ONB-001 -> SCAN-001 -> [KW-001 + WAUD-001 + SOCAUD-001 + LOCALP-001]`

Se reutilizaron sin rediseño los runtimes, migraciones y rollback ya versionados. Supabase actúa exclusivamente como **control plane transaccional ligero**.

Migraciones aplicadas de forma aditiva:

- `20261013075000_cerebro_company_registry_preprod_persistence_v1.sql`;
- `20261013083000_cerebro_company_onboarding_preprod_persistence_v1.sql`;
- `20261013093000_cerebro_scan001_preprod_persistence_v1.sql`;
- `20261013101500_cerebro_post_scan_parallel_preprod_v1.sql`.

## VERIFICACIÓN FÍSICA

Los objetos PREPROD tienen RLS y acceso acotado a `service_role`; `anon` y `authenticated` no tienen SELECT sobre las tablas ni EXECUTE sobre las funciones de control plane auditadas.

Self-check GREEN transaccional, completamente revertido después:

- 8 motores GREEN: `TENANT-001`, `COMP-REG-001`, `COMP-ONB-001`, `SCAN-001`, `KW-001`, `WAUD-001`, `SOCAUD-001`, `LOCALP-001`;
- 3 motores READY: `KBOOT-001`, `SEOBOOT-001`, `SOCBOOT-001`;
- 6 motores todavía BLOCKED;
- 4 receipts post-SCAN;
- cross-company = `403 cross_company_access_denied`;
- siguiente gate = `BOOTSTRAP_TIER_DURABLE_EXECUTION_REQUIRED`.

Se probó además el camino de excepción canónico: `KW-001` con `LOW_CONFIDENCE` pasa a `HUMAN_REQUIRED`, mientras `KBOOT-001` y `SEOBOOT-001` permanecen bloqueados. No existe desbloqueo silencioso.

Todas las empresas sintéticas se ejecutaron dentro de una transacción con `ROLLBACK`. Verificación posterior: **0 filas sintéticas** en engine state y receipts post-SCAN.

## SUPABASE NO SOPORTA LO PESADO

Supabase solo persiste estado transaccional mínimo, hashes, contadores y receipts. No se guardan cuerpos web, señales sociales crudas, resultados extensos de keywords, evidencias locales pesadas, logs masivos, credenciales ni payloads de cliente.

Los runtimes de auditoría producen evidencia fuera del control plane; únicamente el resumen gobernado entra en Supabase.

## EXISTENTE / CONSERVADO

No se modifica App Fénix, CRM, datos de negocio `fenix_prod`, WordPress, SEO productivo, Notion, Training, Trading ni gateways PROD. No se crea un servidor por motor: `KW/WAUD/SOCAUD/LOCALP` comparten runtime y persistencia gobernada.

Los rollback exactos ya versionados permanecen disponibles, incluido `post-scan-parallel-preprod-v1.rollback.sql`.

## PARCIAL

Esto todavía **no** significa que los 17 motores de onboarding estén operativos de extremo a extremo.

Estado probado ahora:

- stages 0–7: durable PREPROD verificado;
- stages 8–10 (`KBOOT/SEOBOOT/SOCBOOT`): READY y siguiente bloque a cerrar;
- stages 11–16: bloqueados por dependencias canónicas.

Tampoco se declara aún continuación multiempresa autónoma de `LRN-001` ni autonomía PROD.

## SIGUIENTE GATE

`BOOTSTRAP_TIER_DURABLE_EXECUTION_REQUIRED`

Debe reutilizar `bootstrap-tier-v1.mjs` y su SQL/rollback existentes, probar OLD/current contract, idempotencia, HUMAN_REQUIRED, tenant isolation y desbloqueos canónicos. No crear motores duplicados.

## ROLLBACK

Orden inverso del tramo actualmente instalado:

1. `post-scan-parallel-preprod-v1.rollback.sql`;
2. `scan001-preprod-persistence-v1.rollback.sql`;
3. `company-onboarding-preprod-persistence-v1.rollback.sql`;
4. `company-registry-preprod-persistence-v1.rollback.sql`.

No se dejó ninguna mutación destructiva ni dato de self-check persistido.

## AUTORIDAD

- PROD autónomo: no autorizado.
- PROD write nuevo: no autorizado.
- Trading: aislado.
- Customer data: no usado.
- Coste adicional: 0 EUR.
