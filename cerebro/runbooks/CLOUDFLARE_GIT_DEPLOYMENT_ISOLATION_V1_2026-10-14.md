# CEREBRO OS · Cloudflare Git Deployment Isolation V1

Status: BLOCKING_MAIN_MERGE
Date: 2026-10-14
Repository: carlosjmunoz78/fenix-capital-inmo-map
Applies to: PR #684 and subsequent CEREBRO changes

## Objective

Prevent a normal merge/push to `main` from implicitly promoting production Cloudflare deployments. Preserve the existing Cloudflare integration, but move production promotion behind an explicit governed deployment branch/gate.

## Evidence already observed

The previous `main` commit `8a66eda92078e2fe55ce0c545794f4e583df8ef8` triggered the external GitHub App `cloudflare-workers-and-pages` (app id 85455). That external integration produced production-side build activity for at least:

- Worker `fenix-capital-inmo-map` — successful Workers Build, build id `362111ed-bb4e-4407-88ba-512e0d95f3b2`, version id `a2574a2d-22ef-426f-b171-b1dc036774ee`.
- Worker `fenix-capital-inmo-maps` — successful Workers Build, build id `32c0ce5a-efea-4d2f-b472-e8c0ede69188`, version id `38343b70-25f2-4476-996b-df62a4569ce8`.
- Cloudflare Pages project `fenix-capital-inmo-map` — build was also triggered and failed.

No repository-local Cloudflare configuration was found that can safely disable this behavior from this PR alone. The trigger is external to the repository.

## Required target state

`main` must become a code-integration branch, not an implicit production-deployment trigger.

Preferred preservation-first target:

1. Keep the existing Cloudflare Git integration.
2. Create/use a dedicated governed production branch, recommended `deploy/cloudflare-prod`.
3. Set the production branch of both Workers projects to `deploy/cloudflare-prod`.
4. For the Pages project, either set its production branch to `deploy/cloudflare-prod` with automatic production deployment governed there, or disable automatic production deployments if Pages is confirmed legacy/unneeded.
5. Disable non-production/preview builds where they could use production resources or create unnecessary side effects, unless explicitly required.
6. Do not delete Workers, Pages projects, domains, routes, variables, secrets, bindings, KV/D1/R2 resources, or Git integration as part of this isolation.

## Promotion contract after isolation

A production deployment may only be triggered by an explicit governed promotion to `deploy/cloudflare-prod` after:

- tests GREEN;
- PREPROD GREEN;
- OLD vs NEW PASS;
- tribunal PASS;
- rollback/rebuild evidence present;
- production impact understood;
- no HUMAN_REQUIRED blocker;
- explicit deployment gate records the source commit SHA.

## Rollback

Before changing Cloudflare branch control, record the current production branch and build/deploy settings for each linked project. If the change causes an unexpected behavior, restore those exact previous settings. Do not change application code as part of rollback of this integration setting.

## Current stop condition

PR #684 MUST NOT merge into `main` until Cloudflare branch control is physically changed and a verification proves that a harmless `main`-only test commit does not create an active production deployment/version.

## Human exception

If authenticated Cloudflare account access is not available to CEREBRO tooling, this is `HUMAN_REQUIRED: HIGH_RISK` only for the minimum authenticated dashboard action needed to change branch-control settings. All analysis, evidence collection, verification and subsequent merge/promotion remain automated.
