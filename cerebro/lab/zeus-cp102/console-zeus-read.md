# Console → ZEUS · Live Read V0 · LAB
- Uses the **existing** Cloudflare D1, no new database and no new scheduler.
- Authenticated GET only, pinned GitHub OIDC identity, workflow SHA, repo IDs and branch.
- Exactly two allowed view scopes: `fenix/LRN-001/PREPROD` and `fenix-capital/FACT-001/LAB`; **do not equate company IDs**.
- No write endpoint, no customer data, no new secrets, no engine execution; permissions remain existing.
- Source of truth: `zeus_scoped_observations_v1` + canonical LRN daily cursor + separate CP106 publication counter. Data is real LAB data.
- This is a Console read adapter, **not a production console**, nor an authorization to promote Learning or FACT to PROD.
- Deployment: one isolated Cloudflare Worker `cerebro-console-zeus-live-lab-eu`, route enabled only for authenticated OIDC clients, no cron, and `ZEUS_DB` read path. Rollback: disable its workers.dev subdomain and delete this isolated Worker. Do not alter the existing `cerebro-console-nia-binding-lab-eu`.
- One GitHub Actions proof should reject anonymous and cross-tenant reads and read both scopes. No extra subscriptions.
