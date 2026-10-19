# CEREBRO OS · B18 · DEPENDENCY MAP

Fecha: 2026-10-18

## Flujo
`AUTO-001 baseline measurement`
→ `learning-pipeline`
→ `LearningLedgerV0`
→ `improvement-candidate-factory`
→ `Safe Engineering`
→ cambio mínimo en planner
→ `AUTO-001 NEW measurement`
→ `experiment-pipeline`
→ `evaluation-tribunal`
→ `rsi-old-new-evaluation-tribunal-gate`
→ `promotion-pipeline PREPROD`
→ segundo evento/learning
→ decisión del siguiente ciclo.

## Dependencias reutilizadas
| Componente | Función B18 | Mutación |
|---|---|---|
| `cerebro/runtime/learning-pipeline.mjs` | evento, outcome, evidence, learning | no |
| `cerebro/runtime/learning-ledger.mjs` | persistencia PREPROD atómica | solo ledger temporal PREPROD |
| `cerebro/runtime/improvement-candidate-factory.mjs` | candidate versionado | no |
| `cerebro/runtime/cerebro-safe-engineering-profile-v1.mjs` | gate y comparación de ingeniería | no |
| `cerebro/runtime/experiment-pipeline.mjs` | OLD/NEW controlado | no |
| `cerebro/runtime/evaluation-tribunal.mjs` | evaluación + juez independiente | no |
| `cerebro/runtime/rsi-old-new-evaluation-tribunal-gate.mjs` | composición del gate | no |
| `cerebro/runtime/promotion-pipeline.mjs` | plan PREPROD, no PROD | no |
| `cerebro/platform/auto001-preprod-patch-planner-v0.mjs` | fixture real y cambio mínimo | sí, una función |

## Límites
- `company_id=fenix`
- `environment=PREPROD`
- customer data = false
- Trading = false
- PROD write = false
- auto-merge = false
- additional cost = 0 €

## Rollback dependency
Baseline fijo: `f17fd6481c27d11df3442fb5764ba63c414bbfea`.
La modificación es reversible restaurando únicamente el comportamiento del planner desde ese baseline; el flujo B18 no exige cambios de schema, datos, credenciales ni infraestructura.

## Dependencias no creadas
No se crea servidor, worker, motor LRN, evaluator, tribunal, ingeniero ni proveedor adicional.
