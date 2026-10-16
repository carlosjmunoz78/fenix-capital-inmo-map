# CAP Native V1 — PREPROD Runbook

`CAP-NATIVE` is the governed V1 capability of `CAP-001 · Captación Autónoma`, as defined by the master specification. It is multi-company, exact PREPROD only, Gateway-gated, deterministic before AI, heuristic/simple-bandit before ML, and targets 0 € additional cost.

It consumes metrics/evidence from the existing GA4/GSC/Meta/Brevo/WordPress/MKT-001/SEO-001 stack without duplicating those sources of truth. V1 scores channels, builds bounded experiments, derives STOP/HOLD/SCALE_CANDIDATE decisions and composes a deterministic acquisition plan. It does not write to providers or authorize new spend in PREPROD. Any positive requested spend emits `HUMAN_REQUIRED/MONEY_LIMIT`; provider mutation requests emit `HIGH_RISK`.

Context is always `company_id`, `engine_id=CAP-001`, `environment=PREPROD`, `version`; cross-company rows are denied. Outputs carry explicit no-PROD/no-spend/no-provider-write authority and zero additional cost. Events are designed for EVT-001: `cap.channels.scored`, `cap.experiment.planned`, `cap.stop_scale.decided`, `cap.plan.ready`.

Backup consists of versioned input metrics, experiments and plans. Rollback removes the additive V1 wrapper; there is no provider mutation to reverse. Rebuild replays versioned metrics through deterministic scoring, experiment planning and plan generation and verifies the stable plan ID. OLD vs NEW plus independent QA-001 Tribunal are mandatory; PASS only permits `NATIVE_FULL_PREPROD`, never PROD authority.

Changelog: 1.0.0 adds the first-party governed acquisition optimizer while preserving all existing marketing/SEO/CRM/App systems and Android/Trading isolation.
