# CEREBRO OS · FACT-001 ↔ UMS-001 · PRIVATE QUEUE LAB V0
Fecha: 2026-11-10. **Solo LAB. Nunca PROD ni Console real hasta superar gates.**

## Motivación
El cron temporal no produjo recibo. Cloudflare Cron Triggers pueden propagarse hasta 15 min. Evitamos depender de crons y de URL HTTP pública: Cloudflare Queues Free acepta comandos autenticados por API y despacha a un Worker privado.

## Arquitectura
CEREBRO autorizado (Cloudflare Universal admin/cliente futuro) → API autenticada Cloudflare Queues (EU) → cola `cerebro-fact001-ums001-read-lab-eu` → Worker existente `cerebro-fact001-gateway-lab-eu-20261109` (`queue()` + `CEREBROFactUMS001Lab.route`) → Service Binding `UMS_PRODUCER` → `ProducerLibraryLab.readSelected` → imagen de The Met ya guardada, SHA-256 `e84f82f453c52151d3a28ef22a22faeefdd5dda51f656c4b089c4b88dab8b508`.
- Sin URL pública ni cron nuevo. Sin IAM humano adicional. Solo recurso `met:436524`, lectura de 208766 bytes y audit receipt bajo `meta/fact001-ums001-queue-e2e/v1/`.
- Colas Free: 10k operaciones/día, retención 24h. Un mensaje normalmente tres operaciones. Auditar plan y límites antes de ampliar.
- `UMS001_QUEUE_ENABLED=false` por defecto. `GATEWAY_ENABLED=false`, `ALLOW_MUTATIONS=false` y `CLOUDFLARE_API_ENABLED=false` conservados. Cualquier respuesta rechazada se registra sin repetir envíos, y no altera activos.
- Identidad: `actor_id=cerebro-orchestrator-lab`; `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`; API Key de Queues en conexión privada, nunca incluida en el mensaje; el secreto `UMS001_CALLER_TOKEN` permanece en FACT Worker.
- Esta cola solo permite `action=READ` y el único asset de prueba, no representa búsqueda general ni aprobación para publicar.
- Test local 14/14 PASS en Node 22. Prueba real pendiente de crear consumidor, enviar mensaje y leer recibo KV.

## Rollback
1. Poner `UMS001_QUEUE_ENABLED=false` en FACT.
2. Desactivar/eliminar consumidor de la cola nueva, sin tocar otros.
3. Restaurar versión FACT `16bb1a1a-e0a7-4fe8-b15c-8d249c28cfa4` si necesario.
4. Confirmar FETCH=403, ninguna ruta pública, crons iguales, tres assets Poly Haven intactos, media Met sin publicación.
5. NO modificar main, PROD, App, CRM, SEO, WordPress, Trading ni Console desplegada.
