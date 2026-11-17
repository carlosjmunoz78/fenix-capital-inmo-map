# NIA · Resultado visible en CEREBRO Console (lectura) · 2026-11-17

Se conserva el flujo **Console autenticada → Queue FACT → NIA ACTGW → Notion**, pero se añade respuesta sincrónica de **verificación de la Skill** desde la misma API Notion ya existente, con token `cerebro_notion_service_token_v1` almacenado en Supabase Vault. Este token de servicio no sustituye la credencial aislada Cloudflare `CEREBRO_NIA_NOTION_READ_TOKEN`.

**Evidencia previa real** Supabase pg_net Notion API:
- GET fijo `/v1/pages/41a81b1a-756d-815a-b877-f0d264a6a0d4` → 200, ID correcto, página no archivada (ID de petición 41103)
- GET `/v1/blocks/41a81b1a-756d-815a-b877-f0d264a6a0d4/children?page_size=50` → 200, 36 bloques, sin paginación pendiente, seis encabezados (ID 41105).
- No hay operaciones de escritura, modelos de pago ni IA de Notion.

Nueva respuesta de `consulta NIA` en chat: `NIA_SKILL_VERIFIED_AND_QUEUED` si GET página + bloques en Notion verifica ID/título y estado, con 0–8 encabezados y conteo de bloques. La petición asíncrona a FACT/NIA continúa en cola, **sin declararse completada** hasta verificar logs externos. Si la lectura Notion falla, se conserva el estado `QUEUED` sin fingir contenidos; si el envío Queue falla se devuelve `ERROR`.

**No afirma Notion AI nativa**: la integración Notion de ChatGPT ofrece `notion_spawn_session` solo para un Custom Agent publicado, pero `notion_search_agents` devuelve `results:[]` tanto en workspace como favoritos; no se ha creado ni invocado agente nuevo. El uso automático de Notion Skills a través de la API no equivale a ejecutar Notion AI.

**Gates:** no alterar la autorización del propietario `CARLOS-ADMIN`, token Queues Write caduca 2026-12-01. Snapshot v37 de seis archivos, prueba en canario v4 y luego promoción solo si OLD vs NEW y JWT fail-closed quedan verdes. Rollback a v37 o v36 desde GitHub sin tocar App/CRM/otros motores. PR #70 DRAFT, 0 € adicionales.

## Implantación física del resultado visible · V38 · 17/11/2026

**HECHO:** `cerebro-console-gateway-v0` Supabase Edge v37 → **v38** (`ezbr_sha256=15899b7f2a752ef1d577c0d13e02fbe553c99efd179edddb981a360a89556256`). Solo cambió `nia_console_transport.ts`; los otros cinco archivos se conservaron idénticos a v37. El backend conserva el endpoint y control de propietario, el frontend React y el Gateway FACT/NIA no se alteraron.

La respuesta de `consulta NIA` puede ahora mostrar verificación directa en Notion: la Skill de título exacto, 36 bloques detectados en prueba de acceso, seis encabezados y fecha de lectura. Al mismo tiempo sigue enviando la orden a FACT/NIA en Queue. **No se interpreta el resultado de la Queue como completado** ni se ejecuta IA nativa.

**Verificaciones realizadas:**
- Notion API `GET /v1/pages/<NIA_SKILL_ID>`: 200, ID y estado correctos, referencia pg_net 41103.
- Notion API `GET /v1/blocks/<NIA_SKILL_ID>/children`: 200, 36 bloques, sin `has_more`, pg_net 41105.
- Canario Edge: candidato v4 desplegado, sin credenciales y JWT incorrecto 401/401. Se restauró exactamente v37 como canario v5 (SHA idéntica), luego candidato v38 como v6 (SHA idéntica). Rollback del canario comprobado.
- Función real v38: sin credenciales JWT 401 (`41114`), JWT inválido 401 (`41115`).
- Ninguna API Notion mutante, suscripción, nueva base D1 ni invocación de IA de pago.

**PENDIENTE LIMITADO:** no se ha ejecutado de nuevo la consulta de un propietario real **tras** v38 para confirmar el nuevo texto de resultado en la interfaz. La prueba con propietario de v37 sí existe y pasó. No se declara test E2E positivo de v38 sin verlo.

**IA nativa Notion no conectada:** Notion connector tiene herramienta `notion_spawn_session` para sesiones de Custom Agent **publicado**. La consulta de agentes workspace y favoritos devuelve listas vacías; no hay agente al que dirigir una sesión, y no hay evidencia de una API general para invocar Notion AI. Las Skills disponibles son distintas de un Custom Agent invocable. No se ha sustituido por otra IA ni creado nada de pago.

**Rollback del endpoint real preparado, no ejecutado:** volver a desplegar los seis archivos originales v37 (copia exacta del Edge v37) o los cuatro archivos v36 guardados en `cerebro/backups/console-gateway-v36-20261117/`; verificar 401/401 y conversación real. Mantener PR #70 DRAFT y documentar costes reales antes de autonomía.

## Corte final: V38 · prueba autenticada con propietario · 17/11/2026

**HECHO — último gate de lectura E2E VERDE.** El usuario mostró la respuesta en la Console: «He comprobado la Skill NIA directamente en Notion: 36 bloques de contenido y 6 secciones principales (Identidad y límites; Decisión automática antes de cada operación; Enrutamiento práctico; Coste y seguridad; Prueba y salida; Referencias permanentes). También he enviado la orden a FACT-001/NIA en LAB. Su procesamiento es asíncrono; no he iniciado la IA nativa de Notion».

**Verificación física independiente, mismo intento temporal:**
- **11:59:10.015 UTC**: Supabase Edge v38 registra `CONSOLE_NIA_EDGE_QUEUE_ACCEPTED` (topic `documentation`).
- **11:59:11.070 UTC**: Cloudflare NIA receptor `NIA_CENTRAL_RECEIVER_GATE=PASS`.
- **11:59:11.074 UTC**: Cloudflare FACT-001 `FACT_NIA_PRIVATE_RESULT=PASS`.

La Console muestra la lectura Notion real de la Skill y la Queue termina su despacho con PASS. Los registros son de etapas distintas y se han correlacionado por secuencia temporal y evento, **no se ha demostrado todavía un identificador end-to-end persistente compartido**. Un acuse `QUEUED` no equivale por sí solo a ejecución: el PASS procede del registro posterior de NIA.

**ESTADO:** lectura CEREBRO Console V0 v38 → FACT original → NIA Notion Skill **HECHO y verificado**. No ejecutar más smoke de esta conexión salvo regresión. **No está demostrada la invocación de la IA nativa de Notion** ni la autonomía PROD. Token Cloudflare Queues Write expira el 01/12/2026 y debe rotarse antes. Mantener PR #70 DRAFT, sin GitHub Actions ni suscripciones nuevas.
