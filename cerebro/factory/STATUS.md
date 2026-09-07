# CEREBRO Structural Bootstrap · Estado V0

## HECHO / VERDE · FACTORY, GOVERNANCE Y PREPROD
- FACT-001 · Fábrica de Motores CEREBRO V0 integrada y operativa en PREPROD.
- GOV-001 · Engine Registry V0; POL-001 · Promotion Policy V0 con PROD deny-by-default; HEX-001 · Human Exception Policy con los 8 códigos canónicos.
- Shared runtime contracts: `company_id`, `engine_id`, `environment`, `version`.
- Registry/manifests/factory/governance tests: verdes.
- APP/CRM/WEB/SOCIAL permanecen como baseline mínimo obligatorio.
- Coste adicional: 0 €.

## HECHO / VERDE · APP COMPATIBILITY
- PR #128 integrado; rerun del fallo aislado de Agenda: SUCCESS.
- PR #129 integrado tras Factory + App Compatibility verdes.
- PR #131 y PR #132 son governance/evidence-only y se integraron únicamente tras Factory + App Compatibility verdes.
- HEAD PREPROD tras reconciliación Cloudflare: `2e008d674228921c0e0ef709cc9929051ed74a1f`.
- `PRE-PROD App Build` run #3333: SUCCESS tras PR #131.
- `PRE-PROD App Build` run #3334: SUCCESS tras PR #132; Build PREPROD, Browser QA, CORS, candidato PROD inmutable, QA exacto, leak guard, sellado y artifacts verdes.
- No deploy PROD ni DDL PROD.

## HECHO / VERDE · CLOUDFLARE NON-PROD RECONCILIATION
- Issue #127 cerrado con evidencia reproducible.
- Workers `fenix-capital-inmo-map` y `fenix-capital-inmo-maps`: tras snapshot se retiraron sólo triggers NON-PROD/preview; ambos conservan exclusivamente trigger `main`.
- Pages `fenix-capital-inmo-map`: `preview_deployment_setting` cambió `all → none`; `production_branch=main` y `production_deployments_enabled=true` preservados.
- Configuración build legacy Next.js de Pages quedó intencionadamente sin tocar para no afectar main/PROD; con previews desactivados deja de ser gate NON-PROD.
- Rollback Workers y Pages documentado. Make TEMP 9773361 desactivado tras verificación.
- Evidencias: `governance/cloudflare-control-plane-reconciliation-2026-09-08.json` y `governance/cloudflare-pages-reconciliation-2026-09-08.json`.

## HECHO / VERDE · CORE-001 PROD OBSERVER
- Core Guard live `1.0.0-rc9-prod2`: health score 100, `build_channel=production`, `mode=observer`, tablas listas, `pending_jobs=0`, smoke de portada verde.
- `operational_writes_allowed=false`, `safe_default=true`.
- Clasificación: `CONFIRMED_OPERATIONAL_PROD_OBSERVER`.

## HECHO / VERDE · SEO PREPROD + PROD RUNTIME
- STAGING genuino `staging.fenixcapital.es` verificado.
- `fenix-seo-cerebro/canary` en STAGING: `seo_cerebro_canary_passed`, `missing_image_alt`, snapshot `47`, `fixed_verified`, `patched=true`, cleanup y restauración de gate/modo.
- Evidencia PREPROD: `governance/seo-staging-canary-validation-2026-09-07.json`.
- Posteriormente `fenix-seo-cerebro/loop-once(limit=1)` se ejecutó en PROD con el Core en observer y writes operativos cerrados.
- Resultado PROD: `ok=true`, `alerts_seen=0`, sin remediación de contenido; status posterior confirmó `last_run` no nulo a `2026-09-07T22:53:04+00:00` y `learning_count=0`.
- Evidencia PROD: `governance/seo-prod-empty-cycle-validation-2026-09-07.json`.
- Clasificación: `CONFIRMED_OPERATIONAL_PROD_EMPTY_CYCLE`. La habilitación de escrituras autónomas de contenido sigue gobernada por Promotion Policy.

