# B8 Contracts / ADR · CUT03
ADR-B8-001: Reuse ORCH-001 and B7 envelope over B6 journal; NO second orchestrator/queue/factory/server. Status IMPLEMENTED LAB.
ADR-B8-002: Separate company data via trusted identity + verified company Registry + B3 authorization per company and per action + Supervisor inspection, no UI-only checks. Tests SYNTHETIC.
ADR-B8-003: Executive scoring ordinal (0–5) with cited source references/confidence>=70. No financial forecasts, risk/legal controls never bypassed.
ADR-B8-004: Internal commitments only; third-party acceptance, money, signature, externalAction hard denied; dedicated idempotency and audit. Persistence port only, existing JOB-001 adapter pending.
ADR-B8-005: Portfolio results can contain only evidenced, source-verified metrics or NOT_CONNECTED/null. No invented incidents/cost.
ADR-B8-006: Communications PREPARE only, no SEND, no trusted external recipient/consent/identity connection.
ADR-B8-007: New company onboarding synthetic plan only. No real customer/company/credentials in PROD.
ADR-B8-008: B8 integration is LAB and DRAFT; Supabase registry existing but empty; no business claims.
Mandatory scope: company_id, engine_id, environment, version, plus owner_id, mission_id, idempotency_key as applicable.
Communication authority PREPARE vs EXECUTE vs COMMIT: B8 only PREPARE; EXECUTE limited to evidence-verified READ in LAB; COMMIT denied without separately certified mandate.
Evidence classifications: SYNTHETIC_TEST on B8 fixtures, LOCAL_LAB_TEST Node CI, REAL_EXTERNAL_READ Github/Supabase reads, REAL_LAB_INTEGRATION B7 on PG17 isolated (historic), PROD_OPERATION_VERIFIED NONE.
