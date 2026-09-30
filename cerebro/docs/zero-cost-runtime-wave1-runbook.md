# Runbook · Zero-Cost Runtime Wave 1

Estado: DOCUMENTED_PARTIAL hasta gates exact-head.

## Componentes
- `LOCAL-001`: `LocalCapabilityRegistry`.
- `FREE-001`: `FreeFirstBroker`.
- `DBOFF-001` / `STOROFF-001`: `LocalOffloadStore` sobre `AtomicV8Journal`.
- `AIBUD-001` / `ROUTE-001`: `BudgetModelRouterV0`.
- Harness: `ZeroCostRuntimeHarnessV0`.

## Invariantes
- PREPROD exacto; PROD se rechaza.
- coste adicional objetivo 0 €.
- segundo proyecto Supabase PREPROD no requerido.
- no heavy state en Supabase.
- no Trading.
- `prod_writes=false`, `autonomous_prod=false`.
- lectura/escritura de offload aislada por `company_id + engine_id + environment + version`.
- backup/restore scoped; snapshots cross-scope se rechazan.

## Operación
1. Ejecutar `cd cerebro && npm test`.
2. Ejecutar `npm run validate` y `npm run generate -- --out <tmp>`.
3. Verificar que `CEREBRO Factory PREPROD` está verde sobre el HEAD exacto.
4. Para cambios exclusivamente `cerebro/**`, no exigir reactivación del segundo Supabase PREPROD. El workflow de App puede existir como gate transversal, pero su dependencia remota no convierte Supabase PREPROD en requisito de esta wave.
5. Ejecutar revisión Codex exact-head; cualquier P1/P2 obliga a corregir y repetir gates.

## Backup / rollback / rebuild
- Backup lógico: `harness.backup(context)` devuelve únicamente el scope solicitado.
- Restore: `harness.restore({context, backup})`; rechaza scope distinto.
- Persistencia local usa checksum y replay de `AtomicV8Journal`; corrupción debe fallar cerrada al reabrir.
- Rollback de código: revertir el commit/PR de esta wave; no hay migración de App/Supabase ni escritura PROD.
- Rebuild: recrear harness con los mismos paths; los journals locales se recargan determinísticamente.

## Promoción
No cablear a consumidores reales ni declarar autonomía PROD sin inventario de consumidores, OLD vs NEW, rollback probado, observabilidad de la integración y promoción gradual.
