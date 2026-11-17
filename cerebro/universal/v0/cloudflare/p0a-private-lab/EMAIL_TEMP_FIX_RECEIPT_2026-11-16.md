# P0-A · Corrección del correo temporal del usuario LAB · 16/11/2026

**Evidencia física previa:** API privada Cloudflare `p0a_lab_real_auth_one_shot_20261116_run3`, Workflow `complete`, salida `FAIL_CLOSED`, `stage=CREATE`, `temp_user_cleanup=NOT_NEEDED`, 1 step. El código pasó la comprobación de RPC sintética (si no, habría fallado en `PREFLIGHT`). En Supabase LAB `hnqlnvakzaywtafeiybt`, consulta `COUNT(auth.users WHERE email LIKE 'cerebro-p0a-%@example.invalid')` = 0 antes y 0 después. Worker desactivado y protegido: `CEREBRO_P0A_ENABLED=false`, workers.dev OFF, previews OFF, 0 cron, 0 rutas públicas.

**Causa probable:** el generador usaba `@example.invalid`. La documentación oficial Supabase (Auth error codes) identifica `email_address_invalid` y prohíbe dominios de ejemplo/prueba. URL: https://supabase.com/docs/guides/auth/debugging/error-codes. No se dispone del HTTP status/código concreto de la petición, por lo que es hipótesis fundada, **no error confirmado de proveedor**.

**Corrección aislada:** se cambia exclusivamente el sufijo de correo efímero por `@fenixcapital.es` (dominio controlado por Fénix). El prefijo sigue siendo `cerebro-p0a-<UUID>`; `admin.users` recibe `email_confirm:true`. La llamada oficial `auth.admin.createUser` no envía mensajes de confirmación. No usar direcciones ajenas, no configurar SMTP y no contactar a terceros. No toca ningún dato de cliente.

**GATE:** antes de redeploy, conservar instantánea y la frontera de Worker privada, 0 secretos a logs, test local y documentación. Después ejecutar como máximo **una** instancia LAB con ID único, comprobar resultado y conteo temporal pre/post por SQL, restaurar flag OFF incluso en error. Si falla `CREATE` o `CLEANUP`, detener y revisar sin bucles. No alcanzar PROD; P0-A LIVE todavía BLOQUEADO.


## RECTIFICACIÓN BASADA EN LOGS REALES

El rechazo no fue por el dominio de ejemplo: dos logs Auth LAB del 16/11 devolvieron `POST 400 validation_failed`, mensaje clasificado `PASSWORD_TOO_LONG`. El generador original usaba 112 caracteres. Sustituido por 48 caracteres aleatorios+complejidad, véase `PASSWORD_FIX_RECEIPT_2026-11-16.md`. El dominio propio se conserva para evitar un problema independiente. Estado P0-A aún BLOQUEADO hasta prueba física y cleanup.
