# FACT-001 · MCP dual independent: Vercel, Notion y Cloudflare · auditoría puntual 10/11/2026
Estado: **VERIFICADO PARCIAL / BLOQUEO DE AUTORIZACIÓN IDENTIFICADO / SIN CAMBIOS PROD**.

## Principio del cliente
Dos vías independientes: **ChatGPT (conexión OAuth oficial)** y **CEREBRO Gateway (service identity propia, no sesión de ChatGPT)**. Que un plugin se llame CEREBRO no prueba que el Gateway autónomo tenga identidad propia. Criterios: permisos efectivos, E2E con identidad de cada cliente, menor privilegio por acción, Vault, idempotencia, rollback, coste adicional 0 €.

## Cloudflare
- La fábrica de token hija en LAB YA probó emisión account-token D1 Read, custodia Vault, consulta efectiva D1, cron Worker privado y D1 Recovery en ejecución física.
- Token `cerebro_cf_account_token_issuer_v1` **ACTIVE** con permisos `Account API Tokens Write/Read`, `Integration Write`, `Account API Gateway/Read`, **Billing Write/Read**. Usuario acepta por ahora conservar el emisor amplio para continuidad; **riesgo residual alto** por exposición si la credencial fuese comprometida; los guards de aplicación no sustituyen revocación del permiso en Cloudflare.
- Prohibido utilizar endpoints billing, planes, dominios PROD, workers existentes sin gates. Registrar rotación gradual V2 de privilegios mínimos como hardening futuro, sin revocar credencial activa hasta validar sucesor.

## Vercel: discrepancia resuelta como problema de autorización MCP
- Captura de la cuenta en Opera de oficina demuestra **dos proyectos**: `fenix-capital-preprod` (muestra dominio `app.fenixcapital.es`) y `fenix-capital-preprod-app`. No modificar este enlace a dominio de la APP real.
- Opera Browser Connector recuperó pestañas y contenido de la sesión autenticada de `https://vercel.com/carlosjmunozcabeza-2582s-projects`. Primera instalación Opera **OPERATIONAL READ**. Segunda instalación falló TIMEOUT; Opera queda excluido de FACT-001 operativo hasta su propia fase.
- Vercel MCP oficial conectado: usuario `carlosjmunozcabeza-2582`, plan `hobby`, team `team_qnh6u1Ofy2WPp0MGEKlyMA50` y slug `carlosjmunozcabeza-2582s-projects`, pero `list_projects` devuelve cero; `get_project(fenix-capital-preprod)` devuelve 404.
- Vercel MCP con marca CEREBRO: el mismo scope devuelve **403 forbidden**, con remediation explícita `authorize_team_access(teamId)`. Se invocó `mcp__Vercel__authorize_team_access` y entregó enlace de consentimiento de un solo uso válido 10 minutos. **PENDIENTE aprobación del usuario**; no se debe afirmar que el acceso fue aprobado. Tras aprobación probar por **AMBAS** conexiones: `list_projects`, `get_project`, roles y team, y confirmar sus 2 projectIds; prohibido deploy/borrar/cambiar dominios sin QA/snapshot y reversión.

## Notion: integración ya existente, no duplicar
- Opera autenticado en `app.notion.com/developers/connections`, lista de integraciones:
  1. `Fénix Notion Bridge` (2026-08-14) — `Leer, actualizar e insertar contenido, leer e insertar comentarios y leer información de usuarios`.
  2. `Fenix GitHub Migration` (2026-08-30) — `Leer, actualizar e insertar contenido y leer información de usuarios`.
  3. `Fenix Capital - Make Redes` (2026-06-17) — `Leer, actualizar e insertar contenido, leer e insertar comentarios y leer información de usuarios`.
