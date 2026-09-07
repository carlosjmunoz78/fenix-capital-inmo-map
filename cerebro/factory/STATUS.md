# CEREBRO Structural Bootstrap · Estado V0

## HECHO / VERDE · FACTORY Y PREPROD
- FACT-001 · Fábrica de Motores CEREBRO V0 integrada en `preprod-app-phase1` mediante PR #106.
- Merge PREPROD: `b092f43058d3303c80b9a5783c56ba7b023399c9`.
- GOV-001 · Engine Registry V0.
- POL-001 · Promotion Policy V0 con PROD deny-by-default.
- HEX-001 · Human Exception Policy V0 con los 8 códigos canónicos.
- EVT-001 · contrato canónico de eventos multiempresa.
- JOB-001 · contrato canónico de jobs y reintentos limitados.
- AUD-001 · contrato append-only de auditoría.
- OBSERV-001 · contrato de health/log/trace/coste/seguridad.
- Tribunal V0 · determinista y DENY por defecto.
- Shared runtime contracts · `company_id`, `engine_id`, `environment`, `version`.
- Registry/manifests/factory/governance tests: verdes.
- Pipeline PREPROD nativo tras merge: build, browser QA, CORS, candidato PROD inmutable, browser QA del candidato, leak guard y sellado de artefacto: verdes.
- Coste adicional: 0 €.
- Backup/rollback/rebuild: Git history + revert + schema/registry/factory/contracts versionados.

## HECHO / VERDE · SEGURIDAD PREPROD
- RLS-001 validado en PREPROD mediante un esquema representativo aislado, creado y eliminado en el mismo loop.
- Las tres tablas representativas conservaron RLS enabled, cero grants directos para `anon`/`authenticated`, acceso RPC autorizado para `service_role` y escritura SECURITY DEFINER funcional.
- El candidato `rls-001-enable-only.sql` permanece inerte/versionado; PROD no se modifica.
- Evidencia: `governance/rls-001-preprod-representative-validation.json`.

## HECHO / VERDE · CORE Y SEO EN STAGING/PREPROD
- CORE-001 · quality gate del HEAD actual de `staging` ejecutado de forma aislada: PASS.
- SEO-001 · contratos y paquete SEO CEREBRO incluidos en el mismo quality gate: PASS.
- Pasaron contratos RC9, operaciones/Notion, cache/CSS, plugin updater, runtime gate, Elementor roundtrip, full-page/canonical/batch/Google, SEO CEREBRO, builds deterministas y smokes de paquetes.
- El PR de auditoría fue cerrado sin merge porque solo servía para disparar evidencia.
- WordPress live confirma Core Guard `1.0.0-rc9-prod2`, SEO CEREBRO Bridge `0.4.1`, SEO REST Bridge `1.0.0` y CEREBRO Leads `1.3.2` activos.
- Evidencia: `governance/core-seo-staging-validation-2026-09-07.json` y `governance/wordpress-live-plugin-inventory-2026-09-07.json`.

## HECHO / VERDE · CRM Y DOCUMENTOS A NIVEL DE CONTRATO LIVE
- CRM-001 · boundary live confirmado para tablas críticas: RLS enabled, owner postgres, sin grants directos `anon`/`authenticated`; RPC de contactos, expedientes y tareas verificados como `SECURITY DEFINER`.
- DOC-001 · `documentos`, versiones, orígenes, uploads, intelligence y change-history: RLS enabled y sin grants directos `anon`/`authenticated`; RPC document/evidence verificados live como `SECURITY DEFINER`.
- La suite PREPROD completa de App complementa estos boundaries con browser QA.
- Esto confirma contratos/rutas de seguridad, no autoriza consolidar funciones ni afirma que todos los escenarios de negocio PROD hayan sido ejercitados.
- Evidencia: `governance/crm-doc-live-contract-audit-2026-09-07.json`.

