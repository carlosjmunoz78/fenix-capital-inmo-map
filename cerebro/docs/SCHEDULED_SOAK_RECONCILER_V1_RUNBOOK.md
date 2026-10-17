# CEREBRO SCHEDULED SOAK RECONCILER V1 · RUNBOOK

Fecha: 2026-10-17  
Owner lógico: `LRN-001`  
Entorno: `PREPROD`  
Coste adicional: `0 €`

## Objetivo

Eliminar la comprobación manual repetitiva de los soak programados de Watch & Learn, COMPET y CAP sin falsificar evidencia y sin conceder capacidad de escritura al workflow.

El reconciler lee exclusivamente metadatos de GitHub Actions y cuenta una ejecución solo cuando cumple simultáneamente:

- `event=schedule`;
- `status=completed`;
- `conclusion=success`;
- `head_branch=main`;
- `run_id` distinto.

Una ejecución manual o `workflow_dispatch`, un fallo, una cancelación o una rama distinta de `main` nunca sustituyen un cron genuino.

## Lanes

### WATCH_LEARN_47

Workflow: `cerebro-watch-learn-remote-observation-v0.yml`  
Gate: `THREE_GENUINE_SCHEDULED_RUNS_GREEN_AND_RETENTION_REVIEW`.

### COMPET_REAL_SOURCE_SCHEDULED_SOAK

Workflow: `cerebro-compet-real-targets-v0.yml`  
Gate: `THREE_CONTINUOUS_REAL_COMPETITOR_SCHEDULED_RUNS_GREEN`.

### CAP_REAL_SOURCE_SCHEDULED_SOAK

Workflow: `cerebro-cap-ieca-cordoba-v0.yml`  
Gate: `THREE_GENUINE_SCHEDULED_PREPROD_RUNS_GREEN`.

## Ejecución automática

El workflow `CEREBRO Scheduled Soak Reconciler V1` corre diariamente a `07:11 UTC`, después de las tres ventanas de observación actuales. Usa únicamente `contents: read` y `actions: read` y genera el artifact `cerebro-scheduled-soak-reconciliation-v1` con retención de 30 días.

Estados posibles del reporte:

- `SCHEDULED_SOAKS_IN_PROGRESS`;
- `ALL_SCHEDULED_SOAKS_READY_TO_CERTIFY`.

`READY_TO_CERTIFY` no cambia registries ni promociona PROD. Solo significa que existe evidencia suficiente para abrir el siguiente cambio gobernado de certificación.

## HECHO

- Runtime determinista sin dependencias externas instaladas.
- Test que impide contar manuales/fallos/no-main o duplicados.
- Lectura de GitHub Actions con token efímero del propio workflow.
- Ninguna mutación de repositorio, proveedor, CRM o cliente.
- Coste adicional 0 €.

## Backup

No se crea estado externo nuevo. GitHub conserva el histórico de runs y el artifact de reconciliación; los registries canónicos siguen siendo la fuente contractual.

## Rollback

Deshabilitar/eliminar el cron o revertir los cuatro ficheros del reconciler. No existe rollback de datos de negocio porque el reconciler es read-only.

## Rebuild

Recrear:

1. `cerebro/runtime/scheduled-soak-reconciler-v1.mjs`;
2. `cerebro/tests/scheduled-soak-reconciler-v1.test.mjs`;
3. `cerebro/registry/scheduled-soak-reconciler.v1.json`;
4. `.github/workflows/cerebro-scheduled-soak-reconciler-v1.yml`.

Validar después el registry canónico y la regresión completa de CEREBRO.

## Autoridad

`PROD=false / repository_write=false / provider_write=false / CRM_write=false / customer_data=false / spend=false / Trading=false / external_skill_code=false`.
