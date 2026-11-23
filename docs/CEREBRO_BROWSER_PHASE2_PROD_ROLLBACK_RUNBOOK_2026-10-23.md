# Browser 1 Phase 2 PROD rollback runbook

Trigger rollback on any RED canary, secret-policy violation, queue corruption, lease leak, cross-company isolation failure, unexpected cost, or V1 regression.

1. Set `public.cerebro_browser_orchestrator_config_v2.enabled=false` for `PROD`.
2. Stop issuing new V2 leases; verify `cerebro_browser_lease_v2(...,'PROD',...)` returns `job=null` + `ORCHESTRATOR_DISABLED`.
3. Cancel/drain only Phase 2 canary jobs. Do not delete evidence.
4. Verify active V2 profile leases = 0.
5. Route Browser execution through V1.
6. Verify V1 dispatch ACTIVE and V1 queue healthy.
7. Preserve V2 schema/functions/tables for forensic evidence; no destructive rollback is required.
8. Record incident, cause and corrective migration before another promotion attempt.

## CP126 · Cierre acelerado de vigilancia y leases (2026-11-24) · LAB DRAFT, sin promoción

**Contrato anterior:** el workflow `cerebro-browser-job-runner-v2-live.yml` espera hasta cuatro minutos, incluso con `QUEUED=0`, `RETRY_WAIT=0`, y vuelve a despachar otra ejecución cuando `event_name!=schedule`. En diez runs consecutivos reales (45282924377–45288884049), **43,15 minutos de runners sumados**, de ellos **41,23 minutos de vigilancia**, y todas las matrices de workers fueron `SKIPPED`. Son minutos de ejecución observados, no un importe facturado ni un benchmark de producción.

**Cambio de rama CP122/CP126 y contrato NEW:** PR #92 DRAFT, una única rama `lab/browser1-idle-rearm-gate-cp122-20261123`; no se aplica a PROD. Rearme solo con cola pendiente y resultado de vigilancia OK. El endpoint OIDC `status-v2` incorpora una **lectura de recuento** de `LEASED` caducados (sin IDs, URL, credenciales, escritura ni nuevo permiso) cuando existen arrendamientos; valida tipos/rango y falla con 503 ante inconsistencia. El watcher usa `QUEUED + RETRY_WAIT + expired_leases`; si el campo opcional no existe en la Edge antigua, aplica el contrato anterior y no confía en un estado falso. El worker ya existente llama a `cerebro_browser_lease_v2`, que llama al reaper ya existente. **No crear otro reaper, cron, worker o servidor**. El cierre de un lease agotado es `DEAD_LETTER`, no un reintento MUTATE.

**Pruebas físicas LAB ya acreditadas, no confundidas con UI/browser E2E:**
- CP125: SQL transaccional `BEGIN … public.cerebro_browser_reap_v2('LAB') … ROLLBACK`: un lease 1/1 agotado pasa a DEAD_LETTER, otro 1/2 a RETRY_WAIT, retry vencido a QUEUED; 3/3.
- CP126: nueva transacción LAB usando funciones existentes `enqueue_v2`→`lease_v2`→`complete_v2`: fixture OBSERVE sintético acabó SUCCEEDED, attempt=1, lease liberado; ROLLBACK posterior, **0 filas de fixtures persistidas**, todos los recuentos PROD sin cambio. No se ejecutó Chromium ni se tocó un navegador real.
- GitHub CI del primer commit CP126 `fe544d32f590e88c362e9e46513e60cc96cf9a6d`: tests de la ruta de host 17/17 PASS; comprobaciones ampliadas 32 SUCCESS, 2 SKIPPED, 0 FAILED al cierre de dicha ejecución. Recalificar CI tras cada commit adicional.

**Bloqueador innegociable antes de promoción:** ni Edge `enqueueLive` ni RPC `cerebro_browser_enqueue_v2` emiten un disparador demostrado de GitHub, HTTP o NOTIFY; no hay trigger de tabla ni pg_cron Browser. Cron GitHub `*/5` es *best effort* y se ha observado retraso. **Sin wake-up demostrable para un trabajo NUEVO tras periodo vacío, PR #92 NO MERGE**. Debe medirse enqueue→disparo→lease→complete y coste de runners, más OLD vs NEW, identidad OIDC, prueba OWNER y rollback.

**Orden de despliegue seguro, sujeto a gates, no autorizado aún:**
1. Mantener snapshot de Edge y workflow actuales, SHA completo y contrato de respuesta de `status-v2`; verificar protección OIDC.
2. Desplegar primero Edge aditiva con campo opcional `expired_leases` solo si canario controlado y acceso privado queda verificado; el workflow OLD ignora el campo.
3. Probar un lease sintético, aislado y sin MUTATE en circuito LAB; certificar backoff y cierre exacto sin alterar PROD.
4. Desplegar cambio de workflow solo con wake-up de nuevos jobs previamente probado y SLA válido. Hacer comparación OLD vs NEW, canary gradual y observabilidad; NO promover desde una PR sin test físico.
5. Ante incidente, volver inmediatamente al commit previo de **la Edge y el workflow afectados**, sin eliminar SQL ni datos. No usar `DISABLE` del orquestador como primera opción si hay LEASED activo; coordinar drenaje/kill switch y el runbook original. Garantizar que no se ejecutan otra vez operaciones MUTATE agotadas.
6. Registrar en Engine Registry/observabilidad la capacidad Browser1 sin inventar otro `engine_id`; documentar evidence+coste medido+rollback probado y cierre de gates en PR #92. Si no hay invocador de GitHub externo legítimo, declarar `HOLD_LIVENESS` y no solicitar tokens sin custodia.

**Nota de alcance:** se conserva el runbook histórico de 23/10; algunos estados antiguos (PREPROD desplegado, V1 rollback activo) son evidencias de aquella fecha, NO certificación de funcionamiento presente. El incidente PROD observado tiene un `CONSOLE-001 MUTATE` 1/1 caducado desde 19/11; no ejecutar `reap_v2('PROD')` sin snapshot, tribunal, owner policy y rollback. No reactivar los diez HOLD de identidad.

