# CEREBRO OS · FACT-001 · Cloudflare + Opera · Conectores Universales Dobles V0.2

**Fecha:** 2026-11-09 · **Entorno:** LAB · **Estado:** PARCIAL · **Coste adicional:** 0 € · **PR:** #44 (DRAFT)

## Objetivo contractual

Cloudflare y Opera se deben poder usar **desde ChatGPT normal y desde CEREBRO**, mediante un **núcleo de conectores compartido** y dos adaptadores de identidad independientes:

- `ChatGPT → MCP HTTPS + OAuth (por conectar) → UniversalConnectorCore → proveedor Cloudflare / Opera`.
- `CEREBRO Console → CEREBRO Gateway / IAM-001 (por conectar físicamente) → el mismo UniversalConnectorCore → proveedor Cloudflare / Opera`.

La interfaz solo elige origen; el actor, permisos, empresa, entorno y perfil de navegador se obtienen de un proveedor de autenticación **fiable**, no de parámetros que redacta una IA. Cada operación incluye `company_id`, `engine_id`, `environment`, `version`; auditar sin contraseñas, cookies, páginas ni capturas. Una credencial de Cloudflare no se comparte con ChatGPT. El manejo de credenciales de Opera requiere broker cifrado y consentimiento de inicio de sesión cuando proceda; no descifrar ni copiar secretos de sesiones.

## Cloudflare: alcance completo, promoción incremental

**Alcance funcional deseado:** inventario, Workers, D1, KV, R2, Pages, dominios, DNS, WAF, Access, certificados, logs, analítica, copias, rollback, despliegues, recursos y facturación de lectura. Cada acción de escritura deberá tener módulo explícito, cuota Free verificada, permisos mínimos, preflight, backup, idempotencia durable y rollback.

**HECHO físico:** Cloudflare API token GET verificado; cuenta correcta; Workers Free activo visto en panel; D1 Facebook UE `cerebro-facebook-autoqual-lab` creada mediante GitHub Actions con UUID `e8fe801d-4b01-4e34-ac12-26014b79adc1`; binding registrado en rama Facebook.

**BLOQUEADO:** Worker FB OFF no desplegado. GitHub Actions del repositorio privado rechaza el job antes de ejecutarlo por facturación/límite de gasto. No aumentar presupuestos ni pasar código privado a un repositorio público. MCP OAuth y CEREBRO Gateway aún sin E2E.

## Opera: dos capas existentes, conservar ambas

1. **Opera Browser Connector de ChatGPT, verificado por inventario de herramientas en esta sesión:** `list_tabs`, `history`, `tab_content`, `tab_content_jq_search_query`, `screenshot`, `go_to_page`, `close_tab`. La sesión no expone `click`, `fill`, `press`, `upload`, `back`, `forward` o `switch_tab` mediante este conector. No confundir capacidad del código con capacidad de este enlace instalado.
2. **BROWSER-1 del repositorio CEREBRO, EXISTENTE EN CÓDIGO:** `cerebro/runtime/browser1-access-v1.mjs` y `cerebro/gateway/browser1-action-gateway-binding-v1.mjs`. Tiene contratos y comandos de clic, escribir, rellenar, selección, subida, descargas, pestañas, scroll, volver, recargar, observación, perfiles/leases, y políticas propias. **No reconstruir ni asumir ejecución física en Opera hasta demostrar la vinculación a una instancia real.**

**Separación crítica de instancias:** `cerebro/registry/opera-office-binding.v1.json` distingue `Opera oficina` de otra instancia con pestañas STAGING. Nunca elegir por su apariencia o pestañas. La vinculación de cada operación debe recibir `browser_id` y ámbito de identidad desde el controlador registrado con evidencia fresca; si falta, `LOW_CONFIDENCE`/denegación.

## V0.2 añadido sin tocar Browser-1

- `src/opera-catalog.mjs`: 22 capacidades Opera declaradas. Seis rutas de la herramienta Opera actual tienen implementación adaptadora en LAB: listar/leer/historial/captura/navegar/cerrar. Las demás permanecen `PARTIAL_NOT_ENABLED` o `PLANNED_NOT_ENABLED` hasta su puente real con BROWSER-1.
- `src/opera.mjs`: proveedor tipado que necesita `toolkit` conectado y `resolveBrowserBinding` de confianza. Niega `browser_id` en argumentos del modelo, secretos, origen no autorizado, tab IDs inválidos y lecturas de historial excesivas. No abre ningún navegador por sí solo.
- `src/core.mjs`: despacha por prefijo a `cloudflare` u `opera` usando el **mismo core** de IAM, contexto, controles de coste, auditoría e idempotencia. Mantiene el constructor Cloudflare anterior compatible.
- `src/clients.mjs`: lista capacidades de cualquier proveedor sin describirlas todas como Cloudflare.
- `tests/opera.test.mjs`: 8 pruebas simuladas (identidad cliente independiente, rechazo de origen/credenciales, denegación de clic no conectado, idempotencia, límites de historial y audit-safe). En este paquete parcial de pruebas se ejecutaron **18/18 GREEN** y la validación de catálogo mostró **45 capacidades registradas** (23 Cloudflare, 22 Opera). Estas pruebas **no son E2E físicos**.

## Próximos gates de aceptación

1. Verificar y registrar el perfil exacto de Opera de cada usuario y empresa, sin alterar su binding histórico.
2. Integrar el proveedor Opera LAB con `BROWSER-1.observe` y `.act` y la sesión autorizada del Browser Bridge, reutilizando runtime y ejecutores existentes; OLD vs NEW, anti-loop, tests y rollback físico.
3. Acreditar en ChatGPT normal `tools/list` y `tools/call` sobre el MCP remoto OAuth y en CEREBRO Gateway una acción de lectura sobre **la misma** capacidad, con identidades y credenciales separadas.
4. Expandir acciones de escritura de Opera (clic, escritura, formularios, archivos, pestañas) con permisos por origen, coste 0 y aprobación humana solo para ocho excepciones canónicas.
5. Completar bloqueo del Worker FB mediante ejecutor gratuito de confianza con acceso al repositorio **privado**. Nunca contratar ni desbloquear un gasto no aprobado.
6. Promover por gates: manifiesto, contratos, permisos, backup, tests, evaluación, tribunal, observabilidad, coste medido, PREPROD cuando corresponda, rollback, rebuild, comparación OLD/NEW y promoción gradual. Para App/CRM aplicar las restricciones de no modificación de producción.

**La expresión «poder hacer de todo» significa cubrir todas las operaciones del proveedor que sean técnicamente posibles y estén autorizadas para el actor; no significa autoridad global sin límites, saltarse MFA/CAPTCHA, leer secretos ajenos, cambios destructivos sin gate ni gasto nuevo.**

## Reversión

Revertir solamente los nuevos ficheros y modificaciones aisladas de `cerebro/connectors/universal/` dentro de PR #44. `BROWSER-1`, `ACTGW-001`, Opera oficina, App, CRM, DNS, Instagram y `main` permanecen sin cambios. No fusionar PR antes de pruebas físicas.