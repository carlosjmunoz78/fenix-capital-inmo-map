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
- `tests/opera.test.mjs`: 8 pruebas simuladas (identidad cliente independiente, rechazo de origen/credenciales, denegación de clic no conectado, idempotencia, límites de historial y audit-safe). Se ejecutaron **18/18 GREEN** en la prueba de compatibilidad inicial y después **38/38 GREEN** sobre la batería local completa integrada (núcleo, Cloudflare, MCP, D1, Opera); la validación de catálogo mostró **45 capacidades registradas** (23 Cloudflare, 22 Opera). Estas pruebas **no son E2E físicos**.

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

## Requisito P0 del propietario · Operativa equivalente a humano (2026-11-09)

**CONTRATO DE ACEPTACIÓN OBLIGATORIO**. La capacidad completa no queda acreditada por scaffolds, catálogo ni pruebas simuladas. Se considera operativa únicamente tras evidencia física por cada proveedor y **por cada cliente** (ChatGPT normal y CEREBRO), con autenticación de sesión real, trazas saneadas y rollback probado.

**Cloudflare UNIVERSAL — toda la cuenta, no solo Facebook/Instagram.** Debe cubrir descubrimiento y gestión autorizada de todos los productos disponibles en la cuenta: cuenta, dominios, zonas, DNS, Workers, versiones, despliegues y variables, Workers Routes/Domains, D1, KV, R2, Pages, certificados/TLS, WAF, Access/Zero Trust, reglas, CDN/caché, red, logs, analítica, consumo, permisos administrativos y backups. Cubrir lectura, creación, edición, desactivación y eliminación **cuando la política de riesgo, permisos y rollback lo autorice**; publicar/mutar servicios existentes solo tras los gates de conservación. Probar tanto API oficial como navegación UI como respaldo humano cuando sea indispensable. No asumir que un token de LAB concede todos los permisos.

**Opera — navegación y ordenador equivalentes al flujo humano.** Debe poder ver páginas y ventanas, abrir/cambiar/cerrar pestañas, navegar atrás/adelante/recargar, hacer clic/doble clic, mover/scroll, seleccionar, escribir, pegar, rellenar formularios, adjuntar/subir archivos, descargar/guardar, capturar pantallas, consultar estado, elegir perfiles y operar sesiones autenticadas y MFA con intervención humana cuando corresponda. Integrar con **BROWSER-1 ya existente**, sin reemplazarlo, y vincular la instancia real de Opera mediante un perfil y un binding frescos (la instancia «Opera oficina» no se infiere de otras ventanas). Permitir automatización paso a paso y control manual/handover; cada acción importante con confirmación de resultado real, no solo «comando enviado».

**Acceso dual obligatorio.** Los dos proveedores usarán **un único núcleo FACT-001** con dos clientes y autenticaciones independientes (ChatGPT y CEREBRO Gateway), sin compartir sesiones o credenciales de cada cliente ni dar permisos implícitos. Escala multiempresa con `company_id`, `engine_id`, `environment`, `version`.

**Human-by-exception.** Solo solicitar intervención del propietario ante `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST` — incluidas autenticación MFA, CAPTCHA o consentimientos cuando resulten imprescindibles. Al producirse: comunicar la **acción exacta** que necesita, el enlace oficial y por qué; nunca exigir reautorizaciones repetidas para lo ya autorizado. No saltarse MFA/CAPTCHA ni duplicar credenciales en repositorios.

**Coste e integridad:** 0 € adicionales, sin ChatGPT Work, sin nuevos servicios de pago, sin tocar App/CRM/DNS/PROD ni código existente sin inventario, backup, comparación OLD/NEW, reversión y promoción segura. Si se bloquea un ejecutor gratuito, reportar el bloqueo, no aumentar presupuesto en secreto.

**Estado inicial al registrar este contrato:** Cloudflare GET real y creación D1 aislada FB verificados; Worker OFF no desplegado; Opera adaptador LAB y BROWSER-1 existentes en código; **NO existe aún la conexión MCP remota OAuth ni la certificación de control humano completo desde ChatGPT y CEREBRO**. Registrar por cada función `HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR`.
