# FACT-001 · Automatic Engine Factory V0 · Live Acceptance

Date: 2026-10-08

## Status

**HECHO · `AUTOMATIC_SCAFFOLD_VERIFIED`** for the bounded FACT-001 structural scaffold service.

This acceptance applies only to automatic generation and verification of canonical engine **SCAFFOLD** structures. It does not promote the generated target engine to PREPROD or PROD.

## Evidence chain

### Implementation and exact-head gate

- Candidate PR: `#507 · CEREBRO FACT-001 · hostless automatic Engine Factory V0`.
- Candidate exact head: `89365b6c2bc2e8370517fad13f4ecc45da869721`.
- Exact-head promotion/readiness shadow run: `37830257821` = SUCCESS.
- PR merged additively to `main`.
- Merge/main source SHA accepted here: `a20b98ac9ff006ebbbd9a6fbd51f16d8cdf8cee4`.

### Automatic live run

Merge to `main` triggered `CEREBRO FACT-001 AutoFactory V0` automatically by `push`; no manual workflow launch was required.

- workflow run: `37830400943`
- attempt: `1`
- result: SUCCESS
- request: `fact001-selfcheck-v0`
- company: `fenix`
- engine: `FACT-001`
- environment: `SCAFFOLD`
- version: `0.1.0`
- result: `FACTORY_SCAFFOLD_GREEN`
- generated structural files: `18`
- idempotency key: `fact001:9d7a6ad8651866e85f7199b3cfdf38928a09a302fa29cf2e6a962853dfac6427`
- bundle SHA-256: `e55c45943dba3cf084c0f657cc1cb529a3a23e5b293e2549b2b51ffb36675b74`
- source registry SHA-256: `92717b6109caade90e9c3c89940536122d8583cd8fe8695a4118119febe2caf8`
- HUMAN_REQUIRED: none
- additional cost: `0 EUR`
- PROD authorization/write: false
- Trading access: false
- external code execution: false
- artifact: `fact001-autofactory-37830400943-1`, artifact id `11572234760`, archive digest `sha256:99490d813c487f816b8ad3ec8e3df3213dd783935925f286af0e5208250e9d01`.

The same live execution also ran the CEREBRO regression suite: **634 tests passed, 0 failed**.

### Deterministic idempotency rerun

The same workflow job was rerun against the same immutable source SHA and request.

- workflow run: `37830400943`
- attempt: `2`
- result: SUCCESS
- same source SHA: `a20b98ac9ff006ebbbd9a6fbd51f16d8cdf8cee4`
- same request id: `fact001-selfcheck-v0`
- same generated file count: `18`
- same idempotency key: `fact001:9d7a6ad8651866e85f7199b3cfdf38928a09a302fa29cf2e6a962853dfac6427`
- same bundle SHA-256: `e55c45943dba3cf084c0f657cc1cb529a3a23e5b293e2549b2b51ffb36675b74`
- same registry SHA-256: `92717b6109caade90e9c3c89940536122d8583cd8fe8695a4118119febe2caf8`
- HUMAN_REQUIRED: none
- additional cost: `0 EUR`
- PROD/Trading authority: false
- artifact: `fact001-autofactory-37830400943-2`, artifact id `11572673937`, archive digest `sha256:8fb2fe718f79fc529ac11cd064cb64a8ad238fd73068fd98b3d51d1d2c2035a1`.

The ZIP archive digest is not an idempotency identity because archive metadata may differ between attempts. The accepted deterministic identities are the request idempotency key, generated bundle checksum and registry checksum, which remained identical.

## Accepted capability

FACT-001 can now, for its connected request ingress:

`request → canonical registry validation → deterministic existing factory → one-engine scaffold extraction → 18-file structural verification → immutable CI evidence`

The service is hostless, GitHub-event-driven, repository read-only, deterministic and zero-additional-cost in this V0.

## Explicit boundary

The following are **not** established by this acceptance:

- creation of a new canonical engine ID outside GOV-001 policy;
- automatic implementation of business logic inside the generated scaffold;
- target-engine behavioral evaluation;
- target-engine independent tribunal;
- target-engine PREPROD or PROD promotion;
- autonomous PROD writes;
- Trading access;
- live CEREBRO Gateway `repository_dispatch` request proof.

`repository_dispatch` support exists in the workflow contract but remains `DEFINED_NOT_LIVE_VERIFIED` until ACTGW-001 emits and verifies a real request. Git-backed request-triggered automatic operation is the capability accepted here.

## HUMAN_REQUIRED boundary

Requests remain fail-closed:

- identity/schema conflict → `POLICY_CONFLICT`;
- authority/environment expansion → `HIGH_RISK`;
- additional spend → `MONEY_LIMIT`.

No new human-exception class was introduced.

## Backup / rollback / rebuild

### Backup

Git history remains the source of truth. Generated scaffolds are reproducible outputs; Actions artifacts are evidence, not the canonical source. Existing App/CRM/Supabase/WordPress/SEO/Training data was not modified by this acceptance.

### Rollback

Rollback is a narrow Git revert of the additive AutoFactory workflow/runner/request-contract changes. The workflow has repository `contents: read` and therefore does not require application/business-data rollback.

### Rebuild

```bash
cd cerebro
npm run validate
npm test
npm run generate -- --out /tmp/cerebro-generated
node runtime/fact001-request-runner.mjs \
  --request factory/requests/fact001-selfcheck.v0.json \
  --out /tmp/fact001-scaffold
```

Expected structural result remains `FACTORY_SCAFFOLD_GREEN`, exactly 18 scaffold files, the deterministic identities above, cost 0 and no PROD/Trading authority.

## Final V0 classification

- FACT-001 scaffold automation: **HECHO / AUTOMATIC_SCAFFOLD_VERIFIED**.
- FACT-001 Gateway dispatch binding: **DEFINED / POR AUDITAR LIVE**.
- Generated target engine: **SCAFFOLD only** until its own downstream gates pass.
- Autonomous PROD: **NO**.
- Trading: **NO ACCESS**.
- Additional cost: **0 EUR**.
