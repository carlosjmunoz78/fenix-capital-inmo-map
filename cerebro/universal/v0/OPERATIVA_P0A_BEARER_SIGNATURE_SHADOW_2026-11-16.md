# CEREBRO OPERATIVA · P0-A · Adaptador bearer verificado · 2026-11-16

**ESTADO: LAB / CÓDIGO + TESTS · NO DESPLEGADO · NO CONECTADO A APIs NI PRODUCCIÓN.**

## Propósito
Cerrar un riesgo de diseño del primer `owner-session-gate-shadow.mjs`: ese helper recibía `identity`, `issuer` y `verifiedClaims` como objetos y dependía de que el llamador fuera de confianza. **Nunca se debe conectar directamente a un endpoint que reciba esos objetos del cliente.**

Se añade `owner-session-bearer-shadow.mjs`: recibe **solo** Authorization bearer y selectores LAB/Fénix, fija el issuer del servidor, exige **verificación de firma + emisor** mediante una dependencia server-only `verifyIssuerJwt`, resuelve actor por el user_id verificado y exige una lectura privilegiada de sesión vigente por `session_id + user_id`. Cualquier error niega.

La prueba `owner-session-bearer-shadow.test.mjs` genera en ejecución un par de claves **Ed25519 sintéticas**, firma un JWT de prueba y valida la firma de verdad antes de pasar a comprobación de propietario y sesión; también modifica el payload sin firmarlo, prueba issuer ajeno, actor ajeno, token caducado, ausencia de sesión, error RPC y que los objetos suministrados por cliente no alteran los verificadores del servidor.

La **firma probada es local y sintética**, NO firma de Supabase PROD ni token de usuario real. Tampoco se ha creado un lector privilegiado para `auth.sessions`.

## Dependencias no implementadas
1. `verifyIssuerJwt(token, pinnedIssuer)`: un integrador del lado emisor con validación de firma real por cliente oficial/JWKS, claims verificables y `auth.getUser(token)` si procede. No extraer claims sin validación.
2. `resolveOwnerByVerifiedUser(userId)`: contexto actor activo por UUID autenticado, no por campo/metadata editable del navegador.
3. `readActiveSession({sessionId,userId})`: lector privado del lado emisor con privilegios legítimos, consulta fija y respuesta mínima. Tanto en LAB como en PROD, `service_role` no tiene SELECT directo a `auth.sessions` (comprobado por SQL de permisos). **No conceder SELECT ni modificar Gateway PROD en este bloque.**
4. Costes/latencia/timeout del lector + inspección OLD vs NEW, despliegue paralelo, rollback y E2E autenticado de prueba.

**FAIL-CLOSED:** sin estos tres servicios correctamente conectados no se puede construir el adaptador. No se promueve ni se afirma seguridad E2E por pasar tests con proveedores ficticios.

**Coste adicional:** cero suscripciones; consumo real de CI NO_MEDIDO.
