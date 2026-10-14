import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUMAN_REQUIRED_REASONS,
  PHASE13_BLOCKS,
  PHASE13_CONTRACT,
  auditAdsReadiness,
  benchmarkConsentTools,
  buildCompetitorAdsScanPlan,
  buildCreativeTestPlan,
  buildLandingExperimentPlan,
  buildLocalSeoPlan,
  buildNeutralAdsPatternPlan,
  buildOfflineConversionFeedbackPlan,
  buildPhase13Telemetry,
  buildSocialAuditPlan,
  createPhase13Ledger,
  wrapExistingSeo001
} from '../marketing/phase13-marketing-seo-feedback-runtime-v0.mjs';

const ctx = engine_id => Object.freeze({ company_id: 'fenix', engine_id, environment: 'PREPROD', version: '0.1.0' });

test('phase 13 contract covers exact 152-161 and creates no engine', () => {
  assert.deepEqual(PHASE13_CONTRACT.blocks, [152,153,154,155,156,157,158,159,160,161]);
  assert.equal(PHASE13_CONTRACT.new_engine_created, false);
  assert.equal(PHASE13_CONTRACT.seo_policy, 'WRAP_EXISTING_SEO001_DO_NOT_REPLACE');
  assert.equal(PHASE13_CONTRACT.ads_pattern_policy, 'PROVIDER_NEUTRAL_NO_CLAUDE_DEPENDENCY');
  assert.equal(PHASE13_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(PHASE13_CONTRACT.prod_authorized, false);
});

test('152 ports ads patterns to neutral skills without Claude dependency', () => {
  const result = buildNeutralAdsPatternPlan({
    context: ctx('MKT-001'), request_id: 'req:152', campaign_ref: 'campaign:001', pattern_ref: 'pattern:ads:v0'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE13_BLOCKS.CLAUDE_ADS_PATTERNS);
  assert.equal(result.provider_dependency, 'NONE');
  assert.equal(result.claude_required, false);
  assert.ok(result.portable_skill_components.includes('ECONOMIC_STOP_SCALE_SEAM'));
  assert.equal(result.publishing_authorized, false);
});

test('153 ads audit deterministically identifies readiness gaps', () => {
  const result = auditAdsReadiness({
    context: ctx('MKT-001'), request_id: 'req:153', audit_ref: 'audit:ads:001',
    tracking_present: true, offline_conversion_path_defined: false, budget_cap_defined: true,
    consent_ready: false, attribution_ready: false, landing_alignment_ready: true, creative_count: 1
  });
  assert.equal(result.allowed, true);
  assert.equal(result.block, PHASE13_BLOCKS.ADS_AUDIT);
  assert.ok(result.gaps.includes('OFFLINE_CONVERSION_PATH_MISSING'));
  assert.ok(result.gaps.includes('CONSENT_NOT_READY_FOR_LIVE_EXECUTION'));
  assert.ok(result.gaps.includes('ATTRIBUTION_MISSING'));
  assert.ok(result.gaps.includes('INSUFFICIENT_CREATIVE_VARIANTS'));
  assert.equal(result.live_execution_authorized, false);
});

test('154 competitor ads scan uses COMPET-001 and public/authorized sources only', () => {
  const result = buildCompetitorAdsScanPlan({
    context: ctx('COMPET-001'), request_id: 'req:154', scan_ref: 'scan:competitor:001',
    competitor_refs: ['competitor:001','competitor:002'], source_mode: 'PUBLIC_OR_AUTHORIZED'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.engine_id, 'COMPET-001');
  assert.equal(result.source_mode, 'PUBLIC_OR_AUTHORIZED');
  assert.equal(result.continuous_scraping, false);
  assert.equal(result.remote_execution_authorized, false);
});

test('154 prohibited scraping is fail-closed', () => {
  const result = buildCompetitorAdsScanPlan({
    context: ctx('COMPET-001'), request_id: 'req:154:block', scan_ref: 'scan:001',
    competitor_refs: ['competitor:001'], prohibited_scraping_requested: true
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'PROHIBITED_SCRAPING_DENIED');
  assert.equal(result.human_required_reason, 'POLICY_CONFLICT');
});

test('155 creative testing composes MKT-001 with EVA-001 and cannot publish/spend', () => {
  const result = buildCreativeTestPlan({
    context: ctx('MKT-001'), request_id: 'req:155', experiment_ref: 'exp:creative:001',
    hypothesis_ref: 'hyp:angle:001', control_ref: 'creative:control', variant_refs: ['creative:v1','creative:v2']
  });
  assert.equal(result.allowed, true);
  assert.equal(result.evaluation_engine, 'EVA-001');
  assert.equal(result.primary_metric, 'CONTRIBUTION_MARGIN_CENTS');
  assert.equal(result.publish_authorized, false);
  assert.equal(result.spend_authorized, false);
});

test('156 landing experimentation composes MKT/CAP/EVA without website mutation', () => {
  const result = buildLandingExperimentPlan({
    context: ctx('MKT-001'), request_id: 'req:156', experiment_ref: 'exp:landing:001',
    hypothesis_ref: 'hyp:landing:001', control_landing_ref: 'landing:control', variant_landing_ref: 'landing:v1'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.acquisition_engine, 'CAP-001');
  assert.equal(result.evaluation_engine, 'EVA-001');
  assert.equal(result.website_write_authorized, false);
  assert.equal(result.deploy_authorized, false);
});

test('157 explicitly wraps existing SEO-001 and never replaces it', () => {
  const result = wrapExistingSeo001({
    context: ctx('SEO-001'), request_id: 'req:157', source_of_truth_ref: 'seo:existing:001'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'SEO001_EXISTING_WRAP_PLAN_READY');
  assert.equal(result.engine_id, 'SEO-001');
  assert.equal(result.replace_existing, false);
  assert.equal(result.preserve_existing_runtime, true);
  assert.equal(result.wordpress_write_authorized, false);
  assert.equal(result.gsc_write_authorized, false);
  assert.equal(result.seo_mutation_authorized, false);
});

test('158 local SEO composes SEO-001 and LOCALP-001 and reports gaps without GBP writes', () => {
  const result = buildLocalSeoPlan({
    context: ctx('SEO-001'), request_id: 'req:158', location_ref: 'location:cordoba:001',
    nap_consistent: true, gbp_present: true, categories_reviewed: false,
    service_coverage_reviewed: true, review_flow_defined: false, citations_reviewed: false
  });
  assert.equal(result.allowed, true);
  assert.equal(result.local_presence_engine, 'LOCALP-001');
  assert.ok(result.gaps.includes('GBP_CATEGORIES_NOT_REVIEWED'));
  assert.ok(result.gaps.includes('REVIEW_FLOW_NOT_DEFINED'));
  assert.equal(result.gbp_write_authorized, false);
  assert.equal(result.citation_write_authorized, false);
});

test('159 social audit uses SOCAUD/MKT with public or authorized sources only', () => {
  const result = buildSocialAuditPlan({
    context: ctx('SOCAUD-001'), request_id: 'req:159', audit_ref: 'audit:social:001',
    profile_refs: ['social:instagram:001','social:facebook:001'], source_mode: 'AUTHORIZED_CONNECTOR'
  });
  assert.equal(result.allowed, true);
  assert.equal(result.engine_id, 'SOCAUD-001');
  assert.equal(result.marketing_engine, 'MKT-001');
  assert.equal(result.source_mode, 'AUTHORIZED_CONNECTOR');
  assert.equal(result.social_write_authorized, false);
  assert.equal(result.prohibited_scraping_authorized, false);
});

test('160 benchmarks c15t/LibreConsent in LAB only and does not pretend they are installed', () => {
  for (const tool of ['C15T','LIBRECONSENT']) {
    const result = benchmarkConsentTools({
      context: ctx('WEB-001'), request_id: `req:160:${tool.toLowerCase()}`, tool,
      privacy_score: 90, self_host_score: 85, integration_score: 80, maintenance_score: 75
    });
    assert.equal(result.allowed, true);
    assert.equal(result.block, PHASE13_BLOCKS.CONSENT_TOOLS_BENCHMARK);
    assert.equal(result.benchmark_mode, 'LAB_ONLY');
    assert.equal(result.consent_engine_claimed, false);
    assert.equal(result.install_authorized, false);
    assert.equal(result.config_mutation_authorized, false);
    assert.equal(result.subscription_authorized, false);
  }
});

test('161 offline conversion feedback routes Google/Meta economic signal to CAP/LRN without upload', () => {
  for (const platform of ['GOOGLE_ADS','META']) {
    const result = buildOfflineConversionFeedbackPlan({
      context: ctx('CAP-001'), request_id: `req:161:${platform.toLowerCase()}`,
      platform, conversion_ref: 'conversion:001', platform_identifier_ref: 'platform-id:opaque:001',
      economic_evidence_ref: 'economic:evidence:001', contribution_margin_cents: 320000,
      consent_state: 'UNKNOWN'
    });
    assert.equal(result.allowed, true);
    assert.equal(result.engine_id, 'CAP-001');
    assert.equal(result.learning_engine, 'LRN-001');
    assert.equal(result.observability_engine, 'OBSERV-001');
    assert.equal(result.upload_authorized, false);
    assert.equal(result.platform_write_authorized, false);
    assert.equal(result.raw_contact_data_present, false);
  }
});

test('161 execution with unknown consent is LEGAL_REQUIRED', () => {
  const result = buildOfflineConversionFeedbackPlan({
    context: ctx('CAP-001'), request_id: 'req:161:legal', platform: 'GOOGLE_ADS',
    conversion_ref: 'conversion:001', economic_evidence_ref: 'economic:001',
    contribution_margin_cents: 100000, consent_state: 'UNKNOWN', execution_requested: true
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'CONSENT_REQUIRED_FOR_OFFLINE_UPLOAD');
  assert.equal(result.human_required_reason, 'LEGAL_REQUIRED');
});

test('spend/budget execution is MONEY_LIMIT and publishing/writes/uploads/install are POLICY_CONFLICT', () => {
  const money = buildNeutralAdsPatternPlan({
    context: ctx('MKT-001'), request_id: 'req:money', campaign_ref: 'campaign:001', pattern_ref: 'pattern:001', ad_spend_requested: true
  });
  assert.equal(money.allowed, false);
  assert.equal(money.human_required_reason, 'MONEY_LIMIT');

  for (const flag of ['platform_publish_requested','website_write_requested','seo_write_requested','gbp_write_requested','social_write_requested','offline_conversion_upload_requested','consent_tool_install_requested']) {
    const result = buildNeutralAdsPatternPlan({
      context: ctx('MKT-001'), request_id: `req:${flag}`, campaign_ref: 'campaign:001', pattern_ref: 'pattern:001', [flag]: true
    });
    assert.equal(result.allowed, false, flag);
    assert.equal(result.human_required_reason, 'POLICY_CONFLICT', flag);
  }
});

test('tenant isolation, exact PREPROD and raw PII/secrets are fail-closed', () => {
  const cross = auditAdsReadiness({ context: ctx('MKT-001'), request_id: 'x', audit_ref: 'a:1', target_company_id: 'other-company' });
  assert.equal(cross.allowed, false);
  assert.equal(cross.human_required_reason, 'SECURITY_INCIDENT');

  assert.throws(() => wrapExistingSeo001({ context: { ...ctx('SEO-001'), environment: 'PROD' }, request_id: 'x', source_of_truth_ref: 'seo:1' }), /exact PREPROD only/);
  assert.throws(() => buildSocialAuditPlan({ context: ctx('SOCAUD-001'), request_id: 'x', audit_ref: 'a:1', profile_refs: ['p:1'], email: 'x@example.com' }), /raw PII\/secret\/sensitive\/content field forbidden/);
  assert.throws(() => buildOfflineConversionFeedbackPlan({ context: ctx('CAP-001'), request_id: 'x', platform: 'META', conversion_ref: 'c:1', economic_evidence_ref: 'e:1', access_token: 'secret' }), /raw PII\/secret\/sensitive\/content field forbidden/);
});

test('telemetry uses OBSERV-001 and hashes refs without platform payloads', () => {
  const result = buildPhase13Telemetry({ context: ctx('MKT-001'), event_ref: 'event:phase13:001', event_type: 'ads_audit' });
  assert.equal(result.observability_target, 'OBSERV-001');
  assert.match(result.event_ref_hash, /^[a-f0-9]{32}$/);
  assert.equal(result.raw_pii_persisted, false);
  assert.equal(result.raw_platform_payload_persisted, false);
});

test('phase 13 ledger is idempotent and rejects conflicting reuse', () => {
  const ledger = createPhase13Ledger();
  const request = { context: ctx('MKT-001'), request_id: 'idem:001', campaign_ref: 'campaign:001', pattern_ref: 'pattern:001' };
  const first = ledger.execute({ operation: 'ADS_PATTERNS', request });
  const duplicate = ledger.execute({ operation: 'ADS_PATTERNS', request });
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(ledger.size(), 1);

  const conflict = ledger.execute({ operation: 'ADS_PATTERNS', request: { ...request, pattern_ref: 'pattern:002' } });
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(conflict.human_required_reason, 'POLICY_CONFLICT');
  assert.equal(ledger.size(), 1);
});

test('only canonical HUMAN_REQUIRED reasons are configured', () => {
  assert.deepEqual(HUMAN_REQUIRED_REASONS, [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
  const low = auditAdsReadiness({ context: ctx('MKT-001'), request_id: 'low:001', audit_ref: 'audit:001', confidence: 0.4 });
  assert.equal(low.allowed, false);
  assert.equal(low.human_required_reason, 'LOW_CONFIDENCE');
});
