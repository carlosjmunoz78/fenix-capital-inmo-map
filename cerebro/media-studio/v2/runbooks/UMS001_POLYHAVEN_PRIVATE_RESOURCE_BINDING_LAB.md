# UMS-001 · Poly Haven resource consumer · LAB (2026-11-10)

Purpose: connect the existing UMS-001 Media Studio asset registry to the independent, **private** Poly Haven LAB worker in `carlosjmunoz78/cerebro-assets-autonomous-lab`. No new studio, replacement provider, public URL, secrets in GitHub, or new cron.

Contract: `searchStudioResources({request,identity,mediaService})` obtains ranked **metadata only**. `acquireStudioResource(...)` requires an explicit asset choice and returns an existing Asset Registry candidate. The candidate remains `rights=UNKNOWN`, `qa=PENDING`, `production_ready=false` until the existing UMS-001 rights/quality tribunal validates it. `mediaService` is a private Cloudflare Worker Service Binding to `MediaDemandLab`, **not** a client-supplied HTTPS URL.

Security: only a Gateway-verified producer identity may supply `media.search`/`media.acquire` scopes and a server-side `DEMAND_TOKEN` secret. This contract does not itself create credentials or establish real identity. The consumer cannot grant its own permissions; enforce role/identity in the actual Gateway. No logging or returning secrets.

Current status: **CODE INTEGRATED IN LAB BRANCH ONLY / PHYSICAL CONNECTION NOT YET ENABLED**. The Poly Haven Worker deployed in Cloudflare still runs scheduled-only; its newer RPC entrypoint is in separate assets repo branch with `DEMAND_ENABLED=false`. No live Service Binding; do not claim full connection. This isolated adapter does not mutate main, App, CRM, Supabase or Social.

Release gates:
- establish trusted UMS-001 Gateway identity and Cloudflare service binding; fail closed without it;
- serialize downloads / enforce budget versus existing daily cron; KV is not transactional;
- verify real asset download plus checksum and license metadata from Poly Haven;
- check producer receives the reference, no new blob copy, no automatic publishing;
- execute end-to-end tests and rollback; only then promote this branch to existing UMS-001 runtime;
- maintain additional expense 0 EUR and the original single daily Cron.

Run: `node --test cerebro/media-studio/v2/tests/polyhaven-resource-provider-lab.test.mjs`.

Private raw media retrieval: `loadStudioResourceBytes({asset_record,identity,mediaService})` reads the previously stored KV blob using RPC `media.read`, cross-checks SHA256 in Node and returns bytes to UMS compositor with QA pending. Never expose a public media URL.
