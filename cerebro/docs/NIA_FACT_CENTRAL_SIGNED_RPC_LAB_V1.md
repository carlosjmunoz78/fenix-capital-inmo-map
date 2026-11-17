# NIA · FACT-001 central receiver/issuer (isolated LAB) · 17/11/2026

## Objetivo
Activar solo lectura de la Skill NIA desde el Worker FACT-001 actual, por el canal privado de Cloudflare Service Bindings RPC. La orden sale **firmada desde FACT-001** y se valida en NIA con HMAC-SHA256, Durable Object SQLite antirrepetición y ActionGatewayV1. No depende de GitHub Actions.

## Política de seguridad
- Emisor: `cerebro-fact001-gateway-lab-eu-20261109`, con **cola privada exclusiva** `cerebro-fact001-nia-request-lab-eu`; cola UMS y métodos UMS intactos.
- Receptor: `cerebro-nia-notion-proof-lab`, export `NiaReadOnlyLab`, binding de servicio FACT `NIA_RECEIVER`.
- **Clave HMAC nueva** `CEREBRO_NIA_DISPATCH_HMAC_KEY`, compartida únicamente como dos secretos cifrados Cloudflare de los dos Workers. No reutilizar FACT_EVENT_SIGNING_KEY, UMS ni Notion token. Nunca exportar el valor.
- **Caller RPC** adicional FACT `NIA_LAB_CALLER_TOKEN`, token exclusivo, sin tocar el valor ni alcance de otros caller tokens. Métodos RPC FACT autenticados mediante comparación constante antes de firmar. El acceso por la cola privada está controlado por permisos Cloudflare de productor.
- Flags separados: `NIA_ISSUER_ENABLED` en FACT y `NIA_DISPATCH_ENABLED` en NIA; OFF por defecto. `GATEWAY_ENABLED=false`, `ALLOW_MUTATIONS=false` y todos los flags UMS se conservan.
- Solo mensajes `NIA_FACT_PRIVATE_DISCOVERY_V1` permitidos con `company_id=fenix`, `engine_id=ACTGW-001`, topic de la lista permitida, `already_handled` opcional booleano. Los clientes no pueden imponer `authorized=true`.
- RPC NIA: `dispatchSignedEnvelope` exige firma, issuer, audiencia, empresa, env PREPROD, TTL ≤60 s y nonce nuevo. El Durable Object `NiaNonceLedger` reclama nonce en SQL de forma atómica. El ACTGW real ejecuta `notion.nia.discover.read` con Notion GET solo a la Skill permitida.
- `fetch` original FACT 403 y NIA 404; no workers.dev ni preview ni DNS ni cron. `Notion AI` no se invoca.

## Seguridad de migración
Inventario y snapshot FACT existentes en `cerebro/fact001-nia-parallel-lab/original/` (4 módulos) y `cerebro/docs/NIA_CENTRAL_GATEWAY_PARALLEL_DISPATCH_V1.md`. Versión Cloudflare de FACT antes de cambios: `31803bd4-dfe7-47a5-b62d-707dc853499e`, NIA `c91e07db-1b08-402b-b8ac-c36de97e2446`. Validar en vivo inmediatamente antes.

1. Cargar clase receptor NIA con flags OFF; conservar DO SQLite, Notion secret.
2. Provisionar clave aleatoria en Cloudflare, valor idéntico en FACT y NIA, sin revelar; caller token separado en FACT.
3. FACT: cargarse como módulos originales + un parche aditivo limitado a un método RPC y una rama de cola privada nueva; todos los bindings y secretos heredados en modo estricto y verificados. Flags OFF.
4. Comparar OLD vs NEW de las rutas UMS, payload HTTP, nombres de bindings, métodos y versiones. Revertir FACT por despliegue de la versión previa si difieren.
5. Activar NIA flags solo en LAB y ejecutar orden real de un solo uso por cola privada. Observar `FACT_NIA_PRIVATE_RESULT=PASS`, `NIA_CENTRAL_RECEIVER_GATE=PASS` y auditoría. Probar un NOOP. Sin cron/publicidad.
6. Conservar el binding privado para uso interno posterior, mantener el PR DRAFT; registrar rollback.

No promover autónomamente a PROD; no usar el canal NIA para escribir Notion ni para ejecutar su IA.
