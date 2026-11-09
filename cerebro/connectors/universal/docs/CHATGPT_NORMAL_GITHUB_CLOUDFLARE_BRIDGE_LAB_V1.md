# FACT-001 · ChatGPT normal ↔ GitHub Actions ↔ Cloudflare · LAB V1

## Status and limitations
This is a real REST-API *read-only* pathway independent of ChatGPT Work, the native MCP plugin runtime, and the official Cloudflare MCP OAuth flow. It is **not** a direct ChatGPT MCP connection nor a production autonomous deployment. Production remains untouched.

- GitHub connected in ChatGPT normal writes a validated order JSON to the isolated PR #44 branch; a push-triggered workflow executes the **single fixed** `account_readonly_audit` against the exact account ID with the repository's existing encrypted GitHub Actions secret.
- The order has 4D dimensions (`company_id`, `engine_id`, `environment`, `version`) plus fixed caller ID `chatgpt-normal`, fixed Cloudflare account ID, a versioned request ID and an allowlisted enum operation.
- The runner imports existing `checkCloudflareReadOnly` and `auditCloudflareAccountScopes` for evidence; both use GET to `api.cloudflare.com` only. Request JSON cannot inject commands, SQL, URLs, company IDs, arbitrary account or PROD environment.
- Only per-product permission states (`READ_OK`, `PERMISSION_BLOCKED` etc.) and safe D1 counts are logged; no raw API responses, credentials or customer records are published. A short-lived GitHub Actions artifact carries redacted audit receipt. No public Worker, route or Cloudflare deployment.
- ChatGPT can retrieve run result and job logs through authenticated GitHub connector. Demonstrate real ChatGPT→GitHub→Cloudflare→GitHub→ChatGPT loop before marking operational.
- CEREBRO independent Gateway may later reuse the validated fixed Cloudflare read-only API modules; LIVE Gateway integration remains unproven, and must not be called operative.

## Safety and security gates
1. No secrets in git; encrypted GitHub Actions token injected server-side. Existing account-wide token is broad: recommend a separately scoped read-only token and protected deployment environment before permanent autonomous execution. Never print token.
2. Only `LAB`/`FACT-001`/`fenix-capital`/`chatgpt-normal` and exact Cloudflare account permitted.
3. Never modify or deploy to PROD App/CRM/DNS/Workers/Instagram; no merges; PR draft.
4. Write operations intentionally **not implemented** in this bridge. A separate future workflow for writes requires per-operation policies, backup and rollback, cost ceiling and testing.
5. No new subscription. Do not interpret GitHub runner availability as a guarantee of unlimited free minutes.
6. Idempotency: read-only operation can be repeated safely, and `request_id` identifies each evidence receipt; unbounded automatic retries forbidden.

## How to use without Work
From any normal ChatGPT conversation, use connected GitHub tools to update only `cerebro/connectors/universal/requests/cloudflare-chat-normal-lab.v1.json` on branch `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`, changing the `request_id` to a new `CFN-YYYYMMDD-NNN`. All other keys must remain as shown. Push triggers exactly one LAB workflow. Read its safe log statuses via GitHub connector. No user token entry is necessary.

## Proof and rollback
- Test contract locally using `node --test cerebro/connectors/universal/tests/cloudflare-chat-normal-runner.test.mjs`.
- Verify live workflow `FACT-001 Cloudflare ChatGPT Normal Bridge - READ ONLY LAB` and exact branch, logs, and `FACT001_WRITES=0`; a green test suite alone is not live API evidence.
- To roll back, revert only bridge files on feature branch. All Cloudflare resources remain untouched.