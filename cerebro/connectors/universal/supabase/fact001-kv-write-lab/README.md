# FACT-001 · CEREBRO isolated Cloudflare KV WRITE/READ/ROLLBACK LAB

**Status:** CANDIDATE · NOT PROD. 4D contract: fenix-capital / FACT-001 / LAB / 1.0.0.

Only new Cloudflare EU Workers KV namespace `cerebro-fact001-write-e2e-eu-lab-20261109` ID `fbeb7be5bb81494a8316d8c4221d6a8e`. Created independently through authenticated Cloudflare tool after verifying absence; jurisdiction `eu`, on Free plan. Sidecar `cerebro-fact001-cloudflare-kv-write-lab` is new and independent of existing Supabase CEREBRO Console v33 and read-only sidecar v1.

Authenticates only exact GitHub OIDC signed RS256 issuer, audience, branch, repository and exact workflow path. Requires a fixed 8-field request contract and operation `cloudflare.kv.lab.write_read_rollback`; callers cannot supply paths or values. A single temporary test key `fact001/cerebro-kv-write/<request_id>` gets PUT (TTL 600s), GET value verification, DELETE rollback. Cleanup retry in finally; Cloudflare API endpoints are fixed in source. Unauthorized users get HTTP 401.

Uses existing LAB encrypted Supabase Vault record, without sending Cloudflare token from GitHub workflow; this record currently contains a broad token so all writes remain restricted by source to one isolated LAB namespace. Separate least-privilege credential is mandatory before autonomous PROD write access. Cloudflare Free KV published limits apply; no subscription or credit purchase.

**Tests:** unit suite inherited from FACT-001 read sidecar plus 9 additional KV/tenant/jurisdiction negative tests; GitHub Actions exact workflow signed OIDC, anonymous/fake denial, authenticated PUT/GET/DELETE with 0 changes to preexisting resources. No PROD promotion until physical E2E and security review. Source and precise rollback instructions remain in this PR DRAFT.
