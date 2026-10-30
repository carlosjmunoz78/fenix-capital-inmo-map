# CEREBRO OS · EDGE DEVICE DISPATCH CANARY V1

Date: 2026-10-30
Scope: PREPROD only
Company: fenix
Cost added: 0 EUR
PROD: untouched
Trading: denied

## Objective

Prove that an explicit DEVICE_REQUIRED workload can be persisted while an edge PC/device is OFFLINE and resume through the existing device transport when the edge returns, without turning edge absence into a global CEREBRO failure or HUMAN_REQUIRED.

## Existing inventory preserved

- HOSTLESS_FIRST / EDGE_OPTIONAL placement policy in `cerebro/runtime/execution-placement-policy-v1.mjs`.
- Existing durable device queue `public.cerebro_device_commands_preprod`.
- Existing agent registry `public.cerebro_device_agents_preprod`.
- Existing result ledger `public.cerebro_device_results_preprod`.
- Existing active gateway `cerebro-device-gateway-preprod` V9.
- Existing parallel gateway `cerebro-device-gateway-preprod-lean-canary` V1.
- Existing Browser Bridge/local agent polling path.
- Existing cloud/hostless LRN, FACT-001, useful worker and Playwright browser paths.

No new queue, scheduler, daemon or database table is introduced.

## Dependency map

HOSTLESS work -> existing cloud/GitHub/Supabase runtimes.

DEVICE_REQUIRED work -> placement policy -> OIDC producer -> existing `cerebro_device_commands_preprod` -> existing device gateway -> enrolled edge agent -> result ledger.

If the edge is offline, the command remains QUEUED. This is not HUMAN_REQUIRED. Existing gateway lease/replay semantics remain authoritative for delivery and result idempotency.

## OLD

`cerebro-device-gateway-preprod` V9 remains ACTIVE and unmodified.

## NEW canary

Only `cerebro-device-gateway-preprod-lean-canary` is changed in PREPROD. It acts as a V9 proxy for the existing agent protocol and adds GitHub-OIDC-only `/v1/control/*` routes for:

- synthetic canary fixture;
- governed enqueue into the existing durable device queue;
- status inspection;
- canary-only cleanup.

The producer validates repository/ref/workflow identity, PREPROD scope, company/device/version scope, Trading denial, payload secret-key denial and durable idempotency.

## Backup / rollback

Pre-change canary source is stored at:

`cerebro/backups/supabase/2026-10-30/cerebro-device-gateway-preprod-lean-canary-v1.ts`

Live pre-change canary reference:

- function: `cerebro-device-gateway-preprod-lean-canary`
- version: 1
- SHA256: `2f7c2bb681b1816b82951fbb994dc3c45ea6807c52fa15ae34bb851f83789db0`

Rollback: redeploy the stored V1 source to the same canary function with `verify_jwt=false`. The V9 active gateway is never modified by this canary.

## Canary acceptance

The GitHub-hosted canary uses OIDC and creates only a synthetic edge agent tied to its own `github.run_id`.

Required evidence:

1. OLD V9 health GREEN before NEW.
2. NEW canary health GREEN.
3. Synthetic agent is OFFLINE.
4. First enqueue -> one QUEUED command.
5. Same idempotency key -> same command reused, no duplicate.
6. Status while edge remains OFFLINE -> QUEUED, delivery_attempt=0, no delivery/completion/lease timestamps.
7. human_required=false.
8. Cleanup deletes only synthetic canary-owned data.
9. OLD V9 health remains GREEN after NEW.

## Promotion gate

This canary alone does not authorize promotion to the active V9 gateway or PROD. A later promotion requires physical canary GREEN, OLD vs NEW, rollback verification, observability, registry/changelog update and no known regressions.
