# CEREBRO Browser 1 · Phase 2 · PROD closure

Date: 2026-10-23
Environment: PROD
Project: `cluhljgonannaafpmblx`
Promotion PR: #885
Promotion main SHA: `b39fd0a0dbdd8b1574ce76996963569b1ba86c0a`

## Final status

Browser 1 Phase 2 V2 is promoted to PROD with the governed operating cap:

- global concurrent: 8
- per company: 4
- per department: 2
- Browser V1 preserved and active as rollback path
- Phase 3 not started
- incremental service cost: 0 EUR

## Physical PROD rollout evidence

Primary rollout:
- GitHub Actions run: `39995119306`
- job: `120556520973`
- conclusion: SUCCESS
- branch/ref: `cerebro/browser1-phase2-prod-canary-v1`
- source head: `b39fd0a0dbdd8b1574ce76996963569b1ba86c0a`
- runtime contracts before rollout: 15/15 PASS

Physical stages:
- stage 1: 1/1 GREEN
- stage 2: 2/2 GREEN
- stage 4: 4/4 GREEN
- stage 8: 8/8 GREEN
- total physical synthetic OBSERVE jobs: 15/15 SUCCEEDED

All canary targets were deterministic `data:` pages. No customer data and no external account credentials were used.

Metrics audit for run `39995119306`:
- stage 1 rows/succeeded: 1/1
- stage 2 rows/succeeded: 2/2
- stage 4 rows/succeeded: 4/4
- stage 8 rows/succeeded: 8/8
- `secret_material_logged=true`: 0
- recorded incremental cost: 0 EUR

Artifact:
- ID: `12519054416`
- name: `browser-phase2-prod-rollout-v1`
- size: 355276 bytes
- SHA-256: `8a07b54935eccf40699fdfbad12391927cb2c881f8b241ecc5ccdd094addda40`
- retention expiry observed: 2026-11-06

## Duplicate-run incident and correction

Creating the exact canary branch already triggered rollout run `39995119306`. A subsequent documentation commit triggered a second run `39995150819` concurrently. The second run passed runtime contracts but received `NO_JOB` at stage 1 because the primary rollout already held the governed capacity. Its failure path issued `DISABLE` as designed; the primary rollout then continued through its own staged configuration calls and finalized GREEN at 8/4/2.

The single synthetic QUEUED job left by the duplicate run was cancelled through `cerebro_browser_cancel_v2` with reason `DUPLICATE_PROMOTION_RUN_CANCELLED_AFTER_GREEN_PRIMARY_RUN`; evidence was retained and nothing was deleted.

Closure hardening adds a workflow concurrency group with `cancel-in-progress: false`, preventing simultaneous PROD rollout runs from recurring.

## Final live audit

Observed after primary rollout and duplicate cleanup:
- PROD V2 enabled: true
- final limits: 8 / 4 / 2
- finalizer: `github:39995119306:1:finalize`
- V2 active jobs: 0
- V2 active profile leases: 0
- V1 active jobs: 0
- V1 live leases: 0
- V1 secret-log violations: 0
- V2 secret-log violations: 0
- V2 credential materializations during PROD canary: 0
- `cerebro-browser-dispatch-v1`: ACTIVE
- `cerebro-browser-dispatch-v2`: ACTIVE v1

## Rollback

Immediate rollback remains:
1. set PROD V2 `enabled=false` and limits 1/1/1;
2. stop new V2 leases;
3. drain/cancel governed V2 work while preserving evidence;
4. route execution through Browser V1;
5. investigate before another V2 enablement.

No destructive rollback is required because Phase 2 is additive.

## Classification

- Phase 1 / Browser V1: EXISTENTE + PRESERVADO
- Phase 2 / PROD: HECHO
- Phase 2 operational cap: HECHO 8/4/2
- Credential use in PROD rollout: NO UTILIZADO
- Secret leakage: 0 observed
- Cost additional: 0 EUR observed/recorded
- Phase 3 viewer/takeover: PLANIFICADO, NO INICIADO
- HUMAN_REQUIRED: none after explicit PROD authorization
