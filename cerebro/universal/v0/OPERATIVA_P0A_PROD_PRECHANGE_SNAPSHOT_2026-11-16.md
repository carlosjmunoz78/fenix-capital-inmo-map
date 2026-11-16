# CEREBRO OS · P0-A · Snapshot contractual PRE-CAMBIO PROD · 16/11/2026

**Autorización propietaria:** instalar sólo lector privado de revocación de sesiones en emisor Supabase PROD tras inventario, LAB tests y reversión; no habilitar OPERATIVA PROD ni cambiar App/CRM. Recurso único: `public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)`, proyecto emisor `cluhljgonannaafpmblx`.

## Hechos físicos de inventario (solo consultas a pg_catalog e information_schema, sin PII)
- Emisor PROD `cluhljgonannaafpmblx`: instancia ACTIVE_HEALTHY, DB `postgres`, ejecutor administrativo `postgres`; `auth.sessions` existente.
- Columnas `auth.sessions`: `id uuid`, `user_id uuid`, `not_after timestamptz` presentes y tipo correcto en LAB y PROD. No se han contado ni leído sesiones individuales.
- `to_regprocedure('public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)') IS NULL`: **verdadero**. Misma firma/no colisión en funciones `public`; no existen dependencias entrantes del objeto inexistente.
- `auth.sessions`: `anon SELECT=false`; `authenticated SELECT=false`; `service_role SELECT=false` en ambos proyectos. No se modificará esta ACL.
- LAB `hnqlnvakzaywtafeiybt`: `public.cerebro_operativa_session_guard_lab_v0` propiedad `postgres`, `SECURITY DEFINER`, `search_path=''`, `EXECUTE` sólo `service_role`.
- **LAB pruebas físicas:** UUID de sesión inexistente → false, ambos argumentos NULL → false, mezclado con NULL → false. `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`. Se creó, verificó y eliminó en un único bloque transaccional un lector de ensayo `public.cerebro_operativa_session_guard_rollback_probe_20261116`; comprobado después **no existe** y lector LAB original sigue intacto. Esta es prueba de creación y reversión del recurso aislado, **no** ensayo real de cierre de sesión.
- Se consultó el estado preexistente de security advisors y registro de migraciones sin modificar avisos o esquemas ajenos. No se certifica snapshot/backup completo de la base: para este cambio exclusivamente ADITIVO el objeto de destino no existe, y el snapshot del contrato, el SQL original y la reversión de función única quedan versionados en PR #66.

## Dependencias y fronteras
`operativa-verifier futuro (aún NO conectado) → rol servidor privilegiado service_role → [nueva función] → auth.sessions SOLO SELECT boolean exacto`. No grants a frontend, no lecturas directas a `auth.sessions`, no Edge ni frontend nuevos, no cron ni trigger, no SQL dinámico. No alterar Auth settings, usuarios ni sesiones existentes. No mezclar emisor PROD con lector LAB.

## Contrato OLD vs NEW y rollback
- **OLD:** función específica no existe; App/CRM/Auth/Gateway continúan independientes. **NEW:** función nueva responde boolean y sigue sin consumidor/ruta productiva. Cualquier lector servidor futuro debe verificar JWT firmado por el mismo emisor + actor propietario antes de llamar con `session_id/user_id`; esta instalación no otorga tal garantía por sí sola.
- Backup de metadatos antes de mutación: ESTE DOCUMENTO y los dos scripts SQL exactos en PR #66 DRAFT. No es un backup integral de datos.
- Rollback acotado: `20261116_cerebro_operativa_session_guard_prod_v0_rollback.sql` verifica dependencias y hace `DROP FUNCTION ... RESTRICT` únicamente sobre la función nueva, bajo decisión de rollback; **jamás DROP CASCADE**. Comprobado con operación equivalente aislada en LAB; no ejecutar rollback PROD salvo fallo objetivo de la nueva función.
- Falta antes de cualquier go-live OPERATIVA: test Auth oficial con cuenta efímera LAB y runner protegido (sin credenciales en Vercel); certificado de JWT válido+revocado en emisor PROD y adaptador servidor; E2E propietario, permisos multiempresa, recibos causales de proveedor, FinOps, rollback de aplicación. **PROD OPERATIVA=HOLD**.
- Nuevas suscripciones 0 €. Coste de cómputo, herramientas existentes y CI **NO_MEDIDO**.
