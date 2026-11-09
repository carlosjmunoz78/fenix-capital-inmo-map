# FACT-001 · Cierre de gates humanos de CEREBRO y Cloudflare

2026-11-09 · Estado DEFINIDO, protegido, NO promovido. Coste adicional contratado 0 €.

## Evidencia previa
- Main `cerebro-console-gateway-v0` ACTIVE v33. Repo `supabase/functions/cerebro-console-gateway-v0/index.ts` identical to physical deployed source; blob SHA `44241c6abc3cb89560500336e332f0628219d0fc`.
- New owner canary LAB `cerebro-fact001-console-owner-canary-lab` ACTIVE v2. JWT of a signed-in Supabase owner must be checked using `auth.getUser` and server RPC actor `CARLOS-ADMIN`. Negative identity/CORS gates pass; signed GitHub OIDC client GET successful once.
- Golden shadow integration patch: `cerebro/connectors/universal/console/owner-console-v33-shadow-patch.mjs`, hard-disabled route `GET cloudflare-inventory` for eventual owner path. Golden regression/byte-for-byte rollback SUCCESS [#42707365667](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42707365667); 10/10 unit tests. No deployed Console changes.
- Owner browser observed `https://app.fenixcapital.es/cerebro` login screen `Acceso seguro / Entrar`; no authenticated Supabase session currently available to test. The earlier GitHub user E2E JWT expired.
- Cloudflare connected OAuth allows direct GET and selected LAB writes, but API token-management GET returned 403 code 9109. Dashboard shows Create Token and a preexisting broad active CEREBRO token with 59 permissions. No narrowly scoped new token is established.

## HUMAN_REQUIRED #1 · Owner login
Open existing Opera tab `https://app.fenixcapital.es/cerebro` and click **Entrar**. Sign in normally and keep the page open. NEVER send a password, session token, screenshot of a secret or API token through chat. After a session is available, invoke owner canary `owner-health` and fixed `owner-inventory` from the authenticated App context; require actor `CARLOS-ADMIN`, 200 and read-only returned counts. If 429, respect Cloudflare rate limit without retry storm.

## HUMAN_REQUIRED #2 · Minimal-scope Cloudflare token
Use owner dashboard `https://dash.cloudflare.com/profile/api-tokens` or account-owned token management as permitted by role. Name suggestion: `CEREBRO-FACT001-READONLY-V1`. Scope ONLY account `e39a57e1ac42650ca5a6d5307cf0ac8e`. Require **read-only** for account resources, D1, Workers Scripts, Workers KV Storage, Access Apps as needed by actual API calls. Do not grant Account Settings Edit, API Tokens Edit, DNS Edit, Workers Scripts Write or D1 Write in this READ profile. Exclude optional R2 and Logpush unless entitlement and permission are separately verified. Cloudflare permission exact labels may vary, validate in dashboard and official docs before finalizing.
Store the one-time token via an authenticated secure secret-entry path to Supabase Vault under a **new** name `cerebro_fact001_cf_readonly_v1`, not in chat, GitHub source, workflow logs, or plaintext frontend. Do not replace or delete the existing LAB Vault credential before positive signed read-only E2E and rollback. Rotation and budget alerts are a separate controlled workflow.

## After both gates are green (no implicit promotion)
1. Owner canary live GET 200 with new narrow token in separate vault record; verify token active and D1/Workers GET, no writes.
2. Compare existing 5 Console routes OLD vs NEW; import disabled flag patch into isolated parallel canary and physically verify old behavior, owner link, foreign tenant 403, anonymous 401, quota 429, observability.
3. Test rollback to old source SHA; activate feature flag only on approved promotion. Keep App/CRM/DNS/Trading and preexisting Cloudflare resources unchanged.
4. Expand specific Cloudflare CRUD for preexisting production resources only with per-operation policy, snapshots, permissions, cost check, evaluation tribunal and compensating rollback.

## Recovery
Current safe state: Console v33 unchanged and 4D Cloudflare LAB standalone services independent; owner route OFF, PR #44 DRAFT. No secret value included in this file.

## Actualización posterior: propietario activo en App y cambio de token preparado

- En la pestaña Opera `https://app.fenixcapital.es/cerebro` ahora es visible **JARVIS Work**. En la fuente de App `src/CerebroConsoleHost.tsx`, esta vista solo se representa tras `supabase.auth.getSession()` y una respuesta válida `GET /session/context` con `actor_code === 'CARLOS-ADMIN'`. Por tanto, la App aparenta contar con sesión de propietario **válida**; ya no corresponde pedir iniciar sesión de nuevo.
- Consulta SQL agregada y sin identificadores: 1 actor activo `CARLOS-ADMIN`, 5 registros de sesión de propietario creados en últimas 24h, 1 actualizado en últimas 2h. La consulta no accedió a tokens ni contraseñas.
- **Límite:** esto no sustituye el E2E positivo de `owner-health` / `owner-inventory` contra el servicio paralelo ni acredita que el token de navegador esté disponible para este asistente. No se ha copiado el JWT.
- Token restringido `cerebro_fact001_cf_readonly_v1` todavía NO existe: `vault.secrets` count 0. La pantalla Cloudflare ofrece `Crear token`, pero el conector de API carece de permisos de gestión de credenciales (403). Por ello sigue siendo una acción HUMAN_REQUIRED que debe realizar el propietario en la interfaz autenticada.
- Se ha preparado un cambio **exactamente reversible** para que el canario LAB v2 sustituya su única referencia a Vault por el nuevo secreto, sin fallback al token amplio: `cerebro/connectors/universal/console/owner-canary-v2-scoped-token-switch.mjs`. [Prueba #42709522476](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42709522476) SUCCESS, 10/10 y rollback byte-identico. **No desplegado:** el servicio actual y el secreto antiguo siguen intactos.
- Próximo gate tras creación del token: comprobar permisos exactos del token nuevo y almacenamiento cifrado, aplicar el cambio SOLO al canario, validar owner JWT real / 401 anónimo / 403 actor ajeno / HTTP 429, verificar Cloudflare GET con token restringido, old vs new, rollback, entonces evaluar promoción de consola. No activar escrituras genéricas PROD.
