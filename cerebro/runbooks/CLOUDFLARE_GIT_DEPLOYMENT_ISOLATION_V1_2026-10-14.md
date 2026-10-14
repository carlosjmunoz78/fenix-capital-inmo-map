# CEREBRO OS · Cloudflare Git Deployment Isolation V1

Status: HUMAN_REQUIRED_MINIMUM_BRANCH_CONTROL_CHANGE
Date: 2026-10-14
Repository: carlosjmunoz78/fenix-capital-inmo-map
Applies to: PR #684 and subsequent CEREBRO changes

## Objective

Prevent a normal merge/push to `main` from implicitly promoting production Cloudflare deployments. Preserve the existing Cloudflare integration, but move production promotion behind an explicit governed deployment branch/gate.

## Evidence observed

The previous `main` commit `8a66eda92078e2fe55ce0c545794f4e583df8ef8` triggered the external GitHub App `cloudflare-workers-and-pages` (app id 85455). That external integration produced production-side build activity for:

- Worker `fenix-capital-inmo-map` — successful Workers Build, build id `362111ed-bb4e-4407-88ba-512e0d95f3b2`, version id `a2574a2d-22ef-426f-b171-b1dc036774ee`.
- Worker `fenix-capital-inmo-maps` — successful Workers Build, build id `32c0ce5a-efea-4d2f-b472-e8c0ede69188`, version id `38343b70-25f2-4476-996b-df62a4569ce8`.
- Cloudflare Pages project `fenix-capital-inmo-map` — build was also triggered and failed.

No repository-local Cloudflare configuration was found that can safely disable this behavior from this PR alone. The trigger is external to the repository.

## Physical dashboard inventory completed

The authenticated Cloudflare dashboard was inspected read-only before any mutation.

### Worker `fenix-capital-inmo-map`

- Git repository connected: `carlosjmunoz78/fenix-capital-inmo-map`.
- Production branch: `main`.
- Automatic builds: enabled.
- Build command: `npx wrangler deploy`.
- Production `workers.dev` URL: enabled.
- Preview `workers.dev` URLs: enabled.
- Custom domains: none.
- Custom routes: none.

### Worker `fenix-capital-inmo-maps`

- Git repository connected: `carlosjmunoz78/fenix-capital-inmo-map`.
- Production branch: `main`.
- Automatic builds: enabled.
- Build command: `npx wrangler deploy`.
- Production `workers.dev` URL: enabled.
- Preview `workers.dev` URLs: enabled.
- Custom domains: none.
- Custom routes: none.

### Pages `fenix-capital-inmo-map`

- Git repository connected: `carlosjmunoz78/fenix-capital-inmo-map`.
- Production branch: `main`.
- Automatic deployments: enabled.
- Build command: `npx @cloudflare/next-on-pages@latest`.
- Build output: `.vercel/output/static`.
- Build watch include paths: `*`.
- Custom domains: none.
- `pages.dev` project domain only.
- Dashboard currently reports no successful production deployment.

The complete non-secret inventory is stored at `cerebro/evidence/CLOUDFLARE_GIT_DEPLOYMENT_INVENTORY_V1_2026-10-14.json`.

## Safe parallel target already prepared

A dedicated production branch now exists:

`deploy/cloudflare-prod`

It was created from the current `main` SHA:

`8a66eda92078e2fe55ce0c545794f4e583df8ef8`

Therefore the initial branch-control switch has zero application-code delta versus the currently integrated `main` state. This is deliberate: isolation is separated from application change.

## Required target state

`main` becomes a code-integration branch, not an implicit production-deployment trigger.

Preservation-first target:

1. Keep the existing Cloudflare Git integration.
2. Use `deploy/cloudflare-prod` as the production branch.
3. Set the production branch of both Workers projects to `deploy/cloudflare-prod`.
4. Set the Pages production branch to `deploy/cloudflare-prod` while preserving its existing build configuration.
5. Do not change build commands, domains, routes, runtime variables, secrets, bindings, KV/D1/R2 resources, or application code during isolation.
6. Do not delete or disconnect any Cloudflare project.

## Exact minimum authenticated dashboard changes

Only these three values may change in this isolation step:

- Worker `fenix-capital-inmo-map` → Settings → Builds → Production branch: `main` → `deploy/cloudflare-prod`.
- Worker `fenix-capital-inmo-maps` → Settings → Builds → Production branch: `main` → `deploy/cloudflare-prod`.
- Pages `fenix-capital-inmo-map` → Settings → Branch control → Production branch: `main` → `deploy/cloudflare-prod`.

Everything else must remain unchanged.

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

Snapshot before change:

- Worker `fenix-capital-inmo-map`: production branch `main`.
- Worker `fenix-capital-inmo-maps`: production branch `main`.
- Pages `fenix-capital-inmo-map`: production branch `main`.

Rollback is limited to restoring those three production-branch values to `main`. No application-code rollback is needed for the branch-control isolation itself because `deploy/cloudflare-prod` starts at the same SHA as `main`.

## Verification required after physical change

Before PR #684 can merge:

1. Re-read all three Cloudflare branch-control settings and prove they now point to `deploy/cloudflare-prod`.
2. Prove `main` is no longer classified as the production branch by Cloudflare.
3. Run a harmless governed `main` verification change and confirm it does not create an active production deployment/version.
4. Confirm Workers and Pages continue to have no custom production domain/route attachment.
5. Preserve rollback evidence.

## Current stop condition

PR #684 MUST NOT merge into `main` until the three authenticated Cloudflare production-branch controls are physically changed and verified.

## Human exception

The current Opera Browser Connector can authenticate, inspect and navigate Cloudflare but does not expose a mutation/click/set-value action for dashboard controls. Therefore the only remaining manual step is `HUMAN_REQUIRED: HIGH_RISK` for the three exact branch-control edits above. All inventory, backup evidence, branch preparation, post-change verification and subsequent merge/promotion remain automated.