## HECHO / VERDE · CRM/DOC, SOCIAL Y TRN
- CRM/DOC: boundaries críticos con RLS/grants/RPC auditados live; sin exposición directa `anon`/`authenticated` evidenciada.
- Social: workflows mutantes Buffer quedan manuales y gate determinista evita reintroducir mutación por push/schedule.
- TRN-001: E2E TEST directo SUCCESS `dedupe → Idea → Matriz → Evaluación → Laboratorio → dedupe`; replay idéntico se detuvo en dedupe sin nuevas escrituras.

## RLS-001 · CONTROLADO, PROD SIN MODIFICAR
`fenix_prod.special_cases`, `special_case_people` y `expediente_stage_history` continúan sin RLS en PROD. No tienen grants directos a `anon`/`authenticated`; RPC y roles fueron auditados. PREPROD representativo es verde. Cualquier DDL PROD requiere snapshot, callers, OLD vs NEW, smoke y rollback.

## HUMAN_REQUIRED · EXCEPCIONES EXTERNAS / PROD
Cola canónica: `governance/human-exception-queue-2026-09-07.json` v1.7.0.

1. `HIGH_RISK` · **Branch protection** (#124): rulesets live vacíos; el conector GitHub administrado no expone admin de protection. Make dispone de REST GitHub, pero falta una conexión GitHub autorizada. Acción humana mínima: autorizar esa conexión; después CEREBRO retoma snapshot → protección mínima → test → rollback.
2. `HIGH_RISK` · **LAB-TRD runtime directo** (#126): aislamiento y PAPER/SHADOW están documentados, pero no existe lectura actual accesible de VM/Compute. Acción humana mínima: autorizar/proporcionar lectura Compute/VM o health/log no mutante. `REAL_AUTHORIZED=false` / `BLOCK_REAL` permanece.
3. `SECURITY_INCIDENT` · **Cloudflare Pages secret rotation** (#133): una variable sensible apareció configurada como `plain_text` en control-plane. El valor se omite. No hay caller en repo accesible y ownership externo/legacy no está confirmado; no se rota a ciegas. Requiere inventario/confirmación de consumidores y rotación coordinada antes de PROD sensible.

## GATE PRE-FACTORY MASIVA
- Cloudflare #127: **CERRADO / VERDE**.
- Branch protection #124: **HUMAN_REQUIRED externo formalizado; sin acción autónoma segura restante sin autorización**.
- Trading #126: **HUMAN_REQUIRED externo formalizado; sin health vivo falsificado y REAL bloqueado**.
- Incidente #133: **SECURITY_INCIDENT formalizado; no bloquea scaffolding inerte PREPROD, sí bloquea cualquier uso/rotación PROD a ciegas**.
- Evidencia de cierre: `governance/pre-factory-gate-closeout-2026-09-08.json`.
- Resultado: **FACT-001 puede continuar con generación/registro de scaffolds PREPROD por familias**. Esto NO concede autonomía PROD.

## CIERRE ACTUAL
- **Factory/Governance/PREPROD:** `CONFIRMED_OPERATIONAL`.
- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`.
- **Cloudflare NON-PROD:** `CONFIRMED_RECONCILED`.
- **Core PROD Observer:** `CONFIRMED_OPERATIONAL_PROD_OBSERVER`.
- **SEO PREPROD remediation:** `CONFIRMED_PREPROD_CANARY_PASS`.
- **SEO PROD runtime:** `CONFIRMED_OPERATIONAL_PROD_EMPTY_CYCLE`.
- **TRN TEST runtime:** `CONFIRMED_OPERATIONAL_TEST_RUNTIME`.
- **App/CRM/Web/Social baseline:** preservado.
- **Coste adicional:** 0 €.
- **PROD autonomy total:** `DENY` mientras #124, #126 y #133 sigan aplicando.
- **Siguiente acción estructural:** primera familia multiempresa vía FACT-001 + CEREBRO Gateway/Console V0 temprano, sin crear servidores aislados ni tocar PROD.
