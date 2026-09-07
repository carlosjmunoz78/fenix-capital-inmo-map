# CEREBRO Structural Bootstrap · Estado V0

## HECHO / VERDE · FACTORY Y PREPROD
- FACT-001 · Fábrica de Motores CEREBRO V0 integrada en `preprod-app-phase1` mediante PR #106.
- FACT merge PREPROD: `b092f43058d3303c80b9a5783c56ba7b023399c9`.
- Post-FACT governance/evidence PR #109 integrado en PREPROD: `7da1eacd5ffedc08733b01fb817f2f2004a8f2fd`.
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
- Pipeline nativo post-merge `PRE-PROD App Build` run `34155355925`: SUCCESS completo sobre HEAD `7da1eacd5ffedc08733b01fb817f2f2004a8f2fd`.
- Gates del pipeline: install reproducible, build PREPROD, Browser QA PREPROD, CORS PREPROD, CORS PROD read-only/canonical, build candidato PROD inmutable, Browser QA exacto candidato, leak guard `*-test`, sellado y artifacts: SUCCESS.
- El paso de leak diagnostics fue SKIPPED porque el leak guard no detectó fuga; no representa fallo.
- No se ejecutó deploy PROD ni DDL PROD.
- Coste adicional: 0 €.
- Backup/rollback/rebuild: Git history + revert + schema/registry/factory/contracts versionados.

## HECHO / VERDE · BASELINE PROTEGIDO
- APP, CRM, WEB y SOCIAL son el suelo mínimo de comportamiento: ningún cambio de esta unitaria puede degradarlos.
- La Factory y governance son aditivas; no sustituyen ni eliminan runtime existente.
- OLD vs NEW, Browser QA y gates de compatibilidad protegen la App PREPROD.
- CRM/DOC live boundaries se conservaron read-only; WordPress live se preservó; Social mantuvo sus workflows y añadió un safety gate sin publicar ni mutar Buffer durante el cierre.
- Regla de promoción: NEW debe demostrar `>= OLD` antes de sustituir cualquier comportamiento existente; rollback por revert/snapshot según componente.

## HECHO / VERDE · SEGURIDAD PREPROD
- RLS-001 validado en PREPROD mediante un esquema representativo aislado, creado y eliminado en el mismo loop.
- Las tres tablas representativas conservaron RLS enabled, cero grants directos para `anon`/`authenticated`, acceso RPC autorizado para `service_role` y escritura SECURITY DEFINER funcional.
- El candidato `rls-001-enable-only.sql` permanece inerte/versionado; PROD no se modifica.
- Evidencia: `governance/rls-001-preprod-representative-validation.json`.

## HECHO / VERDE · CORE Y SEO EN STAGING/PREPROD
- CORE-001 · quality gate del HEAD actual de `staging` ejecutado de forma aislada: PASS.
- SEO-001 · contratos y paquete SEO CEREBRO incluidos en el mismo quality gate: PASS.
- Pasaron contratos RC9, operaciones/Notion, cache/CSS, plugin updater, runtime gate, Elementor roundtrip, full-page/canonical/batch/Google, SEO CEREBRO, builds deterministas y smokes de paquetes.
- WordPress live confirma Core Guard `1.0.0-rc9-prod2`, SEO CEREBRO Bridge `0.4.1`, SEO REST Bridge `1.0.0` y CEREBRO Leads `1.3.2` activos.
- Make confirma `FÉNIX · PRE-PROD · CEREBRO SEO · Google bridge · V1` activo con ejecución automática SUCCESS el 2026-09-07.
- Evidencia: `governance/core-seo-staging-validation-2026-09-07.json` y `governance/wordpress-live-plugin-inventory-2026-09-07.json`.

## HECHO / VERDE · CRM Y DOCUMENTOS A NIVEL DE CONTRATO LIVE
- CRM-001 · boundary live confirmado para tablas críticas: RLS enabled, owner postgres, sin grants directos `anon`/`authenticated`; RPC de contactos, expedientes y tareas verificados como `SECURITY DEFINER`.
- DOC-001 · `documentos`, versiones, orígenes, uploads, intelligence y change-history: RLS enabled y sin grants directos `anon`/`authenticated`; RPC document/evidence verificados live como `SECURITY DEFINER`.
- La suite PREPROD completa de App complementa estos boundaries con Browser QA.
- Esto confirma contratos/rutas de seguridad, no autoriza consolidar funciones ni afirma que todos los escenarios de negocio PROD hayan sido ejercitados.
- Evidencia: `governance/crm-doc-live-contract-audit-2026-09-07.json`.

## HECHO / VERDE · SEGURIDAD AUTOMATIZACIONES SOCIALES
- Riesgo histórico de workflows Buffer mutantes disparados automáticamente por `push`: cerrado.
- Workflows mutantes/one-shot legacy: `workflow_dispatch` manual.
- Preflight y verificadores read-only preservados.
- Gate determinista instalado contra reintroducción de mutaciones Buffer por `push`/`schedule`.
- PR social #1 integrado en `main`: `3151776db273840a61ea2a128c3e1e5a79b68020`; safety gate PASS y sin mutación Buffer en el merge.
- Evidencia: `governance/social-safety-closure-2026-09-07.json`.

