# FACT-001 · Cierre de puerta CEREBRO Console → Cloudflare

Fecha: 2026-11-09 · Cuenta Cloudflare e39a57e1ac42650ca5a6d5307cf0ac8e · company_id=fenix-capital · engine_id=FACT-001 · environment=LAB · version=1.0.0.

## OLD (protegido)
- `cerebro-console-gateway-v0` en Supabase sigue ACTIVE v33. Autenticación `withSupabase({auth:'user'})`, server-side `authorizedOwner` con `auth.getUser` y RPC `fenix_prod_actor_context_by_auth_server`, solo actor `CARLOS-ADMIN`.
- Rutas antiguas `chat`, `health`, `contract`, `engines`, `preferences`; ninguna tiene FACT-001 Cloudflare. No se actualizó ni sustituyó.
- App/CRM/SEO/otras funciones/Workers anteriores y DNS intactos.

## NEW · canary independiente
- `cerebro-fact001-console-owner-canary-lab` Supabase ACTIVE v2, fuente en `cerebro/connectors/universal/supabase/fact001-console-owner-canary-lab/`.
- Rutas para usuario: `GET owner-health`, `POST owner-inventory`; verifican el JWT real Supabase y la misma RPC del propietario que Console v33, requieren company_id/engine_id/environment/version; solo lectura Cloudflare D1/Workers, sin API arbitraria ni escrituras.
- Rutas CI separadas `GET health`, `POST inventory` exclusivamente OIDC GitHub con audiencia/repositorio/rama/workflow específicos y firma verificada; nunca equivalen a ser CARLOS-ADMIN.
- Usan secreto existente Vault sin transmitirlo desde GitHub; CORS de App Fénix, otros orígenes 403.

## Evidencias físicas
- Primera integración real de nueva consola paralela a Cloudflare [E2E #42703668544](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42703668544) SUCCESS; OIDC firmado, GET Cloudflare D1=8 Workers=7, cero mutaciones.
- Endurecimiento de owner-only [#42704018268](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42704018268) validó el rechazo de anónimo, token falso y OIDC GitHub presentado como propietario; CORS permite solo origen App; posterior GET Cloudflare dio HTTP 429 y run FAILURE.
- Diagnóstico [#42704193424](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42704193424) demostró código `CLOUDFLARE_READ_HTTP_429` en la consulta. No indica credenciales inválidas. Cloudflare comparte límites API por usuario; documentación https://developers.cloudflare.com/fundamentals/api/reference/limits/.
- Canario actualizado aislado a versión 2 para emitir HTTP 429 explícito (no responder como éxito, no auto-reintentos), separar el workflow de pruebas de unidad de consultas físicas y reducir solicitudes.
- [Unidad #42704728200](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42704728200) SUCCESS, **14/14 pruebas**, actor owner policy presente, provision API retirada y fail closed 429. No se volvió a hacer consulta de Cloudflare después de un 429 hasta que hubiera cuota disponible.

## Gate de promoción: NO VERDE todavía
1. Hace falta prueba REAL positiva de propietario desde sesión Supabase vigente para `owner-health` / `owner-inventory`. Anterior JWT E2E del propietario caducó. No usar/service_role como sustituto del propietario.
2. Hace falta token dedicado solo lectura y por recursos para CEREBRO. La conexión OAuth en ChatGPT da HTTP 403/9109 para gestionar tokens, por eso el token amplio actual permanece únicamente en Vault LAB bajo reglas estrictas.
3. No se puede enlazar a `cerebro-console-gateway-v0` v33 sin canary de sesión, snapshot, comparación OLD vs NEW, validación de rutas actuales y rollback probado. El canary es una nueva función independiente, no un reemplazo invisible.
4. Administración completa de recursos PROD requiere contratos específicos, inventario, backups/snapshots, rollback, evaluación, coste y autorización solo ante HUMAN_REQUIRED real.

## Contrato de enlace definido (todavía OFF)
- Origen App `https://app.fenixcapital.es`, session JWT actual; servicio `https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-console-owner-canary-lab/owner-inventory`.
- Body JSON exactamente `{"company_id":"fenix-capital","engine_id":"FACT-001","environment":"LAB","version":"1.0.0"}`, sin path Cloudflare, SQL, API token ni resource ID elegido por usuario.
- Flag `FACT001_CONSOLE_CF_OWNER_ENABLED=false` hasta gate E2E owner y token mínimo; si se activa mediante implementación gradual, el fallo no debe reemplazar rutas originales. Rollback: desactivar flag y usar v33 intacta.
- No modificar App ni Gateway principal mientras no existan evidencias. CEREBRO LAB OIDC/Vault y ChatGPT directo continúan funcionando para KV/D1 con operaciones LAB previamente probadas.

## Coste y recuperación
- Recursos nuevos dentro de planes Free existentes; suscripciones nuevas 0 EUR; ningún Worker público habilitado.
- Supabase función v2 es canary; rollback de esa función usando el source inmutable de la PR en commit `1da5458ffbfb70a7f43bc0096729adec4f83b193` (v1) con `import_map_path='deno.json'`; no borrar ni sobrescribir v33.
- Usar workflow físico solo con orden nueva/control manual y cuota API recuperada. No crear monitorización repetitiva que sature Cloudflare.
