# L8 Foundation Wave 1 Runbook

OLD baseline: 17/23 physical, 6 DOCUMENTED_ONLY, no partials and no scaffolds. Preserve all 17 physical engines unchanged. Implement only `BMD-001`, `PROC-001`, `COMP-DEP-001`, `COMP-HLT-001`, `COMP-BKP-001`, `COMP-OFF-001`.

## Safety
LAB/PREPROD only. Cross-company DENY BY DEFAULT. No PROD writes, no external deployment, no deletion, no credential changes, no paid AI requirement, and no new subscription. Offboarding and backup return plans only; destructive or binding changes remain outside foundation authorization.

## Gate
Focused L8 tests, syntax, Registry/Factory validation, full regression with only the two known intentionally paused continuous-worker exclusions, existing connection analyzer, dependency/cycle audit, deterministic rebuild twice, 23/23 physical assertion, secrets/PROD/Trading boundary scan, evidence check, OLD vs NEW.

## Rollback
Reset the isolated mission branch to `f7a4a32d361139e34295767b9a40c29c51650a90`. PROD rollback is unnecessary because PROD is not touched.

## Backup/Rebuild
Git history is the durable backup. The L8 audit is executed twice and must be byte-identical.
