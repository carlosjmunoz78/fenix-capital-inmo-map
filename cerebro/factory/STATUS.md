# CEREBRO Structural Bootstrap · Estado V0

## VERDE / CONFIRMED_OPERATIONAL en PREPROD aislado
- FACT-001 · Fábrica de Motores CEREBRO V0.
- GOV-001 · Engine Registry V0.
- POL-001 · Promotion Policy V0.
- HEX-001 · Human Exception Policy V0.
- EVT-001 · contrato canónico de eventos multiempresa.
- JOB-001 · contrato canónico de jobs, estados y reintentos limitados.
- AUD-001 · contrato canónico append-only de auditoría, sin secretos.
- OBSERV-001 · contrato canónico de health/log/trace/coste/seguridad.
- APP-001 · registrado como motor existente; no recreado.
- WEB-001 · registrado desde evidencia web/WordPress viva; no recreado.

## PARCIAL / NO GREENWASH
- DEP-001 · Dependency Registry: RLS caller/grant/RPC closure y clasificación de one-shots ya cerradas; quedan clausura Edge→RPC→tabla del conjunto completo y validación representativa PREPROD de RLS-001.
- CORE-001 · plugin vivo pero global `ok=false`; requiere cerrar staging_host/test_cleanup antes de verde.
- SEO-001 · bridge vivo/ok, pero `last_run=null`, learning_count=0 y GSC connector de pago/trial bloqueado; no se pagará por defecto.
- CRM-001 · contratos App/Supabase vivos, aceptación integral del runtime CRM no re-ejecutada en este loop.
- DOC-001 · funciones y contratos vivos; fronteras documentadas, pero la posible consolidación gateway/document-actions requiere OLD vs NEW.
- TRN-001 · evidencia documental reciente, runtime transversal no verificado directamente.
- LAB-TRD · evidencia PAPER/SHADOW reciente, VM no verificada directamente en este loop.

## RLS-001 · HIGH controlado, no resuelto
Las tablas `fenix_prod.special_cases`, `fenix_prod.special_case_people` y `fenix_prod.expediente_stage_history` continúan con RLS desactivado en PROD.

Auditoría live solo lectura confirma:
- no existen grants de tabla para `anon` ni `authenticated` en las tres tablas;
- las tres tablas son propiedad de `postgres`;
- los RPC relevantes son `SECURITY DEFINER`;
- EXECUTE de esos RPC está limitado a `postgres` y `service_role`;
- `postgres` y `service_role` tienen `BYPASSRLS`;
- `expediente_stage_history` concede a `service_role` solo `SELECT` e `INSERT`;
- no se ha evidenciado exposición directa `anon/authenticated`.

Conclusión: existe un gap de defensa en profundidad, pero no evidencia de exposición directa por grants. No se modifica PROD.

Se ha creado `preprod/rls-001-enable-only.sql` como candidato inerte/versionado y tests que impiden que cambie grants, policies, datos, FORCE RLS o tablas distintas de las tres afectadas.

El Supabase PREPROD configurado (`hnqlnvakzaywtafeiybt`) no contiene esas tablas `fenix_prod`, por lo que no es un entorno representativo para validar el candidato. No se crean tablas duplicadas ni una rama Supabase de pago por defecto.

## ONE-SHOTS · CLASIFICADOS
Ocho Edge Functions `*-once` continúan ACTIVE en Supabase, pero su código live es un tombstone inerte que responde HTTP 410 (`retired` / `migration_endpoint_retired`).

Se mantienen por seguridad hasta disponer de evidencia de callers y rollback; no se eliminan solo para reducir ruido.

## OVERLAPS · FRONTERAS ASIGNADAS SIN CONSOLIDAR
- bank: Gateway = lectura/orquestación; `fenix-bank-api` = creación especializada POST.
- directory: `fenix-directory-api` = lectura; `fenix-directory-actions` = creación/escritura.
- Ana: `fenix-ana-api` = correcciones/decisiones/sync; `fenix-ana-canonical` = lector canónico de reglas.
- documents/evidence: Gateway + document-actions = documento; `fenix-evidence-api` = evidencia contextual/deduplicación/origen.
- expediente stage: Gateway = workspace general; `fenix-expediente-stage` = mutación auditada/versionada de stage.

No se elimina ni fusiona ninguna función sin PREPROD + OLD vs NEW + rollback.

## HECHO en rama aislada
- Rama: `cerebro/fact-001-factory-v0`.
- PR #106: DRAFT contra `preprod-app-phase1`.
- PROD: solo auditoría read-only en este loop; no DDL, no despliegues, no RLS, no deletes.
- Coste adicional: 0 €.
- Factory CLI: create + plan + idempotencia + collision guard.
- Registry v0.4.0: 17 motores registrados/wrapped, sin recrear runtimes existentes.
- Shared contracts: `runtime-contracts.json` con `company_id`, `engine_id`, `environment`, `version`.
- Governance: dependency registry + promotion policy + human exception policy + RLS live audit + one-shot inventory + Edge boundary contract.
- Tests: manifest/registry/factory/governance/runtime + RLS candidate + dependency classification.
- Backup: Git history.
- Rollback: revert commits / eliminar rama aislada antes de merge.
- Rebuild: schema + Registry + Factory CLI + governance/contracts JSON versionados.

## GATES todavía abiertos antes de merge/promoción
1. Validar RLS-001 en una base PREPROD realmente representativa sin introducir coste injustificado.
2. Completar clausura Edge → RPC → tabla para todos los callers frontend actuales.
3. Ejecutar OLD vs NEW + suite App completa sobre PREPROD antes de considerar merge.
4. CORE-001, SEO-001, CRM-001, DOC-001, TRN-001 y LAB-TRD solo pasan a verde con evidencia runtime aplicable.
5. Mantener PR DRAFT mientras exista cualquier HIGH_RISK no cerrado.

## Regla de estado
No se marca un motor como `CONFIRMED_OPERATIONAL` solo porque exista código o documentación. Se exige evidencia del runtime correspondiente y gates aplicables. Los estados parciales anteriores son deliberados y evitan ocultar riesgos.
