# CEREBRO RSI · CONTINUOUS EVOLUTION V0 · CERTIFICATION

Date: 2026-10-09
Scope: continuous learning/adaptation/evolution only. MULTIEMPRESA continuation is explicitly out of scope.

## Status vocabulary

- HECHO: implemented and evidenced in repository/CI.
- EXISTENTE: pre-existing component reused, not rebuilt.
- PARCIAL: real component exists but the stronger claim is not proven.
- DEFINIDO: contract/policy defined.
- PLANIFICADO: future work, not claimed operational.
- POR AUDITAR: no live claim without evidence.

## Mission state

### HECHO

- B1 · Universal Learning Ingress: universal evidence families normalize into a zero-cost, non-PROD learning report and persist idempotently into the PREPROD LRN ledger through the existing learning worker.
- B2 · Versioned Improvement Candidate Factory: persisted learning materializes deterministically as a versioned PREPROD candidate with OLD/NEW contract and no PROD/Trading authority.
- B3 · OLD vs NEW + independent evaluation/tribunal: merged before this certification. Accepted improvements generate a PREPROD promotion envelope; measurable regressions are rejected; equal/insufficient evidence holds; HIGH_RISK and LOW_CONFIDENCE use canonical HUMAN_REQUIRED.
- B4 · PREPROD -> SHADOW -> CANARY -> MONITOR -> KEEP/ROLLBACK -> RELEARN: merged before this certification. Monitoring evidence returns through universal learning ingress.
- Per-domain autonomy policy V0: explicit PREPROD-only autonomy mode, blast radius, kill switch, automatic rollback requirement, risk/confidence envelope and 0 EUR budget.
- Final persistent certification candidate proves both the positive and negative paths:
  - evidence -> LRN -> durable learning -> versioned candidate -> OLD/NEW -> tribunal -> bounded canary -> safe keep -> monitoring evidence -> durable relearning -> next versioned candidate;
  - OLD/NEW regression -> REJECT before adoption;
  - accepted candidate -> canary regression -> automatic ROLLBACK -> OBSERVABILITY_ALERT -> durable relearning -> next versioned candidate;
  - tripped domain kill switch -> adoption blocked.

### PARCIAL / BOUNDARY

- Autonomy is **per domain and PREPROD only**. This certification does not grant global autonomy.
- `CURRENT_DOMAIN_PROMOTION_AUTHORITY` remains required for any authority outside the generic RSI PREPROD envelope.
- No PROD execution, PROD write, external activation or Trading access is granted by this work.
- No physical App/CRM/Supabase/WordPress/SEO/Notion mutation is part of this certification.

## Registry impact

No new engine ID is created by this block.

Existing logical capabilities are reused and composed. The work is a control-plane contract/gate over existing learning, candidate, experiment, evaluation, tribunal and promotion components. Engine Registry count is therefore unchanged by this block.

## Canonical paths

- `cerebro/runtime/universal-learning-ingress.mjs`
- `cerebro/runtime/rsi-learning-worker.mjs`
- `cerebro/runtime/improvement-candidate-factory.mjs`
- `cerebro/runtime/experiment-pipeline.mjs`
- `cerebro/runtime/evaluation-tribunal.mjs`
- `cerebro/runtime/promotion-pipeline.mjs`
- `cerebro/runtime/rsi-old-new-evaluation-tribunal-gate.mjs`
- `cerebro/runtime/rsi-preprod-adoption-monitoring-loop.mjs`
- `cerebro/runtime/rsi-domain-autonomy-policy.mjs`
- `cerebro/tests/rsi-continuous-evolution-end-to-end-certification.test.mjs`
- `.github/workflows/cerebro-rsi-final-continuous-evolution-cert-v0.yml`

## Dependency map

`operational evidence`
-> `universal-learning-ingress`
-> `rsi-learning-worker`
-> durable `LearningLedgerV0`
-> `improvement-candidate-factory`
-> versioned candidate
-> `rsi-old-new-evaluation-tribunal-gate`
-> `experiment-pipeline`
-> `evaluation-tribunal`
-> PREPROD promotion plan
-> `rsi-domain-autonomy-policy`
-> `rsi-preprod-adoption-monitoring-loop`
-> SHADOW/CANARY
-> `promotion-pipeline.postMonitor`
-> KEEP_NONPROD or ROLLBACK
-> `universal-learning-ingress`
-> durable relearning.

## Domain autonomy contract

Required controls before PREPROD canary adoption:

