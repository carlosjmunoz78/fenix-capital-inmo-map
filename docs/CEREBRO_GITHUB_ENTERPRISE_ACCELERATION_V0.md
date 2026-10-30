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
- The Enterprise account is PAID; the current live standard-runner maximum is 180 (issue #1026 evidence).
- GitHub documentation states that increased GitHub Actions job concurrency is not included in the Enterprise trial.
- GitHub documents a 20-job standard hosted-runner baseline without the Enterprise increase.

## Entitlement model
CEREBRO separates two independent facts:
1. `enterprise_organization_verified_for_canonical_repo=true`: ownership/governance is verified.
2. `enterprise_actions_concurrency_entitlement_verified=true`: paid Enterprise Actions concurrency is verified.

The global fanout capability is enabled, but its physical cap remains `min(live runner max 180, documented paid ceiling 500) = 180`.

The paid Enterprise plan documents a standard-runner ceiling of 500 concurrent jobs and GitHub matrices are capped at 256 jobs. The current live setting, not the published ceiling, controls physical fanout.

The general acceleration regression workflow intentionally retains a conservative 20-shard test cap. The Enterprise global fanout workflow has a 20-unit PR canary and a manual dispatch default of 180.

## Acceleration model
- Discover actual independent work only.
- Never create empty capacity jobs.
- One matrix never exceeds 256 jobs.
- The regression test-sharding workflow uses at most 20 parallel shards.
- Enterprise global fanout plans at most the verified live runner maximum; raising 180 to 500 requires fresh live settings evidence.
- Preserve full OLD vs NEW regression.
- Keep old continuous PREPROD workers drained; organization verification does not reactivate permanent runner occupancy.
- Use Linux by default; macOS only when technically required.

## Cost
The canonical repository is public, so standard GitHub-hosted runners are free. Larger runners are not authorized by this capability and remain separately billable.

## Safety
No PROD deployment, external writes, Trading access, paid AI fan-out or service retirement is authorized by this capability.

For service changes:
`INVENTORY -> DEPENDENCIES -> CURRENT CONTRACT -> COST -> REPLACEMENT CONTRACT -> PARALLEL IMPLEMENTATION -> PREPROD -> OLD vs NEW -> ROLLBACK -> DECISION`

## Copilot
Repository instructions remain additive. Copilot is an engineering accelerator, not a runtime dependency and not authority for automatic PROD changes.

## Acceptance
1. Repository and organization evidence verified.
2. Trial vs paid Actions concurrency entitlement represented separately.
3. Global fanout is capped at the current live maximum of 180; PR canaries and regression shards remain capped at 20.
4. Full regression passes.
5. No PROD/external writes occur.
6. Paid plan activation remains `HUMAN_REQUIRED · MONEY_LIMIT`; this policy records existing paid entitlement and does not purchase or activate a plan.

## Rollback
If rollback is needed, disable both fanout entitlement flags and restore the manual fanout default to 20, while preserving the factual `PAID` account state and observed live maximum. Keep the 20-shard regression workflow and all existing workers unchanged.

No data migration is required.
