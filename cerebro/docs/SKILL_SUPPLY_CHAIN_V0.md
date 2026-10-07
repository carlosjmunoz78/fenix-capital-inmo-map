# CEREBRO OS · Skill Supply Chain V0

Estado: **PROD READ-ONLY ADVISORY GREEN / GITHUB MONITOR GREEN / PROD WRITES DISABLED**
Fecha de corte: 2026-10-07
Coste adicional medido: 0 €
Nuevo engine_id: NO
Owner: `FACT-001`
External skill code execution: NO
Trading access: NO
PROD writes: NO
Autopromoción: NO

## 1. Encaje arquitectónico

`cap:skill-supply-chain` es una capability transversal coordinada por `FACT-001`. Reutiliza Registry, contratos, seguridad/policy, QA/evaluación/Tribunal, Model Router, FinOps/free-tier, observabilidad y aprendizaje existentes. No sustituye SEO-001, Company Onboarding, App, CRM, Supabase, Notion, WordPress, Training ni Trading y no crea un engine_id nuevo.

Regla: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## 2. Flujo canónico

DISCOVER → RESOLVE_UPSTREAM → MANIFEST_STATIC_SCAN → LICENSE_EVIDENCE → SECURITY/POLICY_GATE → DEDUP/OVERLAP → PRELAB → DISABLED_WRAPPER → STATIC_LAB → OLD_VS_NEW → ZERO_COST_ROUTE → HARD_QUOTA → BEHAVIORAL_LAB → INDEPENDENT_JUDGE → LAB TRIBUNAL → PREPROD RUNTIME → PREPROD JUDGE → PREPROD TRIBUNAL → HIGH_RISK REVIEW → DARK LAUNCH MAIN → PROD READ-ONLY CANARY → PROMOTE READ-ONLY → MONITOR → LEARN → RECHECK.

Descubrir no implica confiar. LAB GREEN no implica PROD. PREPROD GREEN no implica PROD. PROD read-only GREEN no autoriza writes PROD. Un monitor GREEN tampoco amplía permisos.

## 3. LAB Behavioral · HECHO

Behavioral evidence baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.

Supabase/Postgres: run `37642814017`, artifact `11492473830`, 6/6 llamadas sintéticas, Gemini gratuito acotado, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

agent-browser: run `37644374137`, artifact `11494440533`, raw `STATIC_LAB_HOLD` preservado, wrapper normalizado GREEN sin relajar thresholds, 6/6 llamadas sintéticas, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

GitHub: candidato `lobehub-skills:52441cd3d76607ffffab`, upstream `openclaw/openclaw`, manifest `skills/github/SKILL.md`, wrapper `skillwrap:cerebro-github-v0.1.0`. Run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`; 6/6 llamadas mediante `google-gemini-api-free` + `gemini-3.5-flash-lite`, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

## 4. PREPROD runtime · HECHO

Evidence head genérico `86369e0cd0d54c9c205bd39f309804a62b2c59d3`, workflow `37647914902`, artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.

Se ejecutaron 18 operaciones OLD/NEW/rollback sobre 2 bindings dentro de `SharedRuntime` PREPROD, con fixtures sintéticos no cliente, observabilidad/audit/FinOps, coste 0 €, rollback físico GREEN y rebuild final `DISABLED`. Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

### GitHub PREPROD · HECHO

Lane aislado y paralelo. Run GREEN `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.

3 fixtures sintéticos no cliente; 9 ejecuciones baseline/candidate/rollback; 5/5 tests GREEN; observabilidad/audit/FinOps 9/9/9; coste 0 €; rollback físico GREEN; rebuild `DISABLED`; Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW`. Datos PROD/cliente, código externo, writes PROD, Trading y paid fallback: NO.

## 5. Dark launch previo · HECHO

PR #486 fue fusionado a `main` en `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`. `PROD Live Deploy` quedó SKIPPED al no existir `[DEPLOY_PROD]`; `PROD Runtime Smoke` posterior quedó GREEN.

## 6. PROD read-only canary existente · HECHO

Run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`. Resultado `GREEN_PROD_READONLY_CANARY`: 2 GET reales sobre App pública y Gateway health, sin writes, datos cliente, código externo, Trading ni coste adicional; binding final `DISABLED`; rollback GREEN.

## 7. GitHub PROD read-only canary · HECHO

