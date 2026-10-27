# JARVIS Project Hub V1 · Runbook

## Objetivo

Mantener una única superficie canónica para proyectos, subproyectos y auditorías de CEREBRO/JARVIS sin sustituir ni romper CEREBRO Console V0.

## Estado y alcance

- `company_id=fenix`
- `engine_id=PROJECT-001`
- `environment=PREPROD`
- `version=v1`
- editores: `CARLOS`, `JARVIS`
- coste adicional objetivo: `0 €`
- autoridad PROD de escritura/mutación: **NO**
- Trading: **NO**

## Orden canónico

1. `PRJ-AUDITORIAS`
2. `PRJ-001` a `PRJ-018`
3. Proyectos adicionales creados por Carlos o JARVIS, ordenados después del bloque canónico.

El registro fuente es `cerebro/registry/jarvis-project-registry.v1.json`.

## Auditorías

`PRJ-AUDITORIAS` es el índice vivo de auditorías. La regla es:

- la evidencia histórica es inmutable;
- el resumen actual puede reconciliarse y reescribirse cuando aparece evidencia nueva;
- toda reconciliación añade una revisión con actor, fecha y referencias de evidencia;
- nunca se borra evidencia para hacer coincidir una conclusión nueva.

El índice inicial está en `cerebro/audit/jarvis-audit-index.v1.json`.

## Escritura humana y JARVIS

Carlos puede crear proyectos y editar metadatos. JARVIS puede crear y editar proyectos de forma gobernada. Ambos pasan por `JarvisProjectHubV1`, que escribe un journal append-only `project-revisions.jsonl`.

Campos de identidad (`project_id`, `company_id`, `engine_id`, `environment`, `version`) son inmutables después de crear un proyecto.

## Cortafuegos de autoridad

La edición de proyectos **nunca** puede conceder autoridad de runtime. Estos campos no pueden pasar a `true` mediante Project Hub:

- `prod_authorized`
- `prod_write_authorized`
- `prod_mutation_authorized`
- `spend_authorized`
- `trading_access`
- `live_writes`
- `autonomous_prod`

Project Hub es metadata/procedencia/planificación/auditoría; no sustituye los gates de promoción de motores.

## API prevista a través del Gateway

- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `GET /api/audits`
- `POST /api/audits`

El binding de referencia es `cerebro/console/jarvis-project-hub-binding-v1.mjs`. No se permite acceso directo desde UI a un modelo IA.

## Persistencia y rebuild

Referencia V1: registry snapshot + journal local append-only. Rebuild:

1. cargar registry canónico;
2. cargar índice de auditorías;
3. reproducir `project-revisions.jsonl` en orden;
4. validar contexto PREPROD y firewall de autoridad;
5. reconstruir proyectos y resumen vivo de auditorías.

## Backup

Antes de cambiar persistencia o promover el binding:

1. copiar registry, audit index y journal;
2. registrar SHA del código de runtime/binding;
3. conservar el snapshot anterior de Console V0;
4. ejecutar tests del Project Hub y tests de Console existentes.

## Rollback

Rollback V1 no requiere borrar Console V0:

1. desactivar/eliminar únicamente el binding `console-project-hub-binding-v1`;
2. conservar registry/journal/auditorías como evidencia;
3. volver al gateway `CerebroGatewayV0` existente;
4. si se necesita restaurar metadata, cargar snapshot del registry y reproducir journal hasta la revisión objetivo.

## Aceptación PREPROD

GREEN requiere como mínimo:

- 19 proyectos top-level: AUDITORÍAS + 18 canónicos;
- orden exacto y estable;
- creación por CARLOS;
- edición por JARVIS;
- persistencia/rebuild;
- auditoría con resumen mutable + evidencia inmutable;
- rechazo de escalado PROD/Trading/gasto;
- aislamiento de `company_id`;
- binding que conserve Console V0;
- rollback documentado;
- workflow CI GREEN sobre HEAD exacto.

## Promoción visible

La existencia de runtime/registry **no significa** que el panel ya sea visible en `https://app.fenixcapital.es/cerebro`. La UI debe enlazarse al Gateway/binding y verificarse físicamente antes de declarar `HECHO · UI PROD`.
