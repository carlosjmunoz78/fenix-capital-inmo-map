# RSI-RECOVERY-006 · AUTONOMOUS LEARNING ORCHESTRATOR

Fecha: 2026-10-08
Estado: SCHEDULER_SOFTWARE_GREEN / HORIZON_EXECUTORS_PARTIAL / PHYSICAL_HOST_PENDING
Entorno: PREPROD
Coste adicional: 0 EUR
PROD authority: false
Trading access: false

## Objetivo

Que el ritmo de aprendizaje pertenezca a CEREBRO y no al chat ni a ChatGPT Scheduler. GitHub puede transportar evidencia y validar código; el reloj operativo de `LRN-001` vive dentro del host CEREBRO.

## HECHO

`cerebro/runtime/learning-orchestrator.mjs` implementa estado persistente tenant-scoped y tres horizontes:

- DAILY -> `LEARNING_METRICS_AND_FAILURE_SCAN`
- WEEKLY -> `METALEARN_BOTTLENECK_AND_SUPERVISOR_SCAN`
- MONTHLY -> `KNOWLEDGE_OBSOLESCENCE_AND_POLICY_REVIEW`

El camino EVENT no espera un cron: permanece directo `Skill outbox -> LRN-001`.

El scheduler:

- usa `company_id + LRN-001 + PREPROD + version`;
- coste 0;
- máximo 3 intentos según contrato base;
- genera planes inmutables;
- usa bucket estable DAILY/WEEKLY/MONTHLY para que múltiples polls del mismo horizonte sean idempotentes;
- no avanza el reloj de un horizonte hasta que exista resultado `GREEN` o `PARTIAL_HELD` seguro;
- un resultado ERROR no puede fingir éxito;
- deriva lock keys deterministas;
- falla cerrado ante drift de contexto o autoridad.

`rsi-learning-auto-host.mjs` ejecuta el planner en cada iteración después del ciclo de learning, salvo kill switch. Por tanto, cuando el host físico esté instalado, los horizontes quedan gobernados por el runtime CEREBRO local y no por este chat.

## Incidente detectado y corregido

El primer gate mostró que la identidad inicial de un plan incluía `plans_emitted`, lo que hacía que un segundo poll del mismo horizonte generase otro lock key. Se cambió una sola variable causal: la identidad ahora usa `task + horizon_bucket`. También se valida un plan existente por sus campos inmutables y se ignora la diferencia de hora de polling.

Resultado posterior: gate RSI completo GREEN.

## PARCIAL

El scheduler ya decide y persiste qué debe ejecutarse. Los ejecutores específicos de DAILY/WEEKLY/MONTHLY todavía deben cerrarse para que:

- DAILY materialice métricas/evidencia;
- WEEKLY ejecute MetaLearn + supervisor sobre evidencia suficiente;
- MONTHLY ejecute obsolescencia/policy review no destructiva.

No se marcarán como ejecutados por el mero hecho de estar planificados.

## PHYSICAL_HOST_PENDING

La ejecución temporal 24/7 sigue dependiendo de cerrar RSI-RECOVERY-004 en Windows. El software del scheduler está integrado, pero no se afirma que esté corriendo físicamente.

## Next block

`RSI-RECOVERY-007 · HORIZON EXECUTORS + METALEARN LOOP`.
