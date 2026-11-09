# FACT-001 · Cloudflare Official MCP dual client bridge · LAB

Date: 2026-11-09 · Environment: LAB · Draft PR #44 · Zero additional spend.

## New finding: vendor-managed MCP

Cloudflare operates **https://mcp.cloudflare.com/mcp**, an official OAuth-enabled Streamable HTTP MCP server covering the full Cloudflare API via the small set of `search`, `execute`, `docs` tools. Source: https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/

**Design decision:** avoid building a redundant custom Cloudflare API MCP server. Preserve FACT-001 as governance, authentication boundary, cost/IAM, company/engine identity, event/audit and integration plane; connect clients to Cloudflare's existing official MCP server:

- **ChatGPT normal:** private personal plugin `plugins_6af1f05c0e348191a4afd20c4aa0cb79`, updated to version **0.2.0** via Plugin Creator; portable `mcp.json` and Codex `.mcp.json` point to official URL and declare OAuth client metadata discovery (`cimd`). **Manifest update verified, not account OAuth connection or `tools/call` E2E**. OAuth approval requires user interaction in ChatGPT Plugins; never copy a Cloudflare API token to ChatGPT.
- **CEREBRO Gateway:** additive transport `transport/cloudflare-official-mcp-client.mjs`. Only protocol `initialize`, `notifications/initialized`, `tools/list` permitted at first, using encrypted backend tokenProvider and separate `client_id=cerebro` scope tied to the exact account. No `execute`/writes, and no shared ChatGPT login session. A small server-side `bindCloudflareOfficialReadOnlyToGateway` hook is provided; **not registered or promoted into live CEREBRO PROD**.
- **Opera:** independent browser provider using existing BROWSER-1, not provided by Cloudflare official API MCP.

## Gates and controls

1. `node --test .../tests/cloudflare-official-mcp-client.test.mjs` locally 9/9 PASS: host pinning, credential refusal, protocol, JSON and SSE, no secret logging, client/tenant isolation, Gateway deny-by-default.
2. GitHub Actions run with existing repo Secret `CEREBRO_CLOUDFLARE_API_TOKEN` tests physical MCP handshake; outputs only boolean/status/count. Does not call Cloudflare business APIs or `execute` tool.
3. Even a successful backend MCP handshake does **not** certify production Gateway wiring or OAuth login inside ChatGPT.
4. To activate standard ChatGPT connection user must install/update plugin and approve Cloudflare OAuth; verify actual `tools/list` and a benign `docs`/`search` tool call on account (READ ONLY) from user client.
5. To enable CEREBRO account reads, activate a vetted engine-specific READ ONLY Gateway binding and test physical E2E. Account mutations require explicit policies, durable idempotency, Free quota, backup, rollback and review. Keep App/CRM/DNS/PROD/Instagram untouched.
6. The user's administrative token has broad Worker/D1/R2 permissions and full IP access. Avoid using it as a public ChatGPT bearer or web frontend secret; OAuth is preferred for ChatGPT, and backend secrets remain in Vault.

## Rollback

Revert files in the isolated branch; keep original core, CEREBRO Gateway, DNS, App/CRM and Workers unchanged. Plugin release has prior version 0.1.0 in Plugin Creator release history and can be restored through reviewed rollback. No Cloudflare runtime deployed by this change.