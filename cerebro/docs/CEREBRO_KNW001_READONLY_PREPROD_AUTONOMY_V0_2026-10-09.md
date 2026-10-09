# CEREBRO · KNW-001 · READONLY PREPROD AUTONOMY V0

Date: 2026-10-09
Macro step: `6/6 - AUTONOMIA Y PROMOCION POR DOMINIO`
Company: `fenix`
Engine: `KNW-001`
Domain: `fenix.knowledge.notion`

## Scope

This gate does **not** make the whole knowledge domain autonomous. The domain remains `ASSISTED` and only capability `READONLY_REVIEW_PREPARATION` may become `PREPROD_AUTONOMOUS`.

The capability may prepare/read review context in PREPROD. It may not classify, approve, canonicalize or publish knowledge decisions.

## Existing human authority preserved

`src/AnaKnowledgeReviewGuard.tsx` keeps the existing explicit confirmation path before a knowledge decision is posted. It also preserves authority-specific 403 handling and identifies items reserved to the responsible human. This gate does not weaken or bypass those behaviors.

## Evidence

Canonical evidence source:

`github:prod-runtime-smoke:knowledge`

Evidence depth:

`LIVE_READONLY_ANA_KNOWLEDGE_CONTRACT`

Confidence: `0.85`, equal to the KNW policy minimum `0.85`.

The exact-head workflow also resolves a fresh successful `PROD Runtime Smoke` run on `main` and checks the existing review-guard source contract.

## Promotion flow

`REAL READONLY EVIDENCE -> OLD vs NEW -> INDEPENDENT TRIBUNAL -> SHADOW -> CANARY 5% -> MONITOR -> RELEARN`

The candidate is restricted to `READONLY_REVIEW_PREPARATION`; any missing capability or request such as knowledge classification/approval returns HOLD.

## Safety

- whole-domain autonomy: FALSE
- human classification/approval required: TRUE
- PROD authority: FALSE
- PROD write authority: FALSE
- Trading: FALSE
- MULTIEMPRESA continuation: FALSE
- customer-data mutation: FALSE
- paid fallback: FALSE
- incremental cost: 0 EUR
- kill switch: required
- automatic rollback: required

## Acceptance

GREEN requires current live read-only evidence, confidence threshold, OLD/NEW tribunal PASS, capability-scoped domain-policy ALLOW, B4 `KEEP_NONPROD_AND_RELEARN`, review-guard human confirmation preserved, and no authority/cost boundary drift.

This is an internal closure inside macro step 6/6, not a new macro step.
