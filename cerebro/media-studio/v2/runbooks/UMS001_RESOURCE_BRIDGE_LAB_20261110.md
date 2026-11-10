# UMS-001 · Private CEREBRO resource bridge · LAB 2026-11-10

## Existing dependencies conserved

- Original Poly Haven private Worker and its one daily cron `23 6 * * *` UTC.
- `cerebro-ums001-producer-private-gateway-lab-eu` named RPC class `ProducerLibraryLab`.
- `cerebro-ums001-multisource-scout-lab-eu` named RPC class `MediaSourceScoutLab`.
- Private Service Binding `SOURCE_SCOUT`, source RPC secret, existing LAB KV namespace `99c74b3059ec46baa1441bd0d170bf3f`.
- Original `meta/state-v0` and all Poly Haven `media/` records are NOT to be modified by selected-Met code.

## New exact contract

The **Node runtime orchestration seam** `ums001-producer-orchestrator-bridge-lab.mjs` accepts a previously authenticated LAB CEREBRO identity and a private `producerService` Service Binding. It supports `SEARCH`/`SELECT`/`READ`; never publishes or approves resources.

No general CEREBRO Supervisor binding is claimed until a real caller Service Binding and its authentication is installed and exercised. Do not connect this seam to production App or the CEREBRO PROD gateway.

The **selected Met image path** only accepts `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `provider=met`, `kind=images`, `selected_asset_id=met:436524`, explicit selection and a finite production/request ID. All calls require existing private Service Binding and secret token verification. Only `isPublicDomain=true` from the official Met object API, official HTTPS JPEG preview, MIME `image/jpeg`, valid magic bytes and max 600,000 bytes pass. The Worker rechecks SHA-256 on read, stores one asset under a new isolated KV prefix, and marks QA/rights review `PENDING`, never `production_approved`.

## Run and acceptance gates

1. Preflight worker versions/flags, source/Gateway bindings, privacy and KV original state.
2. Run Node 22 targeted unit suite (`19/19 PASS` on 10 Nov), run isolated one-shot Cloudflare LAB proof, and require receipt containing matching SHA-256 for stored/read bytes.
3. Remove one-shot test cron and temporary `scheduled` handler immediately after receipt.
4. Check all original assets still have the same registry entries and the same total bytes; no new permanent cron, zero direct URLs.
5. If provider API/mime/source fails, classify as BLOCKED and leave selective fetch OFF; do not relax host, size or rights policies to force success.
6. Only after physical acceptance, record source/Gateway deployment IDs, receipt, costs, changed keys, rollback and whether external CEREBRO orchestration is wired. Do not claim the general CEREBRO Gateway is connected without evidence.

## Rollback

- Immediately set `MET_SELECT_ENABLED=false` in Producer Gateway and `SCOUT_ACQUIRE_ENABLED=false` in Source Scout; do not touch the `MET_ENABLED` metadata-search flag.
- Restore previously recorded accepted clean versions **only if necessary** for a failure, with unchanged existing Service Bindings and secrets.
- Preserve the selected test blob/receipt for audit unless a separate authorized cleanup requires deleting those exact new keys. Never delete or alter the pre-existing Poly Haven state/objects.
- Validate Cloudflare privacy, current crons and prior asset count after rollback.

## Cost, autonomous scope and promotions

No paid API, subscriptions, new Worker, permanent Cron or new KV namespace introduced. Cloudflare Free quotas still apply; this is one bounded test and not an unconstrained download agent. All activity is LAB. Publication / download of additional provider resources is not authorized without a new per-provider rights/size/storage gate, tests, PREPROD-equivalent and tribunal acceptance.