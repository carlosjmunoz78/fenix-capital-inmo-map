# CEREBRO RSI · DOMAIN POLICY REGISTRY V0

Date: 2026-10-09
Scope: Fenix / CEREBRO PREPROD only
Cost added: 0 EUR
PROD authority: FALSE
Trading access: FALSE
MULTIEMPRESA continuation: FALSE

## Purpose

Bind the already-certified RSI continuous-evolution control plane to explicit real Fenix domains without granting blanket autonomy.

This is not a rebuild of B1-B4. It is the domain-level authority registry that sits in front of the existing B3/B4 policy and monitoring loop.

## Registered domains

| Domain | Engine | Mode | Current gate |
|---|---|---|---|
| `cerebro.learning.continuous_evolution` | `LRN-001` | `PREPROD_AUTONOMOUS` | certified control-plane monitoring |
| `fenix.app` | `APP-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.crm` | `CRM-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.data` | `DATA-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.knowledge.notion` | `KNW-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.web.wordpress` | `WEB-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.seo` | `SEO-001` | `ASSISTED` | domain evidence wiring required + separate SEO physical gate |
| `fenix.marketing` | `MKT-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.automation` | `AUTO-001` | `ASSISTED` | domain evidence wiring required |
| `fenix.training` | `TRN-001` | `ASSISTED` | domain evidence wiring required |

## Fail-closed rule

Any engine/domain tuple not explicitly present in `cerebro/registry/rsi-domain-autonomy-policies.v0.json` receives `HOLD / EXPLICIT_DOMAIN_POLICY_REQUIRED` and cannot enter autonomous PREPROD adoption.

A registered domain in `ASSISTED` mode also receives `HOLD / DOMAIN_AUTONOMY_NOT_PREPROD_AUTONOMOUS` until its own live evidence wiring and acceptance gate are complete.

Therefore this registry cannot accidentally promote an unverified real domain merely because the generic RSI machinery is GREEN.

## Runtime path

`resolveDomainAutonomyPolicy`
-> `evaluateRegisteredDomainAdoption`
-> existing `evaluateDomainAdoptionPolicy`
-> only if `ALLOW_PREPROD_CANARY`
-> existing `runPreprodAdoptionMonitoringLoop`
-> SHADOW
-> CANARY
-> MONITOR
-> KEEP_NONPROD or ROLLBACK
-> B1 Universal Learning Ingress.

Entry point: `cerebro/runtime/rsi-domain-policy-registry.mjs`.

## Safety envelope

Every explicit policy has:
- PREPROD only;
- kill switch enabled;
- bounded blast radius;
- automatic rollback required;
- explicit risk classes;
- explicit minimum confidence;
- zero incremental cost;
- no PROD promotion/write authority;
- no Trading access.

`DATA-001` is intentionally stricter: LOW risk only, 2% canary ceiling and max 25 records.

## SEO boundary

`SEO-001` remains `ASSISTED`. The registry explicitly does not override the separate physical Core Guard reconciliation/promotion gate. A generic RSI policy cannot be used to bypass the domain-specific SEO safety work.

## MULTIEMPRESA boundary

No new company was registered and no company-onboarding/multicompany runtime was continued. This registry is `company_id=fenix` only.

## Acceptance

The registry is accepted only if CI proves:
1. all engine IDs are canonical;
2. policy tuples are unique;
3. only the already-certified LRN control plane is autonomous;
4. all other real domains remain assisted;
5. unregistered domains fail closed;
6. registered assisted domains cannot start B4;
7. the LRN domain can run the registered-policy path through B4 and return evidence to B1;
8. risk/confidence/money boundaries still map to canonical HUMAN_REQUIRED decisions;
9. PROD/Trading/MULTIEMPRESA authority remains false.

## Next block after GREEN

`RSI_REAL_DOMAIN_EVIDENCE_WIRING_V0`

Do not widen autonomy merely by editing mode flags. For each real domain, wire live operational evidence first, run exact-domain E2E acceptance, then change that one domain from `ASSISTED` to `PREPROD_AUTONOMOUS` only if the evidence is GREEN.
