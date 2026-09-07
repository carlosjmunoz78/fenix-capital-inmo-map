# CEREBRO Structural Bootstrap · Estado V0

## VERDE / CONFIRMED_OPERATIONAL en PREPROD aislado
- FACT-001 · Fábrica de Motores CEREBRO V0: generator determinista, plan, create, idempotencia y collision guard.
- GOV-001 · Engine Registry V0.
- POL-001 · Promotion Policy V0 con PROD deny-by-default.
- HEX-001 · Human Exception Policy V0: `HUMAN_REQUIRED` queda cerrado exactamente a los 8 códigos canónicos; credenciales/MFA/permisos/riesgo irreversible se modelan como blockers, no como excepciones humanas inventadas.
- EVT-001 · contrato canónico de eventos multiempresa.
- JOB-001 · contrato canónico de jobs, estados, `BLOCKED` y reintentos limitados.
- AUD-001 · contrato canónico append-only de auditoría, sin secretos.
- OBSERV-001 · contrato canónico de health/log/trace/coste/seguridad.
- Tribunal V0 · determinista, DENY por defecto, PASS solo con toda la evidencia obligatoria verde.
- APP-001 · registrado como motor existente; no recreado.
- WEB-001 · registrado desde evidencia web/WordPress viva; no recreado.

## VERDE · GATES DE FACTORY/PREPROD
- Registry/manifests: CI verde.
- Factory unit tests: CI verde.
- App compatibility: build PREPROD + browser QA + comprobación de cambios aditivos ejecutados en rama aislada; ningún fichero de runtime App se modifica por FACT-001.
- RLS-001 OLD vs NEW: validación representativa en PostgreSQL 16 efímero, sin datos PROD, con owner/roles/grants/RPC SECURITY DEFINER equivalentes al boundary auditado; OLD y NEW conservan acceso RPC autorizado, mantienen anon/authenticated sin acceso directo y preservan datos.
- Candidato RLS: test exige exactamente 3 `ENABLE ROW LEVEL SECURITY` y prohíbe DROP/DELETE/TRUNCATE/INSERT/UPDATE/GRANT/REVOKE/POLICY/FORCE RLS.
- Coste adicional: 0 €.
- Backup: Git history.
- Rollback: revert commits / rama aislada antes de integración.
- Rebuild: schema + Registry + Factory CLI + governance/contracts versionados.

## PARCIAL / NO GREENWASH
- DEP-001 · Dependency Registry: callers frontend literales clasificados, RLS caller/grant/RPC closure cerrada para el finding y RPC live existence verificada para los principales Edge actuales. La clausura semántica Edge → RPC → tabla de absolutamente todo el runtime continúa incrementalmente.
- CORE-001 · plugin vivo pero global `ok=false`; requiere cerrar `staging_host` / `test_cleanup` antes de marcarlo verde.
- SEO-001 · bridge vivo/ok, pero `last_run=null`, `learning_count=0`; el conector GSC de pago/trial no se renovará por defecto.
- CRM-001 · contratos App/Supabase vivos; aceptación integral específica del runtime CRM no se ha re-ejecutado en este loop.
- DOC-001 · funciones y contratos vivos; la frontera está documentada, pero cualquier consolidación gateway/document-actions sigue requiriendo OLD vs NEW.
- TRN-001 · evidencia documental reciente; runtime transversal no verificado directamente.
- LAB-TRD · evidencia PAPER/SHADOW reciente; VM no verificada directamente en este loop.

## RLS-001 · HIGH controlado, PROD sin modificar
Las tablas `fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

Auditoría live solo lectura confirmó:
- no existen grants de tabla para `anon` ni `authenticated` en las tres tablas;
- las tablas son propiedad de `postgres`;
- los RPC relevantes son `SECURITY DEFINER` y su EXECUTE auditado está limitado a `postgres`/`service_role`;
- `postgres` y `service_role` disponen de `BYPASSRLS`;
- no se evidenció exposición directa `anon/authenticated`.

La prueba PREPROD representativa del cambio enable-only está verde, pero eso **no autoriza** aplicar RLS a PROD. Antes de cualquier DDL PROD siguen siendo obligatorios snapshot/backup, comparación sobre estructura completa, prueba de callers reales y rollback.

## ONE-SHOTS · CLASIFICADOS
Ocho Edge Functions `*-once` continúan ACTIVE, pero la auditoría de código live las clasificó como tombstones HTTP 410. No se eliminan solo para reducir ruido: retirada requiere caller inventory y rollback.

## OVERLAPS · FRONTERAS ASIGNADAS SIN CONSOLIDAR
- bank: Gateway = lectura/orquestación; `fenix-bank-api` = creación especializada POST.
- directory: `fenix-directory-api` = lectura; `fenix-directory-actions` = creación/escritura.
- Ana: `fenix-ana-api` = correcciones/decisiones/sync; `fenix-ana-canonical` = lector canónico.
- documents/evidence: Gateway + document-actions = documento; `fenix-evidence-api` = evidencia contextual/deduplicación/origen.
- expediente stage: Gateway = workspace general; `fenix-expediente-stage` = mutación auditada/versionada.

No se elimina ni fusiona ninguna función sin PREPROD + OLD vs NEW + rollback.

## ESTADO DE INTEGRACIÓN
- Rama: `cerebro/fact-001-factory-v0`.
- PR #106 contra `preprod-app-phase1`.
- Cambios Factory: aditivos; PROD no recibe DDL, deploys, RLS ni deletes.
- Registry: 17 motores existentes/nuevos wrapped sin recrear runtimes.
- Shared contracts: `company_id`, `engine_id`, `environment`, `version` obligatorios en envelopes canónicos.
- Governance: dependency registry, promotion policy, tribunal, human exception policy, RLS audit/candidate, one-shot inventory y frontend Edge contract.

## GATE DE PROMOCIÓN
FACT-001 puede integrarse en `preprod-app-phase1` cuando el HEAD final tenga verdes sus checks propios y App compatibility. Esa integración es PREPROD, no autorización de PROD.

PROD continúa DENY por defecto mientras cualquier gate de producción aplicable no esté demostrado, especialmente findings HIGH, pruebas completas del runtime y promoción gradual.

## Regla de estado
No se marca un motor como `CONFIRMED_OPERATIONAL` solo porque exista código o documentación. Se exige evidencia del runtime correspondiente y gates aplicables. Los estados parciales anteriores son deliberados.
