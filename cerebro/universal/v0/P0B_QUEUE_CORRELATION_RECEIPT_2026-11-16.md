# CEREBRO OS · P0-B · Confirmación de transporte Queue y correlación limitada · 16/11/2026

**ESTADO: HECHO en auditoría de solo lectura de proveedor; correlación E2E de trabajo de negocio PENDIENTE.**

Se ha consultado en Cloudflare la cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`: **22 colas y 10 D1 registradas**. No son 22 ejecutores ni 10 agentes. Se identificaron consumidores usando `GET /queues/{id}/consumers` y métricas de backlog con `GET /queues/{id}/metrics`, y se utilizó el dataset introspectado `events.queuesMessages` (muestreo adaptativo) para sumar `sampleInterval` por `queueId`, `actionType` y `outcome` en ventana **2026-11-15T06:00:00Z–2026-11-16T06:00:00Z**. Solo se conservaron nombres y contadores agregados; ningún cuerpo, cliente o mensaje individual.

| Cola | Write ponderado | Read ponderado | Delete success ponderado | Consumidor verificado por API |
|---|---:|---:|---:|---|
| Operativa canary | 2 | 2 | 2 | `cerebro-operativa-control-canary-lab` |
| Instagram AUTOQUAL ticker | 72 | 72 | 72 | `cerebro-instagram-knowledge-autoqual-lab-eu` |
| LinkedIn autonomy ticker | 72 | 72 | 72 | `cerebro-linkedin-autonomy-ticker-lab-eu` |
| UMS source refresh | 8 | 12 | 14 | `cerebro-ums001-multisource-scout-lab-eu` |

El campo `outcome=success` de `DeleteMessage` acredita **operación de borrado/acknowledgment del broker**; NO prueba que se haya creado un activo, publicado contenido, aprobado un motor, completado un job de negocio o producido un recibo firmado. Las sumas están sujetas a muestreo adaptable. No sumar las tres columnas para declarar trabajos.

**Avance concreto de correlación de fuentes:** en el canario aparecen **2 invocaciones queue** en `events.workersInvocations` y **2 Write + 2 Read + 2 Delete success** de su cola en la misma ventana. Su consumidor coincide con el script; los dos recibos son **agregados**, sin `message_id`, `job_id`, `run_id` ni `receipt_id` enlazados. Clasificación `SAME_WINDOW_SAME_CONSUMER_AGGREGATE_ONLY`, no E2E de negocio. El canario permanece **sin cron, sin workers.dev y sin preview URLs**, verificado físicamente.

**Controles de no inflación:** Instagram muestra **71 invocaciones queue del Worker** frente a **72 Delete success ponderados**; no inventar paridad ni ajustar una fuente. LinkedIn muestra 72/72, pero la igualdad de agregados NO demuestra emparejamiento de mensajes. UMS muestra 8/12/14 por operación, sin inferir consumo uno a uno. Así, ni Cloudflare Jobs ni CEREBRO deben construir un contador `active_agents` ni `verified_business_jobs` a partir de estas métricas.

**Incidencia de observabilidad:** para Instagram y LinkedIn `GET /queues/{id}/metrics` devolvió `backlog_count=0` junto con `backlog_bytes=91` y `128` respectivamente, además de timestamp de mensaje más antiguo. El conjunto no es internamente uniforme para afirmar `QUEUE_DRAINED=VERIFIED`: registrar `BACKLOG_UNCERTAIN`, no activar reconciliación automática, no hacer `pull`, `ack`, `purge`, `peek` ni reintentos que alteren leases.

**Ámbito multiempresa:** solo los consumidores Instagram/LinkedIn declaran `COMPANY_ID=fenix-capital` en bindings leídos previamente; la cola por sí misma no declara empresa y todavía no existe equivalencia canónica auditada con `company_id=fenix`. Canario y UMS no tienen `COMPANY_ID` en bindings planos consultados. Todo permanece en scope cuenta Cloudflare hasta Registry.

**Gates pendientes para business proof:** 1) contrato de correlación con hash estable de `run_id/message_id/job_id/receipt_id` generado por ejecutor autorizado, TTL y compañía; 2) recibo de resultado del job con semántica funcional, no solo ack del broker; 3) prueba sin contenido privado, costes medidos y no duplicados entre retries; 4) observación autenticada en consola/Preview y P0-A revocación real. **Nada de lo anterior se ejecuta con estos datos agregados.**

**Recibo:** `P0B_QUEUE_CORRELATION_2026-11-16.json`. **Tests:** `P0B_QUEUE_CORRELATION_2026-11-16.test.mjs`.

**Preservación:** ni Workers, colas, D1, consumidores, cron, Gateway, App, CRM, DNS, Vercel, GitHub main o Trading han sido modificados; solo archivos nuevos en PR #66 DRAFT. Nuevas suscripciones 0 €, coste variable de consultas no medido.
