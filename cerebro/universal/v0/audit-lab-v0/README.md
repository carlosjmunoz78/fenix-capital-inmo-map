# CEREBRO Operativa LAB · durable FACT dry-run audit v0

No new scheduler or queue. Isolated PREPROD Supabase project only, no App/CRM/PROD changes. Postgres table `cerebro_operativa_lab_audit_v0` allows only fixed company Fénix, environment LAB, owner code CARLOS-ADMIN, capability FACT registry summary, decision DRY_RUN_VALIDATED, executed false, prod disabled, additional cost 0 and a unique lab idempotency key. No JWT/secret/customer payload stored.

Edge `cerebro-operativa-lab-audit-v0` only accepts POST with the exact dry-run contract, re-verifies owner via existing GET and uses PREPROD service_role strictly server-side. Duplicate idempotency requests return the existing persisted audit record. No workflow invocation, marketing publication, cron, DNS or company writes.

Rollback: PR #66 source snapshot, inspect consumer dependencies first, stop using new Preview and Edge; only then drop isolated table and function after backup. No existing DB tables altered. No general execution rights are granted.

Never mark orders as executed or assume that JOB-001 Hostinger master works. This is a durable audit for LAB policy simulation only.
