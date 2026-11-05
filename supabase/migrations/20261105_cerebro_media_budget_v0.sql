-- FACT-001 / CEREBRO · Media budget V0 in private PREPROD schema.
-- Additive schema, not a payment API and not a new server. This does NOT
-- authorize any credential or execute an image request. All money in EUR.
-- Explicitly avoids charging any untracked request / automatic retries.

CREATE TABLE IF NOT EXISTS cerebro_owner_control.media_budget_v0 (
 budget_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id text NOT NULL DEFAULT 'fenix' CHECK(company_id='fenix'),
 engine_id text NOT NULL DEFAULT 'FACT-001' CHECK(engine_id='FACT-001'),
 environment text NOT NULL DEFAULT 'PREPROD' CHECK(environment='PREPROD'),
 version text NOT NULL DEFAULT 'v0' CHECK(version='v0'),
 enabled boolean NOT NULL DEFAULT false,
 max_eur numeric(12,4) NOT NULL DEFAULT 0 CHECK(max_eur>=0),
 per_image_limit_eur numeric(12,4) NOT NULL DEFAULT 0 CHECK(per_image_limit_eur>=0),
 spent_eur numeric(12,4) NOT NULL DEFAULT 0 CHECK(spent_eur>=0),
 reserved_eur numeric(12,4) NOT NULL DEFAULT 0 CHECK(reserved_eur>=0),
 max_images integer NOT NULL DEFAULT 1 CHECK(max_images>=1 AND max_images<=100),
 authorized_by text,
 approved_at timestamptz,
 approval_expires_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,engine_id,environment,version),
 CONSTRAINT budget_does_not_overflow CHECK(spent_eur+reserved_eur<=max_eur),
 CONSTRAINT enabled_requires_real_approval CHECK(
    NOT enabled OR (
      max_eur>0 AND per_image_limit_eur>0 AND
      authorized_by='CARLOS-ADMIN' AND approved_at IS NOT NULL AND
      approval_expires_at>approved_at
    )
 )
);
ALTER TABLE cerebro_owner_control.media_budget_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cerebro_owner_control.media_budget_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON cerebro_owner_control.media_budget_v0 TO service_role;

