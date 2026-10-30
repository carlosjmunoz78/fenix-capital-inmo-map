# CEREBRO OS · GitHub Enterprise Acceleration V0

Date: 2026-10-30
Status: PREPROD_CANDIDATE

## Objective
Exploit GitHub Enterprise safely for CEREBRO engineering, tests, evaluation, generation and finite batch work without turning GitHub Actions into a permanent application runtime and without removing existing services before equivalence is proven.

## Verified live state
- Canonical repository: `fenix-cerebro/fenix-capital-inmo-map`.
- Repository owner: organization `fenix-cerebro`.
- Organization belongs to Enterprise account `cerebro-os`.
- GitHub Enterprise is PAID and billed monthly.
- Next enterprise billing date observed live: 2026-11-30.
- GitHub Enterprise runners page reports `All jobs usage 1/180` on 2026-10-30.
- GitHub documentation publishes 500 concurrent standard hosted jobs for Enterprise and 256 jobs per workflow matrix.
- ChatGPT GitHub connector can write to the canonical repository.
- OIDC OLD + NEW compatibility remains preserved.

## Entitlement model
CEREBRO separates three facts:
1. Enterprise ownership/governance is verified.
2. Paid Actions concurrency entitlement is verified.
3. The physically exposed live runner cap is currently 180, while GitHub documents a 500 Enterprise ceiling.

Therefore:
- `enterprise_actions_concurrency_entitlement_verified=true`;
- `enterprise_account_state=PAID`;
- `current_live_enterprise_parallelism_cap=180`;
- `global_500_topology_prepared=true`;
- `global_500_fanout_enabled=false` until live runner capacity reaches at least 500.

## Acceleration model
- Discover actual independent work only.
- Never create empty capacity jobs.
- One matrix never exceeds 256 jobs.
- Pull-request canaries remain at 20 shards to avoid consuming the whole account before merge.
- Manual acceleration can use up to 128 test shards, bounded by the live 180 cap.
- Global Mission-DAG fanout can use up to the live 180 cap.
- The 500 topology remains prepared as two legal matrices and requires no second scheduler/queue/daemon.
- Preserve full OLD vs NEW regression.
- Keep old continuous PREPROD workers drained; paid Enterprise does not reactivate permanent runner occupancy.
- Use Linux by default; macOS only when technically required.

## Cost
Enterprise Cloud is already active as one paid seat. This capability does not authorize larger runners, extra seats, new subscriptions or silent overage. The canonical repository is public and standard hosted runners remain the preferred path.

## DeepSeek
DeepSeek remains provider-scoped and PREPROD-only. Maximum provider concurrency is 8. Auto recharge remains false. Main-push agent fanout is protected by deterministic budget and live prepaid-balance guards.

## Copilot
Copilot Pro is active. CEREBRO may use up to the plan's 4 concurrent CLI subagents for independent engineering work. Additional AI usage budget remains $0 unless explicitly approved. Copilot is an engineering accelerator, not a runtime dependency and not authority for automatic PROD changes.

## Safety
No PROD deployment, external writes, Trading access, silent paid AI expansion or service retirement is authorized by this capability.

For service changes:
`INVENTORY -> DEPENDENCIES -> CURRENT CONTRACT -> COST -> REPLACEMENT CONTRACT -> PARALLEL IMPLEMENTATION -> PREPROD -> OLD vs NEW -> ROLLBACK -> DECISION`

## Acceptance
1. Paid Enterprise evidence verified.
2. Live physical runner cap recorded separately from documented 500 ceiling.
3. PR canary and full regression pass.
4. Global fanout uses only discovered useful PREPROD work.
5. No PROD/external writes occur.
6. 500 physical fanout remains fail-closed until GitHub exposes a live limit of at least 500.

## Rollback
Revert the policy/workflow/runbook changes. If paid entitlement evidence is lost, set `enterprise_actions_concurrency_entitlement_verified=false`; the runtime falls back to the standard 20-job safety cap.

No data migration is required.
