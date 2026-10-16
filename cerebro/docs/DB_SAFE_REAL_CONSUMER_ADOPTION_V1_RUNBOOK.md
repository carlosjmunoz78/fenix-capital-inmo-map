# DB-SAFE-NATIVE · REAL CONSUMER ADOPTION V1

## Estado
`PARCIAL_AWAITING_EXACT_HEAD_CI` hasta exact-head CI + Governed Main + RSI + merge a `main` + ejecución automática GREEN en `main`.

## Regla
La evidencia read-only y un binding receipt no equivalen a adopción funcional. Esta capa es aditiva: preserva `db-safe-native-v1.mjs` y obliga a que cada consumidor declarado use campos concretos del output y cambie de decisión ante una regresión semántica.

## Owner
`DATA-001`. Coincide en registry nativo y operacional; no existe contradicción de ownership en este bloque.

## Ruta estricta
`DATA-001 / DB-SAFE -> INSPECT + RLS_AUDIT + PERFORMANCE_AUDIT + MIGRATION_PLAN + INDEX_PLAN + MIGRATION_APPLY_PREPROD + ROLLBACK_PREPROD -> MIG/DBOFF/CRM/SEC/QA/RBLD -> EVA/Tribunal -> OBSERV/FINOPS -> LRN -> estado persistente`.

La migración se ejecuta únicamente contra un adapter first-party determinista PREPROD; no muta Supabase PROD ni un proveedor externo. El runtime nativo sigue imponiendo backup, rollback, regression GREEN, contratos mapeados, transacción, schema lease, RLS y denegación de PROD.

## Consumidores obligatorios
- `MIG-001`: plan reversible + resultado de apply PREPROD.
- `DBOFF-001`: routing de workloads; transaccional permanece en core, training/logs pesados salen.
- `CRM-001`: tablas canónicas y contratos CRM preservados.
- `SEC-001`: RLS activo, políticas GREEN, sin fuga cross-company y sin PROD mutation.
- `QA-001`: regresión + transacción apply/rollback.
- `RBLD-001`: rollback restaura schema y snapshot baseline.
- `OBSERV-001`: bundle completo persistido.
- `FINOPS-001`: coste real agregado = 0 €.

Transversalmente, `EVA-001` ejecuta OLD vs NEW + Tribunal y `LRN-001` persiste el outcome de adopción con replay idempotente.

## Pruebas semánticas
Se invalida individualmente reversibilidad, offload, contratos CRM, aislamiento RLS, regresión, snapshot de rollback, cobertura de observabilidad y coste. Si el consumidor no cambia de decisión, no cuenta como consumo real.

## Persistencia e idempotencia
- state JSON fail-closed;
- segundo replay LRN crea 0 batches;
- OBSERV y FINOPS no duplican correlación;
- misma entrada produce mismos hashes.

## FULL_E2E_REAL_PREPROD
Solo cuando los 8 consumidores tienen cobertura funcional 1.0, Tribunal PASS, LRN GREEN, backup/rollback/rebuild demostrado, estado reanudable, coste 0 €, PROD/DB externo/CRM/spend/trading/Android OFF, CI exact-head GREEN, Governed Main GREEN, RSI GREEN, merge a main y ejecución automática main GREEN.

## Rollback
Retirar únicamente la capa estricta, su registry y workflow. Runtime DB-SAFE nativo, evidencias anteriores y contratos legacy permanecen intactos.

## Rebuild
Recrear desde:
- `cerebro/runtime/db-safe-real-consumer-adoption-v1.mjs`
- `cerebro/tests/db-safe-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/db-safe-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-db-safe-full-e2e-real-v1.yml`

## Changelog
- v1.0.0: añade prueba real productor→consumidor, Tribunal, LRN, durable state y evidencia FinOps/observabilidad sin modificar el runtime legacy.

## next_block
`EVT-001_REAL_CONSUMER_ADOPTION_TO_FULL_E2E`
