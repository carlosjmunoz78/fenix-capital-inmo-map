# CEREBRO OPERATIVA · P0-A · AUTH E2E LAB REAL SUPERADO · 16/11/2026

## HECHO · Prueba física Cloudflare + Supabase LAB

- Cuenta Cloudflare: `e39a57e1ac42650ca5a6d5307cf0ac8e`. Worker nuevo aislado `cerebro-operativa-auth-p0a-lab-eu` y Workflow privado `cerebro-operativa-p0a-auth-lab-eu`, jurisdicción UE.
- Proyecto Supabase **exclusivo LAB**: `hnqlnvakzaywtafeiybt`, no PROD.
- Código de Auth versionado (commit `67ac20440031bc05957ced2badc85c2af7848570`): `worker.mjs` + `cycle.mjs` + `intent.mjs`. Correo temporal controlado `cerebro-p0a-<id>@fenixcapital.es`, contraseña 48 caracteres, generada aleatoriamente. No almacenar ni imprimir correo, contraseña, token o service_role.
- Instancia única definitiva `p0a_lab_real_auth_password_fix_20261116_run5` **completada** (Cloudflare API readback, no captura ni simulación).
- Versión efectiva comprobada ANTES del lanzamiento mediante probes con `intent` deliberadamente inválido: `4a853a87-2841-4dbc-bbb3-794bfada2b3f`. El primer probe retornó versión previa; el segundo confirmó versión nueva. El run5 se ejecutó con la versión correcta.
- Salida real de proveedor: `status=PASS_LAB_ISSUER_ONLY`, `stage=COMPLETE`, `temp_user_cleanup=SUCCESS`, `prod_execution=DISABLED`; `step_count=1`, `status=complete`.
- Operaciones del ciclo integradas en el código: comprobación negativa del lector `auth.sessions`, creación de usuario temporal en LAB mediante Auth Admin, inicio de sesión real y validación GET `/auth/v1/user` y claims issuer/sub/session_id, lector true de sesión activa, logout local, lector false posterior, eliminación Auth Admin en finally. El éxito se produce únicamente si se cumplen esas comparaciones y el borrado final devuelve éxito.
- **Verificación independiente posterior vía SQL Supabase LAB**: `SELECT count(*) FROM auth.users WHERE email LIKE 'cerebro-p0a-%@fenixcapital.es' OR email LIKE 'cerebro-p0a-%@example.invalid'` = **0**; ningún usuario temporal residual dentro del patrón. El registro de Cloudflare también certifica `temp_user_cleanup=SUCCESS`.
- **Verificación independiente posterior vía API Cloudflare**: `CEREBRO_P0A_ENABLED=false`; workers.dev disabled, previews disabled, cron `[]`, Workflow UE, secretos expuestos solamente como nombres `CEREBRO_LAB_SERVICE_ROLE_KEY` y `CEREBRO_LAB_PROJECT_REF` (ambos `secret_text`). La clave publicable LAB figura como `plain_text`; es un valor publicable por diseño. Ninguna URL/ruta pública del Worker se activó, ningún trigger automático.

## Incidentes controlados y diagnóstico verificado

1. El primer run con payload REST fue rechazado por el validador de intent; se añadió normalización JSON del Workflow y pruebas de 10 casos.
2. Cloudflare Workflows puede usar la versión antigua inmediatamente después de actualizar; se implantó gate físico por versión antes del lanzamiento.
3. Runs 3 y 4 fallaron sin crear usuario, `FAIL_CLOSED / stage=CREATE / cleanup=NOT_NEEDED`. Supabase `auth_logs` mostró `POST 400 validation_failed`, categoría `PASSWORD_TOO_LONG` (password anterior 112 caracteres). Se corrigió a 48 caracteres, tras pruebas offline. No se atribuye este error al dominio del correo.
4. Run5 completado con éxito y cleanup confirmado. **No reintentar ni volver a crear usuarios para este gate.**

## Clasificación de gates

`P0_A_PRIVATE_TRANSPORT=HECHO`;
`P0_A_LAB_AUTH_ISSUER_AND_SESSION_REVOKE=PASS_REAL`;
`P0_A_TEMP_USER_CLEANUP=PASS_REAL`;
`P0_A_WORKER_OFF_AFTER_RUN=PASS_REAL`;
`P0_A_HTTPS_PUBLIC_EXECUTION=DISABLED`;
`P0_A_PROD_AUTH_ISSUER=NOT_TESTED`;
`P0_B_PROVIDER_BUSINESS_RECEIPT=NOT_CERTIFIED`;
`OPERATIVA_PROD=HOLD`.

**Importante:** el resultado `PASS_LAB_ISSUER_ONLY` acredita el emisor y sesiones de LAB, **no** firma/autorización de producción ni todos los gates P0 B–H. No convertir el Worker a público ni guardar secretos en GitHub o chats. No tocar los sistemas originales App/CRM/WordPress, Supabase PROD, Cloudflare JARVIS/FACT/Instagram/Facebook, DNS o main.

## Riesgo residual: clave administrativa temporalmente visible en hPanel

La clave legacy `service_role` de **LAB** estuvo configurada por el usuario como variable ordinaria antes de convertirla en `secret_text`. Apareció parcialmente en capturas y podría permanecer en versiones anteriores/configuración histórica. **No rotar a ciegas** (rotación legacy JWT puede invalidar otras dependencias LAB). Abrir incidencia de inventario de consumidores LAB, plan de migración a clave limitada `sb_secret_` con adaptación de validación y plan de rotación con rollback; realizar solo cuando los consumidores estén identificados y puedan revertirse. Supabase PROD sin exposición documentada.

## Coste y rollback

No se contrató ningún servicio nuevo (0 € suscripción). Cloudflare Workers y Workflows del plan Free ya contratado; consumo específico de llamadas/CPU no medido. Flag `false` mantenido como apagado tras test, con rollback disponible mediante versiones del Worker en Cloudflare. PR #66 debe permanecer DRAFT y no mergear mientras `OPERATIVA_PROD=HOLD`.
