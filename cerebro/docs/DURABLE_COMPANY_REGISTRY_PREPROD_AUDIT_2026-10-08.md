# CEREBRO OS · Durable Company Registry PREPROD Audit · 2026-10-08

## Status

`POR AUDITAR → AUDIT_READ_ONLY_COMPLETE / DESIGN_NOT_APPLIED`

No Supabase DDL or data mutation was performed in this audit.

## Objective

Prepare the next gate after verified COMP-REG-001/TENANT-001 in-memory PREPROD execution:

`DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`.

The registry is transactional core state, so Supabase is an acceptable candidate under the project architecture, but it must remain narrowly scoped and must not become a store for heavy jobs/logs/research/training.

## Live Supabase inventory

Project inspected: existing Fénix Supabase project. Schemas inspected: `public`, `fenix_prod`, plus schema inventory.

Findings:

- No base table matching company/tenant/empresa/compañía/organization/workspace/registry semantics exists in `public` or `fenix_prod`.
- No dedicated `cerebro_core` schema exists today.
- Existing tables carrying `company_id` include `fenix_prod.cerebro_user_preferences`, `fenix_prod.cerebro_conversation_memory`, `fenix_prod.task_action_notes`, `fenix_prod.expediente_action_notes` and `fenix_prod.performance_goals`.
- Existing CEREBRO memory/preferences prove a secure server-only pattern already in use: RLS enabled, direct anon/authenticated grants absent, service-role grants bounded, and public SECURITY DEFINER server RPCs with hardened search path and anon/authenticated EXECUTE revoked.
- Existing CEREBRO server RPCs inspected expose service-role execution only for preference/memory server operations.
- The current Phase 4 `MultiCompanyBootstrap` remains in-memory and is not backed by these tables.

## Migration history inventory

The Supabase project already contains a long production migration history, including hardened operational contracts and CEREBRO preference/conversation-memory migrations. No migration indicating a central Company Registry or tenant registry was found in the live migration list.

This means the next persistence binding must be additive; it must not overload an unrelated existing App/CRM table merely because it already contains a `company_id` column.

## Security finding outside the registry scope

Supabase currently reports `fenix_prod.performance_goals` with Row Level Security disabled.

This is a real security configuration risk, but it is **not** evidence of an active breach and it is separate from the Company Registry work. It must not be auto-remediated blindly: enabling RLS without appropriate policies may break existing access.

Supabase's proposed base remediation statement is:

```sql
ALTER TABLE "fenix_prod"."performance_goals" ENABLE ROW LEVEL SECURITY;
```

Do **not** execute that statement until the table's current consumers, grants and required policies are inventoried and a rollback/test plan exists.

## Design decision V0

Preferred zero-additional-cost direction:

1. Keep the existing Fénix operational schema untouched.
2. Add a logically isolated CEREBRO transactional schema/table set rather than repurposing App/CRM tables.
3. Start with the smallest durable source of truth required for multi-company registration only.
4. Preserve `company_id`, `engine_id`, `environment`, `version` as canonical context.
5. Use service-role-only server RPC access with explicit RLS/grant deny for anon/authenticated, following the already proven CEREBRO memory/preference pattern.
6. Keep downstream engine state/evidence separable; do not turn Supabase into the heavy event/log/training store.

Candidate schema name for the next implementation slice: `cerebro_core`.

Candidate minimum table: `cerebro_core.company_registry`.

No table or schema has been created yet.

## Proposed minimum registry contract

The implementation candidate should include at least:

- `company_id` primary identity, stable text key;
- `environment` constrained initially to `PREPROD` for this gate;
- `version` text contract version;
- lifecycle status with fail-closed values;
- bounded non-sensitive metadata JSON;
- deterministic idempotency key/request identity;
- created/updated timestamps;
- optimistic version/revision or equivalent conflict protection;
- no credentials/secrets/business customer payload;
- audit-safe source/evidence reference;
- RLS enabled before exposure;
- no anon/authenticated table grants;
- service-role-only server RPCs for register/read/update needed by CEREBRO Gateway/runtime;
- no autonomous PROD activation.

## Preservation boundary

Do not alter existing App Fénix, CRM, `fenix_prod` operational tables, CEREBRO memory/preferences, WordPress, SEO, Training or Trading to create this registry.

Do not reuse `performance_goals` or any operational business table as the Company Registry.

## PREPROD implementation sequence

`contract + migration SQL in Git → local/isolated PostgreSQL CI → security/grant/RLS tests → rollback/rebuild test → exact-head review → additive Supabase schema migration → synthetic PREPROD register/read/idempotency/tenant-isolation evidence → OLD in-memory vs NEW durable comparison → tribunal → bounded binding`

No PROD company activation is part of this sequence.

## Backup / rollback requirements before live DDL

Before applying the migration to Supabase:

- record exact existing schema inventory and migration head;
- keep migration additive and independently reversible;
- define drop/revert SQL for only the new CEREBRO registry objects;
- ensure no existing object is replaced or renamed;
- test rebuild from migration source;
- test duplicate request idempotency and cross-company deny;
- prove existing App/CRM build/runtime contracts unchanged.

## Cost

Additional recurring cost target: `0 EUR`.

The preferred design reuses the already-contracted Supabase project only for the small transactional Company Registry. No paid AI or new always-on host is required.

## Next technical slice

`DURABLE-COMPREG-001 · MIGRATION_CONTRACT_LOCAL_PREPROD`

Build the additive `cerebro_core.company_registry` migration contract and its local PostgreSQL CI/security tests without touching live Supabase. Only after that slice is GREEN should live additive DDL be considered.
