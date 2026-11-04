# ZEUS · JARVIS · CHANGELOG B6 CUT01 · 2026-11-04

**ADD:** PR #16 DRAFT isolated on PR #15 B5. No new server, endpoint, worker or main merge.

- Guarded B6 read executor with trusted B2/B3 dependencies, second per-operation B3 grant, catalog route check, zero cost, per-mission idempotent claim, audit pre/post, result hash and verifier.
- GitHub Contents API read-only actual connector with hard allowlist and ephemeral CI token, SHA pinned, git blob verification and independent result verifier.
- PostgreSQL 17 private schema *LAB-only candidate* for durable mission claim, scoped by owner/company/environment/mission/capability/connector/key; atomic claims, no silent retry, completion/failure.
- Real temporary-file reversible mutation fixture with snapshot, postcondition check, exact rollback; no changes to existing App/CRM systems.
- Factory-aligned B6 manifest with engine_id, company_id, environment, version and security/observability/backup hooks.

**TESTS:** 289/289 PASS (Actions 41749233214); real read API SUCCESS (41749233111); PostgreSQL journal plus physical sandbox rollback SUCCESS (41749233139). Governed integration SUCCESS, production promotion skipped (41749233140).

**NOT DONE:** real B2/B3 owner/permissions, Gateway live binding, production journal integration, real external connector mutation or MCP/CLI/browser/Computer Use execution, PROD backup/restore and audit independent. PROD OFF and DRAFT maintained.

**ROLLBACK:** close/revert PR #16 only; no PROD B6 migration created.
**NEXT:** B6_CUT02_TRUSTED_CONNECTORS_B3_REAL_POLICY_JOURNAL_WIRING_AND_CROSS_DEVICE_NO_GO.
