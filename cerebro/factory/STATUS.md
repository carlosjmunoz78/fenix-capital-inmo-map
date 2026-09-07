# CEREBRO Structural Bootstrap · Estado V0

## HECHO / VERDE · FACTORY, GOVERNANCE Y PREPROD
- FACT-001 · Fábrica de Motores CEREBRO V0 integrada y operativa en PREPROD.
- GOV-001 · Engine Registry V0; POL-001 · Promotion Policy V0 con PROD deny-by-default; HEX-001 · Human Exception Policy con los 8 códigos canónicos.
- EVT-001, JOB-001, AUD-001 y OBSERV-001 registrados; Tribunal V0 determinista y DENY por defecto.
- Shared runtime contracts: `company_id`, `engine_id`, `environment`, `version`.
- Registry/manifests/factory/governance tests: verdes.
- RLS-001 tuvo validación representativa aislada en PREPROD; el candidato SQL permanece inerte y PROD no se modificó.
- APP/CRM/WEB/SOCIAL se mantienen como baseline mínimo y no han sido sustituidos ni degradados.
- Coste adicional acumulado de este cierre: 0 €.

## HECHO / VERDE · APP COMPATIBILITY Y POST-MERGE
- PR #121 cerró la excepción Core PROD mediante evidencia live read-only.
- PR #122 documentó que los fallos Cloudflare son externos/heredados y no una regresión de CEREBRO.
- PR #123 cerró TRN runtime mediante E2E TEST directo y deduplicación real.
- HEAD PREPROD tras PR #123: `ac98a5d1a6fdd5a97bc80d54a5a16f30dd73251a`.
- `PRE-PROD App Build` run `34165008629`: SUCCESS completo sobre ese HEAD.
- Gates verdes: install reproducible, build PREPROD, Browser QA PREPROD, CORS PREPROD, CORS PROD read-only/canonical, build candidato PROD inmutable, Browser QA exacto candidato, leak guard `*-test`, sellado y artifacts.
- `Upload PROD leak diagnostics` quedó SKIPPED porque no hubo leak; no representa fallo.
- No hubo deploy PROD ni DDL PROD.

## HECHO / VERDE · CORE-001 PROD EN OBSERVER
- Core Guard live `1.0.0-rc9-prod2` verificado directamente por WordPress Abilities.
- Health score 100, `build_channel=production`, `mode=observer`, tablas listas, `pending_jobs=0`, cron presente, smoke de portada verde.
- `operational_writes_allowed=false` y `safe_default=true`.
- El antiguo `cerebro-status ok=false` correspondía a checks de staging ejecutados en PROD (`staging_host`/cleanup), no a una caída de PROD.
- Clasificación: `CONFIRMED_OPERATIONAL_PROD_OBSERVER`.

## HECHO / VERDE · SEO RUNTIME, APRENDIZAJE AÚN BLOQUEADO
- SEO CEREBRO Bridge live `0.4.1`: `ok=true` y host `fenixcapital.es` confirmado read-only.
- Google bridge PREPROD de Make tiene ejecución automática SUCCESS.
- El runtime del bridge está confirmado; el aprendizaje PROD NO: `last_run=null`, `learning_count=0`.
- Solo `fenixcapital.es` está conectado en WPWriter y los escenarios Make TEST/PREPROD WordPress auditados usan la conexión WordPress PROD.
- Ejecutar `loop-once` o `canary` ahora sería mutación PROD sin WordPress PREPROD representativo. Se mantiene `LOW_CONFIDENCE`, issue #125.

## HECHO / VERDE · CRM Y DOCUMENTOS A NIVEL DE CONTRATO LIVE
- CRM-001 · boundaries críticos con RLS/grants/RPC auditados live y sin exposición directa `anon`/`authenticated` evidenciada.
- DOC-001 · documentos/versiones/orígenes/uploads/intelligence/change-history auditados a nivel de contrato live.
- Cualquier consolidación sigue prohibida sin PREPROD + OLD vs NEW.

## HECHO / VERDE · SEGURIDAD AUTOMATIZACIONES SOCIALES
- Workflows Buffer mutantes ya no se disparan por `push`; one-shots mutantes quedan manuales.
- Gate determinista evita reintroducir mutación Buffer por `push`/`schedule`.
- Social safety merge preservó comportamiento y no publicó durante el cierre.

## HECHO / VERDE · TRN-001 RUNTIME TEST
- Worker activo `FÉNIX · CORE · Cerebro · Señal a Idea, Embudo, Evaluación y Laboratorio · V2.2` validado directamente.
- Ejecución E2E `6660393c384b4c79b61a01d02e39d1e1`: SUCCESS, 6 operaciones; dedupe → Idea → Matriz → Evaluación → Laboratorio → dedupe record.
- Evidencia creada exclusivamente con `Entorno=TEST`, `OK Carlos=false`, `Apto calendario=false`, `Promovido a patrón=false`.
- Replay con el mismo `signal_id`, ejecución `359d076b93644540be2680fcf9910064`: SUCCESS con una sola operación útil de dedupe; no hubo nuevas escrituras Notion.
- Clasificación: `CONFIRMED_OPERATIONAL_TEST_RUNTIME`; no autoriza publicación/promoción PROD.
- Evidencia: `governance/trn-runtime-e2e-validation-2026-09-07.json`.

