# Runbook · CEREBRO Dynamic Skill Adoption V1

## Normal path

1. Continuous intake discovers pinned public skill metadata.
2. External code remains inert; CEREBRO builds internal semantic contracts and engine bindings.
3. Candidate must reach FULL_SAFE_PREPROD with OLD vs NEW, tribunal, LRN, observability, audit, FinOps, backup, rollback, rebuild and idempotency all green.
4. Intake emits a dynamic adoption proposal artifact.
5. Dynamic adoption workflow merges only safe pending capabilities into the dynamic registry.
6. Pending registry is persisted on `main` without granting runtime availability.
7. Canonical-main no-side-effect canary runs against the exact pending-registry commit.
8. Green candidates become `PROD_CAPABILITY_AVAILABLE_READONLY` and enter the shared fast lane.

## Failure behavior

- Search rate limit: defer and retry on next event/15-minute recovery cycle.
- Empty rotated page with known results: one bounded fallback to page 1.
- Incomplete evidence: keep out of dynamic adoption.
- Canary failure: capability remains pending and not callable.
- Main branch advances before a registry push: non-force push fails; next cycle retries.
- Any unexpected modified path: workflow fails closed.

## Rollback

The only persistent mutable surface is `cerebro/registry/skill-dynamic-adoption-v1.json`. Restore the previous Git revision of this file to remove a dynamic capability from availability. No third-party package uninstall is required because external skill code is never installed or executed.

## Rebuild

Re-run intake from the immutable `source_locator`, `pinned_sha`, `snapshot_sha256`, `manifest_sha256`, and `outcome_hash`; the internal engine bindings and closure evidence are deterministic and must pass the same gates again.
