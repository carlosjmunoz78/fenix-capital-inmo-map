# FACT-001 · Cloudflare · Corte diferencial de legado y cola Gateway · 11/11/2026

**Estado:** HECHO en emisor v2 y encola firmada LAB; **PARCIAL conector Cloudflare FULL**, no promover autonomías sin pruebas. Evidencia de lecturas actuales, no reproducir hallazgos históricos como acciones realizadas hoy.

## 1. Emisor antiguo — evidencia actual
- API Cloudflare GET de token exacto `cerebro_cf_account_token_issuer_v1` ID `45c74c2de351bf8c1deeb1bee3f8f7ef` devolvió **status=disabled** y **solo dos permisos** `Account API Tokens Write` / `Account API Tokens Read`.
- Last used: `2026-11-11T08:49:44Z`. Last modified: `2026-11-11T10:03:24Z`.
- La reducción y desactivación **ya estaban efectuadas al primer GET de este bloque**. No atribuir a este bloque una modificación del token; se conservó, no borró, no reactivó.
- El emisor v2 sigue `active`, con únicamente `Account API Tokens Write`, almacenado en Vault. Ya probó emisión de hijo D1 Read, denegación de acceso administrativo, revocación y 401. No repetir la prueba ni crear nuevo token.
- Snapshot v1 previo en `registry/cloudflare-v1-legacy-scope-snapshot-20261111.json`. Vault de v1 se conserva como contingencia cifrada pendiente de decidir eliminación con inventario global de consumidores. Contrato actual de v10 no lee v1.

## 2. Cola duradera CEREBRO — prueba física actual
- Supabase Edge `cerebro-fact001-console-owner-canary-lab` ACTIVE **v6** con dos contextos AUTH independientes (JWT de usuario real + RPC `CARLOS-ADMIN` o GitHub OIDC firmado), ambos aislados del Gateway principal.
- El código desplegado usa D1 de recuperación existente, no crea base ni Worker: UUID `1305f791-7c44-47f9-946b-f330a09c88aa`.
- D1 API real GET SQL parametrizado de fixture: `FACT001-CF-GW-SIGNED-20261111-001` **COMPLETED, attempts=1**. Configuración Recovery `enabled=1`, `max_jobs_per_tick=1`. No trabajos comerciales ni llamadas a proveedores.
- Worker `cerebro-fact001-recovery-runner-lab`: cron real `*/5 * * * *` y binding único `RECOVERY_DB` a la misma D1, confirmado mediante API Cloudflare.
- `cerebro-console-gateway-v0` ACTIVE **v33**, hash `a32fc26e4b328d0477bc53f0ae9085c0d5d280703779db5ac8593fd9b718553a`. No se modificó durante este bloque. Canary v6 no es un reemplazo de Gateway v33.

## 3. Lo que impide declarar FULL y pasar a otra fase como terminada
- **Owner session test pendiente**: un GET /owner-health y POST /owner-queue-submit desde JWT real de sesión vigente, con rol `CARLOS-ADMIN`, verificación de conflicto y D1 readback; no sustituir con firma GitHub ni con servicio administrativo.
- **Console original → canary**: no acreditado el enlace real (v33 sigue con rutas antiguas). Sin prueba OLD/NEW, preflight de backup y rollback físico, no integrar en App/CRM principal ni hacer promoción.
- **FULL universal**: el token v2 es gestor de tokens, no autoriza Workers/D1 mutaciones. Rutas de token hijo se retiraron (404) después del E2E. No existe credencial/contrato común FULL con todas las APIs Cloudflare, ni operaciones de restauración real para cada familia. El cron actual solo procesa `fact001.lab.heartbeat`.
- **Backups + rollback físico**: código y snapshots conservados, pero no hay prueba de reversión del canary y de Gateway físico end-to-end. La desactivación v1 es una defensa efectiva, no una garantía de que toda dependencia externa quedó migrada.

## Protección y coste
`PROD=UNCHANGED`, `APP_CRM_DNS_MAIN=UNCHANGED`, Cloudflare Free D1 10/10 preexistentes, coste adicional contratado 0 €, no secret values en resultados, Opera no iniciado.

## Próximo gate concreto
`CF-OWNER-REAL-JWT-E2E-AND-CONSOLE-GATEWAY-DUAL-ROUTE_LAB`. Se requiere exclusivamente una sesión actual de propietario en App/CEREBRO para verificar el origen `owner`, sin exponer JWT por chat. Hasta entonces mantener la canary, v2 y cron LAB, no abrir escritura a proveedor ni afirmar FULL.
