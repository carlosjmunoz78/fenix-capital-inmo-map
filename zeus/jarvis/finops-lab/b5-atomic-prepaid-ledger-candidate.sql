-- ZEUS/JARVIS B5 CUT04 · PostgreSQL 17 synthetic FINOPS LAB candidate.
-- NOT A PROD MIGRATION. NO provider calls. NO secrets. NO grants to anonymous/authenticated.
-- Reserve/settle/release are transactional SERVER-only primitives, not spend authorization.
CREATE SCHEMA zeus_jarvis_b5_lab;
REVOKE ALL ON SCHEMA zeus_jarvis_b5_lab FROM PUBLIC;

CREATE TABLE zeus_jarvis_b5_lab.prepaid_account (
 company_id text NOT NULL,
 environment text NOT NULL CHECK(environment IN ('LAB','PREPROD')),
 provider text NOT NULL CHECK(provider='DEEPSEEK'),
 currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
 balance_verified boolean NOT NULL DEFAULT false,
 verified_at timestamptz,
 available_cents integer NOT NULL CHECK(available_cents BETWEEN 0 AND 5000),
 owner_limit_cents integer NOT NULL CHECK(owner_limit_cents BETWEEN 0 AND 5000),
 spent_cents integer NOT NULL DEFAULT 0 CHECK(spent_cents>=0),
 reserved_cents integer NOT NULL DEFAULT 0 CHECK(reserved_cents>=0),
 PRIMARY KEY(company_id,environment,provider),
 CHECK(spent_cents+reserved_cents<=LEAST(available_cents,owner_limit_cents))
);
CREATE TABLE zeus_jarvis_b5_lab.reservation (
 company_id text NOT NULL,
 environment text NOT NULL,
 provider text NOT NULL,
 request_key text NOT NULL,
 reserved_cents integer NOT NULL CHECK(reserved_cents>0 AND reserved_cents<=5000),
 actual_cents integer NOT NULL DEFAULT 0 CHECK(actual_cents>=0),
 status text NOT NULL DEFAULT 'RESERVED'
  CHECK(status IN ('RESERVED','SETTLED','RELEASED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(company_id,environment,provider,request_key),
 FOREIGN KEY(company_id,environment,provider)
  REFERENCES zeus_jarvis_b5_lab.prepaid_account(company_id,environment,provider),
 CHECK(actual_cents<=reserved_cents)
);
REVOKE ALL ON ALL TABLES IN SCHEMA zeus_jarvis_b5_lab FROM PUBLIC;

CREATE FUNCTION zeus_jarvis_b5_lab.reserve_prepaid(
 p_company text,p_environment text,p_request_key text,p_cents integer
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $fn$
DECLARE
 b zeus_jarvis_b5_lab.prepaid_account%ROWTYPE;
 previous zeus_jarvis_b5_lab.reservation%ROWTYPE;
BEGIN
 IF p_company IS NULL OR p_company !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
  OR p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
  OR p_environment NOT IN ('LAB','PREPROD')
  OR p_cents IS NULL OR p_cents<1 OR p_cents>5000
 THEN RETURN 'DENY_INVALID_REQUEST'; END IF;
 -- Account-level row lock makes concurrent reservations *serializable for this budget*.
 SELECT * INTO b FROM zeus_jarvis_b5_lab.prepaid_account
  WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK'
  FOR UPDATE;
 IF NOT FOUND THEN RETURN 'DENY_NO_BUDGET'; END IF;
 IF b.balance_verified IS DISTINCT FROM true OR b.verified_at IS NULL
  OR b.verified_at < clock_timestamp()-interval '15 minutes'
  OR b.verified_at > clock_timestamp()
 THEN RETURN 'DENY_BALANCE_UNVERIFIED'; END IF;
 SELECT * INTO previous FROM zeus_jarvis_b5_lab.reservation
  WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK'
   AND request_key=p_request_key;
 IF FOUND THEN
  IF previous.reserved_cents=p_cents AND previous.status='RESERVED'
   THEN RETURN 'ALREADY_RESERVED';
  END IF;
  RETURN 'DENY_IDEMPOTENCY_CONFLICT';
 END IF;
 IF b.spent_cents+b.reserved_cents+p_cents>LEAST(b.available_cents,b.owner_limit_cents)
 THEN RETURN 'DENY_BUDGET_LIMIT'; END IF;
 INSERT INTO zeus_jarvis_b5_lab.reservation
  (company_id,environment,provider,request_key,reserved_cents)
 VALUES(p_company,p_environment,'DEEPSEEK',p_request_key,p_cents);
 UPDATE zeus_jarvis_b5_lab.prepaid_account
 SET reserved_cents=reserved_cents+p_cents
 WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK';
 RETURN 'RESERVED';
END;
$fn$;

CREATE FUNCTION zeus_jarvis_b5_lab.finalize_prepaid(
 p_company text,p_environment text,p_request_key text,p_actual_cents integer,
 p_release boolean DEFAULT false
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $fn$
DECLARE
 b zeus_jarvis_b5_lab.prepaid_account%ROWTYPE;
 r zeus_jarvis_b5_lab.reservation%ROWTYPE;
BEGIN
 IF p_company IS NULL OR p_company !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
  OR p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$'
  OR p_environment NOT IN ('LAB','PREPROD') OR p_actual_cents IS NULL
  OR p_actual_cents<0 OR p_actual_cents>5000 OR p_release IS NULL
 THEN RETURN 'DENY_INVALID_REQUEST'; END IF;
 -- Lock budget first, then reservation, same order as reserve().
 SELECT * INTO b FROM zeus_jarvis_b5_lab.prepaid_account
  WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK'
  FOR UPDATE;
 IF NOT FOUND THEN RETURN 'DENY_NO_BUDGET'; END IF;
 SELECT * INTO r FROM zeus_jarvis_b5_lab.reservation
  WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK'
   AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND OR r.status!='RESERVED' THEN RETURN 'DENY_RESERVATION_INACTIVE'; END IF;
 IF p_actual_cents>r.reserved_cents THEN RETURN 'DENY_OVER_RESERVED_SPEND'; END IF;
 IF p_release AND p_actual_cents<>0 THEN RETURN 'DENY_RELEASE_MUST_BE_ZERO'; END IF;
 UPDATE zeus_jarvis_b5_lab.reservation
  SET status=CASE WHEN p_release THEN 'RELEASED' ELSE 'SETTLED' END,
      actual_cents=p_actual_cents
  WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK'
   AND request_key=p_request_key;
 UPDATE zeus_jarvis_b5_lab.prepaid_account
  SET reserved_cents=reserved_cents-r.reserved_cents,
      spent_cents=spent_cents+p_actual_cents
  WHERE company_id=p_company AND environment=p_environment AND provider='DEEPSEEK';
 RETURN CASE WHEN p_release THEN 'RELEASED' ELSE 'SETTLED' END;
END;
$fn$;
REVOKE ALL ON FUNCTION zeus_jarvis_b5_lab.reserve_prepaid(text,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION zeus_jarvis_b5_lab.finalize_prepaid(text,text,text,integer,boolean) FROM PUBLIC;
