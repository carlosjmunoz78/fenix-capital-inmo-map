# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · HANDOFF

> Este archivo es continuidad viva. Debe actualizarse antes de saturación del chat y al cerrar bloques mayores.

## Identidad

- Proyecto: CEREBRO OS · ENGINE FACTORY & MULTIEMPRESA
- Misión activa: Universal Skill Activation Factory V1
- Issue canónica: #780
- Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
- Entorno: LAB/PREPROD
- PROD: NO TOCAR
- Coste adicional: 0 EUR

## Objetivo de la misión

Conseguir que una skill, repositorio o capability pueda entrar en CEREBRO y quedar automáticamente FULL_SAFE_PREPROD/FULL_REAL o en un estado terminal explicable, sin integración artesanal individual.

El efecto de usuario objetivo es: aportar URL/repositorio/skill → CEREBRO descubre capacidades → deduplica/absorbe → resuelve motores relevantes → genera/reutiliza wrapper/adaptador → prueba en paralelo → OLD vs NEW → QA/EVA/Tribunal → LRN/OBS/FinOps → rollback/rebuild → PREPROD físico → estado terminal.

## Definición estricta

No llamar integrada a una skill por discovery, catálogo, normalización, documentación, wrapper o test aislado.

Estados terminales permitidos:

- FULL_SAFE_PREPROD / FULL_REAL
- ABSORBED
- REJECTED
- BLOCKED_EXTERNAL
- HUMAN_REQUIRED

HUMAN_REQUIRED solo: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

## Evidencia viva de partida

- FACT-001/Factory V1 existe físicamente.
- Registry actual: 179 motores canónicos, preservando 177 base.
- Catálogo: 184/184 items normalizados/reconciliados; no todos físicamente activos.
- Existe Skill Full Adoption workflow.
- Existe Multilane Skill Factory con FAST_LANE y paralelismo.
- Existe Safe Engineering Profile V1.
- Existe durable JOB-001.
- Existe RSI/LRN continuous evolution loop.
- Existe prueba real de 2 skills → 10 bindings FULL SAFE PREPROD.
- Gap principal: la ruta profunda de binding todavía contiene especificidad por skills/domains concretos; hay que generalizarla.

## Decisión de arquitectura

No construir primero un conjunto grande de nuevos motores matemático/ingeniero/programador.

Orden:

1. Bootstrap mínimo: hacer que FACT reutilice Safe Engineering Profile existente como brazo técnico.
2. Construir Generic Activation Planner y Generic Real Binding Executor.
3. Conectar Multilane.
4. Certificar con lote ciego.
5. Usar la propia Factory para incorporar Math/Solver, Systems Engineering, Data Engineering, Security Engineering y futuras capabilities.

La ingeniería previa forma parte del presupuesto total, no añade una fase separada larga.

## Presupuesto técnico

Objetivo: 14–18 horas técnicas sobre base existente.
Límite de reevaluación estructural: 20 horas si persiste trabajo manual por skill.

SLO objetivo posterior, sujeto a medición real:
- sencilla 1–5 min;
- normal 5–15 min;
- repo mediano 10–30 min;
- compleja 20–60 min;
- hardware/credenciales/runtime externo: automático hasta bloqueo terminal.

## Estado de bloques

- B0 PERSISTENCE_AND_CONTRACT: IN_PROGRESS
- B1 ENGINEERING_BOOTSTRAP: PLANNED
- B2 GENERIC_ACTIVATION_PLANNER: PLANNED
- B3 SEMANTIC_CONTRACT_FAMILIES: PLANNED
- B4 GENERIC_REAL_BINDING_EXECUTOR: PLANNED
- B5 MULTILANE_EXECUTION: PLANNED
- B6 BLIND_BATCH_CERTIFICATION: PLANNED
- B7 SCALE_BATCH: PLANNED

## next_block

`B1_ENGINEERING_BOOTSTRAP`

Leer antes de tocar código:
- `cerebro/runtime/cerebro-safe-engineering-profile-v1.mjs`
- `cerebro/registry/safe-engineering-profile.v1.json`
- `cerebro/skills/skill-real-engine-binding-v1.mjs`
- `cerebro/skills/internal-capability-signals.v0.json`
- `cerebro/skills/MULTILANE_SKILL_FACTORY_V0.md`
- runtime/tests de skill capability evolution y evaluation tribunal.

## Política de comunicación

El usuario no quiere interrupciones frecuentes. Solo avisar por hitos importantes con una frase muy breve: qué se está haciendo, qué se consiguió y qué sigue.

## Prompt exacto para nuevo chat

```text
CONTINÚA CEREBRO OS · UNIVERSAL SKILL ACTIVATION FACTORY V1.

NO reconstruyas estado por memoria y NO repitas investigación cerrada. Trabaja desde evidencia viva del repositorio.

1. Lee primero, en este orden:
   - cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_HANDOFF.md
   - cerebro/registry/universal-skill-activation-factory-v1.state.json
   - cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_MASTER_2026-10-17.md
   - cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_RUNBOOK_2026-10-17.md
   - issue GitHub #780
2. Verifica únicamente evidencia viva mínima: branch/HEAD/PR/runs y archivos tocados desde el último HANDOFF.
3. Entra directamente en `next_block` del HANDOFF/STATE.
4. CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. No sustituyas ni borres sistemas existentes.
5. PREPROD/LAB únicamente. No tocar PROD. No ampliar permisos. Trading aislado. Coste adicional 0 EUR.
6. Una skill NO está integrada por estar catalogada/normalizada/envuelta. FULL exige consumo semántico real en todos los bindings relevantes, OLD vs NEW, QA/EVA/Tribunal, no regresión, LRN/OBS/Audit/FinOps, rollback/rebuild, idempotencia/restart y evidencia física cuando aplique.
7. Corrige fallos por familia/generador, no skill por skill. Si la misma familia falla 3 veces, reevalúa la estructura.
8. Continúa automáticamente entre pasos. Solo para por HUMAN_REQUIRED canónico real.
9. Comunicación con Carlos: solo por hitos importantes, una frase muy corta de vez en cuando; no interrumpir cada pocos minutos.
10. Antes de saturación del chat o al cerrar un bloque mayor, actualiza MASTER + STATE + RUNBOOK + HANDOFF con exact HEAD, PR/runs, evidencias, cambios, rollback, bloque cerrado y `next_block`, para saltar al siguiente chat sin perder nada.

OBJETIVO FINAL DE ESTA MISIÓN:
Que una skill/repositorio entre y CEREBRO la convierta automáticamente en FULL_SAFE_PREPROD/FULL_REAL, ABSORBED, REJECTED, BLOCKED_EXTERNAL o HUMAN_REQUIRED, sin integración artesanal individual.
```

## Changelog de continuidad

### 2026-10-17 · inicio
- Rama dedicada creada.
- Issue #780 creada.
- MASTER creado.
- STATE creado.
- RUNBOOK creado.
- HANDOFF inicial creado.
- Siguiente bloque: B1 Engineering Bootstrap.
