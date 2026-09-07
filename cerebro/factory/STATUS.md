# CEREBRO Structural Bootstrap · Estado V0

## VERDE / CONFIRMED_OPERATIONAL en PREPROD aislado
- FACT-001 · Fábrica de Motores CEREBRO V0.
- GOV-001 · Engine Registry V0.
- POL-001 · Promotion Policy V0.
- HEX-001 · Human Exception Policy V0.
- APP-001 · registrado como motor existente; no recreado.
- WEB-001 · registrado desde evidencia web/WordPress viva; no recreado.

## PARCIAL / NO GREENWASH
- DEP-001 · Dependency Registry: caller paths de casos especiales y expediente stage mejorados, pero aún faltan cierre completo de grants/RPC live, owners de overlaps, one-shots y clausura Edge→RPC→tabla.
- CORE-001 · plugin vivo pero global `ok=false`; requiere cerrar staging_host/test_cleanup antes de verde.
- SEO-001 · bridge vivo/ok, pero `last_run=null`, learning_count=0 y GSC connector de pago/trial bloqueado; no se pagará por defecto.
- CRM-001 · contratos App/Supabase vivos, aceptación integral del runtime CRM no re-ejecutada en este loop.
- DOC-001 · funciones y contratos vivos; frontera gateway/document-actions/evidence sigue por resolver.
- TRN-001 · evidencia documental reciente, runtime transversal no verificado directamente.
- LAB-TRD · evidencia PAPER/SHADOW reciente, VM no verificada directamente en este loop.

## RIESGO VIVO BLOQUEANTE
`RLS-001` HIGH: `fenix_prod.special_cases`, `fenix_prod.special_case_people`, `fenix_prod.expediente_stage_history` aparecen con RLS desactivado en auditoría viva.

No se habilita RLS automáticamente. Evidencia de fuente actual confirma:
- App PROD llama `fenix-special-cases-api`; esta autentica usuario y usa RPCs server-side con service role.
- `fenix-expediente-stage` autentica usuario y llama `fenix_prod_exp_stage_server`.
- migración de `expediente_stage_history` revoca `anon/authenticated` y concede `service_role`, pero RLS sigue siendo un finding y debe verificarse contra grants/definiciones live antes de cambiar nada.

## HECHO en rama aislada
- Rama: `cerebro/fact-001-factory-v0`.
- PR #106: DRAFT contra `preprod-app-phase1`.
- PROD: no modificado por este trabajo.
- Coste adicional: 0 €.
- Factory CLI: create + plan + idempotencia + collision guard.
- Registry v0.3.0: 13 motores registrados/wrapped, sin recrear runtimes existentes.
- Governance: dependency registry + promotion policy + human exception policy.
- Tests: manifest/registry/factory/governance.
- CI del HEAD `007cd28e797438547d827cc72d20934931078217`: validator y unit tests completados con SUCCESS.
- Backup: Git history.
- Rollback: revert commits / eliminar rama aislada antes de merge.
- Rebuild: schema + Registry + Factory CLI + governance JSON versionado.

## GATES todavía abiertos antes de merge/promoción
1. Auditar grants y definiciones live de RPCs para `special_cases` y `special_case_people`.
2. Resolver owner/canonical boundary de overlaps gateway ↔ document/directory/stage/Ana/bank.
3. Clasificar Edge Functions `*-once` activas antes de cualquier retirada.
4. Completar clausura Edge → RPC → tabla para todos los callers frontend actuales.
5. Ejecutar OLD vs NEW + suite App completa sobre PREPROD antes de considerar merge.
6. Mantener PR DRAFT mientras exista cualquier HIGH_RISK no cerrado.

## Regla de estado
No se marca un motor como `CONFIRMED_OPERATIONAL` solo porque exista código o documentación. Se exige evidencia del runtime correspondiente y gates aplicables. Los estados parciales anteriores son deliberados y evitan ocultar riesgos.
