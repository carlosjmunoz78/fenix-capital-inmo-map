# FACT-001 · Notion 25→50 encrypted batch planner LAB (parallel candidate)

**Scope**: `company_id=fenix-capital`, `engine_id=FACT-001`, `environment=LAB`, `version=1.0.0`.

This service is an isolated, no-write planner for a **single** next batch of 25 Notion search-index objects. It does **not** export any page content and does not move the physical D1 CAS checkpoint.

- Input is the already encrypted 6632-object Notion search index (GitHub Action artifact `13808862248`). The runner pins ZIP and JSON SHA-256 and verifies Git checkpoint documenting the prior 25 page contents copied to private Google Drive, readback verified.
- The service permits only the immutable `offset=25, max_items=25`, GitHub OIDC from the exact one-shot workflow, correct owner, branch, audience, environment and source index SHA.
- Service reads only a pre-existing AES key from Supabase Vault. It produces an authenticated encrypted plan with object counts, type counts and deterministic batch reference. The plaintext identifiers stay inside the LAB service. No notion-token access is needed for planning.
- Input size and shape are strictly bounded. Anonymous and forged requests return HTTP401; cross-environment orders return HTTP403. No bearer, IDs, decrypted contents, Vault values or source ZIP URLs are logged.
- The remote GitHub Action is activated only by one new request file with exact owner and commit marker. No cron, queue or automatic re-run. Artifacts contain only cipher JSON and non-sensitive proof.

**Current scope**: CANDIDATE before remote integration. PR #44 stays DRAFT. The original `cerebro-fact001-headless-provider-lab` v33 and `cerebro-fact001-notion-content-export-lab` v1 remain unchanged.

**Next gates**: perform CI tests, deploy as a distinct isolated LAB Edge Function, test signed negative gates, inspect page/data-source counts before choosing a content exporter, verify encrypted plan in GitHub/Drive with SHA-256 readback. D1 checkpoint CAS and Notion physical restore remain unverified.

**Rollback**: no existing service replaced; disable/remove the new isolated Edge Function and revert only these additive files. Source backups preserved.