## HECHO / VERDE · SEGURIDAD AUTOMATIZACIONES SOCIALES
- Riesgo histórico de workflows Buffer mutantes disparados automáticamente por `push`: cerrado.
- Los workflows mutantes/one-shot legacy pasan a `workflow_dispatch` manual.
- Preflight y verificadores read-only se preservan.
- Se añadió un gate determinista que impide reintroducir mutaciones Buffer automáticas por `push`/`schedule`.
- PR social #1 integrado en `main`: `3151776db273840a61ea2a128c3e1e5a79b68020`.
- Para ese merge solo se ejecutó `CEREBRO Social Safety Gate`; resultado PASS; no se ejecutó ninguna mutación Buffer.
- Evidencia: `governance/social-safety-closure-2026-09-07.json`.

## EXISTENTE / REGISTRADO
- APP-001 · existente y envuelto, no recreado.
- WEB-001 · WordPress live y stack crítico activo; no recreado.
- 17 manifests del Registry preservan la taxonomía de evidencia y no elevan un runtime por mera documentación.
- Edge/RPC inventory, one-shot inventory y fronteras de solapamiento documentadas.

## PARCIAL / NO GREENWASH
- DEP-001 · el finding RLS y los principales callers/RPC están cerrados; la clausura semántica Edge → RPC → tabla de absolutamente todo el runtime sigue siendo incremental.
- CORE-001 PROD · plugin live activo y staging/source/package verdes, pero el health runtime global no se eleva a verde hasta revalidar el histórico `global ok=false` (`staging_host` / `test_cleanup`).
- SEO-001 PROD · plugin live activo y staging/source/package verdes, pero el learning runtime no se eleva hasta revalidar `last_run`/`learning_count`; no se pagará por GSC.
- CRM-001 · boundary live confirmado; la aceptación integral de todos los escenarios de negocio permanece distinta de la certificación contractual.
- DOC-001 · boundary live confirmado; cualquier consolidación gateway/document-actions continúa prohibida sin OLD vs NEW.
- TRN-001 · documentación lo clasifica operativo; falta verificación directa del runtime transversal.
- LAB-TRD · evidencia PAPER/SHADOW documentada; falta acceso directo a VM/runtime para elevar evidencia independiente.

## RLS-001 · HIGH CONTROLADO, PROD SIN MODIFICAR
Las tablas `fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

La auditoría live read-only confirmó que no existen grants de tabla para `anon`/`authenticated`, las tablas son propiedad de `postgres`, los RPC relevantes son `SECURITY DEFINER`, el EXECUTE auditado está limitado a `postgres`/`service_role` y no se evidenció exposición directa anon/authenticated.

La prueba representativa PREPROD está verde, pero **no autoriza DDL PROD**. La promoción de seguridad exige snapshot/backup, prueba sobre estructura representativa completa, callers reales, runtime smoke y rollback.

## ONE-SHOTS Y SOLAPAMIENTOS
- Ocho Edge `*-once` siguen ACTIVE pero fueron clasificados como tombstones HTTP 410; no se eliminan sin caller inventory y rollback.
- Bank, directory, Ana, documents/evidence y expediente-stage tienen fronteras asignadas; ninguna consolidación está autorizada sin PREPROD + OLD vs NEW.

## POR AUDITAR / EXCEPCIONES NO AUTÓNOMAS
- `preprod-app-phase1`, social `main`, Core Guard `main` y `staging` están auditadas como `protected=false`; el conector actual no ofrece escritura administrativa segura de branch protection.
- Core Guard: `staging` está 252 commits por delante de `main`; no se sincroniza a ciegas. `production` es una línea de despliegue distinta y tampoco se sobrescribe para igualar ramas.
- Checks externos Cloudflare siguen fallando de forma independiente al pipeline GitHub nativo verde; no existe control-plane Cloudflare conectado para una corrección reversible.
- Core/SEO live health, TRN y LAB-TRD requieren una fuente runtime directa no disponible en el tool surface actual.
- La cola exacta y sus códigos canónicos está en `governance/human-exception-queue-2026-09-07.json`; la canonicalidad en `governance/repository-canonicality-live-2026-09-07.json`.

## REGLA DE PROMOCIÓN
El alcance estructural/autónomamente ejecutable de FACT-001 y PREPROD está verde. PROD continúa DENY por defecto mientras falte cualquier gate aplicable. Ningún estado se eleva por conveniencia: solo por evidencia reproducible, observabilidad y rollback.
