# FACT-001 P5 · Cierre seguro del primer intento autónomo · 12-11-2026

**Veredicto:** cinco conectores con lectura física comprobada (ver workflow #43196619003), pero **AUTONOMÍA GENERAL NO ACREDITADA**. No confundir el estado del broker CEREBRO con el Gateway/cola de automatización.

## HECHO
- Tablas y triggers **nuevos y aislados** en D1 Free EU existente: `fact001_p5_automation_registry_v1`, `fact001_p5_jobs_v1`, `fact001_p5_audit_v1` (registro solo LAB, una ejecución por día, OFF de nuevo). Antes de DDL bookmark: `00000244-00000000-00005121-883db4a2c4f77084b10f02697c7c50d7`. **No restaurar D1 completa**, porque comparte otros motores.
- Nuevo Edge `cerebro-fact001-p5-dispatch-lab` v1, rutas no listadas 404, HMAC-like ticket aleatorio de 256 bits cuyo SHA256 se registra solo en D1; Vault propio del CEREBRO y cinco consultas fijas, 0 mutaciones a proveedores. No existe puente de escritura PROD.
- Live security test [#43199780121](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43199780121) SUCCESS: anónimo 401, malformed 401, PROD 403, ticket no autorizado 409.
- Cuenta Cloudflare Free **5/5 cron ocupados**: no hubo upgrade, pagos, eliminación ni modificación de cron ajenos. Worker de prueba sin cron `cerebro-fact001-p5-auto-lab` fue borrado (confirmado ausente).
- Reutilizado mediante versión paralela el cron **ya existente** `cerebro-fact001-recovery-runner-lab` (cada 5 minutos). Código original `processRecoveryTick` idéntico byte por byte al origen del repo y marcado en tests; cron, subdominio y D1 originales conservados. Versiones: original `a9caa600-c26d-4368-b060-57275f983963`, wrapper OFF anterior `18c112e8-a19d-4532-9236-b77996e19cff`, actual **OFF** `8b6448d3-3fb6-4124-bba6-c4b077a09cd0`. PR #44 DRAFT; main intacto.
- Primer cron real registró en D1 `FACT001-P5-20261112` con audit `QUEUED` y tiempo de expiración; el servicio Supabase no reclamó `RUNNING`, sin evidencia de lectura 5/5 de ese cron. Pasada la caducidad, se reconcilió ese job de manera acotada a `RECONCILE`, `attempts=0`, `error_code=DISPATCH_UNVERIFIED_TICKET_EXPIRED`, con auditoría inmutable `QUEUED→RECONCILE`.
- **Aislamiento/restauración:** D1 registry `enabled=0` y Worker `P5_ENABLED=false`, verificados. Cron original `*/5 * * * *` conservado. No se volverá a enviar el ticket caducado, no hay reintentos ciegos.
- Mejora [CI #43203935317](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43203935317) SUCCESS: código `worker.mjs` ahora registra `RECONCILE` de forma atómica si un futuro envío falla y el registro aún permanece en `QUEUED`, sin sobrescribir `RUNNING` ni `COMPLETED`. **Esta mejora permanece en GitHub LAB sin desplegar porque P5 está OFF.**
- No se ha modificado App, CRM, WordPress, SEO, DNS, Trading, `main` ni ninguna función Supabase preexistente. Coste de nuevas suscripciones: 0 €.

## Bloqueo que NO está resuelto
El salto Cloudflare cron → Supabase Edge no dio acuse de recibo de la orden. Se registró el job en Cloudflare, pero su estado nunca fue `RUNNING`; no hay evidencia de aceptación por el despachador. La causa exacta de egress o red aún no está identificada. No sustituir por otro camino que eluda controles de seguridad. Falta también el Gateway general CEREBRO→cola bajo identidad registrada, on-demand, no solo agenda diaria.

## Reapertura
1. Con P5 OFF, investigar solo observabilidad de la llamada cron→Edge (sin tokens en logs) y demostrar que el servicio recibe el ticket.
2. Comparar contrato/versión con el broker P5, corregir únicamente el fallo real y pasar CI negativa en paralelo.
3. Ejecutar una prueba controlada con ticket nuevo y propio, 1 job, D1 `QUEUED→RUNNING→COMPLETED`, 5 lecturas sin mutación, doble lectura de estado/ledgers, audit y rollback. **Nunca repetir el job del 12-11**.
4. Conectar una fuente de automación CEREBRO real al Gateway con autorización por scope/coste/permisos/idempotencia; después habilitar worker y registro LAB con máximo un job diario. La Console UI queda fuera.
5. En caso de fallo, conservar `RECONCILE`; mantener los 5 conectores aceptados funcionalmente, pero autonomía NO VERDE.

**Criterios cumplidos:** Conservación, pruebas funcionales 5/5 firmadas, cron original, aislamiento, rollback y auditoría del fallo. **No cumplidos:** envío automático y consumo completo, Gateway interno, autonomía bajo demanda.
