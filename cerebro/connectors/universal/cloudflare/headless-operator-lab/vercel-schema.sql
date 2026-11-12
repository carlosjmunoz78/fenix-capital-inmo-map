-- FACT001 additive Vercel LAB jobs, never touches other CEREBRO tables.
CREATE TABLE IF NOT EXISTS fact001_vercel_jobs_v1(
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='0.1.0'),
 provider TEXT NOT NULL CHECK(provider='vercel'),
 team_id TEXT NOT NULL CHECK(team_id='team_qnh6u1Ofy2WPp0MGEKlyMA50'),
 project_id TEXT NOT NULL CHECK(project_id='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu'),
 project_name TEXT NOT NULL CHECK(project_name='cerebro-fact001-vercel-lab-20261111'),
 operation TEXT NOT NULL CHECK(operation IN ('vercel.project.read_lab','vercel.project.set_framework_vite_lab','vercel.project.rollback_framework_null_lab','vercel.deployment.list_lab')),
 max_cost_eur INTEGER NOT NULL CHECK(max_cost_eur=0),
 request_id TEXT NOT NULL UNIQUE,
 idempotency_key TEXT NOT NULL UNIQUE,
 submitted_by TEXT NOT NULL CHECK(submitted_by IN ('CHATGPT_OPERATOR','CEREBRO_SIGNED_OIDC')),
 state TEXT NOT NULL CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE')),
 phase TEXT NOT NULL DEFAULT 'PENDING',
 error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts IN (0,1)),
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER
);
CREATE TABLE IF NOT EXISTS fact001_vercel_events_v1(
 event_id INTEGER PRIMARY KEY AUTOINCREMENT,
 job_id TEXT NOT NULL,
 state TEXT NOT NULL,
 phase TEXT NOT NULL,
 error_code TEXT,
 recorded_at_ms INTEGER NOT NULL
);
