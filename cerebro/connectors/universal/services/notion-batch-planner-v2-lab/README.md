# FACT-001 · Notion second 25 encrypted batch plan · v2 isolated LAB

Parallel alternative to batch-planner LAB v1, whose 2.14 MB signed HTTP payload failed without data leakage after two attempts (Github Actions 42923697168, 42924293695). This worker never accepts index bytes, IDs, arbitrary URLs or plaintext. It reads only the two pre-existing service credentials from Supabase Vault, refreshes the accessible Notion search index read-only (max 85 pages), compares exactly the old pinned ID SHA-256 for 6632 objects and 6446 pages/186 sources, then creates a 25→50 AES256-GCM sealed plan and verifies decrypt/rebuild internally.

- GitHub OIDC pinned to branch, owner, audience and one-shot workflow; no anonymous/forged caller.
- One-off order fixed to 25→50; no cron or queue, no remote D1 writes, no Notion mutation or content export. No additional subscription or secrets in artifacts.
- No original broker or former planner modifications. First 25 page archive already on private Drive and unchanged.
- If the live list differs or upstream rate-limits, return 503 fail-closed. No checkpoint advances.

State: **candidate** until CI, deployment, signed run and encrypted offsite readback. Later first legacy v1 planner can be retired only through an isolated reversible change after proof, not in this task.