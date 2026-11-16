# CEREBRO OS · P0-B · Auditoría física de recursos y ejecución · 16-11-2026

**HECHO: INVENTARIO DE CONTROL PLANE + LECTURA AGREGADA DE RUNTIME · NO CAMBIO EN SERVICIOS · ESTADO P0-B PARCIAL.**

## Evidencia nueva verificable

Se realizaron lecturas directas **GET Cloudflare** (cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`) y **SQL de solo lectura en Supabase LAB** (`hnqlnvakzaywtafeiybt`). No se utilizaron claves o sesiones en el chat, ni llamadas de escritura sobre los proveedores. Registro estructurado inmutable: `P0B_RUNTIME_OBSERVATION_FENIX_2026-11-16.json`, con prueba de contrato `P0B_RUNTIME_OBSERVATION_FENIX_2026-11-16.test.mjs`.

### Cloudflare (05:59:46 UTC)
- **38 Worker scripts** presentes físicamente en la cuenta. Son recursos desplegados, **NO 38 agentes autónomos**.
- Se consultaron individualmente deployments, schedules y subdominio de los cuatro seleccionados: `cerebro-jarvis-lab-eu`, `cerebro-jarvis-cut32-lab-eu`, `cerebro-instagram-autoqual-lab`, `cerebro-facebook-autoqual-lab`. **4/4 existen, 4/4 tienen deployment y crons=[]**. Solo el JARVIS original tiene `workers.dev=true`; los otros tres `workers.dev=false`. No hubo activación, nueva URL o cambio de ruta.
- El endpoint oficial de observabilidad devolvió **232 eventos**, ventana `2026-11-15T05:59:46.522Z`–`2026-11-16T05:59:46.522Z`: `cerebro-facebook-buffer-replenisher-lab` **160** y `cerebro-facebook-knowledge-autoqual-lab-eu` **72**. Son **eventos de observabilidad**, no solicitudes HTTP, jobs, publicaciones, éxitos ni recuento de agentes.
- Los cuatro Worker seleccionados NO aparecen en el desglose devuelto; **ausencia de observación no demuestra cero ejecuciones**. Crons vacíos tampoco excluyen triggers por HTTP, queues u otros mecanismos.
- Quota Free 5 cron triggers/5 ya registrada el 15/11; **no repetida en este bloque ni alterada**. No liberar cuota ni comprar plan.

### Supabase LAB (05:58:05 UTC)
- `list_edge_functions`: **367 funciones Edge listadas con status ACTIVE** (estado de despliegue/serving, **NO 367 procesos en ejecución**). Dos observadores Operativa `cerebro-operativa-device-observe-lab-v0` y `cerebro-operativa-job-telemetry-lab-v0`, versión 1 ACTIVE. Ambos tienen `verify_jwt=false` y código que **delega** la autenticación del propietario a `fenix-app-gateway/session/context` del emisor PROD. La protección real depende del emisor y sigue pendiente del gate P0-A de revocación estricta. No se ha modificado ni probado una sesión auténtica revocada.
- `cerebro_browser_job_v2`: **201 filas en total, 117 Fénix** y **84 de otra empresa excluidas**. Solo Fénix: **92 SUCCEEDED, 13 DEAD_LETTER, 6 HOLD, 1 QUEUED, 5 CANCELLED** (suman 117). Todas con etiqueta histórica `PREPROD` dentro del proyecto LAB, **no implica que exista App PREPROD**. Último update 26/10, **0 updates últimas 24h; 0 leases vigentes; 0 latidos 5 min**.
- `jarvis_work_job_v1` Fénix: **6** (5 SUCCEEDED, 1 DEAD_LETTER), último update 09/11, **0 leases vigentes y 0 updates en 24h**.
- `cerebro_creative_job_v1` Fénix: **18** (7 SUCCEEDED, 11 HOLD), último update 05/11; **0 leases vigentes y 0 updates en 24h**.
- `cerebro_browser_job_v1`: **14 registros históricos SUCCEEDED**, último update 23/10; no sumar sin inventario de duplicados como trabajos independientes del V2.
- Dispositivos Fénix: **5 registros**, **0 heartbeats 5 min**, último visto 12/11; **104 comandos históricos**, **0 creados 24h**. Registros son identidades de dispositivos, no agentes autónomos verificados.
- `cerebro_browser_worker_metric_v2` Fénix: **60 muestras con 60 labels distintos de worker históricos**, 0 muestras 24h, último 26/10. Son etiquetas instrumentadas, **no 60 workers activos**. La suma `incremental_cost_eur=0` en dichas muestras **no** verifica factura real ni coste global 0€.
- `cerebro_job001_telemetry_preprod` Fénix: **0 filas, 0 TTL válido**. Interpretación correcta: `NO_TELEMETRY_IN_THIS_SOURCE`, no `GLOBAL_JOBS=0`.

## Veredicto operacional

**HECHO:** se han verificado existencia física de cuatro deployments Cloudflare, dos Edge readers LAB y datos históricos por empresa; existe actividad reciente de observabilidad de dos servicios Facebook en la cuenta Cloudflare. **NO VERIFICADO:** número global de agentes/subagentes/worker processes actuales, 24h ejecuciones CEREBRO, costes globales, heartbeats firmados correlacionados con job_id/run_id de esos trabajadores.

`active_agent_count=null`, `active_subagent_count=null`, `active_worker_count=null`, `active_job_count=null`. No sustituir por cero ni por cantidad de scripts/roles/filas/labels. Requisito para cambiar a ejecución verificada: heartbeat confiable con TTL + identidad worker/agent y recibo de job/run correlacionado + política; y separación de empresa/ambiente.

## Próximas reparaciones sin romper lo existente
1. Añadir a **lectura owner LAB existente** una fuente dinámica firmada de Cloudflare/Edge, con scopes server-side y coste verificado; hoy el token Preview de Cloudflare sigue ausente según el runbook anterior. **No** añadirlo a navegador ni a GitHub, ni permitir POST.
2. Emitir por los ejecutores **ya existentes** un recibo mínimo sin datos sensibles (`company_id`, `environment`, `engine_id`, `worker_id`, `job_id`, `run_id`, `heartbeat_at`, `lease_expiry`, `receipt_id`, `source`) cuando se autorice su integración sin modificar PROD.
3. Separar en Operativa las columnas `REGISTRADO`, `DEPLOYED`, `CRON_CONFIGURADO`, `HEARTBEAT_FRESCO`, `TRABAJO_VERIFICADO`, `COSTE_MEDIDO`; mostrar `NO_VERIFICADO` si no existe fuente independiente.
4. **No modificar** Cron Free, Workers, App, CRM, Gateway PROD, DNS, main, laboratorio de Trading ni abrir producción. PR #66 DRAFT. Coste de suscripciones 0 €, **consumo marginal NO_MEDIDO**.

**Rollback:** revertir únicamente la adición de esta instantánea/documentación/tests en PR DRAFT; no se cambió infraestructura, no existe rollback de servicios para este bloque.
