# DB-SAFE-NATIVE v1 · Runbook PREPROD

Owner `DATA-001`; support `MIG-001`, `SEC-001`, `QA-001`, `DBOFF-001`, `OBSERV-001`, `FINOPS-001`.

Flow: read-only inventory/audit → dependency/contract map → migration/index plan → backup + rollback → regression/security gate → transactional PREPROD apply via authorized adapter → advisors/regression → evidence. PROD mutation is denied.

The live non-prod Supabase workspace `fenix-capital-inmo-map` was inspected read-only. No DDL/data mutation was performed. Security advisors are treated as findings, not auto-fixes: current findings include RLS/policy and SECURITY DEFINER exposure that require per-caller/dependency analysis before remediation. This capability therefore forbids bulk security rewrites.

Heavy logs, research, training, OCR, simulations and long jobs are routed toward offload instead of increasing Supabase transactional load.

Backup: existing verified backup/snapshot or scoped schema/data snapshot before mutation. Rollback: versioned rollback SQL tested before promotion. Rebuild: replay versioned migrations/contracts. Fallback: read-only/stop.

Changelog 1.0.0 · 2026-10-16: first-party safe DB authorizer, destructive SQL guard, RLS fail-closed, schema lease, idempotency, workload offload policy, zero-cost route and injected adapter.
