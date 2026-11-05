# FACT-001 · PREPROD OpenAI provider probe, one-time authenticated invocation · 2026-11-05

## Verified implementation
- Existing project: `hnqlnvakzaywtafeiybt` ONLY. `cluhljgonannaafpmblx` App/CRM PROD untouched.
- Parallel Edge Function deployed: `cerebro-media-worker-preprod-v0` v1.
- Source: `supabase/functions/cerebro-media-worker-preprod-v0/index.ts`.
- Route is technically configured with `verify_jwt=false`, **but it performs its own one-time nonce authentication before any result** through `public.cerebro_media_claim_invocation_v0`, invoked with Supabase service role. Arbitrary public requests receive 403.
- The nonce is 24 random bytes, SHA-256 indexed in a private RLS table, single-use and expiring in five minutes. No standard browser JWT or public user can create nonce because the SQL RPC is not granted to anon/authenticated.
- The callable owner-side `cerebro_owner_control.probe_media_worker_v0(job_id)` creates and dispatches a nonce through `pg_net`, returns only a request identifier, never a token.
- **Physical request 198358** for job `998341cd-c52c-4b84-933e-d356e4fe1742` received **HTTP 200**. Body: `{ok:true,action:"probe",company_id:"fenix",engine_id:"FACT-001",provider:"OPENAI",model:"gpt-image-2.5-flare",openai_env_ready:false,service_storage_ready:true,api_called:false,cost_incurred:false,publish_authorized:false}`.
- Supabase storage buckets `fenix-preprod-images` and `cerebro-creative-assets` are private. No new images found.
- Tests for 10 existing social-to-FACT briefs and worker compatibility remain green.
- OpenAI API reference supports `gpt-image-2.5-flare`: https://developers.openai.com/api/reference/resources/images/methods/generate

## Single operational blocker
**OPENAI_API_KEY is not configured in the PREPROD Edge Function runtime.** The connected Supabase management tools in this ChatGPT session do not expose an authorized Edge Secrets set/update method. Sensitive Vault access requests are blocked by connector security controls and must **not be worked around**.

The owner has authorized paid images and declines credential rotation. This does NOT create a key in the runtime. Credential must be securely bound **through authorized admin UI (Supabase → Edge Functions → Secrets → `OPENAI_API_KEY`)** or another permitted connection. Do not paste credentials into chats, GitHub files, audit logs or SQL.

## After credential binding (not yet done)
1. Re-run authenticated worker probe: `openai_env_ready:true`. This is evidence of presence, not key validity.
2. Verify one-image budget and one-call idempotency. Keep publish disabled.
3. Deploy paid media execution path implementing CEREBRO source brief → OpenAI API → private PNG + SHA-256 → compositor with true official transparent Fénix logo → independent QA. Do not automatically publish raw images.
4. Present signed private preview to owner; Facebook post only through an authorized publisher and validate native ID/permalink.
5. Before any promotion: old-vs-new tests, PREPROD full run, audit, backup, rollback, no App/CRM changes.

## Rollback
The new worker is additive. Existing `fenix-openai-images-test`, `cerebro-creative-dispatch-v1` and publication Buffer system are unchanged. Disable/remove the newly deployed `cerebro-media-worker-preprod-v0` if its private auth fails; never remove original storage/jobs.
