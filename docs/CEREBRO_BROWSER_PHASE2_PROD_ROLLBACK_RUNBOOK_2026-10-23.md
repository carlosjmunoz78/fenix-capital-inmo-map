# Browser 1 Phase 2 PROD rollback runbook

Trigger rollback on any RED canary, secret-policy violation, queue corruption, lease leak, cross-company isolation failure, unexpected cost, or V1 regression.

1. Set `public.cerebro_browser_orchestrator_config_v2.enabled=false` for `PROD`.
2. Stop issuing new V2 leases; verify `cerebro_browser_lease_v2(...,'PROD',...)` returns `job=null` + `ORCHESTRATOR_DISABLED`.
3. Cancel/drain only Phase 2 canary jobs. Do not delete evidence.
4. Verify active V2 profile leases = 0.
5. Route Browser execution through V1.
6. Verify V1 dispatch ACTIVE and V1 queue healthy.
7. Preserve V2 schema/functions/tables for forensic evidence; no destructive rollback is required.
8. Record incident, cause and corrective migration before another promotion attempt.
