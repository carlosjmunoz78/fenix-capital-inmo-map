# CHANGELOG · 2026-11-02

## CONNECT_EXISTING_ENGINES_AND_ENRICH_CANONICAL_DEPENDENCIES

Estado: GREEN.

### Añadido

- Política de overlay de dependencias basada en evidencia.
- Runner reproducible `connect-existing-engines-v3.mjs`.
- Workflow aislado LAB/PREPROD.
- Detección estricta de bindings físicos.
- Cycle guard para impedir ciclos nuevos en el grafo efectivo.
- Separación explícita entre relaciones efectivas y candidatas.
- Rebuild determinista y paquete de continuidad.
- Evidencia durable de cierre, autonomía, bindings, grafo y runbook.

### Refinado durante la misión

- v1 detectó relaciones cíclicas y falló correctamente el gate.
- v2 preservó dichas relaciones mediante cycle guard y pasó GREEN.
- v3 eliminó falsos positivos procedentes de tests, Registry, missions y workflows; las candidatas bajaron de 11.912 a 515 y los bindings físicos verificables quedaron en 34.
- v1 y v2 fueron retirados al quedar sustituidos por v3; su historial permanece en Git.

### Preservado

- Registry canónico: 179 motores, sin modificación.
- FACT-001 y Factory V1, sin modificación.
- Código de negocio existente, sin sobrescritura.
- PROD, Trading LAB, secretos y datos de cliente, sin tocar.
- Coste adicional: 0 EUR.

### Pendiente explícito

- P23 Live Audit: POR_AUDITAR; no existe evidencia física de integración live en este repositorio.
- El overlay sigue siendo `ADVISORY_ONLY`; no gobierna runtime ni PROD.

### Siguiente misión

`IMPLEMENT_PRIORITY_ENGINES_L0_L1_L2_L6_WAVE_1`.
