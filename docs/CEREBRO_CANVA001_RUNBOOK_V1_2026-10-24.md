# CEREBRO OS · CANVA-001 · Runbook V1

Date: 2026-10-24
Company: fenix
Environment: PREPROD
Status: DEFINED / BLOCKED_PENDING_CANVA_OAUTH
Additional cost target: 0 EUR

## Purpose

CANVA-001 is the transversal Canva production engine for CEREBRO. It must create, edit, organize, resize, export and retain reusable creative assets in the authorized Canva account for corporate social, personal brand, marketing, web and future company use.

## Preserve-first rule

CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR.

CANVA-001 must never delete or overwrite existing Canva content during onboarding or night-factory runs. Existing folders, designs, Brand Kits, templates and assets are inventoried first.

## Transport decision

Primary: Canva official remote MCP server.
Endpoint: https://api.canva.com/connect/v1/mcp
Fallback: Canva Connect REST APIs where deterministic endpoints are preferable.
Browser 1: not used as primary transport. A physical Browser 1 canary on 2026-10-24 reached Canva but Canva returned a Cloudflare/provider block page ('Muy pronto podras volver a disenar'). Evidence job: 6d5f8fc5-e484-45be-81c9-30de83813d37.

## Why MCP

The official Canva MCP exposes design generation and editing, search, folders, assets, Brand Kits/templates, exports, resize, image generation and collaborative design workflows. It avoids provider anti-bot browser behavior and is the correct agent integration surface.

## OAuth gate

Canva requires per-user OAuth for MCP. There is no organization-wide service account that can replace the user grant.

Required once before execution:
1. Create a Canva Developer app for CEREBRO (<=18 character app name if required by current Canva portal UI).
2. Enable Outside Canva -> Canva MCP.
3. Configure the CEREBRO OAuth redirect URL.
4. Store Client ID and Client Secret only in CEREBRO Vault.
5. Complete owner OAuth grant for the Canva account.
6. Store refresh/access material only in Vault/session manager; never Git, job payloads, logs or chat.
7. Discover tools from MCP at runtime; do not assume a stale fixed catalog.

Until that grant exists, state remains `BLOCKED_PENDING_PROVIDER_AUTHORIZATION_NOT_NEW_HUMAN_REQUIRED_CODE`.

## First certification sequence

1. MCP connect and `tools/list`.
2. Read-only: search recent designs and folders.
3. Read Brand Kits; confirm `Capital` if available to the same Canva identity.
4. Create dedicated test folder in PREPROD scope.
5. Create one editable test design.
6. Generate one standalone test image.
7. Start/edit/commit one editing transaction.
8. Create from a Brand Template if available.
9. Resize one test design if included in plan.
10. Export PNG and MP4/PDF where applicable.
11. Verify all artifacts are in Canva and no external publication occurred.
12. Verify no additional charge occurred.
13. Revoke OAuth and prove rollback/reconnect procedure in PREPROD before autonomous PROD promotion.

## Night Factory mission

Mission contract: `cerebro/integrations/canva/CANVA-001.mission-night-2026-10-24.json`.

The mission works in iterative batches:
- inventory and structure;
- reusable brand masters;
- static creative production;
- image/AI experimentation;
- video/motion drafts;
- cross-platform adaptation;
- final QA and review inventory.

The mission must keep all useful variants in Canva, label strongest candidates `READY_FOR_REVIEW`, and document the hypothesis each variant tests.

## Creative rules

- Use paid Canva functionality already included in the current subscription when useful.
- Never assume an AI feature is unlimited; respect existing plan allowance.
- Never purchase credits, elements or services outside the existing plan without MONEY_LIMIT.
- Preserve editable master files.
- Resize is not equivalent to native platform adaptation.
- Maintain brand, accessibility, license, commercial-use, mobile-legibility and visual QA.
- No fake followers, fake engagement or deceptive social mechanics.
- Canva Voice is not the default voice engine unless specifically selected by routing/quality policy.
- No publishing outside Canva during Night Factory.

## Human exception policy

Only canonical CEREBRO reasons are valid:
LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

Canva OAuth/provider consent is an execution blocker/status and does not add a ninth HUMAN_REQUIRED code.

## Rollback

Before autonomous promotion:
- revoke Canva OAuth token/grant;
- disable CANVA-001 connection;
- preserve all generated designs;
- no deletion of pre-existing Canva content;
- stop scheduler/mission runner;
- retain audit and artifact inventory.

## Promotion gate

No PROD autonomous execution until OAuth, tool discovery, read/write smoke tests, QA, observability, cost check, backup/rebuild documentation and rollback are green.
