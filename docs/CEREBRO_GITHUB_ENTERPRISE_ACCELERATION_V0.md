# CEREBRO OS · GitHub Enterprise Acceleration V0

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Exploit GitHub safely for CEREBRO engineering, tests, evaluation, generation and finite batch work without turning GitHub Actions into a permanent application runtime and without removing existing services before equivalence is proven.

## Verified live state
- Canonical repository: `fenix-cerebro/fenix-capital-inmo-map`.
- Repository owner: organization `fenix-cerebro`.
- Organization `fenix-cerebro` belongs to Enterprise account `cerebro-os`.
- ChatGPT GitHub connector is installed for `fenix-cerebro` and can write to the canonical repository.
- OIDC compatibility OLD + NEW was prepared before transfer.
- The Enterprise account is still in its 30-day TRIAL state.
- GitHub documentation states that increased GitHub Actions job concurrency is not included in the Enterprise trial.

## Entitlement model
CEREBRO separates two independent facts:
1. `enterprise_organization_verified_for_canonical_repo=true`: ownership/governance is verified.
2. `enterprise_actions_concurrency_entitlement_verified=false`: paid Enterprise Actions concurrency is not yet verified because the account is still TRIAL.

Therefore `global_500_fanout_enabled=false`.

The paid Enterprise plan documents a standard-runner ceiling of 500 concurrent jobs and GitHub matrices are capped at 256 jobs. Those are readiness targets, not current trial execution authority.

During TRIAL CEREBRO uses a conservative internal `cerebro_trial_safe_parallelism_cap=16`. This is a CEREBRO safety cap, not a claim that 16 is GitHub's contractual account limit.

## Acceleration model
- Discover actual independent work only.
- Never create empty capacity jobs.
- One matrix never exceeds 256 jobs.
- During TRIAL this workflow uses at most 16 parallel shards.
- Paid 500-job topology may be prepared and statically tested, but physical execution above the trial-safe cap requires separate paid Actions concurrency evidence.
- Preserve full OLD vs NEW regression.
- Keep old continuous PREPROD workers drained; organization verification does not reactivate permanent runner occupancy.
- Use Linux by default; macOS only when technically required.

## Safety
No PROD deployment, external writes, Trading access, paid AI fan-out or service retirement is authorized by this capability.

For service changes:
`INVENTORY -> DEPENDENCIES -> CURRENT CONTRACT -> COST -> REPLACEMENT CONTRACT -> PARALLEL IMPLEMENTATION -> PREPROD -> OLD vs NEW -> ROLLBACK -> DECISION`

## Copilot
Repository instructions remain additive. Copilot is an engineering accelerator, not a runtime dependency and not authority for automatic PROD changes.

## Acceptance
1. Repository and organization evidence verified.
2. Trial vs paid Actions concurrency entitlement represented separately.
3. TRIAL execution remains fail-closed at the CEREBRO safety cap.
4. Full regression passes.
5. No PROD/external writes occur.
6. Paid activation remains `HUMAN_REQUIRED · MONEY_LIMIT` until explicitly approved.

## Rollback
Revert the policy/workflow/runbook changes. If entitlement evidence is lost, keep `enterprise_actions_concurrency_entitlement_verified=false` and `global_500_fanout_enabled=false`.

No data migration is required.
