-- PREPROD-ONLY / OWNER SUSPENSION. Apply ONLY after backing up exact functions
-- to cerebro_lab_private.staging_suspension_snapshot_v1 and verifying hashes.
-- Do not run in PROD. Reactivation forbidden until explicit new owner order.
CREATE OR REPLACE FUNCTION public.seo001_dispatch_page_quality_for_city_v2_preprod(p_province text,p_municipality text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','net','vault' AS $staging_off$
BEGIN RETURN jsonb_build_object('ok',false,'state','BLOCKED_DEPENDENCY','reason','STAGING_SUSPENDED_BY_OWNER','dependency_id','wordpress_staging','side_effects',false,'request_id',null,'target_url',null,'environment','PREPROD'); END;
$staging_off$;
CREATE OR REPLACE FUNCTION public.seo001_dispatch_render_qa_preprod(p_company_id text DEFAULT 'FENIX_CAPITAL'::text,p_engine_id text DEFAULT 'SEO-001'::text,p_environment text DEFAULT 'PREPROD'::text,p_province text DEFAULT NULL::text,p_municipality text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','net' AS $staging_off$
BEGIN RETURN jsonb_build_object('ok',false,'state','BLOCKED_DEPENDENCY','reason','STAGING_SUSPENDED_BY_OWNER','dependency_id','wordpress_staging','side_effects',false,'request_id',null,'target_url',null,'environment','PREPROD'); END;
$staging_off$;
CREATE OR REPLACE FUNCTION public.seo001_wp_staging_http_preprod(p_method text,p_path text,p_body jsonb DEFAULT NULL::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','net','vault' AS $staging_off$
BEGIN RETURN jsonb_build_object('ok',false,'state','BLOCKED_DEPENDENCY','reason','STAGING_SUSPENDED_BY_OWNER','dependency_id','wordpress_staging','side_effects',false,'request_id',null,'target_url',null,'environment','PREPROD'); END;
$staging_off$;
