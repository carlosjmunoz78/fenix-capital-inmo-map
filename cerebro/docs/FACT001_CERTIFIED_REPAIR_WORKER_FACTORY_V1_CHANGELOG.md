# FACT-001 Certified Repair Worker Factory V1 · Change Log

## 2026-10-31 · DEFINED / branch only

- Added `cerebro/registry/certified-repair-worker-profiles.v1.json` with one physically existing certified repair path: `AUTO001_APP_HCI_AUTH_SHELL_ROLE_MAIN_V1`.
- Added deterministic `cerebro/factory/repair-worker-factory-v1.mjs` that validates canonical engine identity, bounded mutation envelopes, required gates, path existence, serial repository writes and zero-cost/no-PROD/no-Trading authority.
- Added focused fail-closed tests in `cerebro/tests/repair-worker-factory-v1.test.mjs`.
- Added hostless read-only workflow `CEREBRO FACT-001 Certified Repair Worker Factory V1` to validate and generate an inspectable deterministic bundle.
- Added runbook, dependency map and explicit autonomy state.
- Existing Engine Registry is preserved; no canonical engine ID is added or replaced.
- Existing AUTO-001/QA/HCI/App ownership is wrapped, not substituted.
- Factory dispatch authority remains false; repository mutation concurrency remains 1.
- Additional cost remains 0 EUR; paid AI is not required; PROD writes and Trading remain false.
- Status is not operational until exact-head PR CI and PREPROD acceptance are physically GREEN.
