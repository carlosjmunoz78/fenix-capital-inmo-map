import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANNEL_INTELLIGENCE_RUNTIME,
  WEB_PROFILE_ENGINES,
  CHANNEL_POD_ENGINES,
  CHANNEL_POD_ROLES,
  INITIAL_CHANNELS,
  buildWebOperatingProfile,
  buildChannelPodProfile,
  scoreTrendOpportunity,
  buildVisualTasteProfile,
  buildCrossChannelInsight,
  planNewChannelBootstrap,
  buildChannelIntelligencePlan
} from '../marketing/channel-intelligence-runtime-v1.mjs';

const context = Object.freeze({
  company_id: 'fenix-capital',
  engine_id: 'MKT-001',
  capability_id: 'CHANNEL-INTELLIGENCE-V1',
  environment: 'PREPROD',
  version: 'v1'
});
const base = (extra = {}) => ({ context, confidence: 0.99, ...extra });

const strongTrend = (extra = {}) => base({
  channel_id: 'instagram',
  signal_ref: 'trend:instagram:reel:001',
  momentum: 72,
  acceleration: 88,
  audience_fit: 92,
  brand_fit: 82,
  commercial_intent: 86,
  search_demand: 78,
  competitor_gap: 84,
  geographic_relevance: 90,
  cross_platform_diffusion: 70,
  saturation: 20,
  risk: 10,
  cost: 5,
  ...extra
});

test('runtime is PREPROD-only, zero-cost and does not invent engine ids', () => {
  assert.equal(CHANNEL_INTELLIGENCE_RUNTIME.owner_engine, 'MKT-001');
  assert.equal(CHANNEL_INTELLIGENCE_RUNTIME.environment, 'PREPROD');
  assert.equal(CHANNEL_INTELLIGENCE_RUNTIME.prod_enabled, false);
  assert.equal(CHANNEL_INTELLIGENCE_RUNTIME.new_engine_ids_allowed, false);
  assert.equal(CHANNEL_INTELLIGENCE_RUNTIME.additional_cost_eur, 0);
});

test('web operating profile composes existing canonical engines and never writes WordPress PROD', () => {
  const out = buildWebOperatingProfile(base({ site_ref: 'site:fenixcapital:prod-baseline' }));
  assert.equal(out.allowed, true);
  assert.equal(out.status, 'WEB_OPERATING_PROFILE_READY');
  assert.deepEqual(out.composed_engines, WEB_PROFILE_ENGINES);
  assert.ok(out.composed_engines.includes('WEB-001'));
  assert.ok(out.composed_engines.includes('WAUD-001'));
  assert.ok(out.composed_engines.includes('COMPET-001'));
  assert.equal(out.wordpress_prod_write_authorized, false);
  assert.equal(out.prod_authorized, false);
});

test('Instagram Facebook and LinkedIn get independent logical pods over shared engines', () => {
  for (const channel of INITIAL_CHANNELS) {
    const out = buildChannelPodProfile(base({ channel_id: channel, account_ref: `account:${channel}:fenix` }));
    assert.equal(out.allowed, true);
    assert.equal(out.channel_id, channel);
    assert.deepEqual(out.composed_engines, CHANNEL_POD_ENGINES);
    assert.deepEqual(out.roles, CHANNEL_POD_ROLES);
    assert.equal(out.publishing_authorized, false);
    assert.equal(out.paid_execution_authorized, false);
    assert.equal(out.provider_binding, false);
  }
});

test('trend opportunity scoring prioritizes acceleration before saturation and is deterministic', () => {
  const a = scoreTrendOpportunity(strongTrend());
  const b = scoreTrendOpportunity(strongTrend());
  assert.equal(a.allowed, true);
  assert.equal(a.stage, 'BREAKOUT');
  assert.equal(a.recommendation, 'PRIORITIZE_LAB_EXPERIMENT');
  assert.ok(a.opportunity_score >= 70);
  assert.equal(a.score_hash, b.score_hash);
  assert.equal(a.experiment_engine, 'EXP-001');
  assert.equal(a.lab_engine, 'LAB-MKT');
  assert.equal(a.prod_authorized, false);
});

test('saturated trend is not blindly adopted even with high volume signals', () => {
  const out = scoreTrendOpportunity(strongTrend({ momentum: 95, acceleration: 35, saturation: 92 }));
  assert.equal(out.stage, 'SATURATED');
  assert.notEqual(out.recommendation, 'PRIORITIZE_LAB_EXPERIMENT');
});

test('decline signal takes precedence over raw popularity', () => {
  const out = scoreTrendOpportunity(strongTrend({ decline_signal: true, momentum: 90, acceleration: 80 }));
  assert.equal(out.stage, 'DECLINING');
});

test('visual taste profile stores preference tags as evidence, not an absolute rule', () => {
  const out = buildVisualTasteProfile(base({
    preferred_tags: ['premium','visual','clean','strong-cta'],
    rejected_tags: ['generic-ai','excessive-animation'],
    evidence_refs: ['decision:hero:b','decision:cta:c']
  }));
  assert.equal(out.allowed, true);
  assert.equal(out.owner_preference_is_one_signal_not_absolute_rule, true);
  assert.equal(out.profile.preferred_tags.includes('premium'), true);
  assert.equal(out.learning_engine, 'LRN-001');
});

