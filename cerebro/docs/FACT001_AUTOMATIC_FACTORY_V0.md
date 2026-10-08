# FACT-001 · Automatic Engine Factory V0

Date: 2026-10-08

## Objective

Move FACT-001 from manual structural generation to a hostless, event-driven scaffold service while preserving all existing App/CRM/Supabase/WordPress/SEO/Training/Trading boundaries.

Rule applied: **CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**.

## Status

### HECHO · software on candidate branch

- Existing canonical factory remains the only scaffold-generation authority.
- New `fact001-request-runner.mjs` validates a bounded request and invokes the existing factory; it does not reimplement or replace FACT-001.
- New request contract under `cerebro/factory/requests/`.
- New hostless GitHub Actions control path with `push`, `workflow_dispatch` and `repository_dispatch` ingress.
- Exactly one requested canonical engine scaffold is extracted from the existing deterministic 177-engine generation.
- Exactly 18 mandatory scaffold files are structurally checked.
- Deterministic request idempotency key, registry checksum and bundle checksum are emitted.
- Run evidence is archived as a GitHub Actions artifact.
- Repository permission is read-only; no new credential, paid provider, Supabase write, PROD write or Trading path is introduced.

### PARCIAL

- Live post-merge acceptance is still required before FACT-001 can be labeled `AUTOMATIC_SCAFFOLD_VERIFIED`.
- The target engine itself remains only `SCAFFOLD`; this workflow does not claim target-engine behavioral evaluation, tribunal or PREPROD readiness.
- CEREBRO Gateway dispatch wiring is supported by contract (`repository_dispatch`) but is not claimed live until ACTGW sends and verifies a real request.

### POR AUDITAR

- First real automatic `main` run from `fact001-selfcheck.v0.json`.
- Deterministic rerun/idempotency evidence on the same request.
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

Before merge: abandon/revert the candidate branch.

After merge, rollback is a narrow Git revert of:

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

## Promotion rule

FACT-001 itself may move to `AUTOMATIC_SCAFFOLD_VERIFIED` only after:

1. exact-head regression gates GREEN;
2. implementation merged additively to `main`;
3. automatic `main` workflow executes without manual launch;
4. real scaffold artifact is present and safe;
5. same request rerun reproduces the same idempotency/bundle identity or otherwise proves deterministic idempotency;
6. autonomy registry, dependency map, changelog and current state are updated from observed evidence.

PROD authority is explicitly outside V0.
