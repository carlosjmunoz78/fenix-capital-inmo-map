# FACT-001 · Automatic Engine Factory V0

Date: 2026-10-08

## Objective

Move FACT-001 from manual structural generation to a hostless, event-driven scaffold service while preserving all existing App/CRM/Supabase/WordPress/SEO/Training/Trading boundaries.

Rule applied: **CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**.

## Status

### HECHO · `AUTOMATIC_SCAFFOLD_VERIFIED`

- Existing canonical factory remains the only scaffold-generation authority.
- `fact001-request-runner.mjs` validates a bounded request and invokes the existing factory; it does not reimplement or replace FACT-001.
- Request contract lives under `cerebro/factory/requests/`.
- Hostless GitHub Actions control path supports `push`, `workflow_dispatch` and `repository_dispatch` ingress.
- Exactly one requested canonical engine scaffold is extracted from the deterministic 177-engine generation.
- Exactly 18 mandatory scaffold files are structurally checked.
- Deterministic request idempotency key, registry checksum and bundle checksum are emitted.
- Run evidence is archived as a GitHub Actions artifact.
- Repository permission is read-only; no new credential, paid provider, Supabase write, PROD write or Trading path is introduced.
- Automatic post-merge `main` run `37830400943` attempt 1 completed SUCCESS from push without manual launch.
- Same immutable run rerun as attempt 2 completed SUCCESS with the same request idempotency key, bundle checksum and registry checksum.
- Acceptance evidence is recorded in `FACT001_AUTOMATIC_FACTORY_ACCEPTANCE_2026-10-08.md` and the autonomy registry overlay.

### PARCIAL

- The generated target engine itself remains only `SCAFFOLD`; this workflow does not claim target-engine behavioral evaluation, tribunal or PREPROD readiness.
- CEREBRO Gateway dispatch wiring is supported by contract (`repository_dispatch`) but is not claimed live until ACTGW-001 sends and verifies a real request.

### POR AUDITAR

- Live ACTGW-001 → `repository_dispatch` request proof.
- Future high-volume request queue behavior beyond the V0 bound of 50 request files per run.

## Request contract

Required context: `company_id`, `engine_id`, `environment`, `version`.

V0 accepts only:

- canonical `engine_id` already present in `engine-registry.seed.json`;
- `environment = SCAFFOLD`;
- intent `CREATE_SCAFFOLD`, `REBUILD_SCAFFOLD` or `VERIFY_SCAFFOLD`;
- `additional_cost_eur = 0`;
- no PROD authority, PROD writes, Trading or external code execution.

Fail-closed routing:

- unknown/noncanonical identity or contract drift → `POLICY_CONFLICT`;
- authority expansion/non-SCAFFOLD request → `HIGH_RISK`;
- any incremental spend → `MONEY_LIMIT`.

These are canonical HUMAN_REQUIRED reasons. No ad-hoc human reason is introduced.

## Execution model

`structured request → validate canonical registry → run existing FACT-001 → extract target scaffold → verify 18 files → structural evidence → artifact`

The workflow runs entirely on GitHub-hosted Actions and therefore does not depend on the Windows PC or Browser Bridge. The runtime uses deterministic Node/JSON logic; paid AI is not required.

## Live acceptance identity

- source SHA: `a20b98ac9ff006ebbbd9a6fbd51f16d8cdf8cee4`
- run: `37830400943`
- accepted attempts: `1` and `2`
- request: `fact001-selfcheck-v0`
- idempotency key: `fact001:9d7a6ad8651866e85f7199b3cfdf38928a09a302fa29cf2e6a962853dfac6427`
- bundle SHA-256: `e55c45943dba3cf084c0f657cc1cb529a3a23e5b293e2549b2b51ffb36675b74`
- registry SHA-256: `92717b6109caade90e9c3c89940536122d8583cd8fe8695a4118119febe2caf8`
- generated scaffold files: `18`
- regression suite in accepted live run: `634 passed / 0 failed`
- HUMAN_REQUIRED: none
- additional cost: `0 EUR`
- PROD/Trading: false

## Evaluation boundary

The AutoFactory evaluates **factory structural correctness**, not the business behavior of the generated engine. The generated target keeps its native scaffold fields such as `evaluation.status = NOT_EVALUATED` and `tribunal.status = NOT_RUN` until an implementation exists and the normal promotion chain is executed.

A green AutoFactory run therefore means:

`FACT-001 produced a reproducible, policy-safe structural scaffold`

It does **not** mean:

`target engine is autonomous PREPROD/PROD`.

## Backup

- Source code, request contract and seed requests are preserved by Git history.
- Generated scaffold artifacts are rebuildable output and are not the source of truth.
- Workflow artifacts provide immutable run evidence for 30 days in V0.
- No existing application or business data is modified; therefore no App/CRM/Supabase data backup is required for this additive change.

## Rollback

Rollback is a narrow Git revert of:

- `.github/workflows/cerebro-fact001-autofactory-v0.yml`
- `cerebro/runtime/fact001-request-runner.mjs`
- request-contract/test/documentation additions.

Because the workflow has `contents: read` and only writes temporary runner files plus Actions artifacts, disabling/reverting it requires no production data rollback.

## Rebuild

Factory authority remains reproducible from the existing repository:

```bash
cd cerebro
npm run validate
npm test
npm run generate -- --out /tmp/cerebro-generated
```

One bounded request is rebuilt with:

```bash
node cerebro/runtime/fact001-request-runner.mjs \
  --request cerebro/factory/requests/fact001-selfcheck.v0.json \
  --out /tmp/fact001-scaffold
```

Expected: `FACTORY_SCAFFOLD_GREEN`, 18 generated files, deterministic hashes, cost 0, PROD/Trading false.

## Downstream promotion rule for generated engines

FACT-001 automation being verified does not bypass the promotion contract of any generated target. Each target still requires its own implementation, contracts, permissions, tests, evaluation, tribunal, observability, rollback, backup, rebuild, measured cost, policy and PREPROD evidence before any higher autonomy state.

PROD authority is explicitly outside FACT-001 AutoFactory V0.
