# CEREBRO OS · B18 · RUNBOOK

Fecha: 2026-10-18
Estado: HECHO PREPROD

## Objetivo
Reproducir B18 sin tocar PROD y demostrar que un aprendizaje medido cambia una decisión de ingeniería posterior.

## Procedimiento
1. Confirmar rama `cerebro/universal-skill-activation-factory-v1-20261017` y PR #784 DRAFT.
2. Materializar OLD exacto `f17fd6481c27d11df3442fb5764ba63c414bbfea` en worktree separado.
3. Ejecutar targeted tests:
   - `cerebro/tests/auto001-preprod-patch-executor-v0.test.mjs`
   - `cerebro/tests/universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.test.mjs`
4. Ejecutar `universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.mjs` con OLD worktree y NEW current head.
5. Exigir `old_measurement.score=0` y `new_measurement.score=1` para `order_invariance_score`.
6. Exigir persistencia LRN, `PASS_PREPROD_PLAN`, `NEW_BETTER` y Tribunal `APPROVE_PREPROD_NEXT_STAGE`.
7. Exigir segundo ciclo con `learning_changed_next_decision=true`.
8. Ejecutar full CEREBRO regression con Node 24.x.
9. Guardar exact head, baseline, report y boundaries como artifact.
10. No promover a PROD; B18 únicamente habilita continuar a B19.

## Fallos
- OLD no reproduce 0: detener cierre y revisar baseline/fixture.
- NEW no da 1: rollback del cambio y volver a LRN.
- Tribunal FAIL: rollback obligatorio.
- Tribunal MORE_EVIDENCE: mantener HOLD y ampliar evidencia, no forzar verde.
- cualquier expansión de PROD/Trading/customer data/coste: fail closed; HUMAN_REQUIRED solo si coincide con código canónico.

## Evidencia de referencia
Run #2, `run_id=39080643672`, exact PR head `ed92f8b7ff351d98318d57225b4d3f510e20b7a4`, artifact `12119220118`.

## Next
`B19_UNIVERSAL_E2E_REAL`.
