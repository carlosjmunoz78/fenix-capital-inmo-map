# CEREBRO Browser 1 · Phase 2 · PROD promotion gate

Authorization: explicit user authorization received on 2026-10-23 for Phase 2 PROD promotion.

Promotion policy:
- Preserve Browser V1 unchanged as rollback path.
- Apply V2 additively.
- Deploy V2 with PROD disabled first.
- Run governed canary at concurrency 1.
- Promote 1 -> 2 -> 4 -> 8 only when each previous stage is GREEN.
- Any red: set PROD V2 `enabled=false`, drain governed V2 canaries, retain evidence, route through V1.
- No Phase 3 work in this promotion.
- No additional paid service or subscription.

Required gates before enabling V2 in PROD:
- latest `main` is ancestor of Phase 2 branch;
- Phase 2 tribunal PASS;
- V1 unchanged;
- PROD pre-change snapshot recorded;
- V2 DDL reviewed additive-only;
- Edge Function authentication contract preserved;
- no raw secrets in queue/logs;
- incremental cost target 0 EUR.
