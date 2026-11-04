# B7 · RUNBOOK DE VERIFICACIÓN / RECUPERACIÓN Y ROLLBACK
**Entorno:** LAB. **PR:** #17 DRAFT, base PR #16; PROD OFF.
1. Revisar el HEAD Git actual de PR17 y B6 PR16; exigir que B6 permanezca inalterada y base correcta.
2. Node 24: `node --test zeus/jarvis/core/*.test.mjs`. Ejecución verificada: 352 tests / 0 FAIL.
3. Gate CUT02: `.github/workflows/jarvis-b7-cut02-real-pg17-github-lab.yml` usa token efímero `contents:read`; no repositorio/ruta controlados por el cliente.
4. Gate CUT03: `.github/workflows/jarvis-b7-cut03-durable-pg17-github-lab.yml` levanta PostgreSQL 17 efímero, instala el mismo journal existente B6, verifica dos lectores, claim único por misión, recuperación de recibo, interrupción segura y PG dump+restore. Último verde 41755006530.
5. Si mission claim devuelve IN_PROGRESS tras desconexión, **NO reintentar una acción potencialmente ya ejecutada**: registrar reconciliación con evidencia y supervisión antes de liberar; no borrar claims.
6. STOP inmediato si B3 no valida grants efectivos, ha caducado/revocado, kill switch activado, tribunal no acepta, evidencia sin hash, proveedor pide gasto o tenant incompatible.
7. PREPROD/PROD no están autorizados para B7; prohibido cambiar control `enabled` o `kill_switch` para conseguir verde.
8. Backup de Git: commit BASE B6 `115b7330f5ba2fd8fc1d6819d20e8e8f4bd37fbb`, PR17 separada. Reversión de B7: cerrar/revertir solo PR17; no tocar `main`, B6, CRM, PROD.
9. Restore de laboratorio realizado con `pg_dump/pg_restore` para claim B6 + misión B7; no es restore de DB PROD.
10. Para promover: restauración y concesiones reales aisladas, validación independiente, observabilidad, límite de costes, backup/rollback/rebuild y pruebas E2E del Gateway/supervisor actual.
