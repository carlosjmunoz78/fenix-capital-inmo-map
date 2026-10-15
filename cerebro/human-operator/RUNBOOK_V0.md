# Human Operator Runbook V0

Status: `DEFINED / PHYSICAL_EXECUTION_NOT_STARTED`

## Start conditions

Do not start physical execution unless:
- shared Skills/Capability Evolution work is stable;
- dedicated Chrome CEREBRO profile exists;
- kill switch is enabled and tested;
- job is LAB/PREPROD and explicit;
- identity and credential refs are registered/authorized;
- rollback/cleanup path is known;
- no Trading route is reachable.

## Start sequence

1. Load job and validate required identity fields.
2. Validate environment and allowed surfaces/actions.
3. Resolve browser profile; reject Carlos personal profile.
4. Check Browser Bridge/adapter attestation.
5. Check IAM credential/session health.
6. Reuse valid session before re-login.
7. Resolve secret only if authentication is required.
8. Open/pin intended tab.
9. Capture initial checkpoint and evidence baseline.
10. Execute objective with bounded replanning.

## Runtime loop

`OBSERVE -> PLAN -> ACT -> VERIFY -> EVIDENCE -> CHECKPOINT_WHEN_NEEDED -> CONTINUE`

Rules:
- verify effects, never assume a click succeeded;
- identical state repeated >= configured threshold => circuit break;
- no measured step => no PASS/RESOLVED claim;
- navigation retries bounded;
- new unknown surface/action => deny/hold;
- expired session => session resolver, not immediate owner interruption;
- canonical HUMAN_REQUIRED only.

## Recovery

- Tab closed: reopen from last verified checkpoint.
- Chrome crash: restart dedicated profile and verify restored session/state.
- Controller crash: resume durable job from checkpoint.
- Bridge disconnect: reconnect bounded times, then HOLD.
- Unknown UI: screenshot + DOM/accessibility evidence, replan once/bounded, then HOLD.
- Session invalid: reuse refresh/login chain.
- Loop: stop case, preserve evidence, continue other safe cases when policy permits.

## Stop immediately

- kill switch activated;
- environment drift to unauthorized PROD mutation;
- unexpected money movement;
- security incident;
- cross-company isolation failure;
- destructive action outside explicit authorization;
- credential value detected in log/evidence;
- Trading surface reached.

## End sequence

1. Verify final state.
2. Cleanup synthetic mutations when required.
3. Capture final checkpoint.
4. Generate MorningReportV0.
5. Mark unmeasured cases explicitly.
6. Route verified findings to QA-001.
7. Do not route raw transient noise to LRN-001.
8. Release transient secret leases.
9. Leave persistent Chrome session/profile intact unless policy requires logout.
10. Record rollback/cleanup status.

## Morning operator output

Must state:
- duration and coverage;
- completed/failed/held jobs;
- findings by severity/owner;
- session reuse and recovery rate;
- browser/controller restarts;
- conversation failures;
- permissions/isolation failures;
- unresolved and unmeasured cases;
- cost;
- exact next safe actions.

## Promotion

No physical success in LAB/PREPROD authorizes PROD. Promotion requires OLD vs NEW, independent evaluation/judge, observability, rollback, backup/rebuild and explicit authorization.
