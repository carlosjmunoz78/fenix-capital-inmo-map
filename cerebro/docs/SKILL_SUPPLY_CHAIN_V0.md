# CEREBRO OS · Skill Supply Chain V0

Estado: **PROD READ-ONLY CANARY GREEN / GITHUB PROD READ-ONLY CANARY GREEN / PROD WRITES DISABLED**
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

DISCOVER → RESOLVE_UPSTREAM → MANIFEST_STATIC_SCAN → LICENSE_EVIDENCE → SECURITY/POLICY_GATE → DEDUP/OVERLAP → PRELAB → DISABLED_WRAPPER → STATIC_LAB → OLD_VS_NEW → ZERO_COST_ROUTE → HARD_QUOTA → BEHAVIORAL_LAB → INDEPENDENT_JUDGE → LAB TRIBUNAL → PREPROD RUNTIME → PREPROD JUDGE → PREPROD TRIBUNAL → HIGH_RISK REVIEW → DARK LAUNCH MAIN → PROD READ-ONLY CANARY → MONITOR → LEARN → RECHECK.

Descubrir no implica confiar. LAB GREEN no implica PROD. PREPROD GREEN no implica PROD. PROD read-only GREEN no autoriza writes PROD.

## 3. LAB Behavioral · HECHO

Behavioral evidence baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.

Supabase/Postgres: run `37642814017`, artifact `11492473830`, 6/6 llamadas sintéticas, Gemini gratuito acotado, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

agent-browser: run `37644374137`, artifact `11494440533`, raw `STATIC_LAB_HOLD` preservado, wrapper normalizado GREEN sin relajar thresholds, 6/6 llamadas sintéticas, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

GitHub: candidato `lobehub-skills:52441cd3d76607ffffab`, upstream `openclaw/openclaw`, manifest `skills/github/SKILL.md`, wrapper `skillwrap:cerebro-github-v0.1.0`. Run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`; 6/6 llamadas mediante `google-gemini-api-free` + `gemini-3.5-flash-lite`, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

## 4. PREPROD runtime · HECHO

Evidence head genérico `86369e0cd0d54c9c205bd39f309804a62b2c59d3`, workflow `37647914902`, artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.

Se ejecutaron 18 operaciones OLD/NEW/rollback sobre 2 bindings dentro de `SharedRuntime` PREPROD, con fixtures sintéticos no cliente, observabilidad/audit/FinOps, coste 0 €, rollback físico GREEN y rebuild final `DISABLED`. Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

### GitHub PREPROD · HECHO

Lane aislado y paralelo, sin sustituir el PREPROD genérico. El primer intento `37667783071` se detuvo fail-closed antes del runtime por una aserción de schema. Se corrigió únicamente esa comprobación, sin rebajar gates ni permisos.

Run GREEN `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.

- 3 fixtures sintéticos no cliente.
- 9 ejecuciones: baseline + GitHub wrapper + rollback baseline.
- 5/5 tests focalizados GREEN.
- Observabilidad 9, audit 9, FinOps 9; audit chain válida.
- Coste adicional: 0 €.
- Rollback físico: GREEN.
- Rebuild final: `DISABLED`.
- Judge: `GREEN_FOR_PREPROD_TRIBUNAL`.
- Tribunal: `GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW`, blockers 0.
- Datos PROD/cliente, código externo, writes PROD, Trading y paid fallback: NO.

## 5. Dark launch a main · HECHO para lane previo

Con autorización humana `HIGH_RISK`, PR #486 fue fusionado a `main` en `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.

El despliegue de la App Fénix no se disparó; `PROD Live Deploy` quedó SKIPPED al no existir token `[DEPLOY_PROD]`. El `PROD Runtime Smoke` posterior quedó GREEN.

## 6. PROD read-only canary existente · HECHO

Workflow `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

Resultado: `GREEN_PROD_READONLY_CANARY` con 2 GET reales sobre App pública y health del Gateway, sin writes, datos cliente, código externo, Trading ni coste adicional. Binding final `DISABLED`; rollback GREEN.

## 7. GitHub PROD read-only canary · HECHO

Autorización humana permanente: mejorar de forma segura y reversible sin romper lo existente. El canary se acotó expresamente a lectura GitHub; no autorizó mutaciones.

Workflow `37670597824`, head `7ee76db7a44b7e3c1153fd3b35365fc2e2ca5554`.
Artifact `11505096443`.
Digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`.

