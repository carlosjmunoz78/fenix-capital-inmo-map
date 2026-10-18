# CEREBRO SCHEDULED SOAK RECONCILER V1 · RUNBOOK

Fecha: 2026-10-18  
Owner lógico: `LRN-001`  
Entorno: `PREPROD`  
Coste adicional: `0 €`

## Objetivo

Verificar exclusivamente ejecuciones programadas genuinas de Watch & Learn, COMPET y CAP, conservar la evidencia de certificación y continuar como monitor read-only de continuidad. Nunca sustituye cron reales por ejecuciones manuales y nunca promociona registries o PROD automáticamente.

Una ejecución cuenta solo si cumple simultáneamente:

- `event=schedule`;
- `status=completed`;
- `conclusion=success`;
- `head_branch=main`;
- `run_id` distinto.

`workflow_dispatch`, manuales, fallos, cancelaciones, ramas distintas o duplicados no cuentan.

## HECHO · certificación 2026-10-18

El reconciler run `39125588186` emitió artifact `12136037115`, digest `sha256:66074f4508593e6a2279ac7517746d95bbbcc17c17fb79f57982fd62cdcc01f7`, estado `ALL_SCHEDULED_SOAKS_READY_TO_CERTIFY`.

### WATCH_LEARN_47

- 3 runs genuinos GREEN.
- Registry actual: `CONTINUOUS_PREPROD_ACCEPTANCE_GREEN`.
- Revisión de retención: `RETENTION_REVIEW_GREEN`.
- Siguiente comportamiento: observación PREPROD continua y HOLD si aparece regresión de replay o política.

### COMPET_REAL_SOURCE_SCHEDULED_SOAK

- 3 runs genuinos GREEN.
- Tres targets reales de Córdoba y baseline GET-only preservados.
- Registry actual: `REAL_TARGETS_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN`.
- Siguiente comportamiento: observación read-only continua y HOLD si la fuente/política deja de cumplir.

### CAP_REAL_SOURCE_SCHEDULED_SOAK

- 3 runs genuinos GREEN.
- Fuente oficial IECA Córdoba GET-only y discovery físico preservados.
- Registry actual: `REAL_OFFICIAL_COMPANY_DISCOVERY_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN`.
- Siguiente comportamiento: discovery read-only continuo y HOLD si la fuente/política deja de cumplir.

## Ejecución automática

`CEREBRO Scheduled Soak Reconciler V1` corre diariamente a `07:11 UTC`, después de las ventanas de las fuentes observadas. Usa únicamente `contents: read` y `actions: read` y genera el artifact `cerebro-scheduled-soak-reconciliation-v1` con retención de 30 días.

Después de la certificación su función es detectar regresiones y mantener evidencia de continuidad. No debe reabrir o cerrar gates por sí mismo mediante escritura de repositorio.

## HECHO técnico

- Runtime determinista sin dependencias externas instaladas.
- Test que impide contar manuales/fallos/no-main/duplicados.
- Lectura de GitHub Actions con token efímero del workflow.
- Ninguna mutación de repositorio, proveedor, CRM o cliente.
- Ninguna autoridad PROD o Trading.
- Coste adicional `0 €`.

## Backup

El histórico de GitHub Actions, los artifacts y los registries canónicos son la evidencia durable. No se crea estado de negocio externo.

## Rollback

Deshabilitar/eliminar el cron del reconciler o revertir su metadata. Los registries ya certificados y el histórico de runs permanecen intactos; no hay datos de negocio que revertir.

## Rebuild

1. Recrear `cerebro/runtime/scheduled-soak-reconciler-v1.mjs`.
2. Recrear su test y workflow read-only.
3. Releer el histórico de GitHub Actions.
4. Verificar tres runs genuinos distintos por lane.
5. Releer los registries actuales de Watch/COMPET/CAP.
6. Ejecutar regresión exact-head antes de aceptar el estado reconstruido.

## Autoridad

`PROD=false / repository_write=false / provider_write=false / CRM_write=false / customer_data=false / spend=false / Trading=false / external_skill_code=false`.
