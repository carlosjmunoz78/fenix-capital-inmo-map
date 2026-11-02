# L9 Foundation Wave 1 Runbook

Corrected OLD baseline after excluding Factory from physical evidence: 7/11 physical, `WHY-001` partial, `DIRUI-001`, `TIMELINE-001`, `VOICEUI-001` documented-only. Preserve the seven physical engines. WRAP_PRESERVE the observed `WHY-001` runtime path. Implement only four foundation UI engines.

## Safety
LAB/PREPROD only. Cross-company DENY BY DEFAULT. No PROD writes, external actions, microphone capture, recording, paid AI, command execution, or external Voice API calls. Foundation UI does not equal live CEREBRO Console autonomy.

## Dependencies
OLD audit observed 10 effective runtime relationships and rejected 6 cycle-closing candidates. Rejected relationships remain evidence/candidates and are not silently inserted into the effective graph.

## Gate
Focused L9 tests, syntax, Registry/Factory validation, full regression excluding only the two known intentionally paused continuous-worker tests, connection analyzer, deterministic L7/L8/L9-aware audit, cycle guard, 11/11 physical assertion, secret/PROD/Trading boundary scan, evidence completeness, OLD vs NEW.

## Rollback
Reset the isolated mission branch to `0cb328b4ce574438786b6d85f1253986537bd4c0`. No PROD rollback is required.

## Backup/Rebuild
Git history is durable backup. L9 audit output must be byte-identical across two executions.
