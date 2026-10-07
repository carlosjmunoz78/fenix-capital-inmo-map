# CEREBRO OS · Skill Supply Chain V0

Estado: **PROD READ-ONLY CANARY GREEN / PROD WRITES DISABLED / GITHUB GREEN HASTA PREPROD**
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

Descubrir no implica confiar. LAB GREEN no implica PROD. PREPROD GREEN no implica PROD. PROD read-only GREEN no autoriza writes PROD ni autoriza automáticamente nuevos candidatos.

## 3. LAB Behavioral · HECHO

Behavioral evidence baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.

Supabase/Postgres: run `37642814017`, artifact `11492473830`, 6/6 llamadas sintéticas, Gemini gratuito acotado, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

agent-browser: run `37644374137`, artifact `11494440533`, raw `STATIC_LAB_HOLD` preservado, wrapper normalizado GREEN sin relajar thresholds, 6/6 llamadas sintéticas, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

GitHub: candidato `lobehub-skills:52441cd3d76607ffffab`, upstream `openclaw/openclaw`, manifest `skills/github/SKILL.md`, wrapper `skillwrap:cerebro-github-v0.1.0`. Run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`; 6/6 llamadas mediante `google-gemini-api-free` + `gemini-3.5-flash-lite`, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN, `READY_FOR_PREPROD_PROMOTION_REVIEW`.

## 4. PREPROD runtime · HECHO

Evidence head genérico `86369e0cd0d54c9c205bd39f309804a62b2c59d3`, workflow `37647914902`, artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.

Se ejecutaron 18 operaciones OLD/NEW/rollback sobre 2 bindings dentro de `SharedRuntime` PREPROD, con fixtures sintéticos no cliente, observabilidad/audit/FinOps, coste 0 €, rollback físico GREEN y rebuild final `DISABLED`. Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

### GitHub PREPROD · HECHO

Se creó un lane aislado y paralelo, sin sustituir el PREPROD genérico. El primer intento `37667783071` se detuvo fail-closed antes del runtime porque una aserción esperaba el campo `merge_authorized` en Registry, mientras el schema canónico expresa esa frontera como `prod_write_authorized`. Se corrigió únicamente esa comprobación, sin rebajar gates ni permisos.

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
- Datos PROD/cliente: NO.
- Código externo de skills: NO.
- PROD writes: NO.
- Trading: NO.
- Paid fallback: NO.
- Merge/PROD/autopromoción: NO autorizados.

## 5. Dark launch a main · HECHO para lane previamente autorizado

Con autorización humana `HIGH_RISK`, PR #486 fue fusionado a `main` en `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.

El despliegue de la App Fénix no se disparó; `PROD Live Deploy` quedó SKIPPED al no existir token `[DEPLOY_PROD]`. El `PROD Runtime Smoke` posterior quedó GREEN, preservando App/Gateway y fail-closed existentes.

Esta evidencia no constituye promoción automática del nuevo candidato GitHub.

## 6. PROD read-only canary · HECHO para lane previamente autorizado

Workflow `37662400743` sobre head `c84efac4b014aab873d4f484207cbce564792030`.
Artifact `11500917864`.
Digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

Resultado: `GREEN_PROD_READONLY_CANARY`.

- Runtime canary aislado `PROD_CANARY`.
- 2 lecturas reales PROD mediante GET: raíz pública de App y health del `fenix-app-gateway`.
- App HTTP 200.
- Gateway HTTP 200, `env=PROD`, `service=fenix-app-gateway`.
- Wrappers Supabase/Postgres y agent-browser ejercitados localmente bajo policy CEREBRO.
- Los wrappers conservan `prod_authorized=false`.
- PROD writes: NO.
- Datos cliente: NO.
- Credenciales expuestas: NO.
- Código externo de skills: NO.
- Trading: NO.
- Paid fallback: NO.
- Coste adicional: 0 €.
- Binding temporal: ENABLED solo durante canary y restaurado a `DISABLED`.
- Rollback: GREEN.

El candidato GitHub todavía **no** está incluido en este canary y no hereda su autorización.

## 7. Alcance exacto del GREEN actual

La capability previamente autorizada está probada hasta **PROD read-only observation canary**. El candidato GitHub está probado hasta **PREPROD runtime + Judge + Tribunal**, con rollback/rebuild y observabilidad completos.

Para GitHub, el siguiente paso es `PROD_READONLY_CANARY` y permanece detenido por `HUMAN_REQUIRED=HIGH_RISK`. `github_prod_readonly_canary_authorized=false`.

No se autoriza ni se necesita convertir estas skills en ejecutables autónomos: continúan siendo guidance no confiable detrás de wrappers CEREBRO. Cualquier futura ampliación que introduzca write PROD, datos cliente, nuevas credenciales, permisos, side effects o Trading vuelve a `HUMAN_REQUIRED=HIGH_RISK` o al motivo de excepción aplicable.

## 8. No interferencia

App/CRM/Supabase/Notion/WordPress/SEO/Training se preservan. Trading permanece aislado. No hay nueva suscripción ni servidor. No se ha activado despliegue de App por el PREPROD GitHub.

## 9. Estado documental

- Registry: `cerebro/registry/skill-supply-chain-v0.json`.
- Contract: `cerebro/contracts/skill-supply-chain-v0.json`.
- Dependency map: `cerebro/docs/SKILL_SUPPLY_CHAIN_DEPENDENCY_MAP_V0.md`.
- Runbook: `cerebro/docs/SKILL_SUPPLY_CHAIN_RUNBOOK_V0.md`.
- Changelog: `cerebro/docs/SKILL_SUPPLY_CHAIN_CHANGELOG_V0.md`.
- Backup/rebuild: `cerebro/docs/SKILL_SUPPLY_CHAIN_BACKUP_REBUILD_V0.md`.
- Autonomy: `cerebro/docs/SKILL_SUPPLY_CHAIN_AUTONOMY_V0.md`.

## 10. Estado semántico

HECHO: Discovery, LAB, OLD vs NEW, Gemini zero-cost, Judge/Tribunal, PREPROD runtime, rollback/rebuild, dark launch a main y canary PROD read-only para lane previo; GitHub LAB + PREPROD GREEN con evidencia inmutable.

EXISTENTE: FACT-001, runtime compartido, ledgers, policy/governance y sistemas Fénix preservados.

PARCIAL: GitHub queda pendiente exclusivamente de un nuevo gate HIGH_RISK para su PROD read-only canary; cualquier capacidad de escritura/side-effect PROD permanece prohibida.

DEFINIDO: operación fail-closed, coste 0 €, wrappers subordinados, evidencia por candidato y rollback inmediato.

PLANIFICADO: monitor/recheck incremental; GitHub canary solo tras autorización humana explícita.

## 11. Next block

No hay bloqueo técnico de PREPROD para GitHub. El Tribunal lo dejó en `GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW`. El siguiente bloque técnico está definido, pero no puede ejecutarse sin un nuevo `HUMAN_REQUIRED=HIGH_RISK` explícito.
