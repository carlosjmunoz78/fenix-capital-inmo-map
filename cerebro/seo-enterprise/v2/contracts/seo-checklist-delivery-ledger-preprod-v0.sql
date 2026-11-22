-- CEREBRO SEO-001 · Transactional checklist delivery ledger · PREPROD ONLY
-- Explicit target project ref: hnqlnvakzaywtafeiybt. DO NOT execute against PROD cluhljgonannaafpmblx.
-- Inventoried: table did not exist, no related data to migrate; independent additive table.
-- No scheduled worker, triggers, FDW, secrets, users or publications.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('public.cerebro_seo_checklist_delivery_v0') IS NOT NULL THEN
    RAISE EXCEPTION 'TABLE_ALREADY_EXISTS__STOP_AND_INSPECT';
  END IF;
END
$preflight$;
CREATE TABLE public.cerebro_seo_checklist_delivery_v0 (
  idempotency_key text PRIMARY KEY
    CHECK (idempotency_key ~ '^[0-9a-f]{48}$'),
  company_id text NOT NULL DEFAULT 'fenix' CHECK (company_id='fenix'),
  engine_id text NOT NULL DEFAULT 'SEO-001' CHECK (engine_id='SEO-001'),
  environment text NOT NULL DEFAULT 'PREPROD' CHECK (environment='PREPROD'),
  asset_id text NOT NULL DEFAULT 'SEO-MAGNET-52656-CHECKLIST-V1'
    CHECK (asset_id='SEO-MAGNET-52656-CHECKLIST-V1'),
  lead_event_id uuid NOT NULL,
  request_id uuid NOT NULL UNIQUE,
  recipient_sha256 text NOT NULL CHECK (recipient_sha256 ~ '^[0-9a-f]{64}$'),
  attachment_sha256 text NOT NULL
    CHECK (attachment_sha256='59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6'),
  consent_privacy_at timestamptz NOT NULL,
  privacy_notice_version text NOT NULL CHECK (length(privacy_notice_version)<=80),
  consent_marketing boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED','ACCEPTED','UNKNOWN')),
  message_id_sha256 text NULL
    CHECK (message_id_sha256 IS NULL OR message_id_sha256 ~ '^[0-9a-f]{64}$'),
  last_error_code text NULL CHECK (last_error_code IS NULL OR length(last_error_code)<=100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT seo_delivery_nonempty_verification CHECK (consent_privacy_at <= created_at + interval '5 minutes'),
  CONSTRAINT seo_delivery_accepted_receipt CHECK (status<>'ACCEPTED' OR (message_id_sha256 IS NOT NULL AND completed_at IS NOT NULL)),
  UNIQUE (lead_event_id,asset_id)
);
ALTER TABLE public.cerebro_seo_checklist_delivery_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cerebro_seo_checklist_delivery_v0 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.cerebro_seo_checklist_delivery_v0 TO service_role;
COMMENT ON TABLE public.cerebro_seo_checklist_delivery_v0 IS
 'SEO-001 PREPROD only; one-shot transactional checklist delivery receipts. No customer email, phone or raw consent evidence. Client roles denied; service_role only.';
COMMIT;

-- Rollback (only after checking row count = 0, no worker using the table):
-- DROP TABLE public.cerebro_seo_checklist_delivery_v0;
-- Deleting receipts after real email acceptance is prohibited: preserve idempotency evidence.
