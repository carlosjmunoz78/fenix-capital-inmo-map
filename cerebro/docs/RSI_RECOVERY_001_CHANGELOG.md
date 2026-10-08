# RSI-RECOVERY-001 · Changelog

## 2026-10-08

### HECHO

- Congelado OLD source PR #416 / `a79d51dccb794ab0718d6959554185bfab3ca0b4` y CURRENT base `63e4a02341d8884b4df21c7c2a94562b06844059`.
- Creada recovery branch `cerebro-rsi-recovery-001-20261008` y PR DRAFT #502.
- Auditados los 49 archivos OLD: 13 workflows, 11 docs, 12 runtimes, 13 tests.
- Portados con cambios 11 runtimes genéricos: continuous-improvement contract/scheduler, learning, experiment, evaluation tribunal, promotion envelope, meta-learning, multi-company learning, FACT-001 supervisor, knowledge obsolescence y continuity handoff.
- `rsi-observability-security.mjs` OLD no se duplicó; se preservó la autoridad CURRENT `observability-audit-finops.mjs` y se añadió `rsi-observability-adapter.mjs` puro.
- `skill-rsi-shadow-bridge.mjs` usa el contrato canónico recuperado y continúa sin persistencia/publicación/PROD.
- Añadidos tests por módulo y E2E de recuperación.
- Añadido workflow unificado `cerebro-rsi-recovery-001-gate.yml`.
- Gate completo GREEN en head `75ee94a0a1602ca18decaf5c06810200e3d47949`, run `37777163573`.

### NO HECHO / NO AUTORIZADO

- No merge de PR #416.
- No merge de PR #502 a main.
- No PROD write ni autonomía PROD.
- No persistencia automática de learning records.
- No elevación de permisos o presupuesto.
- No nuevas credenciales.
- No acceso Trading.
- No paid fallback.
- No cambios de App/CRM/Supabase/SEO/Notion/WordPress/Training.

### SIGUIENTE

`RSI-RECOVERY-002 · PREPROD INTEGRATION & CURRENT-MAIN RECONCILIATION`: verificar main vivo, reconciliar drift, comparar CURRENT vs recovery, ejecutar gates completos, probar rollback/rebuild y solo entonces decidir registro/promoción.

---

## RSI-RECOVERY-011 · POST-MERGE AUTONOMY ACCEPTANCE · 2026-10-08

### HECHO

- PR #502 integrada en `main` como recuperación NON-PROD/PREPROD y control plane hostless.
- PR #503 corrigió el checksum de nuevos batches para usar SHA-256 de bytes reales.
- PR #504 añadió compatibilidad criptográficamente verificada con el checksum histórico, visibilidad `PARTIAL_REMOTE_ERROR` y fallo visible del workflow tras persistir evidencia anti-loop.
- PR #505 añadió migración idempotente del checksum legado del índice, preservando byte-for-byte el batch histórico.
- `CEREBRO RSI Learning Outbox Publisher V0`, run `37823708844`, attempt 3 = SUCCESS.
- `CEREBRO RSI Learning Control Plane V0`, run `37827544846` = SUCCESS: un batch real descargado/procesado, 15 learning records persistidos, ledger existente, cero HOLD/HUMAN_REQUIRED.
- `CEREBRO RSI Learning Outbox Publisher V0`, run `37823708844`, attempt 4 = SUCCESS.
- `CEREBRO RSI Learning Control Plane V0`, run `37827678008` = SUCCESS: 0 descargas nuevas, 1 batch saltado por receipt, 0 persistencias nuevas y ledger existente.
- Engine binding `LRN-001` actualizado a `AUTOMATIC_PREPROD_VERIFIED`.
- Core hostless: no depende de PC permanentemente encendido.
- Coste adicional observado/contratado para este V0: 0 EUR; sin nuevas credenciales.

### ESTADO

- `LRN-001 / RSI V0 = LISTO · AUTOMÁTICO · PREPROD`.
- `PROD = HOLD`.
- `Trading = NO ACCESS`.
- Solo los motores/componentes conectados mediante eventos/hooks entran automáticamente en el circuito; legado no conectado requiere wrapping controlado.

### EVIDENCIA

Ver `cerebro/docs/RSI_RECOVERY_011_POSTMERGE_AUTONOMY_ACCEPTANCE.md`.
