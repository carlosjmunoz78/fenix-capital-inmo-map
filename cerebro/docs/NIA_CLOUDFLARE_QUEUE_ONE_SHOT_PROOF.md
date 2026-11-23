# NIA · Prueba privada one-shot de Cloudflare Queues · 17/11/2026

**RESULTADO FÍSICO: PASS.** Se ha registrado una ejecución real del Worker `cerebro-nia-notion-proof-lab` con la integración nueva `CEREBRO NIA · Lectura LAB` sin GitHub Actions.

## Evidencia en Cloudflare Observability

- `NIA_CLOUDFLARE_PAGE_READ=PASS`
- `NIA_CLOUDFLARE_BLOCK_READ=PASS`
- `NIA_PRIVATE_QUEUE_GATE=PASS_DEDICATED_NOTION_TOKEN_READONLY`
- Hora evento: 2026-11-17 09:01:56 UTC (aprox.).
- No se registraron el token, el cuerpo de la página ni datos personales.

## Incidente y reparación

El primer ensayo devolvió `BLOCKED_NOTION_NETWORK`. Cloudflare Workers no admite `redirect:'error'`, que lanza `TypeError` al construir `Request` antes de enviar tráfico. La corrección `redirect:'manual'` retiene el bloqueo de redirecciones al comprobar explícitamente `HTTP 200`. Fuente: https://developers.cloudflare.com/workers/runtime-apis/request/

## Eliminación de recursos efímeros

- Cola temporal EU `cerebro-nia-one-shot-proof-lab` id `fd2908242aad44d3b9c0b2b5b61ffea8`: **ELIMINADA**, comprobada ausente en lista Cloudflare.
- Consumidor `602e148f877d4c728aff3408412960d7`: **ELIMINADO**.
- Worker: restaurar implementación original sin handler de cola, con el único cambio `redirect:'manual'` y conservar credencial cifrada original; mantener NIA_ENABLED=false, workers.dev false, previews false, cron vacío.
- No implicó tráfico público, DNS, App, CRM, Workers ajenos, GitHub Actions ni suscripciones.

**Alcance de PASS:** credencial y permisos API de lectura de la Skill; no demuestra invocación de IA de Notion ni vinculación ACTGW en producción.
