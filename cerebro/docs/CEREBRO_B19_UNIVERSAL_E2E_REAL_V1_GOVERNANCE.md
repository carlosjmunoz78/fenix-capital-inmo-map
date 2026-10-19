# CEREBRO B19 · Universal E2E Real V1 · Governance

Fecha: 2026-10-18  
Repo: `carlosjmunoz78/fenix-capital-inmo-map`  
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`  
PR: `#784`  
Entorno: `PREPROD`  
Coste adicional: `0 €`

## Contract

B19 certifica físicamente una cadena gobernada completa sobre una candidata first-party de software engineering:

`FACT factory -> register HOLD -> evaluate OLD -> LRN -> Safe Engineering -> evaluate NEW -> OLD vs NEW -> independent Tribunal -> non-PROD promotion gates -> controlled rollback/rebuild -> append-only audit -> final native PREPROD registration`.

Contrato máquina: `cerebro/contracts/universal-skill-b19-e2e-real-v1.contract.json`.

Invariantes duras:
- `company_id=fenix`, `engine_id=FACT-001`, `environment=PREPROD`;
- ninguna etapa concede `PROD`, write PROD, auto-merge, Trading, customer data, instalación de dependencia ni ejecución de código externo;
- coste incremental `0 €`;
- el candidato no puede declararse FULL por documentación, catálogo o wrapper: requiere consumo/binding y pruebas reales;
- `HUMAN_REQUIRED` conserva exclusivamente los ocho motivos canónicos del proyecto.

## Dependency map

B19 reutiliza, no duplica:
- `FACT-001`: `universal-skill-activation-planner-v1.mjs` y `fact-skill-native-v1.mjs`;
- `LRN-001`: persistencia medida usada por B18;
- Safe Engineering existente: `universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.mjs`;
- QA/EVA/JDG: `evaluation-tribunal.mjs` + Tribunal independiente de B18/Real Binding;
- Real Binding/Auto Engineering: `universal-skill-auto-engineering-v1.mjs` y `universal-skill-real-binding-v1.mjs`;
- promoción acotada: `promotion-pipeline.mjs`;
- observabilidad/auditoría/FinOps: `observability-audit-finops.mjs`;
- rollback/rebuild: baseline Git exacta + lifecycle físico del binding;
- CI exact-head: `.github/workflows/cerebro-universal-skill-b19-universal-e2e-real-v1.yml`.

No se introduce servidor nuevo, proveedor de pago, dependencia externa ni base paralela.

## Evidence

Código certificado: `11573142a88b94498e76320f1d5d8355a793de59`.  
Baseline OLD: `f17fd6481c27d11df3442fb5764ba63c414bbfea`.  
Workflow: `CEREBRO Universal Skill B19 Universal E2E Real V1` run `#3`, `run_id=39082605153`, `SUCCESS`.  
Artifact: `12119710913`.  
Digest: `sha256:b2a01e911f597d57fb88d132a151ce71122de10ef36d43e53ab89dc842dd801e`.

Resultado del artifact exact-head:
- `B19_GREEN_PREPROD`;
- FACT plan `ACTIVATION_PLAN_READY`, 8 bindings;
- registro inicial `HOLD`, sin HUMAN_REQUIRED;
- métrica física `order_invariance_score`: OLD `0`, NEW `1`;
- LRN persistido en baseline y siguiente ciclo;
- Safe Engineering `PASS_PREPROD_PLAN`;
- comparación `NEW_BETTER`;
- Tribunal `APPROVE_PREPROD_NEXT_STAGE`;
- promoción sana `KEEP_NONPROD`;
- breach controlado `ROLLBACK` a la baseline;
- lifecycle físico `FULL_SAFE_PREPROD`;
- backup, rollback, rebuild, observabilidad, audit, FinOps e idempotencia `GREEN`;
- registro final `NATIVE_FULL_PREPROD`, decisión `ENVOLVER`;
- audit hash-chain válida con 12 registros;
- targeted B18+B19 y full CEREBRO regression `GREEN`.

## Runbook

1. Confirmar que el branch/PR siguen en PREPROD y que no existe expansión de autoridad.
2. Ejecutar tests dirigidos B18+B19.
3. Materializar la baseline OLD por SHA en worktree detached.
4. Ejecutar `cerebro/tests/run-universal-skill-b19-evidence-v1.mjs` con módulo OLD real y módulo NEW del exact head.
5. Exigir OLD=0, NEW=1 y B18 green; si no, `FAIL CLOSED`.
6. Exigir FACT initial `HOLD`, LRN persistido, Safe Engineering, Tribunal independiente y promotion non-PROD.
7. Exigir lifecycle físico con backup/rollback/rebuild, OBSERV/AUD/FINOPS e idempotencia.
8. Exigir FACT final `NATIVE_FULL_PREPROD`.
9. Verificar append-only audit chain y 12 registros previstos.
10. Ejecutar full CEREBRO regression.
11. Publicar artifact de evidencia exact-head. Si cualquier gate falla, no actualizar Registry como cerrado.

Workflow canónico: `CEREBRO Universal Skill B19 Universal E2E Real V1`.

## Backup / rollback / rebuild / autonomy

Backup:
- baseline física fijada por SHA `f17fd6481c27d11df3442fb5764ba63c414bbfea`;
- artifact CI conserva report, learning ledger, audit ledger, exact head y baseline head;
- el binding físico exige `backup_ready=true`.

Rollback:
- el pipeline prueba una brecha controlada y exige `decision=ROLLBACK`;
- `rollback_ref=git:f17fd6481c27d11df3442fb5764ba63c414bbfea`;
- `rollback_green=true` debe constar en el lifecycle físico.

Rebuild:
- el workflow exact-head materializa OLD desde Git y reconstruye la evidencia NEW desde el código del head;
- `rebuild_green=true` e idempotencia son gates obligatorios;
- corrupción, drift de autoridad o evaluación incompleta mantienen HOLD/FAIL CLOSED.

Autonomía:
- B19 certifica autonomía acotada PREPROD de la cadena técnica, no autonomía PROD de negocio;
- `prod_authorized=false`, `prod_write_authorized=false`, `prod_mutation_authorized=false`, `auto_merge=false`;
- customer data y Trading siguen fuera del alcance;
- cualquier promoción posterior requiere su propia política/gate y evidencia exact-head.

## Changelog

### 1.1.0 · 2026-10-18
- B19 cerrado con evidencia exact-head real.
- Corregido el gate FACT final para consumir el esquema real de EVA: `evaluation.leakage_check=PASS` + `delta>0`; el Tribunal permanece como gate independiente.
- Añadidos contrato lifecycle específico, registry B19 y documentación consolidada de dependency map/runbook/backup/rebuild/autonomy.
- Ningún cambio de autoridad, PROD, Trading, customer data o coste.

### 1.0.0 · 2026-10-18
- Primera implementación de B19: runtime, tests, OLD fixture controlado, exact-head evidence runner y GitHub Actions workflow.

## Next block

`B20_P0_ACCEPTANCE_AND_SCALE_RELEASE_CERTIFICATION`

Objetivo: certificar la misión P0 de issue `#780` como fábrica industrial y no caso único, combinando evidencia B19 con blind-batch/Scale184/repository-E2E, comprobando que no existe código candidate-specific necesario para activar entradas nuevas y que los estados terminales siguen siendo veraces. PREPROD only; no merge/PROD implícito.
