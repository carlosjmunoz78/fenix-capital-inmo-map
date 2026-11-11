-- Additive Pages LAB tables ONLY, not applied until CF_PAGES_TOKEN independently provisioned.
CREATE TABLE IF NOT EXISTS fact001_cf_pages_jobs_v1(
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 operation TEXT NOT NULL CHECK(operation IN ('pages.project.create_empty','pages.project.update_branch','pages.project.rollback_branch','pages.project.delete_empty')),
 resource_name TEXT NOT NULL CHECK(resource_name GLOB 'cerebro-fact001-managed-pages-lab-*'),
 request_id TEXT NOT NULL UNIQUE,
 idempotency_key TEXT NOT NULL UNIQUE,
 max_cost_eur INTEGER NOT NULL CHECK(max_cost_eur=0),
 submitted_by TEXT NOT NULL CHECK(submitted_by IN ('CHATGPT_OPERATOR','CEREBRO_SIGNED_OIDC')),
 state TEXT NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE')),
 phase TEXT NOT NULL DEFAULT 'PENDING',
 error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts IN (0,1)),
 created_at_ms INTEGER NOT NULL,
 updated_at_ms INTEGER
);
CREATE TABLE IF NOT EXISTS fact001_cf_pages_owned_v1(
 name TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 engine_id TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('V1','V2','ROLLED_BACK','DELETED')),
 original_branch TEXT NOT NULL,
 current_branch TEXT NOT NULL,
 created_by_request TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,
 updated_at_ms INTEGER NOT NULL
);
