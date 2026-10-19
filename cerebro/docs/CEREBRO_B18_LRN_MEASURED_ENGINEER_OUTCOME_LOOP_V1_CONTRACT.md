# CEREBRO OS · B18 · LRN MEASURED ENGINEER OUTCOME LOOP V1 · CONTRACT

Fecha: 2026-10-18  
Estado: HECHO PREPROD  
Motor propietario: `LRN-001`  
Motor objetivo del fixture: `AUTO-001`  
Nuevo motor: NO

## Contrato
B18 demuestra un circuito de aprendizaje e ingeniería medido sobre código real:

`baseline real -> evidencia -> LRN persistido -> Safe Engineering -> cambio mínimo reversible -> NEW con misma métrica -> OLD vs NEW -> Tribunal independiente -> aceptar/rollback -> siguiente ciclo afectado por el aprendizaje`.

## Fixture real
Target: `cerebro/platform/auto001-preprod-patch-planner-v0.mjs`.

Defecto medido del baseline `f17fd6481c27d11df3442fb5764ba63c414bbfea`: ante dos mappings certificados equivalentes, la selección dependía del orden del array por usar `find()`. Métrica `order_invariance_score`: OLD=0.

Cambio mínimo: filtrar mappings elegibles, aplicar orden estable determinista y seleccionar el primero. NEW=1 con las mismas dos permutaciones y el mismo contrato de medición.

## Reutilización obligatoria
- `cerebro-safe-engineering-profile-v1.mjs`
- `learning-pipeline.mjs`
- `learning-ledger.mjs`
- `improvement-candidate-factory.mjs`
- `rsi-old-new-evaluation-tribunal-gate.mjs`
- `evaluation-tribunal.mjs`
- `experiment-pipeline.mjs`
- `promotion-pipeline.mjs`

B18 no crea un motor de aprendizaje, evaluator, tribunal ni ingeniero nuevo.

## Gates
- PREPROD solamente.
- coste adicional 0 €.
- sin datos de cliente.
- sin Trading.
- sin PROD write.
- sin auto-merge.
- juez independiente `JDG-001` distinto del actor candidato.
- backup/rollback/rebuild obligatorios.
- una no-mejora o regresión exige rechazo/rollback.
- metadata, plan-only, synthetic-only y self-judging no certifican B18.

## Evidencia certificada
Workflow: `CEREBRO Universal Skill B18 LRN Measured Engineer Outcome Loop V1` run #2, `run_id=39080643672`, exact PR head `ed92f8b7ff351d98318d57225b4d3f510e20b7a4`: targeted GREEN, OLD/NEW real GREEN, full CEREBRO regression GREEN.

Artifact: `12119220118`, digest `sha256:f4dd30b155d31093507f6107c482a42e5ac5043a89644b58fdcdf7fa63429520`.

## Resultado terminal B18
`HECHO_PREPROD`.

Siguiente bloque: `B19_UNIVERSAL_E2E_REAL`.
