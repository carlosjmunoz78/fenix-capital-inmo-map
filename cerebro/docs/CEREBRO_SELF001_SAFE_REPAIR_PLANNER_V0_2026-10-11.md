# CEREBRO SELF-001 · SAFE REPAIR PLANNER V0 · 2026-10-11

## Estado

- **EXISTENTE:** `SELF-001` ya figura en el Engine Registry canónico; no se crea ningún motor nuevo.
- **POR AUDITAR PREVIO:** existía una rama histórica `cerebro-self-healing-v0-20260911` con un planificador SELF-001 mínimo, pero esa rama está ampliamente divergida de `main` y no debe fusionarse en bloque.
- **HECHO EN ESTE CAMBIO:** se recuperan únicamente las semánticas auditadas y seguras de SELF-001 sobre el `main` actual y se envuelven alrededor del estado de remediación QA ya operativo.
- **PARCIAL:** SELF-001 genera planes de reparación reversibles y enrutados; no modifica código arbitrariamente ni promueve a PROD.

## CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR

No se fusiona la rama histórica. Se reutiliza el `engine_id=SELF-001`, se conserva su filosofía fail-closed y se implementa un wrapper actual compatible con QA-001 / LRN-001 / RSI.

## Dependencias

Entrada canónica: `CEREBRO_QA_AUTONOMOUS_REMEDIATION_STATE_V0`.

Salida: `CEREBRO_SELF_HEALING_PLAN_BATCH_V0`.

Dependencias reutilizadas: Node, GitHub Actions existente, rama QA de estado y los gates OLD vs NEW / PREPROD / juez / rollback / rebuild ya definidos. No se añade servicio externo ni suscripción.

## Autoridad

SELF-001 V0 es **plan-only** para cambios de código. Puede preparar trabajo reversible y acciones operativas allowlisted, pero no recibe autoridad implícita para mutar App/Web/SEO/CRM en PROD.

Para cada caso QA genera, como mínimo: owner, snapshot requerido, branch requerida, smallest patch requerido, test de regresión cuando el caso sea bug, OLD vs NEW, PREPROD, juez independiente, rollback y rebuild.

## Backup / rollback / rebuild

- Backup: el código parte del `main` actual en rama independiente y la evidencia QA permanece en `cerebro/qa-state-v0`.
- Rollback de este cambio: revertir el PR elimina el planner sin alterar datos de negocio ni el estado histórico QA.
- Rebuild: una ejecución nueva de `CEREBRO Continuous Human QA V0` reconstruye la remediación y los planes SELF-001 desde evidencia viva y código versionado.

## HUMAN_REQUIRED

Solo se propagan razones canónicas. Seguridad, dinero, Trading, cambios desconocidos o autoridad fuera de PREPROD fallan cerrados.

## Próximo gate

`OWNER_EXECUTOR_CAPABILITY_AUDIT`.

Antes de permitir corrección automática de código hay que auditar las capacidades reales de cada owner y/o un ejecutor de código compartido. No se añadirá un ejecutor nuevo si ya existe una capacidad equivalente.

## Coste

Coste adicional contractual: **0 €**.
