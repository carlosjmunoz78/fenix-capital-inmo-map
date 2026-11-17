# CEREBRO OS · LAB-CF-CANARY-001 · Cloudflare Queue Worker V0.3
**Fecha:** 15-11-2026 · **Estado:** HECHO · trabajo determinista real por cola, 0 cron adicionales y rollback PAUSED acreditado.

## 1. Qué está probado
El Worker privado `cerebro-operativa-control-canary-lab` tiene consumidor de la cola nueva `cerebro-operativa-control-canary-queue-lab-eu` (jurisdicción EU). Consume sólo mensajes de prueba exactos `fenix/LAB-CF-CANARY-001/LAB/0.3.0`, `TICK_ONLY`, una unidad, presupuesto 0 y `external_actions_allowed=false`; escribe exclusivamente un recibo de verificación en el KV nuevo `cerebro-operativa-control-canary-receipts-lab-eu` (EU). El Worker no posee endpoint público, cron, D1, secretos, API externa, permisos de publicar ni vínculos con los 21 Queues y 12 KV preexistentes.

Enlace a fuente reproducible: `worker.queue-v0.mjs`. Test: `worker.queue-v0.test.mjs`. Evidencia física (ids y timestamp): `queue-physical-acceptance-2026-11-15.json`.

| Prueba de proveedor real | Resultado |
|---|---|
| Mensaje enviado a cola con `CONTROL_PAUSED=true` | `PAUSED_SKIPPED`, recibo KV, 0 work_units, 0 acciones externas |
| Mensaje enviado tras desplegar `CONTROL_PAUSED=false` | `WORK_UNIT_ACK`, recibo KV, 1 work_unit lógico, 0 acciones externas |
| Rollback por versión Cloudflare al estado pausado | `3e25b452-96c9-492f-9f7e-9b57bcc81c69`, `CONTROL_PAUSED=true`, verificado por GET |
| Configuración posterior | canario `crons=[]`, `workers_dev=false`, `preview_urls=false`; cinco cron originales sin modificar |
| Métricas de cola tras recepción | backlog=0 (medición aproximada del proveedor) |

### Semántica crítica
La unidad de trabajo es **un reconocimiento determinista de mensaje escrito como recibo KV**, no una publicación, un lead, un training ni otro trabajo comercial. El consumidor funciona por eventos de Queue, sin cron. La pausa evita ejecutar la unidad, **pero puede aceptar y marcar mensajes como omitidos**; no apaga el servicio Queue ni garantiza que el mensaje espere hasta la reanudación.

Los mensajes Queue son *at-least-once*. KV tiene consistencia eventual; la detección de idempotencia es mejor esfuerzo, no garantía transaccional. Esta V0.3 no se puede usar para ejecución financiera, escrituras externas o procesos empresariales hasta implementar libro de idempotencia transaccional (D1/DO) y tribunal.

## 2. Inventario de recursos nuevos
Cuenta Cloudflare `e39a57e1ac42650ca5a6d5307cf0ac8e`. Un único Worker preexistente actualizado: `cerebro-operativa-control-canary-lab`. Cola nueva ID `2404f1e2dbe2407dbdd37e6957855033`, KV nuevo `afe8a24354714ebcb317326415003b7e`, consumidor `4583df6a9ab34844b3c759ca15a26da1`. Configuración consumidor: batch 1, concurrency 1, max_retries 2, max_wait 1000 ms, retry_delay 5 s. No borrado ni reemplazo de recursos anteriores.

Las 21 colas y 12 KV previos se inventariaron antes del alta; no se modificaron. Se confirmó que el nombre nuevo no existía antes. Recursos nuevos se crearon con jurisdicción `eu`.

## 3. Acciones y recibos
- Versión PAUSED V0.3: `3e25b452-96c9-492f-9f7e-9b57bcc81c69`. Deployment inicial `ed1a8c2e-506a-403a-9ed8-ff948c0904c5`.
- Prueba física pausada: `labcf-pause-probe-20261115-a1`. Receipt KV `receipt:labcfkey-pause-probe-20261115-a1` contiene `PAUSED_SKIPPED`, work_units 0, `observed_pause:true`, timestamp 17:11:17 UTC.
- Versión temporal RESUMED V0.3: `823ad15a-7af3-4f07-80f1-7601ab6919fb`. Deployment `c7279c19-c26b-4a78-81e4-2ecd2bca7980`.
- Prueba física reanudada: `labcf-resume-proof-20261115-b1`. Receipt KV `receipt:labcfkey-resume-proof-20261115-b1`: `WORK_UNIT_ACK`, work_units 1, `observed_pause:false`, timestamp 17:13:43 UTC.
- **Rollback inmediato y confirmado:** deployment `dd80be77-a812-42d7-a96b-0099fa43ef7b`, versión PAUSED V0.3 restaurada. GET 17:14:56 UTC confirmó CONTROL_PAUSED true, cron [], worker_dev OFF, preview OFF, consumer 1, y los cinco cron exactos preexistentes.

Los recibos caducan a las 24 horas en KV. La evidencia y nombres de clave no sensibles quedan registrados de forma duradera en GitHub. No almacenar JWT, tokens, credenciales de Cloudflare, datos de clientes ni payloads empresariales.

## 4. Facturación y cuotas
Cloudflare Queues Free incluye 10.000 operaciones diarias; el ensayo usa una cantidad mínima de operaciones. KV también ofrece plan gratuito sujeto a sus límites. No se contrataron suscripciones ni se alteró plan. **No se dispone de medición de factura incremental por este ensayo**: 0 € es el coste adicional de suscripción, no una certificación contable de todo consumo.

## 5. Controles, backup y reconstrucción
El ejecutor real NO debe pasar a PROD ni ejecutarse desde la consola principal todavía. El adaptador Vercel Cloudflare sigue sin token backend. No mostrar control de escritura como conectado.

Para cambios futuros: comprobar GET de Queue, consumer, worker, crons, subdomain y **GET deployed version → GET versión/bindings**; `GET /settings` puede mostrar la última versión subida no desplegada. Asegurar backup de fuente y `version_id` de rollback. Subir nueva versión PAUSED sin desplegar, probar, desplegar con readback; si se prueba RESUME, desplegar su versión exacta sólo para el ensayo, enviar una única tarea y revertir a PAUSED antes del cierre. Si se rechaza una comprobación, mantener pausa.

No borrar cola, consumidor ni KV automáticamente: preservar recibos y exportarlos antes de autorizar retirada. No activar rutas públicas, Access adicionales, un sexto cron ni ningún motor comercial.

## 6. Objetivo inmediato para Operativa
1. Mostrar recibos físicos como **HISTÓRICOS**, no como lectura Cloudflare en vivo. Diferenciar pausa de procesamiento de pausa del consumer.
2. Conectar un *Owner Gateway* de lectura y después un despachador Cloudflare específico mediante credencial autorizada y servidor aislado; secreto nunca en navegador ni GitHub.
3. Añadir tribunal, idempotencia transaccional, coste, políticas por empresa, contrapartida de rollback y trazabilidad completa antes de aceptar tareas empresariales.

**Estado:** HECHO física ejecución Queue de un tick LAB y rollback; POR AUDITAR el control directamente desde CEREBRO Console y el scheduler temporal; bloqueada promoción a producción.
