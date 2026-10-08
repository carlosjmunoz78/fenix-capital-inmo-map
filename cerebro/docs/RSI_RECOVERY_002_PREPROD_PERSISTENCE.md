# RSI-RECOVERY-002 · PREPROD persistence & CURRENT-main reconciliation

Fecha: 2026-10-08
Estado: CONTRACT_AND_TESTS_GREEN_NOT_DEPLOYED
PROD: NO AUTORIZADO
Coste adicional: 0 EUR

## Reconciliación CURRENT main

`main` fue re-verificado después de RSI-RECOVERY-001 y continúa en `63e4a02341d8884b4df21c7c2a94562b06844059`, exactamente el base de PR #502. La recovery branch estaba `ahead` y `behind_by: 0`; por tanto, en este corte no existe drift de main que reconciliar.

## Persistencia PREPROD añadida

Se añaden dos componentes sin Supabase y sin servicio de pago:

- `cerebro/runtime/learning-ledger.mjs`: ledger LRN-001 local, durable mediante `AtomicV8Journal`, exact PREPROD, idempotente, reiniciable y con aislamiento por contexto.
- `cerebro/runtime/learning-preprod-pipeline.mjs`: gate explícito LAB shadow → PREPROD candidate → LRN-001 local.

La persistencia solo acepta records con `persistent_publish_authorized=true` y `persistence_scope=LOCAL_PREPROD_LRN_LEDGER_ONLY`. No habilita `rsi_publish_authorized`, PROD write, Trading, customer data, nuevas credenciales ni paid fallback.

## Automatización human-by-exception

`persistBridgeReportToPreprod` puede persistir automáticamente candidatos LOW/MEDIUM provenientes de un `SHADOW_BRIDGE_GREEN` cuando policy, security y local persistence están habilitados. HIGH/CRITICAL no se persisten automáticamente y generan `HUMAN_REQUIRED=HIGH_RISK`, uno de los ocho códigos canónicos.

Los reintentos/duplicados técnicos no generan intervención humana: la idempotencia del ledger devuelve duplicate sin duplicar operaciones.

## Tests físicos de persistencia

Los tests crean un journal temporal real, escriben el learning candidate, reabren el ledger desde disco, verifican recuperación tras restart, aislamiento de contexto, idempotencia y conflicto de `learning_id`. También verifican el batch bridge → PREPROD: LOW persiste y HIGH queda retenido.

El gate `CEREBRO RSI Recovery 001 Gate` fue ampliado para ejecutar estos tests junto con contrato, scheduler, learning, experiment, tribunal, promotion envelope, meta-learning, multi-company, Factory, obsolescencia, continuity, observability adapter, E2E y bridge regression.

## Qué NO significa este estado

No existe evidencia de que un worker PREPROD de larga duración esté ejecutando todavía el ledger LRN-001 fuera del CI. Los tests prueban persistencia/restart del componente, no un despliegue operativo permanente. Por tanto el estado correcto es `CONTRACT_AND_TESTS_GREEN_NOT_DEPLOYED`, no OPERATIVO.

## Rollback/rebuild

Rollback antes de merge: revertir/cerrar PR #502; main permanece intacto. El journal LRN-001 es un componente nuevo y no toca tablas Supabase ni datos existentes. Rebuild: main autorizado + archivos aprobados + gate completo; el journal puede reconstruirse a partir de learning records/evidencias válidas cuando exista el proceso de ingestión autorizado.

## Next block

`RSI-RECOVERY-003 · PREPROD RUNTIME HOST AUDIT`: localizar en la arquitectura CURRENT un runtime/worker persistente ya disponible o self-hosted a coste 0 EUR para ejecutar LRN-001 sin cargar Supabase. No desplegar hasta inventariar dependencias, almacenamiento, backup, restore, observabilidad y kill switch.
