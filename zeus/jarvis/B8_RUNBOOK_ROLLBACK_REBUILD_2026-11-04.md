# B8 · RUNBOOK · ROLLBACK / REBUILD · CORTE 03
## Scope
LAB-only, PR #18 DRAFT based on B7 #17 which is based on B6 #16. No PROD migration. No tables/servers/secrets created.
## Before any action
1. Verify exact PR #18 base is `cerebro/jarvis-b7-multiagent-supervisor-v0-20261104` and B7 remains DRAFT.
2. Verify B3/B4 `enabled=false` and `kill_switch=true` in `cluhljgonannaafpmblx` (read-only).
3. Verify `cerebro/registry/engine-registry.v1.json` count remains 179 and no new subscription/paid model.
## Rebuild
Checkout B8 branch in isolated checkout (not main), Node 24, execute `node --test zeus/jarvis/core/*.test.mjs`. CI link 41785220608 is verified for code HEAD `80b6738...`: 413 PASS / 0 FAIL. Additional tests added later require new CI.
Verify B7 GitHub+PG17 workflows at their certified SHA if rerunning; **never** point tests at PROD DB.
## Rollback
Because only new files exist in B8, rollback = close PR #18 or revert only B8 additions in its branch; do not reset/force-push main, B7, B6, App or CRM. Preserve audit and STATE.
No B8 database migration was applied; therefore there is no B8 database rollback to execute. Do not confuse B7's PG17 synthetic restore with B8 or PROD restore.
## Fault handling
Cross-company result, forged identity, audit outage, unverified evidence, B3 deny, supervisor kill, unknown source or economic commitment -> **DENY/STOP** without external work. On ambiguous durable commit, do not auto-retry; reconcile with journal/evidence first.
## Criteria to promote
Real Company Registry, OWNER_ROOT, bounded B3, durable JOB-001 adapter, P23 verified metrics, independent Tribunal, backup/restore in isolated PostgreSQL, OLD vs NEW, FinOps, PREPROD, separate production authorization. None fulfilled by LAB CI alone.