- exact `company_id`, `engine_id`, `domain_id`, `environment=PREPROD`, policy version;
- `autonomy_mode=PREPROD_AUTONOMOUS`;
- kill switch enabled and `ARMED`;
- bounded blast radius (`max_percent <= 25`, `max_records <= 1000`, scope `PREPROD_ONLY`);
- canary percent must fit both policy and blast-radius maximum;
- automatic rollback must be enabled;
- risk must remain LOW/MEDIUM; HIGH/CRITICAL -> `HUMAN_REQUIRED:HIGH_RISK`;
- confidence must satisfy policy floor, never below 0.60; otherwise `HUMAN_REQUIRED:LOW_CONFIDENCE`;
- authority/scope violations -> canonical POLICY_CONFLICT or SECURITY_INCIDENT;
- incremental cost limit = 0 EUR;
- rollback and rebuild refs required;
- PROD promotion authority = false;
- PROD write authority = false;
- Trading access = false.

## Recovery / backup / rollback / rebuild

- B3 refuses experiment approval unless `backup_ref`, `rollback_ref` and `rebuild_ref` are present.
- B4 uses the immutable promotion plan and predefined monitoring thresholds. A breach produces `ROLLBACK` with the plan's rollback ref.
- The domain policy requires automatic rollback before canary authorization.
- Code rollback for this additive block is the Git revert of its merge commit; no destructive migration is introduced.
- Durable local learning/candidate journals remain append-only/idempotent and are exercised in temporary isolated state during certification.
- Baseline before the final certification branch: `5caaafd4b8ab380172bfdd5fe81438ae9a813f7a`.

## Evidence anchors before final merge

- B3 merge: `c4e32e3451f4530c181b4cf8d6c3a6135686e419`.
- B3 post-merge workflow: `37856879005` · SUCCESS.
- B4 merge: `5caaafd4b8ab380172bfdd5fe81438ae9a813f7a`.
- B4 post-merge workflow: `37857121524` · SUCCESS.
- B4 same-SHA `PROD Live Deploy`: `37857121466` · SKIPPED.
- Final certification PR: `#522`.
- Final certification candidate head after exact OLD baseline correction: `c865daafc37fb4230af7962f1c5c513bf39acd15`.
- Final certification workflow run on that head: `37857733549`; all certification steps GREEN.

The definitive merge SHA and post-merge run are recorded in the external continuity handoff generated after merge. This file intentionally does not invent future evidence.

## Changelog

### Added

- per-domain RSI autonomy envelope;
- blast-radius control;
- kill-switch contract;
- automatic rollback prerequisite;
- full persistent positive-loop certification;
- explicit OLD/NEW rejection certification;
- explicit canary rollback-and-relearn certification.

### Preserved

- existing App/CRM/Supabase/WordPress/SEO/Notion behavior;
- existing B1/B2/B3/B4 contracts;
- existing `CURRENT_DOMAIN_PROMOTION_AUTHORITY` boundary;
- Trading isolation;
- 0 EUR incremental-cost target.

### Not done / not claimed

- no global autonomous PROD promotion;
- no continuation of MULTIEMPRESA;
- no paid service;
- no hidden external writes;
- no new engine ID;
- no weakening of policy, permissions, tests or budgets.

## Runbook

Normal PREPROD loop:

1. accept a safe universal evidence signal;
2. persist via LRN worker;
3. materialize versioned candidate;
4. resolve exact OLD contract if source version is provisional;
5. execute equivalent OLD/NEW fixture;
6. evaluate with predefined metric and independent tribunal;
7. reject/HOLD/HUMAN_REQUIRED when required;
8. if PASS, require backup + rollback + rebuild;
9. evaluate per-domain autonomy policy;
10. require armed kill switch + bounded blast radius + automatic rollback;
11. advance PREPROD -> SHADOW -> CANARY only with explicit evidence;
12. monitor predefined thresholds;
13. KEEP_NONPROD or ROLLBACK;
14. convert monitoring outcome into universal evidence;
15. persist the new learning and materialize the next candidate;
16. repeat without changing PROD authority.

Emergency/exception behavior:

- kill switch `TRIPPED` -> block adoption;
- HIGH/CRITICAL risk -> HUMAN_REQUIRED:HIGH_RISK;
- confidence below threshold -> HUMAN_REQUIRED:LOW_CONFIDENCE;
- company/engine/scope conflict -> HUMAN_REQUIRED:POLICY_CONFLICT;
- authority boundary violation -> HUMAN_REQUIRED:SECURITY_INCIDENT;
- non-zero unapproved cost -> MONEY_LIMIT / fail closed;
- failed shadow/canary evidence -> HOLD, do not advance.

## Next block

After final exact-head merge + post-merge CI confirmation: **continuous evolution V0 mission closure and monitoring only**. Do not resume MULTIEMPRESA from this handoff.
