-- FACT-001 LAB receipt immutability hardening.
-- The database's default service_role grant also included UPDATE/DELETE.
-- This isolated table must permit only SELECT and INSERT by the existing LAB Edge.
BEGIN;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.cerebro_universal_fact_attestation_lab_v0 FROM service_role;
GRANT SELECT, INSERT ON TABLE public.cerebro_universal_fact_attestation_lab_v0 TO service_role;
COMMIT;
