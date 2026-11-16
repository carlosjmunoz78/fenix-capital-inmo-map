# P0-A · Cloudflare privado · auth real preparado, sin claves · 16/11/2026

## Estado ejecutado y evidencias

**HECHO en Cloudflare Free, proveedor real:** se actualizó EXCLUSIVAMENTE Worker `cerebro-operativa-auth-p0a-lab-eu` usando fuentes versionadas de PR #66 DRAFT (commit `199cf04e583cc4299a0fe8684d53a4635f1cf6f5`): `worker.mjs` y `cycle.mjs`. El Workflow `cerebro-operativa-p0a-auth-lab-eu`, jurisdicción UE, siguió sin cron y se renovó su versión `3c80093a-c024-4462-a749-8ac836d2bd32`.

Instancia real desde API de Cloudflare `p0a_auth_code_disabled_preflight_20261116`: **status=complete**, salida `BLOCKED_DISABLED`, `owner_auth_test=NOT_RUN`, `no_users_created=true`, `prod_execution=DISABLED`; 0 pasos Auth ejecutados. Al reconsultar: workers.dev false, preview URLs false, 0 cron, 0 rutas custom, secreto 0, `CEREBRO_P0A_ENABLED=false`. App/CRM/Hostinger, Supabase PROD, JARVIS y otros Workers sin cambios.

**PRUEBAS SIN RED Y SIN SECRETOS:** 12/12 tests locales Node.js 22 sobre el ciclo de referencia `/mnt/data/p0a_cf_lab/cycle.mjs` (sin subir local de tests al PR), incluyendo: credenciales ausentes, proyecto PROD rechazado, rol anon rechazado, ciclo sintético correcto, fallo RPC previo, fallo signIn y cleanup, revocación que sigue activa, ausencia de tokens/IDs en resultados. El fichero versionado en GitHub es una variante equivalente del código ensayado, **no idéntica byte a byte**; la prueba exacta de código desplegado sí certificó fail-closed en Cloudflare. No declarar CI o E2E real verde.

## Separación de credenciales

Se consultó Supabase LAB `hnqlnvakzaywtafeiybt` y se confirmaron **solo metadatos** de claves publicables válidas (legacy anon y publishable). No hay API autorizada en estos conectores para leer una clave administrativa LAB. Cloudflare Secrets Store existente `cerebro-os-shared-vault` contiene únicamente referencia a otro proveedor, no clave Supabase LAB. El intento de pasar automáticamente una clave publicable entre conectores fue **BLOQUEADO por la capa de seguridad**, no se evadió ni se repitió por canales alternos. **Cloudflare conserva 0 secrets** en este Worker. NO copiar claves al chat, documentos, commits o variables `plain_text`.

### Acción humana segura y puntual

1. Entrar en [Supabase LAB → API Keys](https://supabase.com/dashboard/project/hnqlnvakzaywtafeiybt/settings/api-keys) y obtener la **Publishable** `sb_publishable_...` y la **Legacy service_role** de este mismo proyecto LAB. Jamás usar una clave PROD ni publicar valores.
2. En Cloudflare → Workers & Pages → Worker **`cerebro-operativa-auth-p0a-lab-eu`** → Settings → Variables and Secrets: añadir dos variables tipo **Secret**, nombres exactos `CEREBRO_LAB_PUBLISHABLE_KEY` y `CEREBRO_LAB_SERVICE_ROLE_KEY`, con esos valores. Guardar/desplegar; no mostrar los valores aquí.
3. Mantener `CEREBRO_P0A_ENABLED=false` y sin URLs. Después indicar únicamente que los secretos se han configurado. El agente revalidará nombres, binding, protección y solo entonces podrá plantear una única ejecución API con `intent=LAB_AUTH_E2E_ONE_SHOT`, habilitar temporalmente y **restaurar OFF al concluir**. No reintentar si cleanup no está certificado.

## Ciclo real pendiente

El Worker solo hablará con `https://hnqlnvakzaywtafeiybt.supabase.co`: RPC falso previo; crear usuario temporal oficial (sin correo real); signIn password; verificar usuario mediante endpoint oficial Auth `/auth/v1/user` y JWT claims; RPC true vigente; logout local; RPC false con mismo session_id; borrado de usuario en bloque finally. Logs solo nombres de estados (sin ID/email/token/secret). Si error después de creación, inspeccionar limpieza antes de reintentar.

La validación basada en GET `/auth/v1/user` es el equivalente HTTP de verificación de emisor, **NO** llamada JS `getClaims()`; la aceptación se condiciona a resultados reales de Auth y lector. `P0A_AUTH_LIVE=BLOCKED_KEYS_MISSING`, `PROD=HOLD`.

## Rollback y coste

Rollback: restaurar versión anterior del Worker privado desde despliegue de Cloudflare, desactivar flag; no tocar otros scripts, DNS, Supabase PROD ni WordPress. Solo se ha usado cuenta Workers/Workflows Free sin suscripciones nuevas; el consumo marginal de CPU/peticiones **NO_MEDIDO**.


## Cierre de gate P0-A LAB (recibo físico 16/11/2026)

La acción de introducir claves se completó por el usuario en Cloudflare UI, sin copiar claves a GitHub. La prueba real se realizó y finalizó `PASS_LAB_ISSUER_ONLY`, con `TEMP_USER_CLEANUP=SUCCESS`; SQL posterior count=0; se devolvió flag a false. No se requieren más pruebas destructivas de autenticación para este gate. Ver `RECEIPT_P0A_AUTH_LAB_PASS_2026-11-16.md`. Prohibida promoción global a PROD hasta P0-B y siguientes, y tratar riesgo residual de exposición histórica de la clave legacy de LAB antes de ampliar permisos.
