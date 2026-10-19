# PROD deployment record — CEREBRO Console browser CORS repair

Date: 2026-10-19
Source commit: 783325d8772254038ab2a0ae28e122d21b5c197e
Scope: remove the unsupported cross-origin `x-cerebro-session-id` request header from the browser client while retaining the local session id and authenticated Gateway contract.
Physical evidence before repair: Opera casa `/cerebro` authenticated but remained `Superficie preparada, conexión cerrada`.
Root cause: the browser requested a custom header not advertised by the upstream Gateway CORS allow-list, so preflight blocked `/health` before the authenticated GET.
CI: PR #791 — CEREBRO Session Context Regression Guard, Governed Main Integration, Continuous Human QA and App Restoration Build Gate all GREEN.
Rollback branch: `backup/cerebro-console-prod-0f061c7-20261019`.
Cost: 0 € additional.
