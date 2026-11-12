# Cloudflare universal connector · account-wide portfolio and safeguards

- Account: `e39a57e1ac42650ca5a6d5307cf0ac8e` (fixed scope in V0).
- COMPLETE product coverage goal: Zones, DNS, DNSSEC, redirects, WAF, Bot/DDoS, SSL/TLS, CDN/cache, Workers/Pages/Durable Objects, D1, KV, R2, Queues, Workflows, Hyperdrive, Vectorize, Access/Zero Trust, Tunnels, analytics, logs, billing, account IAM, AI Gateway and future Cloudflare resources.
- Implemented API client calls (NOT physically verified): account read, zone list, DNS list, Worker list/versions/secret metadata/domains, D1 list/read/FB-EU-create/FB-select-only, KV namespaces, R2 buckets, Pages projects, rulesets list, Access apps list.
- Planned/not enabled: universal mutations of zones/DNS/security, billing settings, secret changes, Worker uploads, migrations, backup/export/restore, account-level permissions and all remaining Cloudflare products.
- Contract dimensions: `company_id`, `engine_id`, `environment`, `version` plus authenticated `client_id`/`identity_ref`, idempotency key, permission & cost decision.
- Reuse: `cerebro/factory.mjs`, `cerebro/gateway/action-gateway-v1.mjs`, `cerebro/registry/connector-auth-registry.v0.json`, `credential-reference-registry.v0.json` without overwriting them. Future registration via FACT-001 overlay.
- Token requirements: for Facebook D1 `D1 Read` + `D1 Write` account-scoped; for Worker `Workers Scripts Read` + `Workers Scripts Write` account-scoped; token resource restricted to the specified account; don't add DNS/Zone Edit for Facebook test. For GLOBAL inventory, add separate READ token permissions per product as needed; do not give account-wide write to ChatGPT by default. Store tokens in an encrypted vault/provider secret, never GitHub source or chat.
- Cloudflare API source: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/list/ and https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/create/.
- Cost: Cloudflare Free currently limits D1 to 10 databases per account (verified against official Cloudflare documentation 2026-10-30); this bootstrap refuses creating an 11th database. No subscription or external runtime added by this commit. Deploy/usage cost is UNVERIFIED, so CloudflareFreeCostGuard denies changes until plan/quota are actually attested.
- Privacy: logs store actor, capability, status, tenant and timestamps only. Upstream API error bodies, bearer values and SQL values are not audited.
- Guardrails: fail-closed for wrong account/company/environment, cross-client credential sharing, wrong D1 name, wrong jurisdiction, query mutations, unauthorized PROD changes, missing authentication and unverified free tier. No automatic retries on write failures.
- Physical acceptance: Cloudflare D1 double list before creation, EU verified UUID, isolated branch commit, FB Worker flag-off deploy, external verification, both clients' authenticated requests, audit and documented rollback. Until then: `PARTIAL`.

- All mutation calls require a **durable** idempotency implementation; the exported in-memory implementation is test-only and rejected for live mutations.
- Cloudflare zones inventory checks the account ID in responses, and zone-specific DNS/WAF operations verify that the zone belongs to the configured account.
