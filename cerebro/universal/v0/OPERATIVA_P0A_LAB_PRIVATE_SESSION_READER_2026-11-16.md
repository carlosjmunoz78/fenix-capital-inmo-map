# CEREBRO OS · P0-A · Lector privado de sesiones, solo LAB · 2026-11-16

## Objetivo y frontera de seguridad

Se añade **exclusivamente en Supabase LAB** (`hnqlnvakzaywtafeiybt`) una función SQL nueva, `public.cerebro_operativa_session_guard_lab_v0(uuid,uuid)`, sin cambiar funciones actuales, esquemas de App/CRM ni el proyecto emisor PROD (`cluhljgonannaafpmblx`). **Nunca aplicar esta migración a PROD.** La función confirma únicamente la existencia de una pareja `session_id + user_id` no caducada en `auth.sessions` del **mismo** proyecto LAB y devuelve `boolean`. No acepta empresa ni atributos de navegador como permisos.

**ACL:** nueva función con `SECURITY DEFINER`, propietario esperado `postgres`, `search_path=''`, referencias totalmente cualificadas y SQL estático. `REVOKE ALL FROM PUBLIC,anon,authenticated` y `GRANT EXECUTE TO service_role`. No otorgar nunca `SELECT` sobre `auth.sessions`. No habilitar al cliente web. Llamada final debe estar únicamente en un servicio servidor protegido y resolver el usuario por token **firmado por el mismo LAB issuer**, no por `user_id` arbitrario del cliente.

## Pruebas y límites

1. CI: `owner-session-reader-sql-contract.test.mjs` valida que el SQL es nuevo, scoped a LAB, consulta exacta de sesión con dos UUID, sin grants públicos ni cambios destructivos.
2. Verificación física posterior a migración en LAB: propietario, `prosecdef`, source, EXECUTE por rol y `SELECT` sobre `auth.sessions` (debe continuar denegado para roles externos). Comprobar llamada con UUID inexistente: `false`; comprobar `NULL`: `false`.
3. No introducir usuarios de prueba ni modificar directamente `auth.users/auth.sessions` en esta fase; la comprobación positiva y la **revocación real de una sesión LAB** requerirán una cuenta de test autorizada y el proceso oficial Auth (no inserts manuales).
4. No conectar todavía esta función a los Edge lectores existentes: actualmente aceptan JWT del proyecto PROD, cuyo `auth.sessions` está en otra instancia. Un lector del proyecto LAB **no puede certificar ni revocar** sesiones del emisor PROD.
5. No interpretar una prueba SQL `false` o una firma sintética de Node como un E2E de revocación de JWT real. Falta el lector privado correspondiente al emisor, integrador de `getClaims/getUser`, negative live, medidas de coste, revisión de políticas y despliegue paralelo.

## Rollback

Conservación primero: el recurso no existía en LAB antes del incremento. Reversión, **solo con inventario de dependencias vacío y autorización de eliminación**, `DROP FUNCTION public.cerebro_operativa_session_guard_lab_v0(uuid,uuid)`. No ejecutar rollback destructivo automático. Si la prueba falla, mantener los lectores existentes y no conectar el nuevo componente.

**Coste de suscripción adicional:** 0 €; consumo marginal del entorno a medir.
