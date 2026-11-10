# FACT-001 -> UMS-001 · Private LAB Gateway binding · 2026-11-10
Scope: Fénix / FACT-001 LAB / UMS-001 LAB.
Baseline FACT gateway version: `7c6dc6f0-0584-4939-a8a1-e86ad320a8ef`, DEFAULT FETCH HTTP 403 disabled JSON.
Source: `cerebro/media-studio/v2/runtime/fact001-media-gateway-lab.mjs`, with existing bridge module `ums001-producer-orchestrator-bridge-lab.mjs`.
Service Binding `UMS_PRODUCER` to `cerebro-ums001-producer-private-gateway-lab-eu`, entrypoint `ProducerLibraryLab`.
RPC `CEREBROFactUMS001Lab.route()` requires secret `UMS001_CALLER_TOKEN`, short-scope `UMS001_PRIVATE_BINDING_ENABLED`.
Allowed `SEARCH` metadata and selected single CC0 image `met:436524` `SELECT`/`READ`, strict scope, zero paid cost, QA hold and no publication.
The original FACT flags `GATEWAY_ENABLED=false`, `CLOUDFLARE_API_ENABLED=false`, `ALLOW_MUTATIONS=false` remain unchanged.
The current App, CRM, Supabase PROD, DNS, main, WordPress, social, and Trading remain out of scope.
Physical E2E test will use private RPC inside FACT LAB and check stored `met:436524` SHA-256 without downloading again, with one-time temporary cron cleaned immediately.
No future global Supervisor/Console caller binding may be called operational until it is independently authenticated, connected and tested.
Rollback: `UMS001_PRIVATE_BINDING_ENABLED=false`, restore FACT prior Worker version `7c6dc6f0-0584-4939-a8a1-e86ad320a8ef` after reviewing dependencies. No asset deletion.
