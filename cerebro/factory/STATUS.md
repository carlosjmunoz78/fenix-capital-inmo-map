# CEREBRO Structural Bootstrap · Estado V0

## VERDE / CONFIRMED_OPERATIONAL EN PREPROD
- FACT-001 · Fábrica de Motores CEREBRO V0 integrada en `preprod-app-phase1`.
- GOV-001 · Engine Registry V0.
- POL-001 · Promotion Policy V0 con PROD deny-by-default.
- HEX-001 · `HUMAN_REQUIRED` cerrado exactamente a los 8 códigos canónicos; blockers técnicos separados.
- EVT-001 · contrato canónico de eventos multiempresa.
- JOB-001 · contrato canónico de jobs, `BLOCKED` y reintentos limitados.
- AUD-001 · contrato append-only de auditoría sin secretos.
- OBSERV-001 · contrato de health/log/trace/coste/seguridad.
- Tribunal V0 · determinista, DENY por defecto.
- APP-001 · PREPROD `b092f43058d3303c80b9a5783c56ba7b023399c9` validado.
- WEB-001 · runtime web/WordPress previamente verificado vivo; no recreado.

## HECHO · INTEGRACIÓN FACT-001
- PR #106 se integró por squash únicamente en `preprod-app-phase1`.
- SHA PREPROD integrado: `b092f43058d3303c80b9a5783c56ba7b023399c9`.
- PRE-PROD App Build run `34140388557`: SUCCESS.
- Build PREPROD: SUCCESS.
- Browser QA PREPROD: SUCCESS.
- PREPROD Ana CORS smoke: SUCCESS.
- PROD operational CORS smoke de solo comprobación: SUCCESS.
- PROD canonical write API CORS smoke de solo comprobación: SUCCESS.
- Build de candidato PROD inmutable: SUCCESS; **no promovido**.
- Browser QA exacto sobre candidato PROD: SUCCESS.
- Assertion de ausencia de endpoints `*-test` en candidato PROD: SUCCESS.
- Artifact PREPROD dist: `fenix-preprod-dist-b092f43058d3303c80b9a5783c56ba7b023399c9`.
- Artifact candidato PROD: `fenix-prod-candidate-b092f43058d3303c80b9a5783c56ba7b023399c9`.
- Artifact Playwright: `fenix-preprod-playwright-report-b092f43058d3303c80b9a5783c56ba7b023399c9`.
- Coste adicional introducido por FACT-001: 0 €.

## VERDE · GATES FACTORY
- Registry/manifests y Factory unit tests: CI verde.
- App compatibility aislada antes del merge: verde.
- RLS-001 OLD vs NEW representativo en PostgreSQL 16 efímero: verde.
- Candidato RLS enable-only: exactamente 3 `ENABLE ROW LEVEL SECURITY`; tests prohíben DROP/DELETE/TRUNCATE/INSERT/UPDATE/GRANT/REVOKE/POLICY/FORCE RLS.
- Backup: Git history.
- Rollback de Factory: PR/revert PREPROD; ningún cambio PROD realizado.
- Rebuild: schema + Registry + Factory CLI + contratos/governance versionados.

## PARCIAL / NO GREENWASH
- DEP-001 · todos los callers Edge literales del frontend están clasificados por entorno; el cierre semántico completo Edge → RPC → tabla continúa incrementalmente.
- CORE-001 · plugin vivo pero última evidencia global `ok=false`; pendientes `staging_host` / `test_cleanup`.
- SEO-001 · bridge vivo/ok, pero última evidencia `last_run=null`, `learning_count=0`; no se pagará un conector solo para cerrar estado.
- CRM-001 · contratos App/Supabase vivos; aceptación integral específica pendiente de evidencia ejecutable.
- DOC-001 · funciones y contratos vivos; consolidación no autorizada sin OLD vs NEW.
- TRN-001 · evidencia documental; runtime transversal no verificado directamente.
- LAB-TRD · evidencia PAPER/SHADOW; VM no verificada directamente.

## RLS-001 · HIGH CONTROLADO, PROD SIN MODIFICAR
`fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

Auditoría read-only confirmó ausencia de grants directos `anon`/`authenticated`, ownership `postgres`, RPC relevantes `SECURITY DEFINER`, acceso backend por `service_role` y ausencia de evidencia de exposición directa. La prueba representativa enable-only está verde, pero **no autoriza DDL PROD**. Snapshot/backup, estructura completa representativa, callers reales y rollback probado siguen siendo gates obligatorios.

## ONE-SHOTS Y OVERLAPS
- Ocho `*-once` siguen ACTIVE pero auditados como tombstones HTTP 410; no se eliminan sin caller inventory + rollback.
- bank: Gateway lectura/orquestación; `fenix-bank-api` creación especializada.
- directory: `fenix-directory-api` lectura; `fenix-directory-actions` escritura.
- Ana: `fenix-ana-api` acciones/correcciones; `fenix-ana-canonical` lectura canónica.
- documents/evidence: Gateway + document-actions gobiernan documento; evidence-api gobierna evidencia contextual.
- expediente stage: Gateway workspace; `fenix-expediente-stage` mutación auditada/versionada.

## LOOP ACTUAL
Rama `cerebro/dep-001-runtime-closure-v0`: actualizar evidencia post-merge, eliminar drift de SHA y continuar DEP-001 sin tocar PROD.

## GATE PROD
PROD permanece `DENY` por defecto. La existencia de un candidato PROD verde no equivale a autorización de promoción. Findings HIGH y motores parciales siguen bloqueando promoción autónoma.

## Regla de estado
Solo se usa `CONFIRMED_OPERATIONAL` con evidencia runtime/CI aplicable. Código o documentación por sí solos no elevan un motor a verde.
