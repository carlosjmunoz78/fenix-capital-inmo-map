# CEREBRO NEURONAL · AUTOFILL QUEUES V1

## Estado

PREPROD. Aditivo. Coste adicional objetivo 0 EUR. No autoriza PROD ni Trading.

## Objetivo

Convertir la campaña NEURONAL de 6.449 submissions en trabajo durable, jerarquizado y auto-rellenable dentro del runtime JOB-001 existente. No crea una segunda cola física, scheduler ni daemon.

## Jerarquía de colas lógicas

1. `Q00_FOUNDATION`
2. `Q10_AUDIT`
3. `Q20_CONTRACT`
4. `Q30_DATA`
5. `Q40_UX`
6. `Q50_VISUAL`
7. `Q60_BUILD`
8. `Q70_UNIT`
9. `Q71_INTEGRATION`
10. `Q72_PERF_A11Y`
11. `Q73_ADVERSARIAL`
12. `Q80_EVIDENCE`
13. `Q90_EVAL`
14. `Q99_PROMOTION`

Dentro de cada cola se ordena por prioridad `P0 > P1 > P2`, después por horizonte `NOW > NEXT > FUTURE`, y finalmente por identificador estable.

## Autofill

`NeuronalHierarchicalJob001SourceV1` se conecta a `AdaptiveHierarchicalAgentWorkPumpV3.additional_sources`. Cada reconciliación del supervisor:

- lee el estado durable actual;
- considera completada una submission solo con evidencia compatible con su modo de ejecución;
- calcula dependencias;
- libera únicamente submissions ready;
- respeta backpressure global y máximo de modelo;
- usa idempotency keys estables;
- reintenta mediante JOB-001;
- mantiene dead-letter y HUMAN_REQUIRED diferenciados;
- no inventa progreso ni éxito.

El target NEURONAL por defecto es 40 activos, dentro del contrato físico del supervisor 48/64 y con DeepSeek limitado a 8. Los límites se pueden reducir por entorno; nunca se elevan por encima de los gates existentes.

## Ejecución por fase

- Audit: handler determinista read-only `neuronal.audit.evidence.v1`.
- Contract/Data/UX/Visual y foundation compatible: `model.deepseek.agent` gobernado, candidate-only PREPROD.
- Build: DeepSeek puede producir un plan de implementación, pero un plan no equivale a código aplicado. Sin executor gobernado writable la submission queda `WAITING_CAPABILITY`.
- Tests/Integration/Perf/A11Y/Adversarial/Evidence/Eval/Promotion: no se falsifican. Permanecen bloqueadas hasta que exista su capacidad gobernada y sus dependencias estén verdes.
- MONEY_LIMIT: `HUMAN_REQUIRED`; nunca cuenta como completado.

## Factory-first para gaps

Los gaps de capacidad no se convierten en falsos éxitos ni en peticiones manuales al asistente. Se clasifican `WAITING_CAPABILITY` con política `REUSE_OR_EXTEND_THEN_FACT001_BUILD_IN_LAB`. FACT-001 sigue siendo la única fábrica autorizada para crear o extender la capacidad que falte, con contratos, tests, OLD vs NEW, Tribunal, rollback y rebuild antes de promoción.

## Integración con el supervisor

`cerebro-supervisor-daemon-v0.mjs` permanece como único daemon. El cambio es aditivo:

- registra el handler de auditoría en el worker durable existente;
- añade contexto JOB-001 NEURONAL al conjunto de contextos;
- reconstruye/verifica el source NEURONAL con checksum antes de usarlo;
- instancia una única `NeuronalHierarchicalJob001SourceV1`;
- la pasa como `additional_sources` al Work Pump existente;
- el snapshot de colas queda dentro de la telemetría del Work Pump/heartbeat.

Flag de rollback inmediato: `CEREBRO_ENABLE_NEURONAL_AUTOFILL=NO`.

## Rollback

1. Fijar `CEREBRO_ENABLE_NEURONAL_AUTOFILL=NO` y reiniciar el mismo supervisor PREPROD.
2. Los jobs ya persistidos conservan journal e historial; no se borra JOB-001.
3. Si se requiere rollback de código, revertir el PR. El runtime previo permanece preservado.
4. PROD y Trading no forman parte de este cambio.

## Gate físico pendiente

La fusión a `main` deja el runtime preparado, pero no demuestra por sí sola que el task Windows PREPROD esté ejecutando esos bytes. La aceptación física exige usar el instalador canónico `cerebro/scripts/install-supervisor-preprod-windows.ps1` o el mecanismo de despliegue gobernado existente y observar heartbeat fresco con `additional_work_sources` incluyendo NEURONAL. No declarar operativo físico antes de esa evidencia.
