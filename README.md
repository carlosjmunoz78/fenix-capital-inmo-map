# fenix-capital-inmo-map
App interna Fénix Capital: mapa de inmobiliarias (OSM/Overpass), filtros por CP/municipio/ciudad, scoring de oportunidad, histórico y export.

## Política operativa CEREBRO

**WPVibe no se usa en ningún flujo CEREBRO, ni como fallback ni como vía temporal.** Para cualquier operación WordPress se usan Fénix Core Guard y los plugins/abilities/REST/MCP propios de CEREBRO/Fénix. Si falta una capacidad, se implementa en el plugin propio y se valida en PRE-PROD con backup, tests y rollback.

Documento canónico: `CEREBRO_TOOLING_POLICY_NO_WPVIBE.md`.
