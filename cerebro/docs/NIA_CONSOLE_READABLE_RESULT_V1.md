# NIA · Resultado visible en CEREBRO Console (lectura) · 2026-11-17

Se conserva el flujo **Console autenticada → Queue FACT → NIA ACTGW → Notion**, pero se añade respuesta sincrónica de **verificación de la Skill** desde la misma API Notion ya existente, con token `cerebro_notion_service_token_v1` almacenado en Supabase Vault. Este token de servicio no sustituye la credencial aislada Cloudflare `CEREBRO_NIA_NOTION_READ_TOKEN`.

**Evidencia previa real** Supabase pg_net Notion API:
- GET fijo `/v1/pages/41a81b1a-756d-815a-b877-f0d264a6a0d4` → 200, ID correcto, página no archivada (ID de petición 41103)
- GET `/v1/blocks/41a81b1a-756d-815a-b877-f0d264a6a0d4/children?page_size=50` → 200, 36 bloques, sin paginación pendiente, seis encabezados (ID 41105).
- No hay operaciones de escritura, modelos de pago ni IA de Notion.

Nueva respuesta de `consulta NIA` en chat: `NIA_SKILL_VERIFIED_AND_QUEUED` si GET página + bloques en Notion verifica ID/título y estado, con 0–8 encabezados y conteo de bloques. La petición asíncrona a FACT/NIA continúa en cola, **sin declararse completada** hasta verificar logs externos. Si la lectura Notion falla, se conserva el estado `QUEUED` sin fingir contenidos; si el envío Queue falla se devuelve `ERROR`.

**No afirma Notion AI nativa**: la integración Notion de ChatGPT ofrece `notion_spawn_session` solo para un Custom Agent publicado, pero `notion_search_agents` devuelve `results:[]` tanto en workspace como favoritos; no se ha creado ni invocado agente nuevo. El uso automático de Notion Skills a través de la API no equivale a ejecutar Notion AI.

**Gates:** no alterar la autorización del propietario `CARLOS-ADMIN`, token Queues Write caduca 2026-12-01. Snapshot v37 de seis archivos, prueba en canario v4 y luego promoción solo si OLD vs NEW y JWT fail-closed quedan verdes. Rollback a v37 o v36 desde GitHub sin tocar App/CRM/otros motores. PR #70 DRAFT, 0 € adicionales.
