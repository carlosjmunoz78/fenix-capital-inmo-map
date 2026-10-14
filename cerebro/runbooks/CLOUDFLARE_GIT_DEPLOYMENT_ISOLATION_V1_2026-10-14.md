# CEREBRO OS · Cloudflare Git Deployment Isolation V1

Status: VERIFIED_READY_FOR_PR684_MERGE
Date: 2026-10-14
Repository: carlosjmunoz78/fenix-capital-inmo-map
Applies to: PR #684 and subsequent CEREBRO changes

## Objective

Prevent a normal merge/push to `main` from implicitly promoting production Cloudflare deployments. Preserve the existing Cloudflare integration, but move production promotion behind an explicit governed deployment branch/gate.

## Evidence observed before isolation

The previous `main` commit `8a66eda92078e2fe55ce0c545794f4e583df8ef8` triggered the external GitHub App `cloudflare-workers-and-pages` (app id 85455). That external integration produced production-side build activity for:

- Worker `fenix-capital-inmo-map` — successful Workers Build, build id `362111ed-bb4e-4407-88ba-512e0d95f3b2`, version id `a2574a2d-22ef-426f-b171-b1dc036774ee`.
- Worker `fenix-capital-inmo-maps` — successful Workers Build, build id `32c0ce5a-efea-4d2f-b472-e8c0ede69188`, version id `38343b70-25f2-4476-996b-df62a4569ce8`.
- Cloudflare Pages project `fenix-capital-inmo-map` — build was also triggered and failed.

The trigger was external to repository-local workflows.

## Physical inventory before change

Authenticated Cloudflare dashboard inspection established:

### Worker `fenix-capital-inmo-map`

- Git repository: `carlosjmunoz78/fenix-capital-inmo-map`.
- Production branch before: `main`.
- Automatic builds: enabled.
- Deploy command: `npx wrangler deploy`.
- Custom domains: none.
- Custom routes: none.

### Worker `fenix-capital-inmo-maps`

- Git repository: `carlosjmunoz78/fenix-capital-inmo-map`.
- Production branch before: `main`.
- Automatic builds: enabled.
- Deploy command: `npx wrangler deploy`.
- Custom domains: none.
- Custom routes: none.

### Pages `fenix-capital-inmo-map`

- Git repository: `carlosjmunoz78/fenix-capital-inmo-map`.
- Production branch before: `main`.
- Automatic deployments: enabled.
- Build command: `npx @cloudflare/next-on-pages@latest`.
- Build output: `.vercel/output/static`.
- Build watch include paths: `*`.
- Custom domains: none.
- `pages.dev` project domain only.
- No successful production deployment existed.

The complete non-secret evidence is stored at `cerebro/evidence/CLOUDFLARE_GIT_DEPLOYMENT_INVENTORY_V1_2026-10-14.json`.

## Isolation applied

A dedicated production branch was created:

`deploy/cloudflare-prod`

Initial branch SHA:

`8a66eda92078e2fe55ce0c545794f4e583df8ef8`

The following three authenticated Cloudflare controls were changed and re-read successfully:

- Worker `fenix-capital-inmo-map`: `main` → `deploy/cloudflare-prod`.
- Worker `fenix-capital-inmo-maps`: `main` → `deploy/cloudflare-prod`.
- Pages `fenix-capital-inmo-map`: `main` → `deploy/cloudflare-prod`.

No build command, domain, route, secret, runtime variable, binding, storage resource, Git connection or application code was changed as part of the isolation.

## Physical verification

A harmless documentation-only `main` probe commit was created:

`24596e29186871ef593404481d07393422c64066`

Path:

`cerebro/evidence/CLOUDFLARE_MAIN_ISOLATION_PROBE_2026-10-14.md`

Observed result:

- GitHub live publish job: skipped.
- Worker `fenix-capital-inmo-map`: no new production version from the probe; previous production history remained unchanged.
- Worker `fenix-capital-inmo-maps`: no new production version from the probe; previous production history remained unchanged.
- Pages `fenix-capital-inmo-map`: probe appeared as `Preview`, with `No deployment available`; production continued to report no production deployment.
- No official Fénix custom domain or custom route is attached to either Worker or Pages project.

Result: `PASS`.

`main` is now an integration branch. Cloudflare production is gated by `deploy/cloudflare-prod`.

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

Pre-change branch-control snapshot:

- Worker `fenix-capital-inmo-map`: `main`.
- Worker `fenix-capital-inmo-maps`: `main`.
- Pages `fenix-capital-inmo-map`: `main`.

Rollback is limited to restoring those three production-branch values to `main`. No application-code rollback is required for this isolation setting.

## PR #684 gate

The external Cloudflare blocker that previously prohibited merge is resolved.

PR #684 may merge only after its current exact head passes its required GitHub/CEREBRO checks. Merging #684 into `main` must not itself authorize or trigger Cloudflare production; production remains governed through `deploy/cloudflare-prod`.

## Human exception

Resolved. The three exact authenticated branch-control edits were completed and physically verified. No current HUMAN_REQUIRED remains for this Cloudflare isolation step.
