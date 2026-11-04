# ZEUS JARVIS B7 · AUDITORÍA DE REUTILIZACIÓN OLD vs NEW · 2026-11-04

## Módulos EXISTENTES — no recrear
El repositorio contiene tecnología anterior, comprobada en su **código real** y no únicamente por su nombre:

| Existente | Contrato actual | Tratamiento seguro B7 |
|---|---|---|
| `cerebro/runtime/dynamic-dag-planner-v1.mjs` | `DynamicDagPlannerV1`, PREPROD; dependencias, prioridades, subbloques y `enqueueReady` sobre JOB-001 | **Conservar; comparación OLD vs NEW de capas/dependencias en test; B7 LAB no instancia colas PREPROD para ejecutar** |
| `cerebro/runtime/durable-job-runtime-v1.mjs` | JOB-001, PREPROD, reintentos, leases, checkpoint y cancelación | **Conservar; no crear otra cola. B7 LAB usa journal B6 para atomicidad; adaptador JOB-001 a integrar en PREPROD tras gate** |
| `cerebro/runtime/cerebro-continuous-supervisor-v0.mjs` | supervisor PREPROD sobre worker/JOB, parada y watchdog | **Conservar; B7 tiene puerto Supervisor inyectable, pero aún no conectado físicamente** |
| `cerebro/runtime/cerebro-technical-specialists-v1.mjs` | FACT-001 registry con ARQUITECTO, CODE, SYSTEMS, MATH, DATA, SECURITY, QA, INTEGRATOR; `new_engine_required=false` | **Conservar catálogo lógico; no crear ocho servidores. B7 usará adaptador confiable de registry** |
| `cerebro/runtime/evaluation-tribunal.mjs` | evaluación OLD vs NEW, self-judge rechazado, control anti-Goodhart | **Conservar. B7 exige puerto de tribunal independiente con evidencia SHA; no se confunde dictamen de métrica con validación de tarea** |
| `cerebro/runtime/bounded-recovery-supervisor.mjs` | recuperaciones acotadas y excepciones canónicas, PREPROD | **Conservar; integración de manejo de fallo pendiente de política PREPROD** |

## Evidencia reproducible de compatibilidad
Archivo nuevo: `zeus/jarvis/core/jarvis-b7-existing-components-compat.test.mjs`.

Cinco casos:
1. Comparación OLD DAG PREPROD vs B7 LAB por capas de dependencias.
2. Propagación de fallo de prerequisito equivalente.
3. Prohibición de usar directamente JOB y Supervisor PREPROD en LAB.
4. Reutilización de aliases FACT-001: no motor ni servidor nuevo.
5. Tribunal legacy rechaza al mismo actor como juez y candidato.

GitHub Actions: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41756003358 — **357/357 PASS, 0 FAIL**.

**No es una certificación de que los motores PREPROD ya estén conectados a JARVIS.**
El código B7 LAB contiene un guard de DAG mínimo para una misión de lectura y *no sustituye* la planificación JOB-001 PREPROD. El paso correcto de integración es crear solamente un adaptador de contratos entre B7 y las implementaciones canónicas, con PREPROD, OLD vs NEW, evaluación y rollback; nunca duplicar la Factory/worker/cola.
