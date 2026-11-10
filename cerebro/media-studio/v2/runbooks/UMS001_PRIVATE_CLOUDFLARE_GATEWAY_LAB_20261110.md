# UMS-001 · Private Gateway LAB

- **Scope:** `fenix` / `UMS-001` / `LAB`. A single producer identity is assigned within the internal service binding; arbitrary user-supplied actor identity is not trusted.
- **Access:** RPC only. Worker default `fetch()` returns 404, workers.dev and preview URLs off. No DNS, App, CRM, Supabase or existing Gateway modifications.
- **Provider:** private `MEDIA` Service Binding to Poly Haven candidate worker `MediaDemandLab` named RPC entrypoint.
- **Commands:** `search(task)` metadata only; `acquire(task)` explicitly selected resource; `read(task)` verifies SHA-256 after retrieving private bytes.
- **Audit:** one-time scheduled LAB acceptance stores the result in existing private KV at `meta/ums001-producer-binding-acceptance-2026-11-10`; cron must be removed after test. On-demand operations require a separate trusted CEREBRO Gateway Service Binding to this Worker; no ordinary public route exists.
- **Security:** `PRIVATE_MEDIA_TOKEN` secret set via Cloudflare, never in GitHub. `GATEWAY_ENABLED=false` until certified. CEREBRO UMS-001 actual runtime client activation is separate gate.
- **Cost:** Cloudflare Free, no new paid APIs or permanent cron. No publication permission.
- **Rollback:** disable Gateway, set crons `[]`, restore or delete this isolated Worker only after snapshot and confirmation; underlying media files unchanged.
