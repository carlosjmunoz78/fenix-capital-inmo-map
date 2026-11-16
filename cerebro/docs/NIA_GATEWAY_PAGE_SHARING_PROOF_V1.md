## Captura de permisos Notion · 16-11-2026

La pantalla real de la Skill NIA muestra conexiones activas con:
- `CEREBRO OS · FACT-001`;
- `Fénix Capital · Notion Redes`;
- `Fénix Notion Bridge`.

Esto confirma la **compartición de la página con esas integraciones**, pero no certifica que `ACTGW-001` tenga acceso al token que corresponde a una de ellas.

El adaptador ahora soporta dos proveedores alternativos, ambos inyectados por un host existente:

1. `readSkillPage(id)`: cliente ya autorizado de la API de Notion que consulta la página exacta. Verifica ID, título canónico, no archivada/no eliminada, y devuelve exclusivamente metadatos sin contenido confidencial.
2. `getEnabledSkills()`: cliente personal de MCP Notion, para las sesiones que lo admitan. **La asignación de Skills personales no equivale a acceso de bots**, por lo que esta ruta no basta para certificar un servidor.

**NO HECHO**: descarga de la Skill por runtime CEREBRO, petición física del Gateway con token de servidor, despliegue de adaptador, ejecución de IA o tareas recurrentes. El objetivo del próximo gate es una lectura de `/v1/pages/41a81b1a756d815ab877f0d264a6a0d4` desde la identidad existente del Gateway o un runner seguro que ya tenga el secreto, ocultando cuerpo y credencial. Requerirá comprobar además blocks/children antes de interpretar contenido, idempotencia y políticas.

No añadir el token a código, workflow, logs, capturas ni chat. Preferir el secreto `NOTION_TOKEN` ya referenciado en workflows existentes, previa comprobación de identidad/alcance. No habilitar nuevos trabajos o gasto.

Código de LAB en <https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/70>.
