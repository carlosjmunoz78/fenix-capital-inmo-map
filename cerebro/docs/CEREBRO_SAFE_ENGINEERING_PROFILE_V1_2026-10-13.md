# CEREBRO · SAFE ENGINEERING PROFILE V1 · 2026-10-13

## Estado

**HECHO / INTEGRADO Y VALIDADO EN `main`.** El bloque 25-37 quedó consolidado como un único perfil transversal de ingeniería segura. Esto no equivale a promoción autónoma a PROD: `prod_authorized=false`, `prod_write_authorized=false` y `trading_access=false` siguen siendo fronteras explícitas.

## Objetivo

Consolidar los items 25-37 como un único perfil de ingeniería segura que reutiliza FACT-001, AUTO-001, QA-001, LRN-001 y RUNTIME-001, en lugar de crear 13 motores/agentes nuevos.

## Contrato aplicado

Secuencia obligatoria:

`UNDERSTAND_EXISTING -> DEFINE -> PLAN -> REUSE_BEFORE_BUILD -> ISOLATE_WORKTREE -> WRITE_TESTS_FIRST -> IMPLEMENT_MINIMAL_CHANGE -> SYSTEMATIC_DEBUG -> VERIFY -> CODE_REVIEW -> SECURITY_POLICY_REVIEW -> OLD_VS_NEW -> ROLLBACK_REBUILD_CHECK -> PROMOTION_REVIEW`.

La planificación falla cerrada si faltan inventario, mapa de dependencias, revisión de reutilización, aislamiento, tests previos, rollback, rebuild o backup/snapshot para una mutación.

Valores por defecto y fronteras: `new_engine_required=false`, `paid_model_required=false`, `additional_cost_eur=0`, `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`, `external_skill_code_execution=false`.

## Evidencia CI y promoción gobernada

Implementación validada: `1d4789d77ce875dcfa3ff49f4136a44f9cf71e01`.

PR de feature: `#637`; merge gobernado en `main`: `6db0cdd4dea493bacacd7d877558509efbd838fe`.

Hardening del gate post-merge: PR `#652`; merge en `main`: `30db184b8e3fac433af9dbad7f2f96f88594eda1`.

Validación exact-head previa al merge, workflow `CEREBRO Safe Engineering Profile V1`, run `38472053955`, Node 24:

- focused Safe Engineering contract: PASS;
- AUTO-001 regression: PASS;
- Skill Evolution regression: PASS;
- Evaluation Tribunal regression: PASS;
- `main` baseline full CEREBRO regression: PASS;
- candidate full CEREBRO regression: PASS.

Validación post-merge real sobre `main`, run `38473230754`:

- focused Safe Engineering contract: PASS;
- AUTO-001 regression: PASS;
- Skill Evolution regression: PASS;
- Evaluation Tribunal regression: PASS;
- full CEREBRO regression sobre `main`: PASS;
- main baseline full CEREBRO: PASS.

El `PROD Runtime Smoke` asociado al mismo HEAD de `main` también terminó PASS. `PROD Live Deploy` quedó SKIPPED; este bloque no autoriza ni necesita despliegue PROD.

La primera ejecución diagnóstica con Node 20 falló en `channel-access-profiles-v1.test.mjs` al intentar importar TypeScript directamente. El repositorio declara Node `24.x`; al alinear el gate con Node 24, tanto baseline como candidato pasaron completos. No se modificó ese contrato funcional para ocultar el fallo.

## OLD vs NEW

Baseline OLD: no contenía `CEREBRO_SAFE_ENGINEERING_PROFILE_V1`; full regression CEREBRO = PASS.

NEW integrado: añade el perfil y el gate Skill Evolution; full regression CEREBRO = PASS antes y después del merge; regresiones de seguridad/política observadas = 0; coste adicional = 0 €; autoridad PROD no aumenta; Trading no aumenta.

Veredicto: **NEW_BETTER** por cobertura de la nueva capacidad requerida sin regresión observable en la suite completa.

## Provenance / licencia

Las 13 disposiciones están registradas en `cerebro/registry/safe-engineering-profile.v1.json` y en `cerebro/skills/SAFE_ENGINEERING_PROFILE_ROLLOUT_V1.md`. Evolver permanece `PATTERNS_ONLY`; Claude-Mem permanece `LAB_MEMORY_ONLY`; Agency Agents es fuente de roles, no un despliegue masivo; OpenClaw/Hermes/AbacusAI se tratan como benchmark/wrap de valor único. Ninguno se instala como dependencia obligatoria para este perfil.

## Backup / rollback / rebuild

Backup lógico: historial Git + SHAs de `main` + PRs gobernados. Rollback del bloque = revertir, en orden inverso, el hardening post-merge `30db184b8e3fac433af9dbad7f2f96f88594eda1` y, si fuera necesario, el merge funcional `6db0cdd4dea493bacacd7d877558509efbd838fe`. No existen side effects PROD de este bloque que deban deshacerse.

Rebuild = restaurar runtime, tests, registry, documentación y workflow desde Git y volver a ejecutar el gate con Node 24. No requiere servicio de pago ni runtime externo nuevo.

## Cierre y siguiente bloque

Items 25-37: **HECHO** como integración de arquitectura/capacidad en `main`, con post-merge GREEN y sin expansión de autoridad.

Siguiente bloque autorizado: items 38-50 (IAM, Vault/secrets, standing permissions, renovación de sesión/tokens, routing API/MCP/script/browser, Browser Bridge, GenericAgent LAB, Camoufox LAB autorizado, NeuralAgent patterns, Watch & Learn, Android Device Worker, Jarvis OSS Android y Archer benchmark).
