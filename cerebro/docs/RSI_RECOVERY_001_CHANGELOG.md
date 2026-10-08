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
