# ZEUS / JARVIS · CHANGELOG B6 CORTE 02 · 2026-11-04

- **HECHO LAB:** parametrized PostgreSQL 17 read journal injected into B6 executor, with real GitHub Contents API GET, two concurrent executors, restart deduplication, fingerprint conflict block and failed claim no-auto-retry.
- **HECHO LAB:** existing B3 DecisionService and authorization policy reused (no second auth engine). Tested revoked/expired/inactive grants, kill switch, per-action discovery and execute grants, audit outages, cross-tenant and role spoofing.
- **HECHO LAB:** journal fail returns non-success until durable acknowledgment is true.
- **EVIDENCIA:** 315/315 PASS `41750925376`; real GitHub + PG17 E2E SUCCESS `41750925389`; PG17 journal SUCCESS `41750925403`; GitHub read-only SUCCESS `41750925716`; B4 regression SUCCESS `41750925479`; Governed Integration SUCCESS `41750925423` (deploy skipped).
- **POR AUDITAR / NO-GO PROD:** Supabase B3 private-table metadata read-only audit finds zero real Fénix PROD grants/audits/secret inventory. Controls B3/B4 OFF with kill-switch ON. No B6 PROD activation, no secrets retrieved and no App/CRM modifications.
- **DOCUMENTOS:** `B6_CORTE_02_PG17_B3_POLICY_EVIDENCIAS_2026-11-04.md` and `STATE_B6_CUT02_2026-11-04.json`.
- **ROLLBACK:** revert/close only PR #16 work after baseline `d8d0f344b834fe3eed373a580cd7fcf57ae87675`.
- **SIGUIENTE:** B6_CUT03_APPROVAL_SCOPE_FAILOVER_AND_MORE_TRUSTED_CONNECTOR_PROOFS.