## RLS-001 · CONTROLADO, PROD SIN MODIFICAR
Las tablas `fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

La auditoría live confirmó: sin grants de tabla para `anon`/`authenticated`, owner `postgres`, RPC relevantes `SECURITY DEFINER`, EXECUTE auditado limitado a `postgres`/`service_role`. La prueba representativa PREPROD es verde, pero no autoriza DDL PROD. Cualquier cambio requiere snapshot/backup, callers reales, OLD vs NEW, smoke y rollback.

## EXISTENTE / REGISTRADO
- APP-001 y WEB-001 están envueltos; no recreados.
- Engine Registry, dependency registry, caller/Edge/RPC inventories, one-shot inventory y fronteras de solapamiento permanecen versionados.
- Las Edge `*-once` auditadas siguen como tombstones HTTP 410; no se eliminan sin caller inventory + rollback.
- Bank, directory, Ana, documents/evidence y expediente-stage mantienen fronteras explícitas; sin consolidación a ciegas.

## PARCIAL / EVOLUCIÓN INCREMENTAL
- DEP-001 · principales callers/RPC/finding RLS cerrados; la clausura semántica total Edge → RPC → tabla continúa incremental y no invalida el cierre estructural.
- CRM/DOC · contrato live verde; aceptación exhaustiva de todos los escenarios de negocio es una certificación posterior distinta.

## HUMAN_REQUIRED · ÚNICOS BLOQUEOS DE PROD RESTANTES
La cola canónica es `governance/human-exception-queue-2026-09-07.json` v1.4.0. Ninguno de estos puntos autoriza bypass:

1. `HIGH_RISK` · **branch protection** de ramas críticas. No hay rulesets en el repo App y el conector actual carece de write administrativo para protección. Tracking: issue #124.
2. `LOW_CONFIDENCE` · **SEO learning PROD**. Runtime healthy, pero falta WordPress PREPROD representativo y un ciclo snapshot → learning → verify → rollback → OLD vs NEW. Tracking: issue #125.
3. `HIGH_RISK` · **LAB-TRD runtime directo**. P38 documenta aislamiento, Shadow/Paper y `BLOCK_REAL`, pero falta lectura actual de VM/control-plane. No hay repo Trading accesible, escenario Make Trading, artifact Drive ni conector GCP Compute. Tracking: issue #126.
4. `HIGH_RISK` · **Cloudflare control-plane**. Los fallos son heredados y aparecen en tres bindings externos (Pages + Workers singular/plural); no existe config `wrangler` ni binding plural en repo y no hay conector Cloudflare. Tracking: issue #127.

## TRADING LAB · BLOQUEO REAL CONSERVADO
- Evidencia P38 del 04/09/2026: proyecto GCP `fenix-trading-lab`, VM `cerebro-trading-lab`, Shadow/Paper documentados activos, endpoint Alpaca Paper exacto, long-only, fail-closed.
- `REAL_AUTHORIZED=false`; Tribunal `BLOCK_REAL`.
- J1 PASS, J2 PASS, J3 FAIL, J4 PASS; siguen abiertos gates empíricos y autorización humana real.
- No se ejecutó ninguna orden ni mutación Trading durante este loop.

## CLOUDFLARE · DIAGNÓSTICO CERRADO HASTA CONTROL-PLANE
- Los checks externos fallaban ya en baseline `317a3e...` mientras GitHub native PREPROD era verde.
- Se observaron `Cloudflare Pages`, `Workers Builds: fenix-capital-inmo-map` y `Workers Builds: fenix-capital-inmo-maps`.
- Código del repo: sin `wrangler` y sin referencia al binding plural.
- Conclusión: no reparar a ciegas desde código. Requiere inventario/snapshot en Cloudflare y reconciliación NON-PROD primero.

## CIERRE ACTUAL
- **Estructura/Factory/Governance/PREPROD:** `CONFIRMED_OPERATIONAL`.
- **Core PROD Observer:** `CONFIRMED_OPERATIONAL_PROD_OBSERVER`.
- **TRN TEST runtime:** `CONFIRMED_OPERATIONAL_TEST_RUNTIME`.
- **App/CRM/Web/Social baseline:** preservado.
- **Coste adicional:** 0 €.
- **PROD autonomy:** continúa `DENY` hasta cerrar issues #124–#127 y sus gates aplicables.
- No se declarará “todo verde PROD” mientras exista cualquiera de esos bloqueos.
