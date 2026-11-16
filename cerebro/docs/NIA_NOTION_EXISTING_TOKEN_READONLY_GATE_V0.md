# NIA · Gate físico de alcance del token Notion existente (LAB)

Fecha 2026-11-16. Un solo trabajo `pull_request` para la rama exacta
`cerebro/nia-notion-actgw-readonly-lab-v0-20261116`.

- No se hace checkout de código del PR en el job que recibe el secreto existente `NOTION_TOKEN`; solo se ejecuta Node inline con GET a Notion API.
- Permisos de `GITHUB_TOKEN`: ninguno (`permissions: {}`). Sin terceras acciones, rutas externas, agentes ni gastos de IA.
- Comprobación 1: identificador y título de página NIA, estado no archivado.
- Comprobación 2: GET de un bloque hijo, sin mostrar contenido.
- Salida solo `PASS` / `BLOCKED_*` y códigos HTTP, nunca cuerpos ni credenciales. Fallo cerrado.
- Si pasa, acredita lectura desde el **runner autorizado de GitHub con ese secreto**, no desde el servidor desplegado de ACTGW-001. El token puede pertenecer a alguna integración distinta de las vistas en captura.
- Si falla (secreto ausente / 403 / 404), no crear ni rotar credenciales en este flujo. Revisar propietario del token y acceso de la integración en Notion, siempre sin exponer el valor.
- Tras una ejecución, retirar el workflow de la rama al cerrar el PR o conservarlo sin trigger por nueva edición. Ninguna promoción automática.
