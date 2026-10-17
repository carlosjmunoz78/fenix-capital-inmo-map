# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · RUNBOOK

Fecha: 2026-10-17
Issue: #780
PR: #784
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`

## Regla de operación

Continuar sin esperar instrucciones entre pasos ordinarios. Parar solo por `HUMAN_REQUIRED` real o por exceder autoridad LAB/PREPROD. No tocar PROD, no ampliar permisos, Trading aislado, coste adicional 0 EUR.

## Secuencia de cada cambio

1. Leer evidencia viva y contrato actual.
2. Confirmar dependencias/superficie.
3. Implementar de forma aditiva o envolvente.
4. Tests focales.
5. Regresión de subsistema.
6. Regresión CEREBRO.
7. Evidencia reproducible.
8. OLD vs NEW.
9. Rollback/rebuild si hay estado mutado.
10. Actualizar STATE/MASTER/HANDOFF por hito.

## Anti-loop

Tres fallos de la misma familia ⇒ parar parcheo individual y corregir contrato/generador/planner/adapter/worker común.

## Criterio de FULL

No usar `FULL` para discovery, catálogo, normalización, wrapper, plan, scaffold o simulación. `FULL_SAFE_PREPROD` requiere consumo semántico real por binding relevante, OLD vs NEW PASS, Tribunal PASS, no regresión, LRN/OBS/Audit/FinOps, backup/rollback/rebuild, idempotencia/restart, coste/política correctos y evidencia física cuando aplique.

## Bloques certificados

- B0 Persistencia/contrato: GREEN.
- B1 Engineering bootstrap: GREEN.
- B2 Generic Activation Planner: GREEN.
- B3 Semantic Contract Families: GREEN.
- B4 Generic Real Binding Executor: GREEN.
- B5 Automatic Adapter + Durable Batch: GREEN.
- B6 Blind Batch: GREEN.
- B7 Scale184 Truthful Certification: GREEN.

B7 no significa 184 FULL. Resultado certificado: 35 ABSORBED, 59 REJECTED, 79 BLOCKED_EXTERNAL y 11 ENGINEERING_TASK_REQUIRED; `full_claim=false`.

## B8 · Auto Engineering Fulfillment · ACTIVO

Problema: `universal-skill-adapter-factory-v1.mjs` devuelve `ENGINEERING_TASK_REQUIRED` cuando no existe evidencia semántica suficiente. `universal-skill-batch-orchestrator-v1.mjs` actualmente propaga ese estado; no ejecuta el trabajo técnico hasta producir implementación/evidencia.

Salida B8:
- job de ingeniería ejecutable y durable;
- Safe Engineering como policy/plan común;
- aislamiento equivalente a worktree/sandbox;
- inspección/implementación/tests por familia, no por candidate ID;
- adapter generado solo desde evidencia observada real;
- rerun automático de binding después del trabajo técnico;
- rollback/rebuild y trazabilidad;
- al menos una candidata antes ENGINEERING_TASK_REQUIRED avanza automáticamente sin código hardcodeado por ID.

Reglas B8:
- no eco del contrato como evidencia;
- no ejecutar código externo sin sandbox explícito;
- no instalar dependencias fuera del entorno aislado/autorizado;
- no usar secretos/customer data;
- no PROD;
- si falta evidencia física, `BLOCKED_EXTERNAL`;
- si baja confianza real, `HUMAN_REQUIRED: LOW_CONFIDENCE`.

## B9 · Unseen Repository E2E + SLO · PLANNED

Entrada nueva no preparada: URL/repo/skill. Debe atravesar provenance/licencia → discovery → dedupe → planner → engineering/adaptation → semantic bindings → gates → terminal state. Medir tiempo total y machine time. No vale fixture que conozca el ID de la candidata.

## B10 · Continuous Trigger + Final Factory Certification · PLANNED

Conectar intake normal a ejecución automática y certificar que la Factory puede operar sin chat conductor. Mantener PR en draft y PREPROD hasta todos los gates.

## Comunicación

Solo hitos relevantes, muy breve: `haciendo X · conseguido Y · sigue Z`.

## Continuidad

Antes de saturación o cierre de bloque mayor actualizar:
- MASTER,
- STATE,
- RUNBOOK,
- HANDOFF,
con HEAD exacto, PR/runs, evidencia, rollback y `next_block`.

## Reevaluación

Si al alcanzar 20 horas técnicas acumuladas una skill ordinaria sigue necesitando integración manual, declarar `STRUCTURAL_REASSESSMENT_REQUIRED`; no consumir más tiempo repitiendo el patrón.
