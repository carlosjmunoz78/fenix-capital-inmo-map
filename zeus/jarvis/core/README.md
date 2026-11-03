# SUPERAGENTE JARVIS · Universal Core V0 (BLOQUE 2)

**Status: LAB scaffold / NOT_OPERATIONAL.** This is a standalone ZEUS domain library, **not** the Jarvis user interface, and does not modify App, CRM, Supabase, Auth or other production services.

- Identity: one principal `OWNER_ROOT`, verified by an injected server-side identity provider. A device/channel does not mint privileges.
- Mission envelope: `coreId`, `ownerId`, `companyId`, `projectId`, `intent`, `idempotencyKey`, `channel`, `events`, `status`.
- Continuity: adapter interface for persistent event store. Bundled `MemoryEventStore` is **only in-process for unit testing**; it does not survive restart or provide cross-device persistence in production.
- Security: deny by default, tenant-scoped access, no handling of raw secrets, read-only deterministic capability registry, redacted responses, hard stop on mutations, no network or provider calls.
- No autonomous model or deepseek API in V0. DeepSeek, memory source-of-truth, durable idempotency, concurrency control, and policy-based authorization are follow-on B2/B3/B4 work.
- To run tests: `node --test core/jarvis-universal-core.test.mjs` (Node >= 22).

## Before production activation
Implement an encrypted server-side durable store with atomic unique `(ownerId, companyId, idempotencyKey)` constraints and CAS / leases; integrate authenticated session provider and permissions from ZEUS; map deterministic read-only capabilities to audited CEREBRO gateway; execute real cross-device and restart tests; add evidence and rollback; require security review. **Do not deploy/enable from this scaffold.**