# NIA / ACTGW-001 · One-shot Cloudflare LAB physical proof

Uses exact `ActionGatewayV1` from `cerebro/gateway/action-gateway-v1.mjs`, exact binding `bindNiaDiscoveryToActionGatewayV0` and dedicated Notion `createNiaPageReadProviderV0` (redirect manual fixed).
Deployment: existing isolated `cerebro-nia-notion-proof-lab` Worker; temporary queue consumer and message; no public HTTP, cron, AI/paid API, production.
Secret stays in Cloudflare existing `CEREBRO_NIA_NOTION_READ_TOKEN`.
Checks performed: binding, real Notion API GET, tenant authorization, no PROD/trading/paid, idempotency, audit, topic/payload scope, no duplicate work, raw secret non-disclosure.
After result, delete Queue and consumer, restore Worker `worker.mjs` OFF with no queue handler; retain source and evidence in PR DRAFT. Main CEREBRO Gateway deployment is NOT changed by this test. GitHub Actions suspended and not used.
