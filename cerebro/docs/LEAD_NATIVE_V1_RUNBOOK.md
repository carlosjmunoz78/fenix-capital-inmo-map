# LEAD Native V1 — PREPROD Runbook

`LEAD-NATIVE` implements `LEAD-001 · Lead Scoring` from the master specification. V1 is multi-company, exact PREPROD, Gateway-gated, deterministic/heuristic first and 0 € additional by default. ML is explicitly deferred until sufficient historical evidence exists and would require a new evaluation/Tribunal cycle.

Inputs are snapshots/references from the existing CRM and Supabase transactional source of truth; V1 does not duplicate or mutate those systems. It produces conversion probability, estimated value, urgency, priority and next action. `data_completeness < 0.5` yields canonical `HUMAN_REQUIRED/LOW_CONFIDENCE`; explicit high-risk flags yield `HIGH_RISK`. Cross-company material is denied.

Operations are `SCORE_LEAD`, `SCORE_BATCH`, `PRIORITIZE`, `BUILD_NEXT_ACTION`, `REPLAY_VERIFY`. PREPROD has no CRM write authority and no PROD/Trading authority. A requested CRM/PROD write is `HIGH_RISK` and is not executed.

Observability covers authorization, score IDs, probability, value, urgency, priority, confidence, next action, queue/action IDs, replay and cost. Events target EVT-001: `lead.scored`, `lead.score.human_required`, `lead.batch.scored`, `lead.priority.ready`, `lead.next_action.ready`.

Backup versions the scoring schema/rules and output evidence, not a duplicate customer database. Rollback removes the additive wrapper; no CRM mutation exists to undo. Rebuild replays authorized transactional snapshots through the versioned heuristic and verifies deterministic IDs. OLD vs NEW and independent QA-001 Tribunal are mandatory; PASS grants only `NATIVE_FULL_PREPROD`.

Changelog: 1.0.0 adds governed heuristic lead scoring while preserving CRM/Supabase/App, PROD, Trading and Android boundaries.
