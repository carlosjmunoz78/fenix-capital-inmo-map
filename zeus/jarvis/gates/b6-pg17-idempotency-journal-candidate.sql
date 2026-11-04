-- ZEUS/JARVIS B6 CUT01: isolated PostgreSQL 17 execution journal laboratory.
-- Only synthetic LAB rows. NOT a Supabase PROD migration or exposed REST API.
CREATE SCHEMA zeus_jarvis_b6_lab;
REVOKE ALL ON SCHEMA zeus_jarvis_b6_lab FROM PUBLIC;
CREATE TABLE zeus_jarvis_b6_lab.execution_claim (
 owner_id text NOT NULL,
 company_id text NOT NULL,
 environment text NOT NULL CHECK (environment='LAB'),
 mission_id text NOT NULL,
 capability text NOT NULL,
 connector_id text NOT NULL,
 idempotency_key text NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 state text NOT NULL DEFAULT 'CLAIMED' CHECK(state IN ('CLAIMED','COMPLETED','FAILED')),
 evidence_hash text NULL CHECK(evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$'),
 error_code text NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz NULL,
 PRIMARY KEY (owner_id,company_id,environment,mission_id,capability,connector_id,idempotency_key),
 CHECK(
 (state='CLAIMED' AND evidence_hash IS NULL AND error_code IS NULL AND completed_at IS NULL) OR
 (state='COMPLETED' AND evidence_hash IS NOT NULL AND error_code IS NULL AND completed_at IS NOT NULL) OR
 (state='FAILED' AND evidence_hash IS NULL AND error_code IS NOT NULL AND completed_at IS NOT NULL)
 )
);
REVOKE ALL ON ALL TABLES IN SCHEMA zeus_jarvis_b6_lab FROM PUBLIC;
CREATE FUNCTION zeus_jarvis_b6_lab.claim_read(
 p_owner text,p_company text,p_environment text,p_mission text,p_capability text,
 p_connector text,p_key text,p_fingerprint text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
 rec zeus_jarvis_b6_lab.execution_claim%ROWTYPE;
 inserted boolean;
BEGIN
 IF p_owner IS NULL OR p_owner !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$' OR
    p_company IS NULL OR p_company !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$' OR
    p_environment IS DISTINCT FROM 'LAB' OR
    p_mission IS NULL OR p_mission !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$' OR
    p_capability IS NULL OR p_capability !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$' OR
    p_connector IS NULL OR p_connector !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$' OR
    p_key IS NULL OR p_key !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$' OR
    p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$'
 THEN RETURN 'DENY_INVALID_REQUEST'; END IF;

 INSERT INTO zeus_jarvis_b6_lab.execution_claim(
  owner_id,company_id,environment,mission_id,capability,connector_id,idempotency_key,fingerprint
 ) VALUES(p_owner,p_company,p_environment,p_mission,p_capability,p_connector,p_key,p_fingerprint)
 ON CONFLICT DO NOTHING
 RETURNING true INTO inserted;
 IF inserted THEN RETURN 'CLAIMED'; END IF;

 SELECT * INTO rec FROM zeus_jarvis_b6_lab.execution_claim
 WHERE owner_id=p_owner AND company_id=p_company AND environment=p_environment
 AND mission_id=p_mission AND capability=p_capability AND connector_id=p_connector
 AND idempotency_key=p_key;
 IF NOT FOUND THEN RETURN 'DENY_JOURNAL_RACE'; END IF;
 IF rec.fingerprint<>p_fingerprint THEN RETURN 'CONFLICT'; END IF;
 IF rec.state='COMPLETED' THEN RETURN 'ALREADY_COMPLETED'; END IF;
 IF rec.state='FAILED' THEN RETURN 'PREVIOUS_FAILED_NO_AUTORETRY'; END IF;
 RETURN 'IN_PROGRESS';
END;
$$;
CREATE FUNCTION zeus_jarvis_b6_lab.complete_read(
 p_owner text,p_company text,p_environment text,p_mission text,p_capability text,
 p_connector text,p_key text,p_fingerprint text,p_evidence_hash text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE affected integer;
BEGIN
 IF p_environment IS DISTINCT FROM 'LAB' OR
   p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' OR
   p_evidence_hash IS NULL OR p_evidence_hash !~ '^[0-9a-f]{64}$'
 THEN RETURN 'DENY_INVALID_REQUEST'; END IF;
 UPDATE zeus_jarvis_b6_lab.execution_claim SET
 state='COMPLETED',evidence_hash=p_evidence_hash,completed_at=clock_timestamp()
 WHERE owner_id=p_owner AND company_id=p_company AND environment=p_environment
  AND mission_id=p_mission AND capability=p_capability AND connector_id=p_connector
  AND idempotency_key=p_key AND fingerprint=p_fingerprint AND state='CLAIMED';
 GET DIAGNOSTICS affected = ROW_COUNT;
 RETURN CASE WHEN affected=1 THEN 'COMPLETED' ELSE 'DENY_NOT_CLAIMED' END;
END;
$$;
CREATE FUNCTION zeus_jarvis_b6_lab.fail_read(
 p_owner text,p_company text,p_environment text,p_mission text,p_capability text,
 p_connector text,p_key text,p_fingerprint text,p_error_code text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE affected integer;
BEGIN
 IF p_environment IS DISTINCT FROM 'LAB' OR
   p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' OR
   p_error_code IS NULL OR p_error_code !~ '^[A-Z][A-Z0-9_]{0,79}$'
 THEN RETURN 'DENY_INVALID_REQUEST'; END IF;
 UPDATE zeus_jarvis_b6_lab.execution_claim SET
 state='FAILED',error_code=p_error_code,completed_at=clock_timestamp()
 WHERE owner_id=p_owner AND company_id=p_company AND environment=p_environment
  AND mission_id=p_mission AND capability=p_capability AND connector_id=p_connector
  AND idempotency_key=p_key AND fingerprint=p_fingerprint AND state='CLAIMED';
 GET DIAGNOSTICS affected = ROW_COUNT;
 RETURN CASE WHEN affected=1 THEN 'FAILED' ELSE 'DENY_NOT_CLAIMED' END;
END;
$$;
REVOKE ALL ON FUNCTION zeus_jarvis_b6_lab.claim_read(text,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION zeus_jarvis_b6_lab.complete_read(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION zeus_jarvis_b6_lab.fail_read(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