Resultado: `GREEN_GITHUB_PROD_READONLY_CANARY`.

- Runtime aislado `PROD_CANARY`.
- Evidencia PREPROD inmutable revalidada antes del canary.
- Tests canary: 4/4 GREEN.
- 2 GET reales a GitHub: metadata del repositorio y ref `main`.
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`.
- SHA `main` observado: `3304c93b3aceed338fc2bb7d377c4d562d2d18b2`.
- Wrapper `skillwrap:cerebro-github-v0.1.0` aplicado localmente bajo policy CEREBRO.
- `prod_authorized=false` preservado.
- GitHub write: NO.
- Merge: NO.
- Push: NO.
- Mutación issues/PR: NO.
- Workflow dispatch: NO.
- Datos cliente: NO.
- Credenciales expuestas: NO.
- Código externo de skills: NO.
- Trading: NO.
- Paid fallback: NO.
- Coste adicional: 0 €.
- Binding temporal restaurado a `DISABLED`.
- Rollback: GREEN.

## 8. Alcance exacto del GREEN actual

La capability está probada hasta **PROD read-only observation canary**. El candidato GitHub también está probado hasta **PROD read-only observation canary** y queda `PROD_READONLY_ADVISORY_ELIGIBLE` detrás del wrapper CEREBRO.

No se autoriza convertir estas skills en ejecutables autónomos ni a realizar writes. Cualquier futura ampliación que introduzca write PROD/GitHub, merge automático, push, mutación de PR/issues, datos cliente, nuevas credenciales, permisos superiores, side effects, ejecución externa o Trading vuelve a `HUMAN_REQUIRED=HIGH_RISK` o al motivo de excepción aplicable.

## 9. No interferencia

App/CRM/Supabase/Notion/WordPress/SEO/Training se preservan. Trading permanece aislado. No hay nueva suscripción ni servidor. El canary GitHub no desplegó App ni modificó el repositorio observado.

## 10. Estado documental

- Registry: `cerebro/registry/skill-supply-chain-v0.json`.
- Contract: `cerebro/contracts/skill-supply-chain-v0.json`.
- Dependency map: `cerebro/docs/SKILL_SUPPLY_CHAIN_DEPENDENCY_MAP_V0.md`.
- Runbook: `cerebro/docs/SKILL_SUPPLY_CHAIN_RUNBOOK_V0.md`.
- Changelog: `cerebro/docs/SKILL_SUPPLY_CHAIN_CHANGELOG_V0.md`.
- Backup/rebuild: `cerebro/docs/SKILL_SUPPLY_CHAIN_BACKUP_REBUILD_V0.md`.
- Autonomy: `cerebro/docs/SKILL_SUPPLY_CHAIN_AUTONOMY_V0.md`.

## 11. Estado semántico

HECHO: Discovery, LAB, OLD vs NEW, Gemini zero-cost, Judge/Tribunal, PREPROD runtime, rollback/rebuild, dark launch previo, canary PROD read-only existente y GitHub canary PROD read-only GREEN.

EXISTENTE: FACT-001, runtime compartido, ledgers, policy/governance y sistemas Fénix preservados.

PARCIAL: cualquier capacidad de escritura/side-effect PROD o GitHub permanece prohibida.

DEFINIDO: operación read-only/advisory fail-closed, coste 0 €, wrappers subordinados, evidencia por candidato y rollback inmediato.

PLANIFICADO: monitor/recheck incremental y promoción gradual a `main` de los componentes read-only/advisory, sin disparar despliegue de App.

## 12. Next block

GitHub no tiene bloqueo técnico para operación read-only/advisory. El siguiente bloque ordinario es documentar/promover gradualmente los componentes GREEN a `main` sin `[DEPLOY_PROD]`, verificar checks y PROD Runtime Smoke, y después continuar monitor/recheck. Cualquier permiso de escritura sigue fuera de alcance.
