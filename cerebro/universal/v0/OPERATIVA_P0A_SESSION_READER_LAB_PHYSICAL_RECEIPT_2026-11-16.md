# CEREBRO OS · Recibo físico P0-A · Lector privado de sesión Supabase LAB · 2026-11-16

## Alcance y previa
- Proyecto único `hnqlnvakzaywtafeiybt`, nombre del proyecto `fenix-capital-inmo-map`, región `eu-north-1`, estado `ACTIVE_HEALTHY`. **Es el proyecto LAB usado por CEREBRO Operativa, no el proyecto emisor de identidad de la App.**
- Objeto verificado ausente ANTES de la migración: `public.cerebro_operativa_session_guard_lab_v0`, `existing_count=0`.
- Operador SQL `current_user=postgres` y `has_table_privilege('postgres','auth.sessions','SELECT')=true`; el propietario de la tabla `auth.sessions` es `supabase_auth_admin`.
- Función preparada en PR #66 DRAFT bajo SHA `d7ab6f3c598097d1b276a92dd57d35c52a3b752b`; 3 test de contrato determinista nuevos. No tocar ni dar acceso a filas `auth.users/auth.sessions` directamente.

## Ejecución física
- `apply_migration(project_id=hnqlnvakzaywtafeiybt,name=cerebro_operativa_session_guard_lab_v0_20261116)` devolvió `success=true`.
- `list_migrations` devolvió el registro `20261115232727_cerebro_operativa_session_guard_lab_v0_20261116`.
- Objeto real creado: `public.cerebro_operativa_session_guard_lab_v0(uuid,uuid)` retorna `boolean`, `SECURITY DEFINER`, owner `postgres`, `search_path=''`. Solo SQL estático que evalúa `session_id + user_id` y `not_after` del proyecto LAB.
- ACL ejecutable de la función: `anon=false`, `authenticated=false`, `service_role=true`. ACL tabla base `auth.sessions`: `anon SELECT=false`, `authenticated SELECT=false`, `service_role SELECT=false`. Sin permisos añadidos a la tabla.
- Llamadas de comprobación privilegiadas, sin usuarios reales: UUID de prueba inexistente → `false`; `session_id=NULL` → `false`.

## Separación de seguridad
La nueva función es privada en términos de **EXECUTE roles** aunque resida en schema `public` para uso futuro por RPC desde servidor. Nunca debe ser invocada con `user_id` o `session_id` declarados por navegador: un adaptador seguro tendría que validar firma del JWT emitido por ESTE MISMO proyecto y correlacionar el usuario antes de llamarla.

**No es prueba de revocación real**: ni se creó sesión LAB real de test ni se hizo logout, ni hay un backend caller integrado. Los JWT de la App owner se emiten desde `cluhljgonannaafpmblx`, por lo que un check en `hnqlnvakzaywtafeiybt.auth.sessions` no valida esos tokens. Los Edge observadores existentes y el Gateway PROD permanecen sin cambios. La PR no se fusiona.

## Seguridad / rollback / costes
- Ninguna tabla nueva, UPDATE, DELETE o GRANT de SELECT; solo CREATE FUNCTION y GRANT EXECUTE restringido. No se leyeron secretos ni sesiones reales.
- Rollback: objeto es nuevo y aislado, sin consumidores actuales verificados. Cualquier eliminación futura requiere confirmar dependencias y autorización; no ejecutar DROP automático.
- Tests en CI: registrar conclusión del SHA por separado antes de proclamar verde.
- Coste: sin suscripciones nuevas; costes operativos marginales NO_MEDIDO.
- Estado de promoción: `P0A_LAB_READER_PHYSICAL=PASS_LIMITED`; `P0A_REVOKED_SESSION_E2E=NOT_TESTED`; `OWNER_PROD_ISSUER_READER=NOT_IMPLEMENTED`; `PROD=HOLD`.
