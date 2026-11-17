# FACT-001 P0 · Cloudflare · Cierre comprobable y gate real pendiente (11 Nov 2026)

## Aceptación acotada, sin falsas garantías
**P0 CF-TOKEN-ISSUER-001 VERDE EN LAB**. Prueba física del emisor mínimo v2, su uso independiente desde CEREBRO OIDC y Vault, token hijo limitado a D1 Read, prueba negativa de administración, revocación HTTP 401/403, limpieza. **El conector Cloudflare universal FULL sigue PARCIAL**, ya que incluye canales de escritura a los productos, Gateway Console propietario y promoción/rollback de producción. No confundir las dos etiquetas.

- Cloudflare Account `e39a57e1ac42650ca5a6d5307cf0ac8e`, emisor v2 **active**, exactamente `Account API Tokens Write`; v1 **disabled** desde antes de este turno y scope reducido. Los secretos viven en Vault; ninguno enviado a chat ni GitHub.
- Sidecar emisor `cerebro-fact001-cf-issuer-lab` v10 sigue ACTIVE **sólo lectura con OIDC firmado**; rutas anteriores de emisión/revocación 404 confirmadas.
- Canary `cerebro-fact001-console-owner-canary-lab` v6 ACTIVE en paralelo. Identidades separadas: GitHub OIDC con actor/flujo fijo para el LAB; JWT de usuario real contra Supabase Auth y RPC actor `CARLOS-ADMIN` para propietario.
- Revalidación con GitHub firmado [Run #43005213602](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43005213602): anónimo/falsificación denegados, bloqueo de PROD/tenant extraño, firma OIDC aceptada, cola D1 fija, segundo submit idempotente. **Readback real** de `FACT001-CF-GW-SIGNED-20261111-001`: `COMPLETED` con **attempts=1** después del replay.
- Worker privado `cerebro-fact001-recovery-runner-lab` mantiene `workers_dev=false`, `previews_enabled=false`, cron `*/5 * * * *`, binding `RECOVERY_DB` a D1 ya existente `1305f791-7c44-47f9-946b-f330a09c88aa`. 10/10 D1 de cuenta preexistentes; ningún recurso nuevo ni suscripción contratada en este bloque.
- La regresión [Run #43005472015](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43005472015) **230 tests PASS / 0 fallos**: 164 headless, 31 issuer, 18 canary, 5 registry, 8 onboarding, 4 scaffold. Se restauró el contrato del Registry a `autonomous_queue=PENDING` (solo heartbeat probado), sin debilitar tests. La CI ahora se ejecuta al modificar el registro.
- Gateway original `cerebro-console-gateway-v0` ACTIVE v33, sha256 `a32fc26e4b328d0477bc53f0ae9085c0d5d280703779db5ac8593fd9b718553a`, no modificado. Worker LAB relacionado con UMS001 tiene secretos y service bindings; se detectó y se **descartó usarlo como entorno de rollback** para evitar romper dependencias.

## Gate aún humano y técnico
**OWNER SESSION: HUMAN_REQUIRED (session context / browser origin).** `mcp__Browser__list_tabs` devolvió que no existe contexto navegador de origen en esta conversación. Sin acceso a una sesión Supabase de propietario vigente no se puede acreditar `GET owner-health` ni `POST owner-queue-submit`; GitHub OIDC es deliberadamente rechazado por estas rutas. No inventar JWT, usar service_role como usuario, buscar tokens en logs ni escribir secretos en chat. Para completar el E2E real usar ChatGPT Work con navegador autenticado o abrir esta conversación desde el navegador con la extensión conectada. No alterar el Gateway v33 ni la App para simular el resultado.

### Secuencia de aceptación al disponer de sesión válida
1. Comprobar sesión real `CARLOS-ADMIN` con `GET /owner-health` (esperado 200), anónimo y GitHub OIDC denegados (401).
2. Enviar orden 4D fija `fact001.lab.heartbeat`, coste máximo cero, con request_id `FACT001-CF-GW-SESSION-20261111-001`, al canary `POST /owner-queue-submit` usando token de sesión en entorno seguro, nunca en logs.
3. GET `/owner-queue-status`, D1 readback, cron `COMPLETED` attempts=1 y replay no duplicado; examinar cuota y auditoría.
4. Comparar OLD/NEW del Gateway principal y sus permisos, snapshot, restauración física del canary en LAB y aprobación de promoción gradual. No tocar App/CRM/PROD hasta cumplir los gates.
5. Ampliación universal de Workers/Pages etc requiere contratos por recurso, tokens de menor privilegio, prueba de update/rebuild/rollback sobre recurso propio aislado y tribunal. **No inferir que el permiso v2 de gestionar tokens autoriza mutaciones generales.**

## Decisión de estado
`P0_CLOUDFLARE_TOKEN_ISSUER=VERIFIED_LAB`. `CLOUDFLARE_UNIVERSAL_FULL=PARTIAL`. `GATEWAY_OWNER_E2E=PENDING_HUMAN_SESSION`. `TRADING_ISOLATED=TRUE`; `MAIN_APP_CRM_DNS_UNCHANGED=TRUE`; `ADDITIONAL_SUBSCRIPTIONS_EUR=0`; PR #44 permanece DRAFT; Opera P6 no iniciado.
