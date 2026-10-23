# CEREBRO Browser 1 · Phase 2 · PROD rollout trigger

This commit exists only to trigger the governed PROD rollout workflow on the exact OIDC-authorized branch.

Scope:
- Environment: PROD
- Mode: OBSERVE only
- Target: deterministic `data:` pages only
- Credentials: none
- Customer data: none
- Stages: 1 -> 2 -> 4 -> 8
- Final target only if all stages GREEN: global 8 / company 4 / department 2
- On any failure: automatic `DISABLE`, returning V2 to 1/1/1 disabled and preserving Browser V1 rollback
- Incremental service cost target: 0 EUR
- Phase 3: not started

Promotion source merged to main in PR #885. V1 remains unchanged and active as rollback.
