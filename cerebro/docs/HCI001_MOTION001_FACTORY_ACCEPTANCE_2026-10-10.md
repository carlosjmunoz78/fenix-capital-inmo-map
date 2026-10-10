# HCI-001 + MOTION-001 · FACT-001 V1 Structural Acceptance · 2026-10-10

## Resultado

**STRUCTURAL_FACTORY_GREEN** para `HCI-001` y `MOTION-001` en `SCAFFOLD`.

No equivale a implementación funcional, PREPROD ni PROD.

## Evidencia física

- Merge source SHA: `a708524b8fb9495747d4446189d61ae8474e2764`
- Workflow: `CEREBRO FACT-001 AutoFactory V1`
- Run: `38063071980`, attempt 1
- Resultado workflow: `success`
- Artifact: `fact001-v1-autofactory-38063071980-1`
- Artifact SHA-256: `8985f6926c166d680d6bd09a78ca8d9f2980b798a5aa656f8be14e4532741813`
- Base Registry preservado: `true`
- Motores base preservados: `177`
- Registro V1 estructural: `179`
- PROD Live Deploy: `skipped`

### HCI-001

- 18 archivos scaffold verificados.
- Bundle SHA-256: `d45119b1ed4134260172a9782957cb16b8f1563768a02a07a89babcfcbb3424f`
- Structural evaluation: `GREEN`
- Engine evaluation: `NOT_RUN_SCAFFOLD_ONLY`
- Tribunal: `NOT_RUN_SCAFFOLD_ONLY`
- Next gate: `PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED`

### MOTION-001

- 18 archivos scaffold verificados.
- Bundle SHA-256: `c67cc97b1140f6887a49ac7f68f19c3fbeb1c43461f3029143d689ad986d88ab`
- Structural evaluation: `GREEN`
- Engine evaluation: `NOT_RUN_SCAFFOLD_ONLY`
- Tribunal: `NOT_RUN_SCAFFOLD_ONLY`
- Next gate: `PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED`

## Preservación OLD

FACT-001 V1 no sustituyó FACT-001 V0 ni reescribió `engine-registry.seed.json`. La nueva ruta conservó los 177 IDs V0 en orden exacto y añadió únicamente los dos motores aprobados. Los tests PR confirmaron factory-preprod-shadow, App surface isolation y tribunal shadow en verde antes del merge.

## Authority boundary

- additional cost: `0 €`
- prod_authorized: `false`
- prod_write_authorized: `false`
- trading_access: `false`
- external_code_execution: `false`

## Lo que falta

Ambos motores siguen en estado estructural. Antes de PREPROD necesitan implementación conductual real, contratos ejecutables, tests específicos, telemetría, evaluación independiente y tribunal. Antes de PROD además requieren OLD vs NEW, backup/rollback/rebuild probados, coste medido y promoción gradual.