- NO crear `CEREBRO-OS-NOTION-SERVICE` hasta descartar reutilizar `Fénix Notion Bridge`, evitar duplicaciones o más costes. El Notion MCP conectado de ChatGPT reporta **78 operaciones disponibles** (disponibilidad del conector no acredita suscripciones ni acceso a cada recurso); cuenta Notion identificada y herramientas de páginas, BD, comentarios, vistas, búsqueda, calendario, backups/versiones y adjuntos inventariadas.
- La consulta **exclusivamente metadata de secretos** en ambos proyectos Supabase conectados no encontró entradas con `notion` ni `fenix_bridge` en `vault.secrets`. No se leyó ninguna clave ni se afirma que no esté en otro almacén (GitHub secrets, Edge env, local).
- El conector Opera expone lectura de árbol de accesibilidad y navegación, **no un click/type de entrada de credenciales**, por lo que no se puede trasladar el token interno del Bridge a Vault de forma segura usando solo estas herramientas en chat. Explorar fuentes secretas preexistentes y bootstrap seguro; **acción manual limitada** (mostrar token en su UI y pegarlo directamente en Vault) solo si no existe otra fuente verificada.
- Reglas de permisos por página: una integración de Notion puede tener permisos de contenido amplios, pero necesita que sus páginas/bases estén compartidas con ella. No equivale a administración irrestricta de organización.
- Plan Notion concreto **NO VERIFICADO** por MCP ni interfaz. Basar presupuesto en evidencia, no inferir Business/Enterprise. Plataforma Dev 2026: modo desarrollador/CLI, API y webhooks como alternativas sin IA de pago; Notion Workers beta disponibles Business/Enterprise y pueden consumir créditos cuando cambie precio; Custom Agents usan créditos de Notion y no deben activarse sin autorización/coste verificado. Fuentes oficiales:
  - https://www.notion.com/es-es/help/what-is-the-notion-developer-platform
  - https://www.notion.com/es-es/help/create-integrations-with-the-notion-api
  - https://www.notion.com/es-es/help/add-and-manage-connections-with-the-api
  - https://www.notion.com/es-es/help/understand-pricing-for-workers
  - https://www.notion.com/pricing

## No declarar VERDE UNIVERSAL
- ChatGPT MCP oficial: varias capacidades probadas; Notion y Vercel con gates de permisos específicos. CEREBRO Gateway: aún requiere service identity + broker para ejecutar por sí mismo. User consent y derechos legales no se reemplazan con tokens amplios.
- PR #44 sigue DRAFT, main, APP, CRM, D1/Workers ajenos, DNS, WordPress, Notion páginas, planes y facturación no modificados por esta auditoría.

## Vercel acceptance update · 10/11/2026 · consentimiento CEREBRO confirmado
- Después de aprobar el enlace exclusivo de **CEREBRO · Vercel Universal**, el propio conector pasó de `HTTP 403` a `GET /v10/projects HTTP 200` y devuelve **2 proyectos**: `fenix-capital-preprod` (`prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`) y `fenix-capital-preprod-app` (`prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc`). `get_project` para ambos respondió con nombre e ID correctos.
- El mismo conector puede consultar `list_deployments` del equipo, con registros reales READY y referencias de GitHub; operación lectura únicamente. **PERMISO DE LECTURA DEL CONECTOR CEREBRO: VERIFICADO**.
- El MCP oficial **ChatGPT → Vercel** sigue devolviendo 0 proyectos por defecto, con teamId explícito y slug, y `get_project` responde 404 incluso usando el ID verdadero. Ambas conexiones identifican el mismo usuario y equipo, pero esto demuestra **diferencia en el consentimiento/grant OAuth**, no ausencia de proyectos. **No etiquetar ChatGPT como OK hasta verificar listado de 2 proyectos**.
- Ninguna de las anteriores pruebas demuestra que el **CEREBRO Gateway fuera de ChatGPT** tenga una identidad de servicio ni permiso autónomo; el plugin `CEREBRO · Vercel Universal` se invocó desde ChatGPT.
- **No se hicieron despliegues, configuraciones de dominios, borrados ni escrituras en Vercel**; no tocar `app.fenixcapital.es`. Pendientes: grant del conector oficial ChatGPT, acceso service identity CEREBRO al Gateway, pruebas de escritura/rollback en proyecto exclusivamente LAB (nuevo solo si cabe coste 0 €) y backups.
