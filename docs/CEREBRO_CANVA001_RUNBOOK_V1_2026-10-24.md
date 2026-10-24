# CEREBRO OS · Shared Canva Creative Capability · Runbook V1

Date: 2026-10-24
Capability: `CREATIVE-CANVA-V1`
Scope: multi-company / all governed departments and future engines
Environment: PREPROD
Status: ROUTING_AND_BINDINGS_GREEN / BLOCKED_PENDING_CANVA_OAUTH_FOR_PHYSICAL_MCP_EXECUTION
Additional cost target: 0 EUR

## Architectural rule

Canva is **not a canonical CEREBRO engine**. It is one shared provider capability used through existing engines/departments. `CANVA-001` must not be added to the canonical Engine Registry and no department may clone a separate Canva runtime or credential store.

FACT-001 owns capability scaffolding; ACTGW-001 governs execution; RUNTIME-001 supplies shared runtime. Consumers pass `company_id + engine_id + environment + version` and an explicit operation allowlist.

## Current consumers

Bindings are versioned in `cerebro/integrations/canva/canva-capability-bindings.v1.json`. Current consumers include Facebook/SOC-001, MKT-001, LAB-MKT, SEO-001, WEB-001, APP-001, TRN-001 and the Social/Marketing/SEO/App bootstrap engines. Future engines declaring a creative-media need receive a FACT-001 binding candidate; they do not receive provider authority automatically.

Publication remains the authority of the origin engine. Canva itself creates/edits/organizes/exports assets and cannot independently publish to Facebook, web, campaigns or other provider surfaces.

## Preserve-first rule

CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR.

The capability inventories before mutation and must not delete or overwrite existing Canva content by default. Existing folders, designs, Brand Kits, templates and assets are preserved.

## Transport decision

1. Primary: official Canva remote MCP.
2. Deterministic fallback: Canva Connect REST APIs where appropriate.
3. Browser: secondary only when normal provider UI permits it. No stealth, CAPTCHA/MFA bypass or anti-bot evasion.

Physical Browser 1 evidence on 2026-10-24 reached Canva but the provider returned its anti-bot block page (`Muy pronto podras volver a disenar`). Latest SOC-001 canary: `87ee8f4e-2776-4ab7-b2ad-661ded68aa42`. This is why Browser is not the primary high-volume transport.

## OAuth/Vault gate

The shared runtime uses one governed OAuth connection per authorized Canva identity/account scope, stored only in CEREBRO Vault. Raw credentials/tokens never enter Git, prompts, job payloads or logs.

Provider/app consent that legally requires owner acceptance is handled under the canonical human-exception policy; CEREBRO does not accept legal terms on the owner’s behalf.

## Certification sequence

1. OAuth connection and identity/account binding.
2. MCP tool discovery.
3. Read-only recent designs/folders.
4. Brand Kit read; confirm `Capital` when using the Fénix identity.
5. Test folder.
6. Editable test design.
7. Generated image.
8. Editing transaction.
9. Brand Template where available.
10. Resize where included in the existing plan.
11. PNG/PDF/MP4 export as applicable.
12. Origin-engine binding test.
13. Cost check = 0 EUR incremental.
14. Revoke/reconnect rollback test.
15. Observability/evaluation/Tribunal before autonomous PROD mutation.

## Facebook Night Factory

The first high-volume consumer mission is `cerebro/integrations/canva/CANVA-001.mission-night-2026-10-24.json`, now owned by Facebook/SOC-001 while consuming `CREATIVE-CANVA-V1`.

It covers inventory, reusable masters, posts, carousels, stories, reel covers, thumbnails, generated images, short-video/motion drafts, platform adaptation and QA. It leaves assets inside Canva and does not independently publish them.

## Future departments

When FACT-001 creates or updates an engine that declares creative-media needs:
1. detect the need;
2. generate a Canva binding candidate;
3. restrict operations to the minimum required;
4. bind company/identity/account/environment;
5. run cost/privacy/license/security tests;
6. run EVA/JDG/observability/rollback/rebuild gates;
7. activate the shared capability without copying runtime or credentials.

## Cost and premium features

Canva paid-plan features already included in the account may be used. AI allowance inside the existing plan may be consumed within policy. Any extra purchase or credit spend triggers `MONEY_LIMIT`.

## Canonical human exceptions

Only: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## CI evidence

`CEREBRO Canva Shared Capability V1`: GREEN.
`CEREBRO Governed Main Integration V0`: GREEN.
`CEREBRO RSI Promotion Readiness Shadow V1`: GREEN.

## Rollback/rebuild

Disable the binding or OAuth connection, stop capability jobs, preserve generated and pre-existing designs, retain audit evidence, and restore the previous provider path. Rebuild comes from the versioned capability manifest, MCP contract, binding registry, router, tests and this runbook.
