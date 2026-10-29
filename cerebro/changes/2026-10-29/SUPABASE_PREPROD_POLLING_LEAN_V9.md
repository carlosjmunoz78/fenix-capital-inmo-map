# CEREBRO OS · Supabase PREPROD polling optimization · v9

Date: 2026-10-29
Scope: PREPROD/LAB only
Supabase project: `hnqlnvakzaywtafeiybt` (`fenix-capital-inmo-map`)
Production project `cluhljgonannaafpmblx`: NOT MODIFIED

## Status

- HECHO: inventory of the two active Supabase projects.
- HECHO: baseline of PREPROD request load.
- HECHO: snapshot of `cerebro-device-gateway-preprod` v8 before changes.
- HECHO: parallel canary `cerebro-device-gateway-preprod-lean-canary` deployed ACTIVE.
- HECHO: optimized code promoted to existing PREPROD gateway as v9.
- HECHO: live traffic verification after promotion.
- HECHO: rollback source preserved in GitHub.
- POR AUDITAR: second optimization wave for SEO/sitewide polling; no change made in this wave.

## Why

The old gateway performed maintenance work on every authenticated device poll:

1. agent lookup/auth,
2. nonce insert,
3. nonce retention cleanup,
4. agent heartbeat update,
5. expired command lease recovery,
6. legacy lease recovery,
7. queue read.

This produced unnecessary writes/deletes while devices were idle.

## Change

Command delivery semantics were preserved. The v9 change only throttles maintenance:

- heartbeat update: at most once every 30 seconds per active device,
- nonce retention cleanup: at most once per 5-minute bucket when heartbeat is due,
- per-request nonce INSERT remains unchanged, therefore replay protection remains active,
- command lease recovery, queue selection and delivery marking remain unchanged.

## OLD vs NEW live evidence

Promotion timestamp: 2026-10-29 22:46:36 UTC.

Window sampled around promotion:

### OLD v8
- `cerebro_device_agents_preprod`: 265 operations
- `cerebro_device_nonces_preprod`: 264 operations
- `cerebro_device_commands_preprod`: 399 operations
- server errors: 0

Normalized to command operations:
- agents / commands: 0.664
- nonces / commands: 0.662

### NEW v9
- `cerebro_device_agents_preprod`: 48 operations
- `cerebro_device_nonces_preprod`: 40 operations
- `cerebro_device_commands_preprod`: 122 operations
- server errors: 0

Normalized to command operations:
- agents / commands: 0.393
- nonces / commands: 0.328

Relative reduction normalized to unchanged command work:
- agent operations: ~40.8% lower
- nonce operations: ~50.4% lower
- combined core operations across agents + nonces + commands: ~26% lower

Function-level verification after v9 promotion:
- 43 observed `cerebro-device-gateway-preprod` executions
- 43 HTTP 200
- 0 observed 5xx in sampled window

Based on the previous 24 h baseline (41,335 agent operations, 41,334 nonce operations, 61,981 command operations), the observed ratios imply roughly 38,000 fewer internal REST operations/day if traffic composition remains similar.

## Deployed artifact

- Function: `cerebro-device-gateway-preprod`
- Version: 9
- Status: ACTIVE
- SHA256: `dbb6094ce38e39fe7887cde72758665414348f6ddb1280ccc32aac5d77d7d6ac`

Parallel canary kept available:
- Function: `cerebro-device-gateway-preprod-lean-canary`
- Version: 1
- Status: ACTIVE
- SHA256: `2f7c2bb681b1816b82951fbb994dc3c45ea6807c52fa15ae34bb851f83789db0`

## Rollback

Original v8 source snapshot:
`cerebro/backups/supabase/2026-10-29/cerebro-device-gateway-preprod-v8.ts`

Snapshot commit:
`e23257c768d2f081fd26254878b6977aa19ed100`

Rollback procedure: redeploy the stored v8 source to `cerebro-device-gateway-preprod` in project `hnqlnvakzaywtafeiybt` with `verify_jwt=false`, then verify live agent polls and HTTP status before closing rollback.

## Safety

- PROD was not modified.
- No schema/table changes.
- No data deletion beyond the pre-existing 24 h nonce retention cleanup behavior.
- No authentication weakening.
- No reduction of command polling frequency.
- No new paid service or subscription introduced.
