# BRANDBOOT-001 · Brand Bootstrap & Brand Manual Engine · Candidate

Date: 2026-10-05
Status: `DOCUMENTED_PARTIAL / LAB_CANDIDATE`
Environment: `LAB`
Company scope: `MULTI_COMPANY`
Cost target: `0 € additional fixed cost`

## Why this exists

CEREBRO's multi-company onboarding already requires brand understanding before downstream web/app/social/marketing assets are finalized, but the canonical 177-engine seed does not currently contain a dedicated brand-manual engine. A local V0 has produced an AION fixture and a Fénix fixture successfully. This candidate captures that capability without silently rewriting the canonical registry.

## No-break decision

The canonical `engine-registry.seed.json` remains exactly 177 engines in this branch. `BRANDBOOT-001` is isolated as a candidate contract until GOV-001/FACT-001 explicitly accepts registry expansion or maps the capability into an existing engine.

Therefore this branch does **not**:

- enable PROD;
- alter existing engine behavior;
- change the 177-engine source seed;
- publish AION branding;
- spend on paid AI, fonts or design SaaS;
- bypass naming/trademark review.

## Intended output contract

A successful brand bootstrap produces reusable artifacts, not only a PDF:

- brand manual;
- `brand.json`;
- `design-tokens.json`;
- `brand.css`;
- asset inventory;
- voice/tone rules;
- presets for web, app, social, email and documents.

## First physical use case

AION Operator Brand System V1 is the first PREPROD use case. Its current naming gate is `LEGAL_REQUIRED / HIGH_COLLISION_RISK`; its wordmark/symbol are provisional and must not be treated as a registered or cleared brand.

## Local evidence already available

- AION fixture: `LAB_GREEN_LOCAL`.
- Fénix fixture: `LAB_GREEN_LOCAL`.
- Two distinct `company_id` fixtures exercised.
- Paid AI calls: 0.
- Paid design SaaS calls: 0.
- Deterministic brand contracts and rebuild artifacts exist in the local continuity package.

This evidence is useful but does not make the engine `CONFIRMED_OPERATIONAL` in CEREBRO because the implementation has not yet been promoted through Git source of truth + CI + Factory/Governance gates.

## Promotion path

`CANDIDATE -> GOV/FACT architecture decision -> FACT-001 scaffold -> Git source of truth -> tests -> evaluation -> tribunal -> PREPROD -> rollback/rebuild proof -> gradual promotion`.

Naming clearance remains a separate legal gate for each company/brand before public use.

## Rollback

Until merged, rollback is simply closing/deleting the candidate branch. If merged as candidate documentation, removal of the candidate contract does not change existing runtime because it has no PROD writes and is not in the canonical seed.
