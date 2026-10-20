# CEREBRO Dynamic Skill Adoption V1

Status: DEFINED / PREPROD implementation pending merge.

## Purpose

Convert newly discovered public skill semantics into governed internal CEREBRO capabilities without executing third-party skill code. The path is:

`DISCOVERY -> GOVERNED SNAPSHOT -> INTERNAL NORMALIZATION -> ENGINE BINDINGS -> OLD vs NEW -> INDEPENDENT TRIBUNAL -> OBSERVABILITY/AUDIT/FINOPS/LRN -> BACKUP/ROLLBACK/REBUILD -> FULL_SAFE_PREPROD -> CANONICAL MAIN READONLY CANARY -> PROD_CAPABILITY_AVAILABLE_READONLY`.

## Authority boundary

Dynamic adoption never grants PROD write, PROD mutation, permission expansion, dependency installation, customer-data access, paid fallback, spend authority, external skill-code execution, or Trading access. A promoted dynamic capability can only be resolved in `ADVISE`, `ANALYZE`, `REVIEW`, `PLAN`, or `READONLY_OBSERVE` mode. Any side effect remains governed by the origin engine's existing action contract and promotion evidence.

## Continuous operation

The intake workflow is event-driven and also has a 15-minute recovery cadence. A rotated GitHub Search page that is empty while GitHub reports known results performs one bounded fallback to page 1 in the same cycle. It never scans all pages blindly.

The continuous intake emits a dynamic adoption proposal only from `FULL_SAFE_PREPROD` rows with complete engine bindings, learning feedback, tribunal, observability, audit, FinOps, backup, rollback, rebuild and idempotency evidence. The dynamic adoption workflow persists only `cerebro/registry/skill-dynamic-adoption-v1.json`, performs a canonical `refs/heads/main` no-side-effect canary, and only then makes the capability available in the shared PROD read-only fast lane.

## Rollback/rebuild

Every dynamic capability retains immutable source identity (`pinned_sha`, snapshot/manifest/outcome hashes), target engine bindings, compact capability contracts, closure summary and canary provenance. Git history is the registry backup/rollback chain; rebuild is deterministic from the governed queue result and pinned source identity. Failed canaries remain pending and are not callable from the PROD fast lane.
