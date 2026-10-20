# CEREBRO Dynamic Skill Adoption V1

Status: PREPROD IMPLEMENTED / PENDING EXACT-HEAD VALIDATION AND PHYSICAL MAIN PROOF.
Owner: `FACT-001`.
Scope dimensions: `company_id`, `engine_id`, `environment`, `version`.

## Purpose

Convert newly discovered public skill semantics into governed internal CEREBRO capabilities without executing third-party skill code. The path is:

`DISCOVERY -> GOVERNED SNAPSHOT -> INTERNAL NORMALIZATION -> ENGINE BINDINGS -> OLD vs NEW -> INDEPENDENT TRIBUNAL -> OBSERVABILITY/AUDIT/FINOPS/LRN -> BACKUP/ROLLBACK/REBUILD -> FULL_SAFE_PREPROD -> CANONICAL MAIN READONLY CANARY -> PROD_CAPABILITY_AVAILABLE_READONLY`.

A candidate/review result is not adoption. Acceptance requires a new non-seeded capability to become callable read-only on at least one governed origin engine after the full gate above.

## Contract and authority boundary

Input gate: `FULL_SAFE_PREPROD` with immutable source identity, governed engine bindings, compact capability contracts, OLD vs NEW pass, independent tribunal pass, LRN feedback, observability, audit, FinOps cost 0, backup, rollback, rebuild, and idempotency all green.

Output gate: `PROD_CAPABILITY_AVAILABLE_READONLY` only after a canonical `refs/heads/main` no-side-effect canary against an exact commit SHA.

Allowed runtime modes are `ADVISE`, `ANALYZE`, `REVIEW`, `PLAN`, and `READONLY_OBSERVE`. Dynamic adoption never grants PROD write, PROD mutation, permission expansion, dependency installation, customer-data access, paid fallback, spend authority, external skill-code execution, or Trading access. Any side effect remains governed by the origin engine's existing action contract and promotion evidence.

## Dependency map

Upstream: `universal-skill-autonomous-scout-v1` -> `universal-skill-source-queue-v1` -> existing repository intake / auto-engineering / real-binding / LRN bridge. Dynamic stage: `skill-dynamic-adoption-v1` -> `skill-prod-capability-fastlane-v1`. The workflow only persists `cerebro/registry/skill-dynamic-adoption-v1.json`; it does not replace App Fénix, CRM, Supabase, Notion, WordPress, SEO, Training, automations, or Trading resources.

## Continuous operation

The intake workflow is event-driven and also has a 15-minute recovery cadence. A rotated GitHub Search page that is empty while GitHub reports known results performs one bounded fallback to page 1 in the same cycle. It never scans all pages blindly. GitHub Search rate limits defer to the next event/recovery cycle without blocking pinned priority work.

The continuous intake emits a dynamic adoption proposal only from `FULL_SAFE_PREPROD` rows. One unsafe or malformed candidate is skipped without blocking independent safe candidates. The adoption workflow recovers pending canaries on later cycles even if a prior main update raced or failed.

## Observability and autonomy state

Required signals are discovery source count, FULL_SAFE_PREPROD count, skipped-adoption count, pending-canary count, dynamic PROD-readonly count, last canary run id, and last canary head SHA. A healthy workflow with zero new adopted capabilities is observable but is not counted as throughput success.

Autonomy state remains `PREPROD_IMPLEMENTED_PENDING_VALIDATION` until exact-head CI is green, the change is merged, and a new non-P0 capability physically traverses the pipeline on main. Only then may this path be described as operational for governed read-only adoption.

## Backup, rollback and rebuild

Every dynamic capability retains immutable source identity (`pinned_sha`, snapshot/manifest/outcome hashes), target engine bindings, compact capability contracts, closure summary and canary provenance. Git history of `cerebro/registry/skill-dynamic-adoption-v1.json` is the registry backup chain. Rollback restores the previous registry revision. No third-party package uninstall is required because external skill code is never installed or executed.

Rebuild replays the pinned source through the same FACT-001 pipeline and requires the same gates again. Failed canaries remain pending and are not callable from the PROD fast lane.

## Changelog V1

- Added bounded page-1 fallback for empty rotated search pages with known results.
- Increased scheduled recovery from hourly to every 15 minutes while preserving event-driven intake.
- Added exact engine bindings, compact capability contracts and closure summary to source-queue evidence.
- Added nonblocking per-candidate dynamic adoption.
- Added canonical-main read-only canary with retry of previously pending rows.
- Extended the shared PROD read-only fast lane to dynamically adopted capabilities.
- Preserved 0 € additional cost, Trading isolation and all existing production surfaces.