CREATE TABLE IF NOT EXISTS cerebro_owner_control.media_spend_v0 (
 spend_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 budget_id uuid NOT NULL REFERENCES cerebro_owner_control.media_budget_v0(budget_id) ON DELETE RESTRICT,
 job_id uuid NOT NULL UNIQUE REFERENCES public.cerebro_creative_job_v1(job_id) ON DELETE RESTRICT,
 company_id text NOT NULL DEFAULT 'fenix' CHECK(company_id='fenix'),
 environment text NOT NULL DEFAULT 'PREPROD' CHECK(environment='PREPROD'),
 media_kind text NOT NULL DEFAULT 'IMAGE' CHECK(media_kind='IMAGE'),
 provider text NOT NULL CHECK(provider IN ('OPENAI')),
 model text NOT NULL CHECK(model='gpt-image-2.5-flare'),
 images_requested int NOT NULL DEFAULT 1 CHECK(images_requested=1),
 reservation_eur numeric(12,4) NOT NULL CHECK(reservation_eur>0),
 actual_eur numeric(12,4) CHECK(actual_eur>=0),
 cost_status text NOT NULL DEFAULT 'RESERVED' CHECK(cost_status IN
   ('RESERVED','PROVIDER_AMBIGUOUS','RECONCILED','RELEASED_NO_CALL')),
 cost_evidence_ref text,
 provider_request_id text,
 image_sha256 text CHECK(image_sha256 IS NULL OR image_sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT no_unproven_spend_close CHECK(
  cost_status <> 'RECONCILED' OR
  (actual_eur IS NOT NULL AND cost_evidence_ref IS NOT NULL AND
   provider_request_id IS NOT NULL AND image_sha256 IS NOT NULL)
 )
);
ALTER TABLE cerebro_owner_control.media_spend_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cerebro_owner_control.media_spend_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON cerebro_owner_control.media_spend_v0 TO service_role;

-- A transaction/row lock ensures only one reservation against the media cap.
-- This function cannot call OpenAI; it can only reserve planned spending.
CREATE OR REPLACE FUNCTION cerebro_owner_control.reserve_image_spend_v0(
 p_job_id uuid,p_reservation_eur numeric
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,cerebro_owner_control,public
AS $fn$
DECLARE
 j public.cerebro_creative_job_v1;
 b cerebro_owner_control.media_budget_v0;
 existing cerebro_owner_control.media_spend_v0;
 v_spend_id uuid;
 v_count integer;
BEGIN
 IF p_reservation_eur IS NULL OR p_reservation_eur<=0 THEN
   RETURN jsonb_build_object('ok',false,'reason','INVALID_MEDIA_QUOTE');
 END IF;
 SELECT * INTO j FROM public.cerebro_creative_job_v1 WHERE job_id=p_job_id;
 IF NOT FOUND OR j.company_id<>'fenix' OR j.engine_id<>'FACT-001'
    OR j.environment<>'PREPROD' OR j.channel<>'FACEBOOK'
    OR j.output_type<>'SQUARE_POST' OR j.status<>'HOLD'
    OR coalesce(j.request->'creative_payload'->>'scene_provider','')<>'OPENAI_IMAGE'
    OR coalesce(j.request->>'publish_requested','false')='true'
 THEN RETURN jsonb_build_object('ok',false,'reason','INVALID_IMAGE_JOB_SCOPE'); END IF;
 IF coalesce(j.request->'security_policy'->>'provider_secret_rotation_verified','false')<>'true'
 THEN RETURN jsonb_build_object('ok',false,'reason','SECURITY_INCIDENT'); END IF;
 SELECT * INTO b FROM cerebro_owner_control.media_budget_v0
 WHERE company_id='fenix' AND engine_id='FACT-001'
   AND environment='PREPROD' AND version='v0' FOR UPDATE;
 IF NOT FOUND OR b.enabled IS DISTINCT FROM true
    OR b.approval_expires_at<=now() THEN
   RETURN jsonb_build_object('ok',false,'reason','MONEY_LIMIT_OR_BUDGET_DISABLED'); END IF;
 SELECT * INTO existing FROM cerebro_owner_control.media_spend_v0
 WHERE job_id=p_job_id;
 IF FOUND THEN
   RETURN jsonb_build_object('ok',false,'reason','ALREADY_RESERVED_NO_RETRY',
     'cost_status',existing.cost_status); END IF;
 IF p_reservation_eur>b.per_image_limit_eur OR
    b.spent_eur+b.reserved_eur+p_reservation_eur>b.max_eur THEN
   RETURN jsonb_build_object('ok',false,'reason','MONEY_LIMIT'); END IF;
 SELECT count(*) INTO v_count FROM cerebro_owner_control.media_spend_v0
 WHERE budget_id=b.budget_id AND cost_status<>'RELEASED_NO_CALL';
 IF v_count>=b.max_images THEN
   RETURN jsonb_build_object('ok',false,'reason','IMAGE_COUNT_LIMIT'); END IF;
 INSERT INTO cerebro_owner_control.media_spend_v0(
  budget_id,job_id,provider,model,reservation_eur,cost_status
 ) VALUES(b.budget_id,p_job_id,'OPENAI','gpt-image-2.5-flare',
  p_reservation_eur,'RESERVED') RETURNING spend_id INTO v_spend_id;
 UPDATE cerebro_owner_control.media_budget_v0
 SET reserved_eur=reserved_eur+p_reservation_eur,updated_at=now()
 WHERE budget_id=b.budget_id;
 RETURN jsonb_build_object('ok',true,'state','RESERVED_NO_PROVIDER_CALL',
    'spend_id',v_spend_id,'job_id',p_job_id,
    'reservation_eur',p_reservation_eur,'single_image_only',true,
    'publish_authorized',false);
END $fn$;
REVOKE ALL ON FUNCTION cerebro_owner_control.reserve_image_spend_v0(uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cerebro_owner_control.reserve_image_spend_v0(uuid,numeric) TO service_role;

INSERT INTO cerebro_owner_control.media_budget_v0 (
 company_id,engine_id,environment,version,enabled,max_eur,per_image_limit_eur,max_images
) VALUES('fenix','FACT-001','PREPROD','v0',false,0,0,1)
ON CONFLICT(company_id,engine_id,environment,version) DO NOTHING;

COMMENT ON TABLE cerebro_owner_control.media_budget_v0 IS
 'Media images and videos are allowed to incur cost, but no paid call before a quantified owner-authorized budget. Inactive by default.';
COMMENT ON TABLE cerebro_owner_control.media_spend_v0 IS
 'Reservation for one possible image, not proof of OpenAI call. Ambiguous requests retain budget and never auto retry.';
