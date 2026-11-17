# NIA · Prueba privada Cloudflare Queues (sin cron ni GitHub Actions)

**Estado:** ejecución de prueba efímera, acotada por nombre de cola, mensaje, página y TTL de 120 segundos. No URL pública ni vista previa. El token continúa como secreto inmutable de Cloudflare.

- Cola temporal: `cerebro-nia-one-shot-proof-lab` (jurisdicción UE, Free).
- Consumidor: solo `cerebro-nia-notion-proof-lab`, lote 1. El mensaje contiene identificador de página pública de la Skill, timestamp y tipo fijo; **ninguna credencial**.
- El handler `queue` verifica el mensaje y ejecuta solo dos GET de Notion; registra resultado sanitizado `NIA_PRIVATE_QUEUE_GATE` sin datos privados.
- `scheduled` sigue inerte porque `NIA_ENABLED=false`. Sin cron, sin workers.dev, sin preview, sin route. Cola y consumidor se eliminarán al terminar la prueba.
- Antes y después: verificar secret tipo `secret_text`, binding `NIA_ENABLED=false`, crons vacíos, URLs deshabilitadas.
- Tras la prueba, volver al código original sin handler de cola para evitar puertas residuales y mantener la documentación histórica.
- No autoriza invocación de IA de Notion ni promoción de Gateway a producción.