## HECHO / VERDE · TRN CONTRACT RUNTIME
- `FÉNIX · TEST · Auditoría contratos Embudo y Evaluación · V1` fue activado temporalmente, ejecutado y restaurado a inactive.
- La ejecución `3202169bcbe9423880dfd3e00a69297a` terminó SUCCESS.
- Los únicos módulos operativos fueron dos GET read-only a data sources Notion de Matriz Embudo y Cerebro Estratégico · Decisiones; no hubo escritura.
- Evidencia: `governance/trn-runtime-contract-validation-2026-09-07.json`.
- Esto confirma un boundary runtime real de TRN; el worker transversal completo permanece en excepción `LOW_CONFIDENCE` hasta disponer de su health directo.

## EXISTENTE / REGISTRADO
- APP-001 · existente y envuelto, no recreado.
- WEB-001 · WordPress live y stack crítico activo; no recreado.
- 17 manifests del Registry preservan la taxonomía de evidencia y no elevan un runtime por mera documentación.
- Edge/RPC inventory, one-shot inventory y fronteras de solapamiento documentadas.
- PR #108 cerrado sin merge como supersedido por #109 para evitar duplicación y SHA drift.

## PARCIAL / NO GREENWASH
- DEP-001 · finding RLS y principales callers/RPC cerrados; la clausura semántica Edge → RPC → tabla de todo el runtime continúa incremental y no bloquea la unitaria estructural.
- CORE-001 PROD · staging/source/package y evidencia PREPROD verdes; falta health PROD actual directo.
- SEO-001 PROD · staging/source/package y Google bridge PREPROD verdes; falta `last_run`/`learning_count` de WordPress PROD.
- CRM-001 · boundary live confirmado; aceptación integral de todos los escenarios de negocio permanece distinta de certificación contractual.
- DOC-001 · boundary live confirmado; cualquier consolidación gateway/document-actions continúa prohibida sin OLD vs NEW.
- TRN-001 · contract runtime directo verde; worker transversal completo pendiente de health directo.
- LAB-TRD · evidencia PAPER/SHADOW y aislamiento GCP documentados; falta control-plane/runtime directo para elevar evidencia independiente.

## RLS-001 · HIGH CONTROLADO, PROD SIN MODIFICAR
Las tablas `fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

La auditoría live read-only confirmó que no existen grants de tabla para `anon`/`authenticated`, las tablas son propiedad de `postgres`, los RPC relevantes son `SECURITY DEFINER`, el EXECUTE auditado está limitado a `postgres`/`service_role` y no se evidenció exposición directa anon/authenticated.

La prueba representativa PREPROD está verde, pero **no autoriza DDL PROD**. La promoción de seguridad exige snapshot/backup, prueba sobre estructura representativa completa, callers reales, runtime smoke y rollback.

## ONE-SHOTS Y SOLAPAMIENTOS
- Las Edge `*-once` auditadas siguen ACTIVE pero fueron clasificadas como tombstones HTTP 410 cuando se verificó su código; no se eliminan sin caller inventory y rollback.
- Bank, directory, Ana, documents/evidence y expediente-stage tienen fronteras asignadas; ninguna consolidación está autorizada sin PREPROD + OLD vs NEW.
- El inventario live se considera dinámico: nuevas Edge encontradas se registran antes de cualquier consolidación o retiro.

## HUMAN_REQUIRED · EXCEPCIONES EXTERNAS FORMALIZADAS
La unitaria estructural/PREPROD queda cerrable en verde porque los bloqueos externos restantes están formalizados con códigos canónicos y no requieren degradar ni retrasar App/CRM/Web/Social. No son verdes de PROD.

- `HIGH_RISK` · branch protection administrativa de ramas críticas.
- `HIGH_RISK` · health actual Core Guard PROD.
- `LOW_CONFIDENCE` · learning loop WordPress PROD de SEO.
- `LOW_CONFIDENCE` · worker transversal completo de TRN-001.
- `HIGH_RISK` · control-plane/runtime GCP de LAB-TRD; `REAL_AUTHORIZED=false` y Tribunal `BLOCK_REAL` se mantienen.
- `HIGH_RISK` · control-plane Cloudflare para reconciliar checks externos heredados.
- Cola canónica: `governance/human-exception-queue-2026-09-07.json` v1.1.0.

## CIERRE DE LA UNITARIA
- **Estado estructural/PREPROD:** `CONFIRMED_OPERATIONAL` para el alcance de Factory/Governance/contratos/gates descrito arriba.
- **Baseline App/CRM/Web/Social:** preservado como mínimo obligatorio.
- **Coste adicional:** 0 €.
- **PROD:** continúa `DENY` por defecto; las excepciones `HUMAN_REQUIRED` no autorizan promoción ni bypass.
- Mejoras no críticas que puedan consumir varios días quedan registradas como evolución incremental y no retrasan el cierre de esta unitaria.
