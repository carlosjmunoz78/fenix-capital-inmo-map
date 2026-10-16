# GH-SAFE-NATIVE v1 · Runbook PREPROD

Owner `FACT-001`; support `QA-001/EVA-001/ROUTE-001/OBSERV-001`. Reuses the existing GitHub safe wrapper and FULL_SAFE_PREPROD evidence; does not execute external skill code.

Flow: inventory → branch → commit on non-main → PR → checks/CI → compare → governed merge with exact head → evidence. Every write requires rollback readiness. Direct commits to main, force/bypass, secrets, PROD deployment/mutation and permission expansion are denied.

Backup: Git history + exact reviewed head SHA. Rollback: governed revert or branch restore; never force-reset shared main. Fallback: read-only/stop. Rebuild: replay the versioned action contract and rerun `node --test cerebro/tests/github-safe-native-v1.test.mjs`.

Observability records action id, stable idempotency key, repository, operation, exact head, authorization reasons and cost (0 € target).

Changelog 1.0.0 (2026-10-16): first-party native GitHub control-plane wrapper; connector adapter is injected only after policy authorization. Existing `skill-cerebro-github-wrapper.mjs` and `skill-github-full-safe-preprod.v1.json` remain preserved as upstream guidance/evidence.
