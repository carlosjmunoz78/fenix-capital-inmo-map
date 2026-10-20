# CEREBRO · SKILL OPERATIONAL WRAPPER BATCH V2 · EVIDENCE

Date: 2026-10-20
Company scope: GLOBAL / first live consumer `company_id=fenix`
Engine owner: FACT-001
Environment: PROD_CAPABILITY
State at evidence capture: PRE-MERGE GREEN

## Baseline / OLD

- Canonical `main` baseline before this isolated branch: `d27a164286cee0b1a64c7199477b48586022aad4`.
- Dynamic adoption registry already exposed five governed READONLY capabilities: `aws-cognito`, `aws-ec2`, `design-md`, `drei`, `figma-to-code`.
- Only `drei` had a CEREBRO-owned executable internal wrapper and real governed runtime-consumption proof.
- No external skill source code was authorized for direct execution.

## NEW candidate

Branch: `cerebro/skill-wrapper-batch-v2`
Green head before this evidence-only commit: `9d053d89af7003c1d4f79503b05dfb3c5450fac3`

The candidate adds CEREBRO-owned deterministic governed wrappers for:

1. `aws-cognito` → `skillwrap:aws-cognito-internal-v1`
2. `aws-ec2` → `skillwrap:aws-ec2-internal-v1`
3. `design-md` → `skillwrap:design-md-internal-v1`
4. `drei` → existing `skillwrap:drei-internal-v1`
5. `figma-to-code` → `skillwrap:figma-to-code-internal-v1`

A shared helper `governed-wrapper-factory-v1.mjs` normalizes safe modes, deterministic hashing, input sanitation, provenance and fail-closed authority.

## Source provenance

All five capabilities are pinned to source snapshot:

`TerminalSkills/skills@6edcf94159d9f46b0759d2e1b59dd545cfaca254`

Licenses recorded in the wrapper registry:

- `aws-cognito`: Apache-2.0
- `aws-ec2`: Apache-2.0
- `design-md`: MIT
- `drei`: Apache-2.0
- `figma-to-code`: Apache-2.0

Implementation policy is `CEREBRO_INTERNAL_REIMPLEMENTATION_FROM_LICENSED_KNOWLEDGE`.
Raw external skill code execution remains `false`.

## Authority / safety contract

For the operational wrapper set:

- direct PROD write: `false`
- direct PROD mutation: `false`
- external side effects: `false`
- permission expansion: `false`
- external skill code execution: `false`
- dependency installation: `false`
- Trading access: `false`
- spend authorization: `false`
- additional cost: `0 EUR`
- external actions remain owned by origin-engine policy, not by the skill wrapper.

No website, CRM, Supabase data, WordPress content, customer data, infrastructure resource or Trading system was changed by this batch.

## Tests and live CI evidence

Final code head tested before evidence commit: `9d053d89af7003c1d4f79503b05dfb3c5450fac3`.

- `CEREBRO Skill PROD Operational Fast Lane V1`
  - run: `39462573766`
  - result: `SUCCESS`
  - proves all five wrappers resolve through the governed operational fast lane with fail-closed authority.

- `CEREBRO Skill PROD Real Consumer V1`
  - run: `39462573712`
  - result: `SUCCESS`
  - proves real internal runtime consumption for all five wrappers and semantic output checks without raw external code or external side effects.

Earlier workflow runs on the same branch also passed while the batch was being assembled; the two run IDs above are the authoritative final-head evidence.

## OLD vs NEW

OLD:

`5 READONLY dynamic capabilities / 1 executable governed internal wrapper / 1 real-consumed capability`

NEW candidate:

`5 READONLY dynamic capabilities / 5 executable governed internal wrappers / 5 real-consumed capabilities`

This changes capability availability only inside the governed `PROD_CAPABILITY` runtime. It does not authorize direct external production mutation.

## Backup / rollback / rebuild

- Backup/reference baseline: immutable Git commit `d27a164286cee0b1a64c7199477b48586022aad4`.
- Before merge, rollback is branch deletion or abandoning the PR; `main` remains untouched.
- After merge, rollback is a Git revert of the wrapper-batch merge commit, followed by the same operational-fast-lane and real-consumer test suites.
- Rebuild is deterministic from repository source + the pinned external source SHA; no paid dependency is required.

## Promotion gate

Promotion to `main` is allowed only after:

1. branch diff is confirmed limited to wrapper/runtime registry/tests/workflows/evidence;
2. final branch CI above is GREEN;
3. PR head remains mergeable and unchanged;
4. post-merge executions on `main` re-prove both operational-set and real-consumer workflows.

Until step 4 is complete, status is `PARCIAL / PRE-MERGE GREEN`, not fully closed.

## next_block

After post-merge GREEN, industrialize wrapper generation/scaffolding so additional approved skills can acquire CEREBRO-owned internal wrappers without hand-building every integration, while preserving the same license, safety, OLD-vs-NEW, rollback, evidence and zero-cost gates.
