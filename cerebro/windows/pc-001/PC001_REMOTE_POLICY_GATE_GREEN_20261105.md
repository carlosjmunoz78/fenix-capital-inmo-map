# CEREBRO OS · PC-001 · Policy gate GREEN · 2026-11-05

**Scope:** `company_id=fenix / engine_id=PC-001 / environment=PREPROD / version=pc001-windows-v1`.
**Branch:** `cerebro/pc001-remote-proof-v0-20261105`.
**Status:** `POLICY_V2_CI_GREEN_REMOTE_PHYSICAL_HOLD`.

## Verified in this iteration
1. Reviewed current PREPROD Gateway V9 and existing Windows transport client. The existing Windows worker accepts only `SERVICE_HEALTH/READ_HEALTH`; it remains untouched.
2. Hardened `cerebro/windows/pc-001/remote-adapter-v0/pc001-remote-policy-v0.mjs` to fail closed for missing, null, array, or malformed payload/policy records and non-Map idempotency ledgers.
3. Local isolated shape tests: **24 passed / 0 failed**. These are policy-shape tests, not the real V2 integration.
4. GitHub Actions real repository CI: [run 41996765512](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41996765512), commit `055ec781c3b507ace6ef9ad036f45097f3cf38d7`, **SUCCESS; 15 tests PASS / 0 failed** covering canonical `universal-device-command-envelope-v2.mjs` and new rejection regressions.
5. The first CI attempt [41996686804](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41996686804) stopped in `setup-node` before testing due to unsupported `cache: false`. Removed that argument and verified the next run GREEN.

## Strict limits / non-claims
- The user's supplied `CEREBRO_PC001_CONTROL_RESULT.json` proves a **local user-consented synthetic** UI/FS exercise only. The new remote adapter has not been physically executed.
- PREPROD Gateway existing authentication and heartbeat do not establish that the V0.1 UI fixture accepts remote commands.
- **No remote control has been enabled or deployed.** The PowerShell broker candidate did not pass prior GitHub upload guard and remains unreviewed in private project Library; no workaround or forced publication was used.
- No original worker stopped; no stop marker created; no App/CRM/Trading/PROD changes; no Supabase mutations.
- No new API billing or subscription; GitHub Actions standard hosted runner for the public repository is free per official GitHub docs.

## Mandatory next release gate (not bypassed by broad approval)
1. Inspect issuer authority for `cerebro_device_commands_preprod`, ensuring only owner-scoped, authenticated and auditable enqueueing. **Do not insert synthetic commands directly into SQL.**
2. Establish takeover ownership of the current queue: no two pollers; no shutdown of the original worker until verified backup, lease handoff and automatic rollback have a readback.
3. Review and independently test the Windows broker code; PowerShell parser and Windows physical PREPROD acceptance are outstanding.
4. Issue a single `PC001_SYNTHETIC_LOCAL_PROOF / RUN_VISIBLE_SYNTHETIC_PROOF` command with short expiry and explicit local consent, then verify claimed lease, unique receipt, semantic readback, kill switch and restoration of the original worker.
5. Only after a remote one-shot success should browser/desktop/files/general control be considered, per individual capability and security policy.

**Next block:** `PC001_AUTHORIZED_OWNER_ENQUEUE_AND_WORKER_HANDOFF_AUDIT`.
