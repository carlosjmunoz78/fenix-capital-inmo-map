# FACT-001 · Reusable Notion Batch Engine LAB V0

Two authenticated routes within a single isolated Supabase Edge Function:
- `/plan` reads and seals a fresh 6632-object search index and the next 25 objects, verifying the immutable index SHA-256.
- `/export` accepts only the sealed plan, validates AES-GCM inside the Vault-backed service, exports one page or data source (and bounded descendants), and returns only AES-256-GCM ciphertext.

This first proof is pinned to offset **75→100** and to the actual Git checkpoint+Cloudflare D1 CAS evidence at 75/v3. It uses pinned GitHub OIDC claims for the one-shot workflow, anonymous/forged/PROD deny-by-default, no cron, no queue, no Notion writes and no App/CRM changes. No credentials on the GitHub runner.

No new D1, no new subscription. The previous broker and first two exporter generations stay untouched. The new service is intended for future logical reuse: the code can be generalized to later batches by a safe versioned policy change after this first validation, without creating a new server per batch.

Physical completion requires 25/25 ciphertext objects in Github, private Drive readback SHA parity, and then CAS offset 75→100 on the isolated D1 with idempotent replay. NEVER advance the checkpoint before offsite readback.