# CEREBRO OS · Skill Supply Chain V0

Estado: PREPROD GREEN / HUMAN_REQUIRED HIGH_RISK / PROD NO AUTORIZADO
Fecha de corte: 2026-10-07
Coste adicional medido: 0 €
PROD writes: NO
Nuevo engine_id: NO
External skill code execution: NO
Trading access: NO
Merge autorizado: NO
PROD autorizado: NO
Autopromoción: NO
HUMAN_REQUIRED actual: HIGH_RISK

## 1. Encaje arquitectónico

`cap:skill-supply-chain` es una capability transversal coordinada por `FACT-001`. Reutiliza Registry, contratos, seguridad/policy, QA/evaluación/Tribunal, Model Router, FinOps/free-tier, observabilidad y aprendizaje existentes. No sustituye SEO-001, Company Onboarding, App, CRM, Supabase, Notion, WordPress, Training ni Trading y no crea un engine_id nuevo.

Regla: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## 2. Flujo canónico

DISCOVER → RESOLVE_UPSTREAM → MANIFEST_STATIC_SCAN → LICENSE_EVIDENCE → SECURITY/POLICY_GATE → DEDUP/OVERLAP → PRELAB → DISABLED_WRAPPER → STATIC_LAB → OLD_VS_NEW → ZERO_COST_ROUTE → HARD_QUOTA → BEHAVIORAL_LAB → INDEPENDENT_JUDGE → LAB TRIBUNAL → PREPROD RUNTIME INTEGRATION → PREPROD JUDGE → PREPROD TRIBUNAL → HIGH_RISK PROMOTION REVIEW → CANARY cuando se autorice → PROMOTE → MONITOR → LEARN → RECHECK.

Todo es fail-closed. Descubrir no implica confiar; auditar no implica instalar; LAB GREEN no implica PROD; PREPROD GREEN no implica PROD.

## 3. Frozen LAB evidence

Behavioral evidence baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.

Supabase/Postgres:
- run `37642814017`, artifact `11492473830`;
- 6/6 llamadas sintéticas;
- Gemini `gemini-3.5-flash-lite` bajo ruta gratuita acotada;
- Judge GREEN, rollback binding GREEN, Tribunal GREEN;
- `READY_FOR_PREPROD_PROMOTION_REVIEW`.

agent-browser:
- run `37644374137`, artifact `11494440533`;
- raw `STATIC_LAB_HOLD` preservado;
- normalized wrapper GREEN, thresholds no relajados;
- 6/6 llamadas sintéticas;
- Judge GREEN, rollback binding GREEN, Tribunal GREEN;
- `READY_FOR_PREPROD_PROMOTION_REVIEW`.

## 4. Step 4 · PREPROD runtime integration · HECHO

Evidence head: `86369e0cd0d54c9c205bd39f309804a62b2c59d3`.
Workflow run: `37647914902` — SUCCESS.
Artifact: `cerebro-skill-preprod-37647914902`, ID `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.

Se creó un harness PREPROD separado del proxy LAB y se ejecutó sobre el runtime CEREBRO existente:

- `SharedRuntime` real, environment exacto `PREPROD`.
- `FACT-001` como owner/runtime engine.
- Dos bindings evaluados: Supabase/Postgres wrapper y agent-browser wrapper.
- Seis fixtures sintéticos no cliente.
- 18 ejecuciones totales: baseline OLD + wrapper NEW + rollback baseline.
- Observabilidad, audit chain y FinOps persistentes locales.
- Coste adicional medido: 0 €.
- No PROD/customer data.
- No external skill code.
- No PROD writes.
- No Trading.
- No paid fallback.

## 5. OLD vs NEW y rollback · HECHO

Para cada binding se ejecutó el baseline CEREBRO, después el wrapper normalizado y después rollback físico a baseline. La salida restaurada se contrastó por hash. Finalmente se reconstruyó el estado sin binding persistido, quedando `DISABLED` por defecto.

Resultado: `PREPROD_INTEGRATION_COMPLETE`, 2 packages GREEN, rollback físico GREEN y rebuild default-disabled GREEN.

El test focalizado ejecutó 3/3 subtests GREEN, incluyendo rechazo fail-closed de PROD, coste >0, datos PROD/cliente, writes, código externo y Trading, además de tampering de rollback/coste.

## 6. PREPROD Judge y Tribunal · HECHO

- Independent PREPROD Judge: `GREEN_FOR_PREPROD_TRIBUNAL`, blockers=[];
- PREPROD Tribunal: `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`, blockers=[];
- `HUMAN_REQUIRED=HIGH_RISK`;
- `merge_authorized=false`;
- `prod_authorized=false`;
- `autonomous_promotion_authorized=false`.

Todos los checks observados del evidence head `86369e0...` finalizaron SUCCESS.

## 7. Alcance exacto: qué significa PREPROD real aquí

Es real respecto al runtime/binding CEREBRO: el código de integración pasó por `SharedRuntime`, binding persistente local, observabilidad/audit/FinOps y rollback/rebuild físicos del binding.

Los fixtures son deliberadamente sintéticos no cliente. No se ejecutó código externo de las skills ni se realizaron side effects reales contra Supabase o un navegador externo. Esto no es una carencia oculta: forma parte del contrato de seguridad porque las skills admitidas se usan como guidance no confiable detrás de wrappers CEREBRO, no como ejecutables autónomos.

## 8. No interferencia

- PROD no tocado.
- Datos PROD/cliente no usados.
- App/CRM/SEO/WordPress/Supabase PROD no modificados.
- Código externo de skills no ejecutado.
- Writes PROD: NO.
- Trading: aislado/no accesible.
- No nuevo servidor ni suscripción de pago.

## 9. Estado documental

- Registry: `cerebro/registry/skill-supply-chain-v0.json`.
- Contract: `cerebro/contracts/skill-supply-chain-v0.json`.
- Dependency map: `cerebro/docs/SKILL_SUPPLY_CHAIN_DEPENDENCY_MAP_V0.md`.
- Runbook: `cerebro/docs/SKILL_SUPPLY_CHAIN_RUNBOOK_V0.md`.
- Changelog: `cerebro/docs/SKILL_SUPPLY_CHAIN_CHANGELOG_V0.md`.
- Backup/rebuild: `cerebro/docs/SKILL_SUPPLY_CHAIN_BACKUP_REBUILD_V0.md`.
- Autonomy: `cerebro/docs/SKILL_SUPPLY_CHAIN_AUTONOMY_V0.md`.

## 10. Status semántico

HECHO: LABs, PREPROD runtime integration, OLD vs NEW controlado, observabilidad/audit/FinOps, rollback físico del binding, rebuild disabled, PREPROD Judge y Tribunal.

EXISTENTE: FACT-001, shared runtime, ledgers, policy/governance y sistemas Fénix preservados.

PARCIAL: autonomía total, porque no hay PROD ni canary autorizado.

DEFINIDO: promoción gradual posterior al gate humano, con baseline y rollback preservados.

PLANIFICADO: canary/promoción únicamente si el humano supera el gate `HIGH_RISK`.

## 11. Next block

**STOP automático en `HUMAN_REQUIRED=HIGH_RISK`.**

La siguiente acción sería decidir si se autoriza la revisión/promoción gradual. No se hace merge, canary ni PROD por inferencia. Si se autoriza en un paso posterior, debe mantenerse el mismo contrato: cambio gradual, observabilidad, coste 0 €, rollback inmediato y sin ampliar permisos simultáneamente.
