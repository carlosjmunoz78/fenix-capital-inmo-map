import test from 'node:test';
import assert from 'node:assert/strict';
import {auditWebsite, auditSocial} from '../multicompany/post-scan-parallel-v1.mjs';
import {bootstrapSocial} from '../multicompany/bootstrap-tier-v1.mjs';
import {
  adaptExistingSocialWebBootstrap,
  buildChannelIntelligenceFromExistingScan,
  channelIntelligenceAdapterPersistenceEnvelope
} from '../marketing/channel-intelligence-multicompany-adapter-v1.mjs';

const company_id = 'fenix-capital';
const evidence_at = '2026-10-21T12:00:00.000Z';
const scan_result = Object.freeze({
  company_id,
  engine_id: 'SCAN-001',
  environment: 'PREPROD',
  prod_authorized: false,
  prod_write_authorized: false,
  trading_access: false,
  additional_cost_eur: 0,
  social_profiles: {
    instagram: ['https://www.instagram.com/fenixcapital'],
    facebook: ['https://www.facebook.com/fenixcapital'],
    linkedin: ['https://www.linkedin.com/company/fenixcapital']
  }
});

const pages = Object.freeze([
  Object.freeze({
    url: 'https://fenixcapital.es/',
    status: 200,
    html: '<html><head><title>Fenix Capital</title><meta name="description" content="Hipotecas en Cordoba"><link rel="canonical" href="https://fenixcapital.es/"><meta name="viewport" content="width=device-width"></head><body><h1>Hipotecas en Cordoba</h1><p>Contenido</p></body></html>'
  })
]);

const trend_signals = Object.freeze([
  Object.freeze({
    channel_id: 'instagram',
    signal_ref: 'trend:ig:reel:001',
    momentum: 76,
    acceleration: 91,
    audience_fit: 90,
    brand_fit: 82,
    commercial_intent: 88,
    search_demand: 81,
    competitor_gap: 86,
    geographic_relevance: 92,
    cross_platform_diffusion: 73,
    saturation: 18,
    risk: 8,
    cost: 3,
    confidence: 0.98
  })
]);

function upstream() {
  const website_audit = auditWebsite({company_id, evidence_at, scan_result, pages});
  const social_audit = auditSocial({company_id, evidence_at, scan_result});
  const social_bootstrap = bootstrapSocial({
    company_id,
    evidence_at,
    social_audit,
    brand_context: {company_id, tone_ref: 'brand:fenix-capital:tone-v1'},
    business_context: {company_id, audience_ref: 'audience:fenix-capital:v1'},
    content_pillars: ['hipoteca-100','educacion-financiera','casos-reales'],
    formats: ['reel','carousel','story'],
    cadence: ['weekly']
  });
  return {website_audit, social_audit, social_bootstrap};
}

test('adapter consumes existing WAUD/SOCAUD/SOCBOOT results instead of duplicating their engines', () => {
  const {website_audit, social_audit, social_bootstrap} = upstream();
  const out = adaptExistingSocialWebBootstrap({
    company_id,
    evidence_at,
    website_audit,
    social_audit,
    social_bootstrap,
    site_ref: 'site:fenixcapital:prod-baseline',
    trend_signals
  });
  assert.equal(out.environment, 'PREPROD');
  assert.deepEqual(out.source_engine_ids, ['WAUD-001','SOCAUD-001','SOCBOOT-001']);
  assert.equal(out.orchestration.existing_post_scan_reused, true);
  assert.equal(out.orchestration.existing_social_bootstrap_reused, true);
  assert.equal(out.orchestration.new_scheduler_created, false);
  assert.deepEqual(out.orchestration.event_job_engines, ['EVT-001','JOB-001']);
  assert.equal(out.additional_cost_eur, 0);
  assert.equal(out.prod_authorized, false);
  assert.equal(out.prod_write_authorized, false);
});

test('adapter creates separate Instagram Facebook and LinkedIn pods from existing social discovery', () => {
  const {website_audit, social_audit, social_bootstrap} = upstream();
  const out = adaptExistingSocialWebBootstrap({
    company_id,
    evidence_at,
    website_audit,
    social_audit,
    social_bootstrap,
    site_ref: 'site:fenixcapital:prod-baseline'
  });
  assert.deepEqual([...out.channel_pods.map((pod) => pod.channel_id)].sort(), ['facebook','instagram','linkedin']);
  assert.equal(new Set(out.channel_pods.map((pod) => pod.pod_id)).size, 3);
  assert.equal(out.channel_pods.every((pod) => pod.account_ref.startsWith(`account:${pod.channel_id}:`)), true);
});

