# NIA · ACTGW-001 · E2E real Cloudflare LAB · 17/11/2026

## Resultado
**HECHO: `NIA_ACTGW_PHYSICAL_GATE=PASS`** confirmado por consulta directa a Cloudflare Workers Observability a las **09:10:37.595 UTC**.

Se ejecutaron en un Worker aislado los **mismos módulos** de ACTGW-001 de CEREBRO:
- `cerebro/gateway/action-gateway-v1.mjs` (`ActionGatewayV1`)
- `cerebro/gateway/nia-action-gateway-binding-v0.mjs` (`bindNiaDiscoveryToActionGatewayV0`)
- `cerebro/gateway/nia-notion-page-provider-v0.mjs` (`createNiaPageReadProviderV0`, con `redirect:'manual'`)

El secreto cifrado `CEREBRO_NIA_NOTION_READ_TOKEN` permaneció vinculado al Worker de LAB, sin exposición a repositorios, registros ni conversación.

## Evidencia física: 17/17 PASS

| Prueba | Cloudflare |
|---|---|
| `NIA_ACTGW_BINDING` | PASS |
| `NIA_ACTGW_GATEWAY_CONTRACT` | PASS |
| `NIA_ACTGW_LIVE_NOTION` | PASS |
| `NIA_ACTGW_IDEMPOTENCY` | PASS |
| `NIA_ACTGW_UNAUTHORIZED` | PASS |
| `NIA_ACTGW_PAID` | PASS |
| `NIA_ACTGW_PROD_WRITE` | PASS |
| `NIA_ACTGW_TRADING` | PASS |
| `NIA_ACTGW_SIGNATURE` | PASS |
| `NIA_ACTGW_TENANT_ISOLATION` | PASS |
| `NIA_ACTGW_TOPIC_SCOPE` | PASS |
| `NIA_ACTGW_NO_DUPLICATION` | PASS |
| `NIA_ACTGW_PAYLOAD_SCOPE` | PASS |
| `NIA_ACTGW_PROD_ENV_DENIED` | PASS |
| `NIA_ACTGW_AUDIT` | PASS |
| `NIA_ACTGW_NO_SECRET_OR_CONTENT_IN_RESULTS` | PASS |
| `NIA_ACTGW_PHYSICAL_GATE` | PASS |

El evento de cola estaba limitado a una identidad de página fija, TTL de 120 segundos y una sola entrega efectiva; el Worker no admitió HTTP público y el handler `scheduled` estuvo inactivo. Los escenarios de denegación se generaron internamente en el servidor, no a partir de parámetros de clientes externos.

## Aislamiento y rollback físico
- Cola temporal de jurisdicción UE `cerebro-nia-actgw-one-shot-lab` (`4794a11a309043dd920e25e5331437dc`): **eliminada** tras PASS; comprobada ausente en listado API.
- Consumidor (`bb720dc6f49c477e9134382c7885155c`): **eliminado**.
- Worker `cerebro-nia-notion-proof-lab`: **restaurado** a `worker.mjs` de prueba anterior, sin importación ACTGW ni handler Queue.
- API Cloudflare posterior: `NIA_ENABLED=false`, `workers.dev.enabled=false`, `previews_enabled=false`, `schedules=[]`, secreto `secret_text` conservado.
- Otros Workers, credenciales, App/CRM, WordPress, Supabase, DNS y PROD: **no tocados**.
- GitHub Actions: **no usados**, siguen suspendidos. Rama LAB y PR #70 **DRAFT**; sin merge.
- Compra/suscripciones adicionales: ninguna.

## Lo que **sí** y **no** acredita
**Sí:** el Action Gateway real de CEREBRO, con su binding real y token Notion dedicado, puede ejecutar `notion.nia.discover.read` con autorización, aislamiento, idempotencia y auditoría en un runtime privado Cloudflare LAB.

**No:** no existe un despacho permanente desde el Gateway central de CEREBRO; no se ha probado la denegación de escritura directamente contra la API Notion; no se ha invocado Notion AI ni se ha promovido un componente autónomo a producción.

## Próximo gate sin tocar PROD
Para conectar **permanentemente** este binding al CEREBRO Gateway central, primero identificar su runtime, contrato de autenticación interna, propietario del secreto y dependencias. Después preparar adaptador paralelo con pruebas de identidad/firma, auditar tráfico OLD/NEW y habilitar solo ruta privada bajo los gates de CEREBRO, nunca a partir de `authorized:true` suministrado por un cliente.

## Reproducción (sin GitHub Actions)
El artefacto temporal `cerebro/nia-notion-cloudflare-lab/actgw-one-shot-worker.mjs` importa tres módulos que, durante la prueba, fueron desplegados con rutas de archivo planas (`action-gateway-v1.mjs`, `nia-action-gateway-binding-v0.mjs`, `nia-notion-page-provider-v0.mjs`) en el mismo bundle. No ejecutar como archivo Node aislado sin los módulos. Está conservado como evidencia del ensayo, no activado en Cloudflare.