test('cross-channel learning transfers insight and denies blind creative copy', () => {
  const ok = buildCrossChannelInsight(base({
    from_channel_id: 'instagram',
    to_channel_id: 'linkedin',
    insight_ref: 'insight:young-couple:001',
    transferable_signals: ['topic:hipoteca-100','hook:error-habitual','intent:high']
  }));
  assert.equal(ok.allowed, true);
  assert.equal(ok.original_asset_copy_authorized, false);
  assert.equal(ok.target_channel_reinterpretation_required, true);

  const denied = buildCrossChannelInsight(base({
    from_channel_id: 'instagram',
    to_channel_id: 'linkedin',
    insight_ref: 'insight:young-couple:001',
    transferable_signals: ['topic:hipoteca-100'],
    copy_post_requested: true
  }));
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required_reason, 'POLICY_CONFLICT');
});

test('new channel bootstrap uses Factory but creates a pod profile, not a new engine id', () => {
  const out = planNewChannelBootstrap(base({
    channel_id: 'future-network',
    channel_manifest_ref: 'manifest:future-network:v1',
    research_evidence_ref: 'evidence:future-network:2026-10-21'
  }));
  assert.equal(out.allowed, true);
  assert.equal(out.creates_new_engine_id, false);
  assert.equal(out.creates_channel_pod_profile, true);
  assert.ok(out.composed_engines.includes('FACT-001'));
  assert.ok(out.pipeline.includes('TERMS_API_POLICY'));
  assert.ok(out.pipeline.includes('E2E'));
  assert.equal(out.installation_authorized, false);
  assert.equal(out.publishing_authorized, false);
});

test('full plan creates web profile plus three initial channel pods with stable idempotency', () => {
  const request = base({
    site_ref: 'site:fenixcapital:baseline-v1',
    account_refs: {
      instagram: 'account:ig:fenix',
      facebook: 'account:fb:fenix',
      linkedin: 'account:li:fenix'
    }
  });
  const a = buildChannelIntelligencePlan(request);
  const b = buildChannelIntelligencePlan(request);
  assert.equal(a.allowed, true);
  assert.equal(a.channel_pods.length, 3);
  assert.deepEqual(a.channel_pods.map((pod) => pod.channel_id), ['instagram','facebook','linkedin']);
  assert.equal(a.continuous_loops.includes('TREND_RADAR'), true);
  assert.equal(a.continuous_loops.includes('COMPETITOR_RADAR'), true);
  assert.equal(a.continuous_loops.includes('WEB_VISUAL_RADAR'), true);
  assert.equal(a.prod_authorized, false);
  assert.equal(a.autonomous_prod, false);
  assert.equal(a.idempotency_key, b.idempotency_key);
});

test('cross-company access fails closed', () => {
  const out = buildWebOperatingProfile(base({ site_ref: 'site:fenix', target_company_id: 'other-company' }));
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'SECURITY_INCIDENT');
});

test('low confidence fails closed', () => {
  const out = buildChannelPodProfile(base({ channel_id: 'instagram', account_ref: 'account:ig:fenix', confidence: 0.2 }));
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'LOW_CONFIDENCE');
});

test('publishing deployment and paid execution remain blocked', () => {
  for (const extra of [
    { publish_requested: true },
    { deploy_requested: true },
    { prod_write_requested: true }
  ]) {
    const out = buildChannelPodProfile(base({ channel_id: 'instagram', account_ref: 'account:ig:fenix', ...extra }));
    assert.equal(out.allowed, false);
    assert.equal(out.human_required_reason, 'POLICY_CONFLICT');
  }
  for (const extra of [
    { spend_cents: 1 },
    { purchase_requested: true },
    { subscription_requested: true },
    { paid_api_requested: true }
  ]) {
    const out = buildChannelPodProfile(base({ channel_id: 'instagram', account_ref: 'account:ig:fenix', ...extra }));
    assert.equal(out.allowed, false);
    assert.equal(out.human_required_reason, 'MONEY_LIMIT');
  }
});

test('raw secret and personal-data shaped fields are rejected', () => {
  assert.throws(() => buildChannelPodProfile(base({ channel_id: 'instagram', account_ref: 'account:ig:fenix', api_key: 'hidden' })), /PII\/secret field forbidden/);
  assert.throws(() => buildVisualTasteProfile(base({ preferred_tags: ['clean'], email: 'hidden@example.test' })), /PII\/secret field forbidden/);
});

test('exact PREPROD MKT-001 capability and v1 context are mandatory', () => {
  assert.throws(() => buildWebOperatingProfile(base({ site_ref: 'site:fenix', context: { ...context, environment: 'PROD' } })), /exact PREPROD/);
  assert.throws(() => buildWebOperatingProfile(base({ site_ref: 'site:fenix', context: { ...context, engine_id: 'FACT-001' } })), /must be MKT-001/);
  assert.throws(() => buildWebOperatingProfile(base({ site_ref: 'site:fenix', context: { ...context, version: 'v0' } })), /exact v1/);
});
