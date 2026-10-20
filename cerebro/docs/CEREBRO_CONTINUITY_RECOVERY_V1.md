# CEREBRO Continuity Recovery V1

## Estado

EXISTENTE en `main` con evidencia previa de recuperación automática para los carriles de lenguaje sintético e intake. Esta revisión amplía la misma envolvente, sin ampliar autoridad, a los dos carriles de skills que han mostrado huecos de `schedule`.

## Objetivo

Evitar que la continuidad dependa de un único cron de GitHub Actions. La envolvente conserva los cron existentes y recupera de forma acotada cuatro carriles gobernados cuando no exista una ejecución satisfactoria suficientemente reciente:

- `CEREBRO Human Language Synthetic Lab V1`: recuperación si el último éxito supera 35 minutos.
- `CEREBRO Universal Skill Continuous Intake V1`: recuperación si el último éxito supera 90 minutos.
- `CEREBRO Skill GitHub Wide Scout`: recuperación si el último éxito supera 75 minutos.
- `CEREBRO Skill Autonomy Safe Action Worker V1`: recuperación si el último éxito supera 75 minutos.

## Diseño

La recuperación no sustituye los cron de los workflows objetivo. Los conserva y añade una envolvente redundante.

La envolvente puede arrancar por cuatro vías independientes dentro de GitHub Actions:

- finalización satisfactoria en `main` de `CEREBRO RSI Learning Control Plane V0`;
- finalización satisfactoria en `main` de `CEREBRO Continuous Human QA V0`;
- finalización satisfactoria en `main` de `CEREBRO AUTO-001 PREPROD Patch Executor V0`;
- cron propio de recuperación a minuto 41 de cada hora, además de `workflow_dispatch` manual.

Esto corrige el punto débil observado: si el cron horario del Scout o del Safe Action Worker se retrasa o se pierde, una ejecución sana de cualquiera de los heartbeats event-driven puede detectar el carril obsoleto y relanzarlo mediante `workflow_dispatch`.

Antes de relanzar, el recovery consulta el estado real de GitHub Actions. Si el workflow objetivo ya tiene una ejecución activa, no duplica trabajo. Si existe un éxito suficientemente reciente, hace no-op. Si está fuera del SLO, no existe éxito previo o falla la inspección, solicita una ejecución del workflow gobernado con hasta tres intentos.

## Autoridad

La envolvente tiene únicamente:

- `contents: read`;
- `actions: write`, exclusivamente para inspeccionar y lanzar workflows existentes.

No recibe autoridad para modificar repositorio, App, CRM, Supabase, WordPress, Trading, datos de cliente ni comportamiento PROD. No cambia los contratos de autoridad de los workflows objetivo y no introduce fallback de pago.

En particular, recuperar `CEREBRO Skill GitHub Wide Scout` o `CEREBRO Skill Autonomy Safe Action Worker V1` no autoriza instalación directa de código externo ni promoción automática a PROD. Solo restablece su ejecución gobernada normal.

## Dependencias

- GitHub Actions.
- Los tres heartbeats event-driven ya existentes.
- Los cuatro workflows objetivo existentes, todos con `workflow_dispatch`.

No se añade suscripción ni infraestructura externa.

## Pruebas

`cerebro/tests/continuity-recovery-workflow-v1.test.mjs` bloquea por contrato:

- los tres heartbeats event-driven y el fallback horario;
- nombres exactos de los cuatro workflows objetivo;
- umbrales de 2.100 s, 5.400 s, 4.500 s y 4.500 s;
- ausencia de `contents: write` y otros permisos de mutación;
- ausencia de autoridad PROD/Trading/fallback de pago.

## Observabilidad

Cada ejecución escribe en `GITHUB_STEP_SUMMARY` uno de estos estados por carril:

- `HEALTHY_ACTIVE_RUN`;
- `HEALTHY`;
- `RECOVERY_DISPATCHED_STALE`;
- `RECOVERY_DISPATCHED_NO_SUCCESS`;
- `RECOVERY_DISPATCHED_INSPECTION_ERROR`.

## Rollback

Rollback inmediato: revertir el commit/merge de esta revisión. Los cron originales de los cuatro workflows objetivo permanecen intactos, por lo que el rollback elimina únicamente la envolvente redundante añadida.

## Criterio de cierre

No declarar continuidad 24/7 por contrato. Esta revisión se considera HECHA únicamente cuando, en `main`, el recovery quede verde y exista evidencia de que detecta como stale y relanza correctamente al menos uno de los dos carriles de skills sin intervención humana. La continuidad sostenida se valida posteriormente con evidencia temporal real.
