# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · RUNBOOK

Fecha: 2026-10-17
Issue: #780
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`

## Regla de operación

Trabajar en continuidad sin esperar instrucciones entre pasos ordinarios. Parar solo por `HUMAN_REQUIRED` real o porque una acción exceda la autoridad PREPROD/LAB de este bloque.

No tocar PROD. No ampliar permisos. No ejecutar código externo crudo. Coste adicional 0 EUR.

## Secuencia de cada cambio

1. Leer evidencia viva y contrato actual.
2. Confirmar dependencias y superficie afectada.
3. Implementar de forma aditiva o envolvente.
4. Ejecutar tests focales.
5. Ejecutar regresión del subsistema.
6. Ejecutar regresión CEREBRO cuando proceda.
7. Generar evidencia reproducible.
8. Comparar OLD vs NEW.
9. Probar rollback/rebuild cuando exista estado mutado.
10. Actualizar STATE/MASTER/HANDOFF por hito.

## Anti-loop

Si aparece la misma familia de fallo tres veces, no continuar parcheando variantes individuales. Volver al contrato/familia de dominio y corregir el generador, planner, adapter o test común.

No corregir una skill aislada si el fallo puede resolverse a nivel de familia y beneficiar a todas.

## Criterio de FULL

No usar `FULL` para discovery, catálogo, normalización, wrapper, plan o simulación.

`FULL_SAFE_PREPROD` requiere consumo semántico real por binding relevante, OLD vs NEW PASS, Tribunal PASS, no regresión, LRN/OBS/Audit/FinOps, backup/rollback/rebuild, idempotencia/restart, coste y política correctos, y evidencia física cuando aplique.

## Bloques

### B0 · Persistencia y contrato
Salida: MASTER, STATE, RUNBOOK, HANDOFF, issue #780.

### B1 · Engineering bootstrap
Reutilizar Safe Engineering Profile existente como capability invocable por FACT. No crear agente independiente.

Prueba mínima: FACT solicita una adaptación técnica declarativa y obtiene plan/artefactos/tests sin ampliar autoridad.

### B2 · Generic Activation Planner
Entrada mínima: candidate metadata + provenance + capability/domain signals + registry.

Salida: `ActivationPlan` determinista con dominios, bindings relevantes, razones, políticas y gaps.

No hardcodear IDs de skills concretas.

### B3 · Semantic Contract Families
Crear contratos reutilizables por dominio. Si no existe contrato suficiente, fail closed a `BLOCKED_EXTERNAL`/`HUMAN_REQUIRED`/`NEEDS_CONTRACT`, nunca fingir integración.

### B4 · Generic Real Binding Executor
Consumir `ActivationPlan`; ejecutar bindings, OLD vs NEW, QA/EVA/Tribunal, LRN/OBS/FinOps y rollback/rebuild; emitir receipts por binding y estado terminal por candidate.

### B5 · Multilane
Conectar planner/executor a EXPRESS/STANDARD/DEEP/FAST_LANE existentes. Paralelizar sin que un fallo cancele los demás.

### B6 · Blind batch
Usar candidatas no preparadas específicamente. Si requieren código dedicado por candidata para atravesar el circuito, la Factory no está generalizada.

### B7 · Scale batch
Procesar lote grande del catálogo de 184. Corregir fallos por familia. Emitir matriz candidate × relevant bindings × terminal outcome.

## Comunicación

Solo hitos relevantes. Formato preferido:

`Estamos haciendo X · conseguido Y · sigue Z.`

No mensajes cada pocos minutos.

## Paquete de cambio de chat

Antes de saturación o cierre de bloque mayor actualizar:

- `CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_MASTER_2026-10-17.md`
- `universal-skill-activation-factory-v1.state.json`
- este RUNBOOK
- `CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_HANDOFF.md`

El HANDOFF debe incluir: branch, issue, exact HEAD SHA, PR si existe, runs/evidencias, archivos cambiados, estado de tests, bloque cerrado, `next_block`, HUMAN_REQUIRED, riesgos, rollback y prompt exacto.

## Condición de reevaluación

Si al alcanzar 20 horas técnicas acumuladas seguimos necesitando integración manual por skill ordinaria, declarar `STRUCTURAL_REASSESSMENT_REQUIRED` y corregir la arquitectura; no consumir más horas repitiendo el patrón.
