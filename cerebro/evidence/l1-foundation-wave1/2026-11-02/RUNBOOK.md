# CEREBRO L1 Foundation Wave1 · Runbook

## Estado
GREEN en LAB/PREPROD. No autorizado para promoción a PROD por este cierre.

## Foundations nuevas
- UPD-001: construye `knowledge_candidate`; nunca publica directamente.
- OBS-001: TTL/contradicciones → ACTIVE/STALE; nunca borra historia.
- CON-001: normaliza entradas estructuradas en compromiso/tarea/riesgo/decisión/hecho; no se declara extracción semántica completa.
- CACHE-001: hash determinista por empresa/motor/versiones/input y evaluación explícita de TTL; sin persistencia enlazada.
- TWIN-001: snapshots y escenarios de simulación con datos sintéticos/anonimizados/fixtures aprobados; nunca escribe PROD.

## Motores preservados
KNW-001, PRV-001, LRN-001, TRN-001, EVA-001, JDG-001, RSH-001, RAG-001 y SIM-001 permanecen en WRAP_PRESERVE.

## Validación
Ejecutar `node --test cerebro/tests/l1-foundation-wave1.test.mjs`, la regresión CEREBRO y después `node cerebro/missions/connect-existing-engines-v3.mjs --out <dir>`.

El gate exige 14/14 L1 físicos, conjunto físico prioritario exacto 48/67, rebuild determinista, Registry/Factory inmutables, guardas de colisión CAN/SCAN y DR/ADR, cero PROD/Trading y coste adicional 0 €.

## Rollback
Retirar únicamente `cerebro/runtime/l1/`, su test y workflow. No modificar implementaciones L1 preexistentes ni L0.

## Próximo bloque
L2_FOUNDATION.
