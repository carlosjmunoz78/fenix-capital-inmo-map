# FACT-001 · Gate de cierre Cloudflare · CEREBRO primero / ChatGPT normal después

**Fecha:** 2026-11-09. **Estado de producción:** NO PROMOCIONADO. PR #44 DRAFT.

## 1. CEREBRO LAB — HECHO, VERIFICADO

- Sidecar independiente `cerebro-fact001-cloudflare-lab` ACTIVE v1, no cambios en la consola original `cerebro-console-gateway-v0` ACTIVE v33.
- Última ejecución de ChatGPT normal → GitHub OIDC firmado → servicio CEREBRO LAB → Supabase Vault → Cloudflare GET: [#42691707204](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42691707204), orden `CFD-20261109-004`, SUCCESS.
- Pruebas 12/12 PASS; anónimo HTTP 401; identidad falsificada HTTP 401; OIDC autenticado HTTP 200; inventario Cloudflare HTTP 200: D1=8 y Workers=7; escrituras Cloudflare 0. No se retransmite el token desde GitHub. Vault conserva exactamente 1 secreto con nombre de LAB.
- Worker privado `cerebro-fact001-gateway-lab-eu-20261109` OFF, sin workers.dev ni previews, sin cron/rutas/secretos, Access app owner-only exacta. No está enlazado al sidecar, ni se declaró que lo estuviera.

## 2. ChatGPT normal Cloudflare — HECHO, VERIFICADO

- Herramientas conectadas de Cloudflare disponibles en esta conversación normal (sin Work). `whoami` autenticado y 3 consultas GET reales mediante `cloudflare.request` a D1, Workers y Access para la cuenta exacta; 8 bases D1, 7 Workers, 3 Access apps, incluyendo Facebook D1 y Worker FACT-001 con su Access app; cero mutaciones.
- Complemento privado personal `cerebro-cloudflare-dual` versión 0.2.0 existe con `cloudflare_api` MCP oficial `https://mcp.cloudflare.com/mcp`, pero esta configuración por sí sola NO prueba su instalación/activación. La conexión Cloudflare directa que sí respondió puede ser una integración distinta; no confundir.
- Puente ChatGPT normal → GitHub → Cloudflare de lectura conserva su alternativa comprobada [#42678166836](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42678166836).

## 3. BLOQUEOS REALES, SIN FALSOS VERDES

- Consola CEREBRO PROD `cerebro-console-gateway-v0` v33 sigue SIN conexión al sidecar; el JWT de pruebas del propietario almacenado en GitHub caducó. No se cambia PROD sin inventario/snapshot, pruebas OLD vs NEW, canary, rollback y un E2E autenticado.
- La identidad OAuth que alimenta las herramientas Cloudflare conectadas devuelve 403 con código 9109 al leer `GET /accounts/{account_id}/tokens` y `GET /user/tokens`; tampoco se ha demostrado permiso para crear tokens. No se puede crear un token dedicado desde ese acceso. No elevar permisos ni solicitar clave por chat.
- LAB usa token administrativo existente cifrado en Vault, pero el código restringe Cloudflare a dos GET. Para autonomía PROD es necesario token dedicado con permisos mínimos, ensayo de rotación y autorización owner.
- R2 devuelve 10042 NotEntitled; Logpush 10000/403; funcionalidad opcional no habilitada hasta requisitos de cuenta y riesgo/coste verificados.
- Escrituras PROD no habilitadas ni probadas: requerirían contratos, política, IAM, audit, evaluación/tribunal, backup/rebuild/rollback y coste. No fusionar PR ni declarar PROD verde.

## 4. Próximo gate concreto (HUMAN_REQUIRED cuando sea imprescindible)

1. Usuario propietario crea o autoriza un token Cloudflare D1/Workers de **solo lectura**, acotado a su cuenta, por la interfaz segura de Cloudflare (la actual conexión no tiene gestión de tokens). No pegarlo en el chat; usar flujo seguro de almacenamiento/rotación en Vault.
2. Validar login real del propietario en la Consola CEREBRO para obtener prueba con sesión vigente (no usar JWT caducado ni suplantación), entonces implantar en paralelo la ruta de consulta, comparar OLD vs NEW y probar rollback antes de cualquier promoción.
3. Mantener ChatGPT directo y CEREBRO LAB operativos para lectura mientras se cierran estas excepciones; costes adicionales contratados 0 €.

**Rollback actual:** el servicio LAB es independiente, la PR #44 sigue DRAFT, el Worker queda OFF; revertir orden GitHub sin tocar App/CRM/DNS/Console PROD. La credencial Vault requiere revocación/rotación controlada, no eliminación impulsiva.
