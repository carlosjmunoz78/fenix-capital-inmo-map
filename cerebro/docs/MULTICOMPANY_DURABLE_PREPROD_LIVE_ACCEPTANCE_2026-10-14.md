# CEREBRO OS · Multiempresa · Durable PREPROD Live Acceptance

Fecha: 2026-10-14  
Estado: `DURABLE_PREPROD_CONTROL_PLANE_PARTIAL`  
Coste adicional: `0 EUR`

## HECHO

Se ha cerrado físicamente el gate de persistencia PREPROD para el primer tramo multiempresa usando el proyecto Supabase existente y exclusivamente como **control plane transaccional ligero**.

Aplicadas de forma aditiva las migraciones versionadas existentes para:

- `COMP-REG-001` · Company Registry;
- `TENANT-001` · Tenant Boundary Guard;
- `COMP-ONB-001` · Company Onboarding;
- `SCAN-001` · receipt durable de escaneo read-only.

Antes de aplicar las migraciones se verificó que ninguno de los objetos objetivo existía. Los rollback exactos ya estaban versionados en el repositorio.

## VERIFICACIÓN FÍSICA

Las seis tablas PREPROD creadas tienen RLS activado. `anon` y `authenticated` no tienen acceso SELECT. Las ocho funciones de control plane no son ejecutables por `anon` ni `authenticated`; `service_role` conserva únicamente la autoridad prevista por contrato.

Se ejecutó además un self-check transaccional completo con una empresa sintética:

`COMP-REG-001 -> TENANT-001 -> COMP-ONB-001 -> SCAN-001`

El flujo dejó GREEN los cuatro motores anteriores y READY `KW-001`, `WAUD-001`, `SOCAUD-001` y `LOCALP-001`. El acceso cross-company devolvió denegación fail-closed. Toda la prueba se ejecutó dentro de una transacción y se hizo `ROLLBACK`; después se verificaron **0 filas persistidas** para la empresa de self-check.

## SUPABASE NO SOPORTA LO PESADO

Supabase solo persiste aquí estado transaccional mínimo, hashes, contadores y receipts. No se guardan cuerpos de páginas, evidencias pesadas, logs masivos, credenciales ni payloads de cliente.

Esto conserva el principio de arquitectura: App/CRM/Auth/datos críticos + control plane ligero en Supabase; investigación y trabajos pesados fuera.

## EXISTENTE / CONSERVADO

No se modifica App Fénix, CRM, tablas de negocio `fenix_prod`, WordPress, SEO, Notion, Training, Trading ni gateways PROD. No se crea una segunda arquitectura de onboarding.

Se reutilizan exactamente los contratos y rollback ya versionados:

- `20261013075000_cerebro_company_registry_preprod_persistence_v1.sql`;
- `20261013083000_cerebro_company_onboarding_preprod_persistence_v1.sql`;
- `20261013093000_cerebro_scan001_preprod_persistence_v1.sql`;
- sus tres rollback correspondientes.

## PARCIAL

Esto **no** significa que los 17 motores de onboarding multiempresa estén operativos de extremo a extremo.

Estado físico probado:

- `TENANT-001`: LIVE PREPROD fail-closed;
- `COMP-REG-001`: LIVE PREPROD durable;
- `COMP-ONB-001`: LIVE PREPROD durable;
- `SCAN-001`: LIVE PREPROD durable receipt;
- `KW-001`, `WAUD-001`, `SOCAUD-001`, `LOCALP-001`: READY tras SCAN, ejecución durable todavía pendiente;
- resto de bootstrap: BLOCKED hasta cerrar dependencias.

Tampoco se declara todavía continuación multiempresa autónoma de `LRN-001`.

## SIGUIENTE GATE

`POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED`

El siguiente bloque debe conservar los motores existentes y cerrar en paralelo `KW-001 + WAUD-001 + SOCAUD-001 + LOCALP-001`, con evidencias fuera de Supabase cuando sean pesadas y solo receipts/hashes ligeros en el control plane.

## ROLLBACK

Orden inverso:

1. `scan001-preprod-persistence-v1.rollback.sql`;
2. `company-onboarding-preprod-persistence-v1.rollback.sql`;
3. `company-registry-preprod-persistence-v1.rollback.sql`.

No se ejecutó rollback porque la aceptación fue GREEN. Los scripts permanecen preparados y acotados a los objetos creados por estas migraciones.

## AUTORIDAD

- PROD autónomo: no autorizado.
- PROD write nuevo: no autorizado.
- Trading: aislado.
- Customer data: no usado.
- Coste adicional: 0 EUR.
