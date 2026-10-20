# fenix-capital-inmo-map
App interna Fénix Capital: mapa de inmobiliarias (OSM/Overpass), filtros por CP/municipio/ciudad, scoring de oportunidad, histórico y export.

## Política operativa CEREBRO

**WPVibe no se usa en ningún flujo CEREBRO, ni como fallback ni como vía temporal.** Para cualquier operación WordPress se usan Fénix Core Guard y los plugins/abilities/REST/MCP propios de CEREBRO/Fénix. Si falta una capacidad, se implementa en el plugin propio y se valida en PRE-PROD con backup, tests y rollback.

Documento canónico: `CEREBRO_TOOLING_POLICY_NO_WPVIBE.md`.

## Estado externo canónico · 2026-10-20

- La web de Fénix Capital (`WEB-001`) ya existe en PROD en `https://fenixcapital.es`; la modificación prevista para 2026-10-21 es trabajo sobre la web existente. No se modifica WordPress como parte de esta corrección de estado.
- El sistema `LAB-TRD` de inversión en bolsa existe en Google Cloud según confirmación del propietario y permanece aislado de App/CRM/CEREBRO PROD. Aislamiento significa separación de credenciales/lógica/recursos, no inexistencia.
- `LAB-TRD` no debe ponerse a punto ni activarse hasta cerrar control E2E integral de navegador y PC; después requiere auditoría y promoción específicas de Trading.

Fuentes canónicas: `cerebro/registry/external-system-state.v1.json` y `cerebro/docs/CEREBRO_EXTERNAL_SYSTEM_STATE_2026-10-20.md`.
