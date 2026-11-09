# FACT-001 · Cloudflare Universal / ChatGPT Private Plugin · P0 evidence
Date: 2026-11-09
Company: fenix-capital
Engine: FACT-001
Environment: LAB
Version: 0.1.0

## Verifiable state
- GitHub PR #44 (DRAFT) and isolated branch `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`.
- Shared core, account-wide Cloudflare capability catalog, authenticated transport-neutral MCP adapter, CEREBRO Gateway bridge.
- Node test suite: 14/14 PASS on isolated local runtime, no external Cloudflare HTTP calls.
- Private ChatGPT plugin created: `plugins_6af1f05c0e348191a4afd20c4aa0cb79`; visibility PRIVATE, version 0.1.0, link: https://chatgpt.com/plugins/plugins_6af1f05c0e348191a4afd20c4aa0cb79
- **This plugin is a skill-only PREPARATION package. It is not an MCP connection and cannot directly access the Cloudflare API.**
- GitHub Actions repository secret `CEREBRO_CLOUDFLARE_API_TOKEN`: its NAME and presence were verified visually in authenticated Opera GitHub Actions Secrets UI on 2026-11-09; its value was NOT read.
- Cloudflare Account `e39a57e1ac42650ca5a6d5307cf0ac8e` D1 dashboard read-only inspection showed 7 existing D1 databases, including Instagram; Facebook target `cerebro-facebook-autoqual-lab` not present in visible rows.
- The Cloudflare token permissions and successful API authentication have **NOT** been tested or attested.
- Facebook D1 NOT created; Facebook Worker NOT deployed; no UUID replaced.
- No App, CRM, DNS, PROD, Instagram, or main changes.

## Remaining physical acceptance
1. Use a trusted authenticated runtime that receives Cloudflare secret from the encrypted repository store (not the chat). Prove the API token is valid for the exact Cloudflare account; discover permitted resource scopes and current free quota. No paid fallback.
2. Add a durable atomic idempotency store and verified FinOps guard before ANY mutation.
3. Safely create the isolated EU Facebook D1 if absent; verify real UUID, commit only to Facebook branch; deploy only disabled Worker after gates.
4. Bind `transport/mcp.mjs` to an HTTPS MCP server with OAuth 2.1 and a verified ChatGPT client identity, and `transport/cerebro-gateway.mjs` to existing CEREBRO Gateway with independent IAM. Do not pass repository API token to ChatGPT.
5. Verify actual tools/list, authenticated tools/call, provenance and rollback from ChatGPT normal AND CEREBRO separately. Never claim operational state based only on Node mocks.
6. Expand account-wide Cloudflare modules with separately approved granular scopes and non-destructive OLD/NEW regression.

## Safety / rollback
All changes are additive under `cerebro/connectors/universal/` on a DRAFT feature branch. Revert branch commits to undo code and skill integration; no Cloudflare resources have been created by this project step. GitHub Actions secret remains encrypted and is not automatically consumed by ChatGPT or Cloudflare.
Cost new external spend: 0 EUR. No ChatGPT Work.
