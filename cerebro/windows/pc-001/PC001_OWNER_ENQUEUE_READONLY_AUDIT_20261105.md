# PC-001 · Auditoría de emisión de órdenes (solo lectura) · 2026-11-05

**Entorno:** `fenix / PREPROD / PC-001` · Proyecto Supabase `hnqlnvakzaywtafeiybt`.

## Comprobaciones físicas de datos
- `public.cerebro_device_commands_preprod` mantiene RLS habilitada (observado con `list_tables`).
- Consulta `pg_policies` de esa tabla: **0 políticas públicas**. No equivale a permiso público de escritura.
- `information_schema.role_table_grants`: se encuentran privilegios INSERT/UPDATE/SELECT para `postgres` y `service_role`; no aparecen concesiones a `anon` ni `authenticated` en la consulta. `service_role` es privilegiado y nunca debe integrarse en un cliente navegador/Windows.
- Para PC-001, cola actual: **1 comando COMPLETED** (la prueba histórica `SERVICE_HEALTH/READ_HEALTH`). No hay comandos pendientes visibles en este corte.
- Gateway PREPROD v9 observado en el corte previo: dispone de enrolamiento, reconexión, poll y resultado; no se ha acreditado una ruta de `enqueue` del propietario para comandos de UI/FS.

## Decisión de seguridad
No se ha creado ninguna orden ni modificado Supabase. No se entrega `service_role` al PC. No se inserta SQL a mano para fabricar una supuesta aceptación remota.

## GATE pendiente
Localizar o desarrollar un **emisor administrativo autenticado exact-scoped**, utilizando la autoridad legítima del Gateway existente y evitando duplicar sistemas, protegido mediante autorización de propietario, política firmada o comprobada en servidor, caducidad, nonce, idempotencia y auditoría. Debe entregar inicialmente solo órdenes de prueba de lectura o síntesis, y mantener parada local, apropiación de cola y rollback.

Siguiente paso técnico: identificar quién emitió la orden `SERVICE_HEALTH` previa, y preservar el mecanismo real existente en lugar de crear tablas o abrir endpoints sin garantías. Antes de la prueba, demostrar una transición del worker original que no pierda ni secuestre mensajes pendientes.

**Estado:** `ISSUER_AUTHORITY_POR_AUDITAR / REMOTE_CONTROL_NOT_EXECUTED`; original worker, App/CRM/PROD y Trading intactos.
