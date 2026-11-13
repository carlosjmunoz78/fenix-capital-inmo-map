# Universal Gateway LAB V0.1 · Auth + JOB-001 + Loopback

Existing PROD Fenix GET session/context is reused as an optional **read-only** identity source, with a server-injected publishable key and user Bearer token. The adapter maps only the server-verified CARLOS-ADMIN principal to Fenix; never issues grants to AION/CAPTACASA, and never uses service_role.

The actual upstream is **not authenticated in CI**. A fixed-endpoint mock verifies the request and denial behavior without handling a real owner JWT. Nothing has been deployed to a public address.

JOB-001's existing durable runtime V1 is PREPROD-only. To prevent mixing with LAB, this adapter only reads **ephemeral fixture journals in os.tmpdir** matching the strict folder prefix, with source_environment PREPROD and projection LAB explicitly included. It does not read real PREPROD/PROD jobs. Job payload and result are redacted.

The physical Node 24 E2E binds a temporary HTTP listener to **127.0.0.1** only, and exercises both JARVIS and Operativa SDK consumers against the same Gateway, plus a real DurableJobRuntimeV1 fixture. It does not connect the currently deployed React interfaces.

LAB evidence is hash-chained JSONL (allowlisted request ID, action, outcome, company); rejects tampering on reopening. Rollback rehearsal closes the loopback listener and confirms it no longer accepts requests.

**No deployment, no DNS, no main, no Supabase/CRM/App/WordPress/Trading mutation.** All actual service bindings and physical owner authentication remain pending. No new jobs, workers or crons; cost target 0 EUR. GitHub CI minutes are not independently billed/reconciled.
