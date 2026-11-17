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

## EVIDENCIA FÍSICA DE CIERRE · 17/11/2026

**HECHO, Cloudflare API y observabilidad:**
- La cuenta registra **10 D1 existentes / 10 máximo Free**, ninguna D1 nueva creada.
- Clase SQLite `NiaNonceLedger` aplicada mediante migración `nia-nonce-ledger-v1` al Worker aislado `cerebro-nia-notion-proof-lab`. Binding `NIA_NONCE_LEDGER` verificado; secreto Notion `CEREBRO_NIA_NOTION_READ_TOKEN` heredado y conservado.
- Cloudflare rechazó el intento de *version upload* que incluía migración (error 10211), de forma segura y sin cambio de runtime. Se aplicó entonces la migración mediante despliegue normal exclusivamente en Worker LAB apagado, como exige Cloudflare; no alteró otros Workers.
- La cola de QA privada UE disparó el ledger real; **8 pruebas PASS / 0 FAIL** en logs:
  `NIA_NONCE_HEALTH`,
  `NIA_NONCE_FIRST_ATOMIC_CLAIM`,
  `NIA_NONCE_REPLAY_REJECTED`,
  `NIA_NONCE_PARALLEL_RACE`,
  `NIA_NONCE_BAD_NONCE_DENIED`,
  `NIA_NONCE_TTL_BOUNDS`,
  `NIA_NONCE_TENANT_BOUND`,
  `NIA_NONCE_PHYSICAL_GATE`.
- **ROLLBACK PARCIAL COMPROBADO:** cola temporal y consumidor eliminados y ausencia comprobada. Worker restaurado a `worker-with-nonce-ledger-stage.mjs` (sin handler de cola); DO SQLite y su binding conservados, inertes sin llamadas. `NIA_ENABLED=false`, `workers.dev=false`, previews=false, `schedules=[]`; el secreto permanece cifrado.
- Versión Worker al finalizar: `c91e07db-1b08-402b-b8ac-c36de97e2446`; versión de antes de la migración `632cdb90-2c92-4f17-9050-f8889ae8d0c6`, disponible como rollback de script si fuera necesario. **No se ha probado eliminar la clase DO** y no se afirma rollback de datos; con el Worker apagado no hay tráfico.
- Coste adicional contratado 0 €; operación pequeña dentro de Free; no se han medido cuotas futuras.
- PR DRAFT; central FACT/UMS sin modificar; GitHub Actions no usado.

**PENDIENTE CRÍTICO:** emisor real firmado del Gateway central y prueba de extremo a extremo con identidad central y ledger persistente. Las 12 pruebas de firma anteriores usaron solo clave sintética, no credencial del FACT central. No declarar despacho central conectado.
