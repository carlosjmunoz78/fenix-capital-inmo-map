# CEREBRO · SAFE ENGINEERING PROFILE V1 · 2026-10-13

## Estado

**PARCIAL / PREPROD VALIDADO SOBRE IMPLEMENTACIÓN.** El perfil transversal 25-37 existe y ha pasado sus gates de implementación. Aún no está fusionado en `main`, no tiene autoridad PROD y no autoriza Trading.

## Objetivo

Consolidar los items 25-37 como un único perfil de ingeniería segura que reutiliza FACT-001, AUTO-001, QA-001, LRN-001 y RUNTIME-001, en lugar de crear 13 motores/agentes nuevos.

## Contrato aplicado

Secuencia obligatoria:

`UNDERSTAND_EXISTING -> DEFINE -> PLAN -> REUSE_BEFORE_BUILD -> ISOLATE_WORKTREE -> WRITE_TESTS_FIRST -> IMPLEMENT_MINIMAL_CHANGE -> SYSTEMATIC_DEBUG -> VERIFY -> CODE_REVIEW -> SECURITY_POLICY_REVIEW -> OLD_VS_NEW -> ROLLBACK_REBUILD_CHECK -> PROMOTION_REVIEW`.

La planificación falla cerrada si faltan inventario, mapa de dependencias, revisión de reutilización, aislamiento, tests previos, rollback, rebuild o backup/snapshot para una mutación.

Valores por defecto y fronteras: `new_engine_required=false`, `paid_model_required=false`, `additional_cost_eur=0`, `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`, `external_skill_code_execution=false`.

## Evidencia CI

Implementación validada: `1d4789d77ce875dcfa3ff49f4136a44f9cf71e01`.

Workflow `CEREBRO Safe Engineering Profile V1`, run `38471616695`, Node 24:

- focused Safe Engineering contract: PASS;
- AUTO-001 regression: PASS;
- Skill Evolution regression: PASS;
- Evaluation Tribunal regression: PASS;
- `main` baseline full CEREBRO regression: PASS;
- candidate full CEREBRO regression: PASS.

La primera ejecución diagnóstica con Node 20 falló en `channel-access-profiles-v1.test.mjs` al intentar importar TypeScript directamente. El repositorio declara Node `24.x`; al alinear este gate con Node 24, tanto el baseline de `main` como el candidato pasaron completos. No se modificó ese contrato funcional para ocultar el fallo.

## OLD vs NEW

Baseline OLD: no contiene `CEREBRO_SAFE_ENGINEERING_PROFILE_V1`; full regression CEREBRO = PASS.

Candidate NEW: añade el perfil y el gate Skill Evolution; full regression CEREBRO = PASS; regresiones de seguridad/política = 0 observadas por los gates; coste adicional = 0 €; autoridad PROD no aumenta; Trading no aumenta.

Veredicto: **NEW_BETTER** por cobertura de la nueva capacidad requerida sin regresión observable en la suite completa. El registro `cerebro/registry/safe-engineering-profile.v1.json` conserva esta evidencia y el criterio de calidad utilizado.

## Provenance / licencia

Las 13 disposiciones están registradas en `cerebro/registry/safe-engineering-profile.v1.json` y en `cerebro/skills/SAFE_ENGINEERING_PROFILE_ROLLOUT_V1.md`. Evolver permanece `PATTERNS_ONLY`; Claude-Mem permanece `LAB_MEMORY_ONLY`; Agency Agents es fuente de roles, no un despliegue masivo; OpenClaw/Hermes/AbacusAI se tratan como benchmark/wrap de valor único. Ninguno se instala como dependencia obligatoria para este perfil.

## Backup / rollback / rebuild

Backup lógico: Git SHA de `main` + rama aislada + PR. Antes de merge, rollback = cerrar PR y borrar/resetear la rama. Después de merge gobernado, rollback = revertir el merge. No existen side effects PROD de este bloque que deban deshacerse.

Rebuild = restaurar runtime, tests, registry, documentación y workflow desde Git y volver a ejecutar el gate con Node 24. No requiere servicio de pago ni runtime externo nuevo.

## Promoción

Faltan únicamente los gates de cierre sobre el HEAD final del PR y, después del merge gobernado, la regresión post-merge en `main`. Hasta entonces el estado correcto sigue siendo PREPROD y no HECHO.

Siguiente bloque autorizado solo tras cierre: items 38-50 (IAM, Vault/secrets, standing permissions, renovación de sesión/tokens, routing API/MCP/script/browser, Browser Bridge, GenericAgent LAB, Camoufox LAB autorizado, NeuralAgent patterns, Watch & Learn, Android Device Worker, Jarvis OSS Android y Archer benchmark).
