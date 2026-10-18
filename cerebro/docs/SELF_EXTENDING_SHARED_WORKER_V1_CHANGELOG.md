# SELF-EXTENDING SHARED WORKER V1 · CHANGELOG

## 2026-10-19

- Added `self-extending-shared-worker-v1.mjs` as an additive composition layer; no engine or server duplicated.
- Connected the required chain: legacy184 batch → JOB-001 durable enqueue → durable worker → resolver → verify/resume → Tribunal.
- Reused `DurableJobRuntimeV1`, `DurableWorkerRunnerV1`, `AtomicV8Journal`, the existing resolver and the existing evaluation Tribunal.
- Added evidence-only PREPROD bindings; missing evidence remains fail-closed.
- Extended the existing RSI learning auto-host with an optional `self_extending` loop. Default behavior remains disabled and backward-compatible.
- Added restart/idempotency/Tribunal tests and a host-integration test.
- Expanded the Self-Extending Repo Runtime CI workflow to gate the new chain.
- No PROD writes, no auto-merge, no dependency installation, no customer data, no Trading, no paid fallback; additional cost target remains 0 €.
