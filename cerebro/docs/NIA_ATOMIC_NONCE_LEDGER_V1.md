# NIA Atomic Nonce Ledger v1 · propuesta Cloudflare Free

## Motivo
La cuenta Cloudflare tiene **10/10 D1**, el máximo Workers Free, comprobado 17/11/2026. No crear una undécima base D1 ni ampliar el plan.

## Solución sin saturar Supabase
SQLite-backed Durable Object `NiaNonceLedger` dentro de **un Worker NIA LAB ya existente**, no servidor ni base D1 adicionales.
- Tabla `nia_nonce_claims(nonce TEXT PRIMARY KEY,expires_at_ms INTEGER)`.
- Alta `INSERT OR IGNORE` + `SELECT changes()` en el mismo objeto SQLite: reclamación atómica por nonce.
- `makeNiaNonceStoreV1` exige Durable Object binding, solo `fenix/ACTGW-001/PREPROD`.
- Sin HTTP, sin cron, sin clientes ni modelos IA, sin secretos dentro de tabla.
- Cualquier fallo de binding/DB hace que `dispatchNiaVerifiedLabV1` deniegue el evento.
- Cloudflare Workers Free permite SQLite DO con límites; no requiere cuota nueva ni pago, siempre que el consumo se mantenga dentro de Free (https://developers.cloudflare.com/durable-objects/platform/pricing/).

## Control de promoción
Primero prueba en Worker LAB privado, migración nueva clase SQLite con `new_sqlite_classes` y binding `NIA_NONCE_LEDGER`; conservar token NIA y flags OFF. Validar conexión y operación concurrente, snapshot del bundle/rollback, cuota y auditoría. No reutilizar `MEDIA_LEDGER` de UMS ni `LAB_KV` de FACT.

## Estado
Preparación código = DEFINIDO. DB/DO real = POR AUDITAR hasta prueba física. Central FACT sigue sin productor firmado, y no se modificará durante este paso.
