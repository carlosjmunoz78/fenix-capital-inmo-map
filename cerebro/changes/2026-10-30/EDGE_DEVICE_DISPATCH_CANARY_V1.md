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
- Existing parallel gateway `cerebro-device-gateway-preprod-lean-canary`.
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

## Execution evidence

### Initial canary run

- GitHub run: `40983195851`.
- OLD V9 health: GREEN before and after.
- GitHub OIDC: GREEN.
- Synthetic OFFLINE fixture: GREEN.
- Failure isolated to command insertion.
- PostgreSQL evidence: SQLSTATE `23502`, `command_id` arrived NULL.
- Root cause: producer relied on an implicit/default UUID behavior that the live PostgREST insert path did not provide.
- No schema change was made.
- Cleanup: GREEN; no synthetic agent/command residue.

### Corrective change

One-variable application fix only:

- producer now creates `command_id` explicitly with `crypto.randomUUID()`;
- static regression asserts explicit UUID generation;
- Supabase schema, queue, V9 gateway and physical agents remain unchanged.

Canary function after correction:

- `cerebro-device-gateway-preprod-lean-canary` version 3;
- custom GitHub OIDC auth retained;
- active V9 gateway unchanged.

### Green physical canary

- GitHub run: `40983676930`.
- Static contract tests: GREEN.
- OLD V9 + NEW canary health before test: GREEN.
- GitHub OIDC mint/verification: GREEN.
- Synthetic OFFLINE edge fixture: GREEN.
- First enqueue: GREEN, state `QUEUED`, delivery_attempt `0`.
- Same idempotency key replay: GREEN, same command reused, no duplicate.
- Durable status while edge remained OFFLINE: GREEN, still `QUEUED`, no delivered/completed/lease timestamps.
- Edge placement: `DEFERRED_EDGE`, queued for automatic resume, `human_required=false`.
- Cleanup: GREEN.
- OLD V9 health after NEW canary: GREEN.
- Post-cleanup database verification: `0` synthetic agents and `0` synthetic commands.

Result: offline-edge persistence and idempotency are **HECHO in PREPROD canary**. This proves that an edge PC/device may be absent without becoming a global CEREBRO failure; explicit edge work can remain durable and resume through the existing device transport when the enrolled edge returns.

## Promotion gate

This canary does not authorize PROD. Promotion of the OIDC producer from the parallel canary into the active PREPROD device gateway requires:

- PR/general regression gates GREEN;
- OLD vs NEW preserved;
- rollback source retained and deployable;
- observability and change documentation current;
- no known canary residues or regression failures.

Any later PROD promotion remains a separate governed gate.
