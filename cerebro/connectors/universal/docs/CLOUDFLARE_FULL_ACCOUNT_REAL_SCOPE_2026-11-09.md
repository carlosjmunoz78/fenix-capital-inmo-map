# FACT-001 · CLOUDLFARE CUENTA COMPLETA · PRUEBA FÍSICA DE PERMISOS

**Fecha:** 2026-11-09 · **Entorno:** LAB · **Estado:** HECHO lectura parcial / PENDIENTE permisos y MCP · **Coste adicional:** 0 €

## Ejecución física

- Account ID fijado: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- GitHub Actions run `42664556101` SUCCESS: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42664556101
- Secreto de Actions: `CEREBRO_CLOUDFLARE_API_TOKEN` (nombre solamente, contenido nunca mostrado).
- 16 consultas GET a Cloudflare API oficial. `CF_UNIVERSAL_MUTATIONS=0`, `CF_UNIVERSAL_ACCOUNT_VERIFIED=true`.
- Test del preflight: 8/8 PASS en el workflow; código GET-only; no contenido privado volcado a logs. Prueba de zonas limitada a **la primera zona devuelta** (no afirma paridad universal de todas las zonas).

## Resultado físico lectura

| Producto/área | Estado exacto |
|---|---|
| Token API, cuenta, D1, Workers | `READ_OK` |
| Workers Domains, Workers Account Settings | `READ_OK` |
| KV, Access / Zero Trust | `READ_OK` |
| Zonas (enumerar) | `READ_OK` |
| SSL Zone Settings, Workers Zone Routes | `READ_OK` |
| R2, Pages, Logpush | `PERMISSION_BLOCKED` |
| DNS, WAF Rulesets (zona del test) | `PERMISSION_BLOCKED` |

`PERMISSION_BLOCKED` significa que el token utilizado no puede leer ese endpoint; NO equivale a que el producto no exista ni a una prueba de ausencia de derechos de edición. Esta sonda no verifica permisos de escritura en ninguna categoría.

## Extensión del catálogo y regresión

- Se incorporan 4 capacidades genéricas a FACT-001: `cloudflare.workers.account-settings`, `cloudflare.workers.deployments`, `cloudflare.zone.ssl`, `cloudflare.zone.worker-routes`.
- El proveedor oficial en `src/cloudflare.mjs` tiene verificación de pertenencia de zona antes de operaciones de zona.
- Regresión completa de los dos proveedores y núcleo: **50/50 PASS**, validación del catálogo **49 capacidades** (27 Cloudflare + 22 Opera), vía run `42665287955`: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42665287955
- Se corrigió un fallo de evaluación anticipada de `zone_id` en consultas Worker sin zona, antes de pasar a VERDE.

## Bloqueadores reales

1. Cloudflare: el usuario deberá **ampliar permisos con granularidad**, por ejemplo cuentas: R2 Storage, Cloudflare Pages, Logpush/Logs; zonas: DNS, WAF Rulesets. Para gestionar todo también se exigirán los permisos de edición específicos, por partes, manteniendo gates de riesgo. No pedir seleccionar todo ni regalar una credencial global permanente. Ningún token puede darse permisos a sí mismo.
2. ChatGPT: la pantalla del plugin privado `CEREBRO · Cloudflare Universal` muestra el botón **`Instalar complemento`** en la sesión Opera observada en 2026-11-09. **NO acreditar instalación**, y aun instalado sigue siendo skill/instrucciones y **NO MCP LIVE**.
3. No hay endpoint MCP HTTPS OAuth autenticado y desplegado; tampoco integración física de CEREBRO Gateway ni control completo de Opera a través del mismo núcleo.
4. Facebook D1 UE existente, trabajador Facebook OFF todavía no desplegado por bloqueo de GitHub Actions en repo privado. Mantener ramas DRAFT, coste 0, no exponer código privado.

## Acciones HUMAN_REQUIRED y conservación

Solicitar al propietario únicamente operaciones imposibles sin interfaz autenticada, como instalar el plugin o ampliar roles de token. El asistente conserva el trabajo de LAB y las PR #44/#9 sin fusionar ni editar App, CRM, DNS, PROD, Instagram o el Browser-1 existente. No copiar contraseñas ni tokens en el chat. Ningún servicio de pago contratado.
