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
- Evidencia: `governance/core-seo-staging-validation-2026-09-07.json`.

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
- WEB-001 · existente y envuelto, no recreado.
- 17 manifests del Registry preservan la taxonomía de evidencia y no elevan un runtime por mera documentación.
- Edge/RPC inventory, one-shot inventory y fronteras de solapamiento documentadas.

## PARCIAL / NO GREENWASH
- DEP-001 · el finding RLS y los principales callers/RPC están cerrados; la clausura semántica Edge → RPC → tabla de absolutamente todo el runtime sigue siendo incremental.
- CORE-001 PROD · staging/source/package están verdes, pero el runtime WordPress PROD no se declara verde hasta cerrar o revalidar el histórico `global ok=false` (`staging_host` / `test_cleanup`).
- SEO-001 PROD · staging/source/package están verdes, pero el runtime live previo tenía `last_run=null` y `learning_count=0`; no se pagará por GSC para forzar estado.
- CRM-001 · contratos App/Supabase vivos; falta una aceptación integral específica del runtime CRM en este loop.
- DOC-001 · contratos/funciones vivos; cualquier consolidación gateway/document-actions exige OLD vs NEW.
- TRN-001 · documentación lo clasifica operativo; falta verificación directa del runtime transversal.
- LAB-TRD · evidencia PAPER/SHADOW documentada; falta acceso directo a VM/runtime para elevar evidencia independiente.

## RLS-001 · HIGH CONTROLADO, PROD SIN MODIFICAR
Las tablas `fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

La auditoría live read-only confirmó que no existen grants de tabla para `anon`/`authenticated`, las tablas son propiedad de `postgres`, los RPC relevantes son `SECURITY DEFINER`, el EXECUTE auditado está limitado a `postgres`/`service_role` y no se evidenció exposición directa anon/authenticated.

La prueba representativa PREPROD está verde, pero **no autoriza DDL PROD**. La promoción de seguridad exige snapshot/backup, prueba sobre estructura representativa completa, callers reales, runtime smoke y rollback.

## ONE-SHOTS Y SOLAPAMIENTOS
- Ocho Edge `*-once` siguen ACTIVE pero fueron clasificados como tombstones HTTP 410; no se eliminan sin caller inventory y rollback.
- Bank, directory, Ana, documents/evidence y expediente-stage tienen fronteras asignadas; ninguna consolidación está autorizada sin PREPROD + OLD vs NEW.

## POR AUDITAR / BLOQUEOS EXTERNOS
- Branch protection de ramas críticas sigue sin evidencia de protección administrativa.
- Checks externos de Cloudflare en el repo App siguen fallando de forma independiente al pipeline GitHub nativo verde; no se modifica Cloudflare sin ownership/configuración/rollback demostrables.
- Runtime WordPress PROD de Core/SEO, CRM integral y VM Trading/Training requieren evidencia directa adicional antes de `CONFIRMED_OPERATIONAL` global.

## REGLA DE PROMOCIÓN
PREPROD estructural de FACT-001 está verde. PROD continúa DENY por defecto mientras falte cualquier gate aplicable. Ningún estado se eleva por conveniencia: solo por evidencia reproducible, observabilidad y rollback.
