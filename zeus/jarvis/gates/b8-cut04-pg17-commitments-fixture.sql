-- ZEUS JARVIS B8 CUT04 · disposable PostgreSQL 17 LAB commitment fixture.
-- No schema is applied to Supabase or PROD, no service shared with App/CRM.
CREATE SCHEMA zeus_jarvis_b8_lab;
REVOKE ALL ON SCHEMA zeus_jarvis_b8_lab FROM PUBLIC;
CREATE TABLE zeus_jarvis_b8_lab.internal_commitment(
 company_id text NOT NULL,
 owner_id text NOT NULL,
 environment text NOT NULL CHECK(environment='LAB'),
 commitment_id text NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 record jsonb NOT NULL CHECK(jsonb_typeof(record)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,owner_id,environment,commitment_id),
 CHECK(record->>'companyId'=company_id),
 CHECK(record->>'ownerId'=owner_id),
 CHECK(record->>'commitmentId'=commitment_id),
 CHECK(record->>'environment'='LAB'),
 CHECK(record->>'status'='INTERNAL_TRACKING'),
 CHECK(record->>'counterpartyAccepted'='false'),
 CHECK(record->>'externalAction'='false'),
 CHECK((record->>'economicCommitmentEuro')::numeric=0)
);
REVOKE ALL ON ALL TABLES IN SCHEMA zeus_jarvis_b8_lab FROM PUBLIC;
CREATE FUNCTION zeus_jarvis_b8_lab.put_internal_commitment(
 p_company text,p_owner text,p_environment text,p_id text,p_fingerprint text,p_record jsonb
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE inserted boolean; existing text;
BEGIN
 IF p_environment IS DISTINCT FROM 'LAB'
 OR p_company IS NULL OR p_company !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
 OR p_owner IS NULL OR p_owner !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
 OR p_id IS NULL OR p_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
 OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
 OR p_record IS NULL OR jsonb_typeof(p_record)<>'object'
 THEN RETURN 'DENY_INVALID';END IF;
 INSERT INTO zeus_jarvis_b8_lab.internal_commitment(
 company_id,owner_id,environment,commitment_id,fingerprint,record
 ) VALUES (p_company,p_owner,p_environment,p_id,p_fingerprint,p_record)
 ON CONFLICT DO NOTHING RETURNING true INTO inserted;
 IF inserted THEN RETURN 'CREATED';END IF;
 SELECT fingerprint INTO existing FROM zeus_jarvis_b8_lab.internal_commitment
 WHERE company_id=p_company AND owner_id=p_owner AND environment=p_environment AND commitment_id=p_id;
 IF NOT FOUND THEN RETURN 'DENY_RACE';END IF;
 IF existing<>p_fingerprint THEN RETURN 'CONFLICT';END IF;
 RETURN 'ALREADY_EXISTS';
END;$$;
REVOKE ALL ON FUNCTION zeus_jarvis_b8_lab.put_internal_commitment(text,text,text,text,text,jsonb) FROM PUBLIC;
