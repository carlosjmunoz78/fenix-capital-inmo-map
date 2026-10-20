# CEREBRO Continuity Recovery V1

## Estado

DEFINIDO en rama hasta promoción a `main`. El estado operativo solo se considera HECHO tras evidencia verde del workflow en `main`.

## Objetivo

Cerrar el hueco de continuidad observado en dos carriles ya gobernados:

- `CEREBRO Human Language Synthetic Lab V1`, objetivo de actividad cada 15 minutos y recuperación cuando no exista un éxito reciente en 35 minutos.
- `CEREBRO Universal Skill Continuous Intake V1`, objetivo horario y recuperación cuando no exista un éxito reciente en 90 minutos.

## Diseño

La recuperación no sustituye los cron existentes. Los conserva y añade una envolvente de continuidad.

El heartbeat primario de recuperación es la finalización satisfactoria de `CEREBRO RSI Learning Control Plane V0`, que ya dispone de cron `*/15 * * * *`, además de eventos propios. Existe también un cron independiente de recuperación a minuto 41 de cada hora y `workflow_dispatch` manual.

El recovery consulta el estado de GitHub Actions. Si el workflow objetivo ya tiene una ejecución activa, no duplica trabajo. Si existe un éxito suficientemente reciente, hace no-op. Si está fuera del SLO, no existe éxito previo o falla la inspección, solicita una ejecución del workflow gobernado mediante `workflow_dispatch`, con hasta tres intentos.

## Autoridad

La envolvente tiene únicamente:

- `contents: read`
- `actions: write`, exclusivamente para lanzar workflows existentes.

No recibe autoridad para modificar repositorio, App, CRM, Supabase, WordPress, Trading, datos de cliente ni comportamiento PROD. No cambia los contratos de autoridad de los workflows objetivo y no introduce fallback de pago.

## Dependencias

- GitHub Actions.
- `CEREBRO RSI Learning Control Plane V0` como heartbeat event-driven redundante.
- Los dos workflows objetivo existentes.

No se añade suscripción ni infraestructura externa.

## Pruebas

`cerebro/tests/continuity-recovery-workflow-v1.test.mjs` bloquea por contrato:

- heartbeat y fallback horario;
- nombres exactos de los dos workflows objetivo;
- umbrales de 2.100 s y 5.400 s;
- ausencia de `contents: write` y otros permisos de mutación;
- ausencia de autoridad PROD/Trading/fallback de pago.

## Observabilidad

Cada ejecución escribe en `GITHUB_STEP_SUMMARY` uno de estos estados por carril:

- `HEALTHY_ACTIVE_RUN`
- `HEALTHY`
- `RECOVERY_DISPATCHED_STALE`
- `RECOVERY_DISPATCHED_NO_SUCCESS`
- `RECOVERY_DISPATCHED_INSPECTION_ERROR`

## Rollback

Rollback inmediato: revertir el commit/merge que incorpora `.github/workflows/cerebro-continuity-recovery-v1.yml`. Los cron originales de los dos workflows objetivo permanecen intactos, por lo que el rollback elimina únicamente la envolvente redundante.

## Criterio de cierre

No declarar continuidad 24/7 probada por una sola ejecución. El cierre técnico inicial exige workflow recovery verde en `main` y dispatch/health check correcto de ambos carriles. La continuidad sostenida se valida después con evidencia temporal real de ejecuciones, sin inferirla del contrato.
