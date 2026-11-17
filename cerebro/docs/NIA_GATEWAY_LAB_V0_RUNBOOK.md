# NIA · ACTGW-001 LAB adapter V0 · 2026-11-16

**Scope:** existing CEREBRO PREPROD Action Gateway only. Additive binding; no change to the Gateway implementation, no new logical motor, HTTP endpoint, Worker, scheduler, paid API or production data.

## Real sources
- Existing Action Gateway: \`cerebro/gateway/action-gateway-v1.mjs\`. Enforces PREPROD, authorized flag, idempotency, zero cost, audit and Human Required gates.
- Existing Notion connector registry: \`connector:notion-private-doc-read\` in \`cerebro/registry/connector-auth-registry.v0.json\` remains PARTIAL; never infer live runtime access from this document.
- NIA enabled in Notion: https://app.notion.com/p/41a81b1a756d815ab877f0d264a6a0d4
- Business runbook: https://app.notion.com/p/41a81b1a756d81ba8a0ffafe84554824

## Usage and gates
- Bind \`notion.nia.discover.read\` only by an existing ACTGW host with an authorized read-only provider implementing \`getEnabledSkills()\`.
- Caller must provide signed/authorized context and not derive \`authorized:true\` from untrusted user fields.
- A matching enabled Skill ID/name yields metadata \`NIA_DISCOVERED\`; irrelevant topics or previously handled work yields \`NOOP\`. Bad scopes or invalid provider fail closed.
- No Notion AI session starts. An outer ACTGW \`ACTION_EXECUTED\` represents a deterministic registry check, not independent work by Notion AI.
- First measure a low-risk read-only observation in isolated LAB, then verify provider scopes and origin, idempotency, audit, costs, negative tests, OLD/NEW parity and rollback. Gateway actual runtime binding is still **not demonstrated**.
- No direct PROD integration, cron, paid fallback, autonomous agents or new purchases.

## Testing
- \`node --test cerebro/tests/nia-actgw-v1-integration.test.mjs\`
- \`node --test cerebro/tests/nia-action-gateway-binding-v0.test.mjs\`
- Mock tests are not evidence that deployed CEREBRO has adopted the Notion provider.

## Rollback
Remove optional binding registration from host if ever added; do not modify the original gateway file. This PR contains only new files and can be closed without impact.

## Actualización de evidencia · 2026-11-17

El V0 anterior describía un adaptador no ejecutado. **Esta limitación se levantó solo para LAB aislado**: existe evidencia de ejecución E2E real (`NIA_ACTGW_PHYSICAL_GATE=PASS`, 17/17) con los mismos módulos `ActionGatewayV1`, `bindNiaDiscoveryToActionGatewayV0` y `createNiaPageReadProviderV0`. Véase `cerebro/docs/NIA_ACTGW_E2E_CLOUDFLARE_LAB_V1.md`.

La prueba utilizó el Worker privado de NIA y una cola UE temporal sin usar GitHub Actions. **Después se eliminó cola/consumidor y se restauró el Worker inerte**. No hay vinculación persistente con el Gateway central, ni acceso de escritura/IA autónoma; el PREPROD/LAB físico PASS no es permiso de promoción PROD.

Para replicación de código, usar el mapa `cerebro/nia-notion-cloudflare-lab/actgw-module-map.v1.json` y el contrato `cerebro/registry/nia-notion-readonly-iam-lab.v0.json`. Un montaje permanente requiere contrato de autentificación de servicio, inspección del Gateway central y actualización autorizada, no reutilizar un token de FACT-001 o Bridge.

GitHub Actions permanece bloqueado, así que los tests de Node del PR deben ejecutarse en un entorno alternativo sin disparar workflows de GitHub. No se afirman tests CI de este último commit.

