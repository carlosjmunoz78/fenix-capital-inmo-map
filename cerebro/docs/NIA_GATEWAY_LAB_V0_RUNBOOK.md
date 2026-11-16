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
