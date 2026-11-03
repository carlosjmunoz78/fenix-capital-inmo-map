-- B4 candidate only: NOT APPLIED. Run only after backup/schema-diff review and independent security gate.
-- No writes to fenix_prod / App / CRM. No grants to anon/authenticated/other app clients.
BEGIN;
CREATE TABLE IF NOT EXISTS zeus_jarvis.b4_memory_control (
 company_id text NOT NULL, environment text NOT NULL CHECK (environment IN ('LAB','PREPROD','PROD')),
 engine_id text NOT NULL DEFAULT 'JARVIS-CORE-001', version text NOT NULL DEFAULT 'B4-0.1.0',
 enabled boolean NOT NULL DEFAULT false, kill_switch boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,environment)
);
CREATE TABLE IF NOT EXISTS zeus_jarvis.b4_memory_event (
 seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id uuid NOT NULL UNIQUE,
 owner_id text NOT NULL, company_id text NOT NULL, environment text NOT NULL CHECK (environment IN ('LAB','PREPROD','PROD')),
 project_id text NOT NULL, idempotency_key text NOT NULL,
 fingerprint text NOT NULL CHECK (length(fingerprint)=64),
 event jsonb NOT NULL CHECK (jsonb_typeof(event)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT b4_memory_event_scope_check CHECK (
  event->>'ownerId'=owner_id AND event->>'companyId'=company_id AND
  event->>'environment'=environment AND event->>'projectId'=project_id AND
  event->>'idempotencyKey'=idempotency_key AND event->>'fingerprint'=fingerprint),
 CONSTRAINT b4_memory_event_dedupe UNIQUE(owner_id,company_id,environment,project_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS b4_memory_event_read_idx ON zeus_jarvis.b4_memory_event(owner_id,company_id,environment,project_id,seq);
ALTER TABLE zeus_jarvis.b4_memory_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeus_jarvis.b4_memory_control FORCE ROW LEVEL SECURITY;
ALTER TABLE zeus_jarvis.b4_memory_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeus_jarvis.b4_memory_event FORCE ROW LEVEL SECURITY;
REVOKE ALL ON zeus_jarvis.b4_memory_control FROM PUBLIC,anon,authenticated;
REVOKE ALL ON zeus_jarvis.b4_memory_event FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE zeus_jarvis.b4_memory_event_seq_seq FROM PUBLIC,anon,authenticated;
-- No service_role grants by design: use exclusively trusted backend connection subject to a live B2/B3 gate.
INSERT INTO zeus_jarvis.b4_memory_control(company_id,environment,enabled,kill_switch)
 VALUES ('fenix','PROD',false,true)
 ON CONFLICT(company_id,environment) DO NOTHING;
COMMIT;