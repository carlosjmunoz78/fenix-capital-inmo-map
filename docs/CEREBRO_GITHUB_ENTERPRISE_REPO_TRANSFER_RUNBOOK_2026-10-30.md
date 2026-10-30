# CEREBRO OS · GitHub Enterprise repo transfer runbook · 2026-10-30

## Scope

Transfer the canonical repository from:

- OLD: `carlosjmunoz78/fenix-capital-inmo-map`
- NEW: `fenix-cerebro/fenix-capital-inmo-map`
- Enterprise: `cerebro-os`
- Organization: `fenix-cerebro`

The transfer must preserve existing App/CRM/Supabase/Browser/SEO/automation behavior and must not expand Trading authority.

## Verified pre-transfer state

- Enterprise `cerebro-os`: EXISTENTE / trial active.
- Organization `fenix-cerebro`: EXISTENTE inside Enterprise.
- Canonical repository: still owned by personal user `carlosjmunoz78`.
- Enterprise 500-job standard-runner ceiling: platform capability only; repository entitlement remains gated until the canonical repo belongs to the Enterprise organization and physical Actions verification succeeds.
- JOB-001 finite burst remains governed by its own per-company/per-engine safety limits. A global 500-job ceiling does not imply 500 jobs must be spawned.

## OIDC dependency inventory

The following live Supabase Edge Functions validate GitHub OIDC repository identity and therefore must accept OLD + NEW before transfer:

1. `cerebro-browser-dispatch-v1`
2. `cerebro-browser-dispatch-v2`
3. `cerebro-browser-work-total-dispatch-v1-prod`
4. `cerebro-browser-work-total-v1-prod`

Not affected by repository owner identity:

- `cerebro-browser-gateway-v1`
- `cerebro-browser-physical-e2e-v1`

## Live rollback snapshot identifiers

Before compatibility deployment, live Supabase function state was observed as:

- `cerebro-browser-dispatch-v1` · version 1 · `verify_jwt=false`
- `cerebro-browser-dispatch-v2` · version 2 · `verify_jwt=false` · live bundle sha256 `2395c0b5657bf7350097e9701c169bc317d382b5bd0d3d8db439f1523a46f445`
- `cerebro-browser-work-total-dispatch-v1-prod` · version 1 · `verify_jwt=false` · live bundle sha256 `af892a79554be421ff885d056b2a7439dfa05fe2950aa93e4f6b18855cfd2125`
- `cerebro-browser-work-total-v1-prod` · version 3 · `verify_jwt=false` · live bundle sha256 `3118815d42803060837313f45b7d87c066cdd36aeb2f61db3fd7cf7e89c97761`

The deployed source was read before modification. `verify_jwt=false` is intentional because these functions authenticate GitHub Actions OIDC tokens themselves with `jose`.

## Compatibility contract

During migration, each affected validator must:

- accept OLD and NEW repository identities only;
- validate the GitHub OIDC issuer and audience exactly as before;
- build `workflow_ref` validation from the already-verified `payload.repository` value;
- preserve existing allowed workflow paths and branch refs;
- preserve PROD/PREPROD boundaries;
- preserve cost, Browser, credential and Trading policies;
- keep OLD valid until post-transfer physical verification completes.

## Promotion sequence

1. Branch + PR with OLD+NEW compatibility.
2. Static contract test GREEN.
3. Existing repository CI/regression GREEN.
4. Deploy the exact compatibility source to the four live Supabase functions.
5. Verify health and function versions.
6. Verify OLD GitHub Actions Browser/OIDC path remains GREEN.
7. Transfer repository to `fenix-cerebro` without renaming it.
8. Verify NEW repository exists and OLD URL redirects.
9. Verify NEW GitHub Actions Browser/OIDC path GREEN.
10. Verify Enterprise organization owns the canonical repository.
11. Set Enterprise entitlement gate true only after physical evidence.
12. Enable global adaptive scheduling up to the Enterprise ceiling while retaining engine/company limits and matrix <=256.
13. Keep OLD OIDC identity during rollback window; remove only in a later governed change.

## Rollback

Before transfer:
- restore previous Supabase Edge Function versions/source if compatibility behavior fails.

After transfer:
- do not remove OLD identity until NEW path is physically GREEN;
- GitHub transfer redirects preserve the old repository URL, but external trust policies must be treated as independent dependencies;
- if a critical external dependency fails, stop promotion and use the documented OLD+NEW compatibility window to repair it rather than deleting/rebuilding systems.

## Status

- Enterprise account: HECHO.
- Enterprise organization: HECHO.
- OIDC compatibility implementation: PARCIAL until CI + live deployment + physical OLD verification are GREEN.
- Repository transfer: PLANIFICADO, not executed.
- Enterprise 500-job entitlement for canonical repo: POR AUDITAR until post-transfer physical verification.
