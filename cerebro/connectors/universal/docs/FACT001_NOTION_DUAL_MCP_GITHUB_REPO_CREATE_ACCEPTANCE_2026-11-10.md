# FACT-001 · NOTION dual MCP + GitHub repository creation · 2026-11-10

Estado: **Notion LAB create / cross-read / update VERDE; GitHub repository creation BLOQUEADO POR PERMISO, no repositorio creado**. No tocar main ni PROD.

## Notion (PHYSICAL LAB E2E)
- Cuenta ya tiene integraciones "Fénix Notion Bridge", "Fenix GitHub Migration", "Fenix Capital - Make Redes" (inventario desde Opera). Ninguna se ha creado ni eliminado.
- La herramienta `mcp__CEREBRO___Notion_Universal__notion_create_pages` creó una única página privada (draft): `FACT-001 · Notion dual MCP · LAB 2026-11-10`. ID `41481b1a-756d-8196-a8ca-c6fb51865f62`. URL https://app.notion.com/p/41481b1a756d8196a8cac6fb51865f62 .
- El MCP oficial `mcp__Notion__fetch` leyó la página creada por el conector con marca CEREBRO (OK).
- El MCP oficial `mcp__Notion__notion_update_page` añadió una sección de prueba sin sustituir datos existentes (OK).
- `mcp__CEREBRO___Notion_Universal__fetch` confirmó que el cambio de ChatGPT está guardado (OK).
- **AVISO**: ambos MCP se invocaron desde una sesión ChatGPT; **NO** es prueba de servicio autónomo del runtime CEREBRO Gateway o de credenciales diferentes. Ese gate permanece pendiente.
- La página LAB se conserva como testigo y runbook privado. No se contrató Notion AI ni Workers. No se alteraron páginas comerciales, CRM, bases de conocimiento ni contenido histórico.
- Vault metadata en proyectos Supabase accesibles no encontró secreto cuyo nombre contenga notion. Buscar primero otro almacén seguro existente antes de crear secreto. Nunca devolver token al chat.

## GitHub create_repository (PHYSICAL NEGATIVE E2E)
- El conector MCP oficial ChatGPT `mcp__GitHub__` expone 89 herramientas, incluyendo `create_branch`, `create_file`, `create_pull_request`, pero **NO `create_repository`**. Falta funcionalidad en ese adaptador, no demostrado que falte derecho personal GitHub.
- El conector `mcp__CEREBRO___GitHub_Universal__` expone 48 herramientas, incluyendo `create_repository`. En prueba de creación con `name=cerebro-fact001-mcp-repo-lab`, `private=true`, `autoInit=true`, repositorio personal, GitHub respondió exactamente `403 Resource not accessible by integration` en `POST /user/repos`. Preflight GET repo devolvió 404; **no se creó recurso**.
- Causa soportada: credencial actual de la integración no permite crear repositorios. Según REST GitHub oficial, endpoint requiere permisos `Repository creation: write` o `Administration: write` con credencial que los soporte; se debe usar OAuth GitHub App user access / PAT apropiado sin exponerlo al modelo, y una implementación de broker o custom MCP que implemente create_repository. Fuente https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user .
- No se deben conceder `Administration: write` sobre repos existentes a un token genérico si `Repository creation: write` es suficiente. Si la app MCP de proveedor no permite cambiar scopes, un broker de servicio propio con autorización de usuario, límites y auditoría es el camino.
- **NO** recrear repositorios existentes como workaround; no dar por habilitada la operación hasta prueba de un repositorio privado aislado y contrato de ciclo de vida y rollback. La autenticación del plugin CEREBRO no debe confundirse con identidad autónoma CEREBRO Gateway.

## Vercel scope
- Browser Opera ve `fenix-capital-preprod` y `fenix-capital-preprod-app`, pero API Vercel ChatGPT lista 0 en team id `team_qnh6u1Ofy2WPp0MGEKlyMA50` y branded CEREBRO devuelve 403 `authorize_team_access`. El anterior enlace de autorización expiró; emitir uno nuevo al final de la ejecución para que el usuario lo abra antes de 10 minutos. No modificar dominios, proyectos, ramas ni despliegues.

## Aceptación dual
1. ChatGPT MCP create/read/update en Notion -> **LAB PASS**.
2. Plugin CEREBRO MCP create/read -> **LAB PASS**, ejecutado desde ChatGPT.
3. CEREBRO Gateway autónomo para Notion -> **NOT VERIFIED**.
4. ChatGPT crear repositorio GitHub -> **NO TOOL**.
5. Plugin CEREBRO crear repositorio GitHub -> **HTTP 403**.
6. CEREBRO Gateway crear repositorio GitHub -> **NOT IMPLEMENTED/NOT VERIFIED**.
7. Vercel equipo -> **USER TEAM CONSENT PENDING**.

Preservar: App, CRM, Supabase y GitHub main, Vercel PROD, Notion material preexistente. Coste adicional 0 EUR.
