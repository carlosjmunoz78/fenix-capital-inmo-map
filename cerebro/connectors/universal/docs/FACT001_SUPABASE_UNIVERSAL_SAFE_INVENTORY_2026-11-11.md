# FACT001 · Supabase Universal · Safe entry inventory (2026-11-11)
**STATUS: PARTIAL / READ_ONLY**, not autonomous Supabase CRUD.

## Physical read-only facts
Supabase organization `fkxsrctlzcddwbivmypl`, plan `pro`. Two protected ACTIVE_HEALTHY projects:
- `fenix-capital-prod` / `cluhljgonannaafpmblx` / `eu-west-2`: App/CRM core + CEREBRO named Edge functions; treat as PROD, do not perform generic create/delete/migrations.
- `fenix-capital-inmo-map` / `hnqlnvakzaywtafeiybt` / `eu-north-1`: existing project, not approved as disposable LAB, map dependencies before any writes.

The CEREBRO signed owner GitHub OIDC provider broker `cerebro-fact001-headless-provider-lab` authenticated and used existing Management PAT `cerebro_supabase_management_pat_v1` held in Supabase Vault, returned HTTP 200 and VERIFIED Supabase inventory in [GitHub run #43051670908](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43051670908). No token content was exposed or moved. No new Supabase project or subscription.

## Next engine acceptance gates
Read-only inventory of Edge functions/migrations/contracts, dependency map to App/CRM, backup strategy, no deletions; create an isolated LAB scope through a new namespaced Edge *only if 0 EUR, noninterference proven, rollback and service-bound policy*, or obtain a separate true sandbox (no extra payment without approval). A single management PAT must not grant unrestricted production writes. Independent signed LAB queue + atomic idempotency + physical self-owned resource lifecycle + provider readback + audit + rollback are **PENDING**.

Conserve → understand → wrap → test → improve → migrate. No modification of any existing Supabase table, function, auth, D1 or PROD through this Supabase-specific review.