Run `37670597824`, head `7ee76db7a44b7e3c1153fd3b35365fc2e2ca5554`, artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`.

Resultado: `GREEN_GITHUB_PROD_READONLY_CANARY`. Tests 4/4 GREEN; 2 GET reales a metadata de repositorio y ref `main`; wrapper `skillwrap:cerebro-github-v0.1.0`; GitHub write/merge/push/mutaciones/workflow dispatch: NO; customer data/credenciales/código externo/Trading/paid fallback: NO; coste 0 €; binding final `DISABLED`; rollback GREEN.

## 8. Promoción GitHub read-only/advisory a main · HECHO

PR #488 fusionado a `main` en `257ba1b9f6d757866a67240c64c7300b6c5de223`.

Validación post-merge:

- Supply Chain Gate run `37671631421`: SUCCESS.
- PROD Runtime Smoke run `37671631622`: SUCCESS.
- PROD Live Deploy run `37671631338`: SKIPPED; la App no fue redesplegada.
- Discovery Scout run `37671631072`: SUCCESS.
- Discovery artifact `11505407332`, digest `sha256:a0c83328273ce7d7598c34b88487e8dadc781bb3908b28821ab8564d32f3e8cd`.
- Expansión de permisos: NO.

La promoción incorpora únicamente componentes read-only/advisory ya probados. No activa writes GitHub ni PROD.

## 9. Monitor/recheck GitHub read-only · HECHO

Se añadió un lane paralelo `CEREBRO Skill GitHub Read-only Monitor`, sin alterar el canary histórico. Está diseñado para `main`, ejecución manual y recheck diario a `04:47 UTC`, siempre con `contents: read` y sin permisos de escritura.

Primer run: `37679202506`, head `0a128fac3df39120d1d7f9fcda30857c18694969`, artifact `11508121977`, digest `sha256:0f7fa772e09434acabcf9180ac5eab7a9b640f68bfc2c27f07c0da4cb5b04672`.

Resultado GREEN:

- Contrato canónico read-only/advisory revalidado antes de observar PROD.
- 4/4 tests fail-closed GREEN.
- 2 GET reales exclusivamente.
- `main` observado: `257ba1b9f6d757866a67240c64c7300b6c5de223`.
- GitHub write, merge, push, mutaciones y workflow dispatch: NO.
- Datos cliente, credenciales expuestas, código externo, Trading y paid fallback: NO.
- Coste adicional: 0 €.
- Rollback: GREEN.
- Binding final: `DISABLED`.

## 10. Alcance exacto del GREEN actual

La capability y el candidato GitHub están en `PROD_READONLY_ADVISORY_GREEN`. El monitor read-only/recheck está probado y no amplía permisos.

No se autoriza convertir skills externas en ejecutables autónomos ni ejecutar writes. Cualquier futura ampliación que introduzca write PROD/GitHub, merge automático, push, mutación de PR/issues, datos cliente, nuevas credenciales, permisos superiores, side effects, ejecución externa o Trading vuelve a `HUMAN_REQUIRED=HIGH_RISK` o al motivo de excepción aplicable.

## 11. No interferencia

App/CRM/Supabase/Notion/WordPress/SEO/Training se preservan. Trading permanece aislado. No hay nueva suscripción ni servidor. La promoción #488 y el monitor no desplegaron App ni modificaron el repositorio observado durante las comprobaciones read-only.

## 12. Estado documental

- Registry: `cerebro/registry/skill-supply-chain-v0.json`.
- Contract: `cerebro/contracts/skill-supply-chain-v0.json`.
- Dependency map: `cerebro/docs/SKILL_SUPPLY_CHAIN_DEPENDENCY_MAP_V0.md`.
- Runbook: `cerebro/docs/SKILL_SUPPLY_CHAIN_RUNBOOK_V0.md`.
- Changelog: `cerebro/docs/SKILL_SUPPLY_CHAIN_CHANGELOG_V0.md`.
- Backup/rebuild: `cerebro/docs/SKILL_SUPPLY_CHAIN_BACKUP_REBUILD_V0.md`.
- Autonomy: `cerebro/docs/SKILL_SUPPLY_CHAIN_AUTONOMY_V0.md`.

## 13. Estado semántico

HECHO: Discovery, LAB, OLD vs NEW, Gemini zero-cost, Judge/Tribunal, PREPROD runtime, rollback/rebuild, canaries PROD read-only, promoción GitHub read-only/advisory a main y primer monitor/recheck GREEN.

EXISTENTE: FACT-001, runtime compartido, ledgers, policy/governance y sistemas Fénix preservados.

PARCIAL: cualquier capacidad de escritura/side-effect PROD o GitHub permanece prohibida.

DEFINIDO: operación read-only/advisory fail-closed, coste 0 €, wrappers subordinados, evidencia por candidato, monitor recurrente y rollback inmediato.

PLANIFICADO: mantener MONITOR/RECHECK; consumir la evidencia del Discovery Scout para priorizar el siguiente candidato por valor real y repetir el pipeline completo, sin inferir confianza ni permisos.

## 14. Next block

El bloque de promoción GitHub read-only está cerrado. El siguiente bloque ordinario es **MONITOR → LEARN → RECHECK + selección evidence-based del siguiente candidato**. CEREBRO puede hacerlo automáticamente dentro del alcance seguro y reversible ya autorizado. Cualquier ampliación de permisos continúa gated.