test('trend signals become LAB candidates but never public/prod actions', () => {
  const {website_audit, social_audit, social_bootstrap} = upstream();
  const out = adaptExistingSocialWebBootstrap({
    company_id,
    evidence_at,
    website_audit,
    social_audit,
    social_bootstrap,
    site_ref: 'site:fenixcapital:prod-baseline',
    trend_signals
  });
  assert.equal(out.trend_results.length, 1);
  assert.equal(out.trend_results[0].stage, 'BREAKOUT');
  assert.equal(out.trend_results[0].recommendation, 'PRIORITIZE_LAB_EXPERIMENT');
  assert.equal(out.prioritized_lab_candidates.length, 1);
  assert.equal(out.orchestration.lab_engine, 'LAB-MKT');
  assert.equal(out.orchestration.experiment_engine, 'EXP-001');
  assert.equal(out.publish_authorized, false);
  assert.equal(out.spend_authorized, false);
});

test('end-to-end adapter reuses the existing post-scan and bootstrap implementations', () => {
  const out = buildChannelIntelligenceFromExistingScan({
    company_id,
    evidence_at,
    scan_result,
    pages,
    brand_context: {company_id, tone_ref: 'brand:fenix-capital:tone-v1'},
    business_context: {company_id, audience_ref: 'audience:fenix-capital:v1'},
    content_pillars: ['hipoteca-100','educacion-financiera'],
    formats: ['reel','carousel'],
    cadence: ['weekly'],
    site_ref: 'site:fenixcapital:prod-baseline',
    trend_signals
  });
  assert.equal(out.source_engine_ids.includes('WAUD-001'), true);
  assert.equal(out.source_engine_ids.includes('SOCAUD-001'), true);
  assert.equal(out.source_engine_ids.includes('SOCBOOT-001'), true);
  assert.equal(out.channel_pods.length, 3);
  assert.equal(out.external_side_effect_executed, false);
});

test('adapter is deterministic for same evidence and produces a persistence envelope', () => {
  const {website_audit, social_audit, social_bootstrap} = upstream();
  const request = {
    company_id,
    evidence_at,
    website_audit,
    social_audit,
    social_bootstrap,
    site_ref: 'site:fenixcapital:prod-baseline',
    trend_signals
  };
  const a = adaptExistingSocialWebBootstrap(request);
  const b = adaptExistingSocialWebBootstrap(request);
  assert.equal(a.evidence_sha256, b.evidence_sha256);
  assert.equal(a.result_sha256, b.result_sha256);
  const envelope = channelIntelligenceAdapterPersistenceEnvelope(a, {
    idempotency_key: 'ci:fenix:2026-10-21',
    recorded_by: 'cerebro:channel-intelligence-v1'
  });
  assert.equal(envelope.channel_pod_count, 3);
  assert.equal(envelope.trend_result_count, 1);
  assert.equal(envelope.prod_authorized, false);
});

test('cross-company upstream evidence is rejected', () => {
  const {website_audit, social_audit, social_bootstrap} = upstream();
  const bad = {...social_audit, company_id: 'other-company'};
  assert.throws(() => adaptExistingSocialWebBootstrap({
    company_id,
    evidence_at,
    website_audit,
    social_audit: bad,
    social_bootstrap,
    site_ref: 'site:fenixcapital:prod-baseline'
  }), /POLICY_CONFLICT:UPSTREAM_SOCAUD-001_SCOPE/);
});

test('upstream HUMAN_REQUIRED stops the adapter fail-closed', () => {
  const {website_audit, social_audit, social_bootstrap} = upstream();
  const blocked = {...social_bootstrap, human_required_code: 'LOW_CONFIDENCE'};
  assert.throws(() => adaptExistingSocialWebBootstrap({
    company_id,
    evidence_at,
    website_audit,
    social_audit,
    social_bootstrap: blocked,
    site_ref: 'site:fenixcapital:prod-baseline'
  }), /LOW_CONFIDENCE:UPSTREAM_SOCBOOT-001/);
});

test('raw credential-shaped fields remain rejected', () => {
  assert.throws(() => buildChannelIntelligenceFromExistingScan({
    company_id,
    evidence_at,
    scan_result,
    pages,
    brand_context: {company_id, api_key: 'hidden'},
    site_ref: 'site:fenixcapital:prod-baseline'
  }), /SECURITY_INCIDENT/);
});
