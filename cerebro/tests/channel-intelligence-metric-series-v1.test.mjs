import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMetricSeries, buildOwnPerformanceSignal} from '../marketing/channel-intelligence-metric-series-v1.mjs';

test('unknown metrics remain null and are never imputed', () => {
  const analysis = analyzeMetricSeries({
    company_id: 'fenix-capital',
    channel_id: 'instagram',
    content_key: 'ig-test',
    snapshots: [
      {observed_at:'2026-10-20T09:00:00Z', impressions:null, clicks:null, engagements:2, sessions:null, conversions:null},
      {observed_at:'2026-10-21T09:00:00Z', impressions:null, clicks:null, engagements:5, sessions:null, conversions:null}
    ]
  });
  assert.equal(analysis.metrics.impressions.known, false);
  assert.equal(analysis.metrics.impressions.latest, null);
  assert.equal(analysis.metrics.engagements.delta, 3);
  assert.equal(analysis.quality_state, 'VELOCITY_EVIDENCE_AVAILABLE');
  assert.equal(analysis.market_trend_claim_authorized, false);
});

test('three observations produce acceleration evidence', () => {
  const analysis = analyzeMetricSeries({
    company_id: 'fenix-capital',
    channel_id: 'linkedin',
    content_key: 'li-test',
    snapshots: [
      {observed_at:'2026-10-19T08:00:00Z', impressions:10, clicks:0, engagements:0, sessions:null, conversions:null},
      {observed_at:'2026-10-20T08:00:00Z', impressions:20, clicks:1, engagements:1, sessions:null, conversions:null},
      {observed_at:'2026-10-21T08:00:00Z', impressions:50, clicks:3, engagements:4, sessions:null, conversions:null}
    ]
  });
  assert.equal(analysis.quality_state, 'ACCELERATION_EVIDENCE_AVAILABLE');
  assert.equal(analysis.metrics.impressions.delta, 30);
  assert.ok(analysis.metrics.impressions.velocity_per_hour > 0);
  assert.ok(analysis.metrics.impressions.acceleration_per_hour2 > 0);
});

test('own performance signal is explicitly not a platform or market trend', () => {
  const analysis = analyzeMetricSeries({
    company_id: 'fenix-capital',
    channel_id: 'facebook',
    content_key: 'fb-test',
    snapshots: [
      {observed_at:'2026-10-20T17:00:00Z', impressions:100, clicks:3, engagements:4, sessions:null, conversions:null},
      {observed_at:'2026-10-21T17:00:00Z', impressions:120, clicks:4, engagements:6, sessions:null, conversions:null}
    ]
  });
  const signal = buildOwnPerformanceSignal(analysis);
  assert.equal(signal.claim_type, 'OWN_PERFORMANCE_SIGNAL');
  assert.equal(signal.platform_trend_claim_authorized, false);
  assert.equal(signal.market_trend_claim_authorized, false);
  assert.equal(signal.experiment_candidate_only, true);
});

test('duplicate timestamps fail closed', () => {
  assert.throws(() => analyzeMetricSeries({
    company_id:'fenix-capital', channel_id:'facebook', content_key:'x', snapshots:[
      {observed_at:'2026-10-21T10:00:00Z', impressions:1, clicks:null, engagements:null, sessions:null, conversions:null},
      {observed_at:'2026-10-21T10:00:00Z', impressions:2, clicks:null, engagements:null, sessions:null, conversions:null}
    ]
  }), /duplicate observed_at/);
});
