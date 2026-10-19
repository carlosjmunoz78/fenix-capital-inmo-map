# CEREBRO Physical Adapter Audit V1

## Purpose

This runbook closes the stale `POR_AUDITAR_PHYSICAL` ambiguity left by the global convergence report without granting any new runtime authority. It classifies each legacy physical domain using current-main evidence and distinguishes:

- safe PREPROD logic already closed;
- genuine physical binding gaps;
- real-data calibration gaps;
- intentionally disabled external side effects;
- HUMAN_REQUIRED gates.

This audit is additive. It does not replace canonical engines, external relationships, SEO-001, App/CRM/Supabase/Notion/WordPress, Training, existing automations or Trading isolation.

## Source of truth

Use `cerebro/registry/physical-adapter-audit-v1.json` for current physical-domain detail and `cerebro/registry/cerebro-global-operational-convergence-v4.json` for the global logical/runtime convergence report.

## Current result

Eleven legacy physical domain buckets have been audited. All eleven have safe PREPROD logic present. Only three remain genuine physical-binding families:

1. IAM/Browser/Vault: fresh authorized Browser Bridge attestation/binding and, when actually needed, an authorized secret binding. Android remains a separate device E2E gate.
2. Multimedia: the governed GitHub-hosted Ubuntu PREPROD CI inventory is now **HECHO**. Its read-only allowlisted probe found FFmpeg, FFprobe, ImageMagick, SoX and eSpeak NG absent in that specific runtime. Absence is valid evidence and does not authorize installation. The remaining gate is to inspect an already-authorized CEREBRO runtime for existing zero-cost multimedia primitives, still without auto-install/download/provider execution.
3. Brand/Commerce/App: STAGING/PWA/APK build evidence exists, but the authorized physical Android install/render is still missing and live commerce/public deployment side effects remain separately governed.

Lead conversion probability is a separate data-calibration gap rather than a broken physical runtime.

Company intent, sales delivery, voice, agenda/contracts/payments, reputation, economic actions and marketing/SEO are not to be represented as generic missing runtimes. Their safe logic is present; the remaining work is optional external execution, legal/money/signature/policy gates, exact adapter evidence or explicit promotion.

## Multimedia evidence consumed by this audit

Canonical evidence: `cerebro/registry/multimedia-zero-cost-physical-inventory-v1.json`.

The evidence proves only the exact GitHub-hosted PREPROD runner that was probed. It does **not** prove presence or absence on Carlos's PC, Browser Bridge host, a CEREBRO server, a future self-hosted worker or any other runtime.

The anti-loop rule is therefore:

- do not install packages merely because CI lacks them;
- do not download models;
- do not call a commercial provider as a substitute;
- do not infer capabilities on another machine;
- audit the next already-authorized runtime read-only and record what is physically present.

## Side-effect policy

Do not open side effects merely to make an audit look green. In particular:

- signatures => `SIGNATURE_REQUIRED`;
- spend, charges, purchases/subscriptions => `MONEY_LIMIT`;
- fiscal issue, unknown consent, person-level third-party resolution or recording/legal risk => `LEGAL_REQUIRED`;
- ungranted public/provider/CRM/calendar/message/browser/deploy writes => `POLICY_CONFLICT`;
- cross-company boundary violation => `SECURITY_INCIDENT`;
- low confidence => `LOW_CONFIDENCE`;
- high-risk content or action => `HIGH_RISK`;
- explicit user/customer human request => `CUSTOMER_HUMAN_REQUEST`.

## Zero-cost next block

Continue in parallel with:

1. audit an already-authorized CEREBRO runtime for existing zero-cost multimedia tools, without auto-installing or downloading anything;
2. reconcile fresh Browser Bridge physical attestation only when the standalone authorized runtime is actually available;
3. run Android physical E2E only when an authorized device is available;
4. allow the read-only Scheduled Soak Reconciler to accumulate genuine cron evidence for Watch & Learn, COMPET and CAP;
5. never use manual runs to fake scheduled-soak closure.

The current browser connector being reachable does not by itself certify the separate CEREBRO Browser Bridge. That bridge requires its own fresh attestation and must remain `PARCIAL` while the standalone service is unavailable or stale.

## Rollback

Revert the audit registry, test and this runbook. No external side effect, migration, permission expansion, paid dependency or PROD change is made by this reconciliation. Git history retains the prior audit state.

## Rebuild

Recreate the audit only from current-main registries and fresh physical evidence. Preserve the historical V2/V3/V4 convergence files and do not infer physical activation from semantic adoption, skill availability or old screenshots/logs. Consume completed physical inventory evidence instead of leaving completed probes in `next_block`.
