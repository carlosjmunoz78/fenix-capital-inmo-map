# FACT001 · Cloudflare D1 · Physical autonomous LAB proof (11 Nov 2026)

**VERIFIED_LAB (scoped records in pre-existing D1) — NOT universal D1 administration.**

Physical D1 Recovery UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, pre-DDL bookmark `0000015a-00000004-00005120-bed2e83bb78ad84f1f0f0ee0468ec756`. Three new additive tables `fact001_cf_d1_jobs_v1`, `fact001_cf_d1_owned_values_v1`, `fact001_cf_d1_events_v1`. Other tables untouched; never restore whole D1. No database created/deleted (Free plan **10/10** currently in use).

Private headless CEREBRO Worker `cerebro-fact001-headless-operator-lab-20261111` version `fde58260-9a26-4dec-a84f-201114ba071b` with three original bindings preserved. Four queued jobs, processed via separate D1 tick without new paid services, resulted:
- `d1.owned.create` — `COMPLETED`, attempts=1, phase=`D1_OWNED_CREATED_V1`, error_code=NULL.
- `d1.owned.update` — `COMPLETED`, attempts=1, phase=`D1_OWNED_UPDATED_V2`, error_code=NULL.
- `d1.owned.rollback` — `COMPLETED`, attempts=1, phase=`D1_OWNED_ROLLBACK_V1`, error_code=NULL.
- `d1.owned.delete` — `COMPLETED`, attempts=1, phase=`D1_OWNED_SOFT_DELETE`, error_code=NULL.

Owner value `fact001-lab-a001` retained for audit with state/value_tag `DELETED`. Cron temporarily accelerated to 1min for E2E, **restored and verified at `*/5 * * * *`**. The Worker stays private, no new route, no public Pages deployment. All source in PR #44 DRAFT branch.

**Pending:** D1 administrator create/delete/database backup & restore separate evidence; a D1-specific signed service ingress; Cloudflare Pages protected content deployments and rollback, token rotation. Cloudflare Universal remains **PARTIAL**; don't infer full Cloudflare or PROD autonomy.

Physical combined counts: Workers 6/6 + Pages empty project 4/4 + D1 scoped records 4/4 = **14 completed LAB jobs**. Note different scopes and security boundaries.
