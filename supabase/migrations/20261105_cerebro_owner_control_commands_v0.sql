-- CEREBRO OS · ChatGPT-first owner command bus V0 · 2026-11-05
-- Additive, PREPROD-only, private schema. No change to APP/CRM/PROD.
-- A trusted human interface (ChatGPT via installed Supabase connector) can
-- register an owner command; workers run independently and never self-approve.
CREATE SCHEMA IF NOT EXISTS cerebro_owner_control;
REVOKE ALL ON SCHEMA cerebro_owner_control FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA cerebro_owner_control TO service_role;

CREATE TABLE IF NOT EXISTS cerebro_owner_control.commands_v0 (
 command_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 idempotency_key text NOT NULL UNIQUE,
 company_id text NOT NULL CHECK (company_id='fenix'),
 engine_id text NOT NULL CHECK (engine_id IN ('FACT-001','SOC-001')),
 environment text NOT NULL DEFAULT 'PREPROD' CHECK (environment='PREPROD'),
 version text NOT NULL DEFAULT 'v0' CHECK (version='v0'),
 source_interface text NOT NULL DEFAULT 'CHATGPT_CONNECTED_OWNER' CHECK (source_interface='CHATGPT_CONNECTED_OWNER'),
 actor text NOT NULL CHECK (actor='CARLOS-ADMIN'),
 command_type text NOT NULL CHECK (command_type IN (
 'STATUS','REQUEST_IMAGE','REVIEW_IMAGE','REJECT_IMAGE','APPROVE_IMAGE',
 'REQUEST_IMPROVEMENT','PAUSE_ENGINE','RESUME_ENGINE','CANCEL_JOB','ROLLBACK')),
 command_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
 jsonb_typeof(command_payload)='object' AND pg_column_size(command_payload)<=12000),
 status text NOT NULL DEFAULT 'HOLD' CHECK (status IN (
 'REQUESTED','HOLD','LEASED','COMPLETED','FAILED','CANCELLED')),
 hold_reason text,
 linked_job_id uuid REFERENCES public.cerebro_creative_job_v1(job_id) ON DELETE RESTRICT,
 owner_input_digest text NOT NULL CHECK (owner_input_digest ~ '^[0-9a-f]{64}$'),
 publish_authorized boolean NOT NULL DEFAULT false CHECK (publish_authorized=false),
 high_risk boolean NOT NULL DEFAULT false,
 last_result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT owner_control_no_production_publish CHECK (environment<>'PROD')
);
ALTER TABLE cerebro_owner_control.commands_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cerebro_owner_control.commands_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON cerebro_owner_control.commands_v0 TO service_role;
CREATE INDEX IF NOT EXISTS owner_commands_v0_status_idx
 ON cerebro_owner_control.commands_v0(status,created_at DESC);

CREATE TABLE IF NOT EXISTS cerebro_owner_control.audit_v0 (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 command_id uuid NOT NULL REFERENCES cerebro_owner_control.commands_v0(command_id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK (event_type IN ('SUBMITTED','STATE_CHANGED')),
 status text NOT NULL,
 hold_reason text,
 actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cerebro_owner_control.audit_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cerebro_owner_control.audit_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON cerebro_owner_control.audit_v0 TO service_role;

CREATE OR REPLACE FUNCTION cerebro_owner_control.audit_commands_v0()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=pg_catalog,cerebro_owner_control
AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO cerebro_owner_control.audit_v0(command_id,event_type,status,hold_reason,actor)
      VALUES(NEW.command_id,'SUBMITTED',NEW.status,NEW.hold_reason,NEW.actor);
  ELSIF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.hold_reason IS DISTINCT FROM OLD.hold_reason THEN
    INSERT INTO cerebro_owner_control.audit_v0(command_id,event_type,status,hold_reason,actor)
      VALUES(NEW.command_id,'STATE_CHANGED',NEW.status,NEW.hold_reason,NEW.actor);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION cerebro_owner_control.audit_commands_v0() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cerebro_owner_control.audit_commands_v0() TO service_role;

DROP TRIGGER IF EXISTS cerebro_owner_command_audit_v0 ON cerebro_owner_control.commands_v0;
CREATE TRIGGER cerebro_owner_command_audit_v0
 AFTER INSERT OR UPDATE OF status,hold_reason ON cerebro_owner_control.commands_v0
 FOR EACH ROW EXECUTE FUNCTION cerebro_owner_control.audit_commands_v0();

COMMENT ON TABLE cerebro_owner_control.commands_v0 IS
 'Owner control plane only. No autonomous worker execution certified here; no paid API call or social publishing authorized by a command row alone.';
COMMENT ON TABLE cerebro_owner_control.audit_v0 IS
 'Append-only command state audit, separate from existing creative job audit.';
