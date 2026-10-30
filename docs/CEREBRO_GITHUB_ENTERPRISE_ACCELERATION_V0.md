# CEREBRO OS · GitHub Enterprise Acceleration V0

Date: 2026-10-31
Status: PREPROD_CANDIDATE

## Objective
Exploit GitHub Enterprise safely for CEREBRO engineering, tests, evaluation, generation and finite batch work without turning GitHub Actions into a permanent application runtime and without removing existing services before equivalence is proven.

## Verified live state
- Canonical repository: `fenix-cerebro/fenix-capital-inmo-map`.
- Repository owner: organization `fenix-cerebro`.
- Organization belongs to Enterprise account `cerebro-os`.
- GitHub Enterprise is PAID.
- GitHub support confirmed an organization-wide simultaneous-job limit of **360**, the maximum applied to the current plan.
- The same confirmation includes up to **50 simultaneous macOS jobs**.
- GitHub documentation publishes a higher 500-job Enterprise topology in supported configurations and 256 jobs per workflow matrix.
- ChatGPT GitHub connector can write to the canonical repository.
- OIDC OLD + NEW compatibility remains preserved.

## Entitlement model
CEREBRO separates three facts:
1. Enterprise ownership/governance is verified.
2. Paid Actions concurrency entitlement is verified.
3. The physically exposed live company cap is **360**, while a 500-job topology remains documented/prepared but is not the live entitlement.

Therefore:
- `enterprise_actions_concurrency_entitlement_verified=true`;
- `enterprise_account_state=PAID`;
- `current_live_enterprise_parallelism_cap=360`;
- `macos_parallelism_cap=50`;
- `global_500_topology_prepared=true`;
- `global_500_fanout_enabled=false` until live runner capacity reaches at least 500.

## Acceleration model
- Discover actual independent work only.
- Never create empty capacity jobs.
- One matrix never exceeds 256 jobs.
- Pull-request canaries remain bounded so validation does not consume the company pool before merge.
- Manual test acceleration remains capped at 128 shards unless its contract is separately promoted.
- Portfolio fair-share: 250 concurrent jobs across W00-W24.
- NEURONAL fair-share: 100 concurrent jobs.
- Control reserve: 10 jobs.
- Total target: 360.
- The 500 topology remains prepared and fail-closed.
- Preserve full OLD vs NEW regression.
- Use Linux by default; macOS only when technically required by macOS/iOS/Safari or Apple-specific tooling.

## Cost
Enterprise Cloud is already active. This capability does not authorize larger runners, extra seats, new subscriptions or silent overage.

## DeepSeek
DeepSeek remains provider-scoped and PREPROD-only. Maximum provider concurrency is 8. Auto recharge remains false. Paid DeepSeek execution requires explicit opt-in.

## Copilot
Copilot remains an engineering accelerator, not a runtime dependency and not authority for automatic PROD changes. Additional AI usage budget remains $0 unless explicitly approved.

## Safety
No PROD deployment, external writes, Trading access, silent paid AI expansion or service retirement is authorized by this capability.

For service changes:
`INVENTORY -> DEPENDENCIES -> CURRENT CONTRACT -> COST -> REPLACEMENT CONTRACT -> PARALLEL IMPLEMENTATION -> PREPROD -> OLD vs NEW -> ROLLBACK -> DECISION`

## Acceptance
1. Paid Enterprise evidence verified.
2. Live physical runner cap recorded as 360 and macOS cap as 50.
3. PR canary and full regression pass.
4. Global fanout uses only discovered useful PREPROD work.
5. No PROD/external writes occur.
6. 500 physical fanout remains fail-closed until GitHub exposes a live limit of at least 500.

## Rollback
Revert the policy/workflow/runbook changes. If paid entitlement evidence is lost, set `enterprise_actions_concurrency_entitlement_verified=false`; the runtime falls back to the standard 20-job safety cap.

No data migration is required.
