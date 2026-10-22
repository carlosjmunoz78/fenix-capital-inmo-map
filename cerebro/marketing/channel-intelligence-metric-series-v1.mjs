import crypto from 'node:crypto';

const METRICS = Object.freeze(['impressions','clicks','engagements','sessions','conversions']);

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function nullableCount(value, label) {
  if (value === null || value === undefined) return null;
  const out = Number(value);
  if (!Number.isSafeInteger(out) || out < 0) throw new TypeError(`${label} must be null or non-negative integer`);
  return out;
}

function normalizeSnapshot(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(`snapshots[${index}] object required`);
  const observedAt = text(raw.observed_at, `snapshots[${index}].observed_at`, 80);
  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(observedMs)) throw new TypeError(`snapshots[${index}].observed_at invalid`);
  const values = {};
  for (const metric of METRICS) values[metric] = nullableCount(raw[metric], `snapshots[${index}].${metric}`);
  return Object.freeze({observed_at: new Date(observedMs).toISOString(), observed_ms: observedMs, ...values});
}

function sha(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function metricSeries(sorted, metric) {
  return sorted.filter(item => item[metric] !== null).map(item => ({t: item.observed_ms, v: item[metric]}));
}

function deriveMetric(series) {
  if (series.length === 0) return Object.freeze({known: false, samples: 0, latest: null, delta: null, velocity_per_hour: null, acceleration_per_hour2: null});
  const latest = series.at(-1);
  if (series.length === 1) return Object.freeze({known: true, samples: 1, latest: latest.v, delta: null, velocity_per_hour: null, acceleration_per_hour2: null});
  const previous = series.at(-2);
  const dtHours = (latest.t - previous.t) / 3_600_000;
  const delta = latest.v - previous.v;
  const velocity = dtHours > 0 ? delta / dtHours : null;
  let acceleration = null;
  if (series.length >= 3) {
    const prior = series.at(-3);
    const prevDtHours = (previous.t - prior.t) / 3_600_000;
    const prevVelocity = prevDtHours > 0 ? (previous.v - prior.v) / prevDtHours : null;
    const midpointHours = prevDtHours > 0 && dtHours > 0 ? (prevDtHours + dtHours) / 2 : null;
    if (velocity !== null && prevVelocity !== null && midpointHours > 0) acceleration = (velocity - prevVelocity) / midpointHours;
  }
  return Object.freeze({
    known: true,
    samples: series.length,
    latest: latest.v,
    delta,
    velocity_per_hour: velocity == null ? null : Number(velocity.toFixed(6)),
    acceleration_per_hour2: acceleration == null ? null : Number(acceleration.toFixed(6))
  });
}

export function analyzeMetricSeries({company_id, channel_id, content_key, snapshots} = {}) {
  const companyId = text(company_id, 'company_id', 160);
  const channelId = text(channel_id, 'channel_id', 80).toLowerCase();
  const contentKey = text(content_key, 'content_key', 200);
  if (!Array.isArray(snapshots) || snapshots.length === 0 || snapshots.length > 500) throw new TypeError('snapshots must be non-empty array <= 500');
  const normalized = snapshots.map(normalizeSnapshot).sort((a,b) => a.observed_ms - b.observed_ms);
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i].observed_ms === normalized[i - 1].observed_ms) throw new Error('duplicate observed_at not allowed');
  }
  const metrics = {};
  for (const metric of METRICS) metrics[metric] = deriveMetric(metricSeries(normalized, metric));
  const knownMetricCount = METRICS.filter(metric => metrics[metric].known).length;
  const velocityMetricCount = METRICS.filter(metric => metrics[metric].velocity_per_hour !== null).length;
  const accelerationMetricCount = METRICS.filter(metric => metrics[metric].acceleration_per_hour2 !== null).length;
  const qualityState = accelerationMetricCount > 0
    ? 'ACCELERATION_EVIDENCE_AVAILABLE'
    : velocityMetricCount > 0
      ? 'VELOCITY_EVIDENCE_AVAILABLE'
      : 'SNAPSHOT_ONLY';
  const result = {
    schema_version: '1.0.0',
    state_type: 'OWN_PERFORMANCE_METRIC_SERIES_V1',
    company_id: companyId,
    channel_id: channelId,
    content_key: contentKey,
    sample_count: normalized.length,
    first_observed_at: normalized[0].observed_at,
    last_observed_at: normalized.at(-1).observed_at,
    known_metric_count: knownMetricCount,
    velocity_metric_count: velocityMetricCount,
    acceleration_metric_count: accelerationMetricCount,
    quality_state: qualityState,
    metrics,
    claim_scope: 'OWN_PERFORMANCE_ONLY',
    market_trend_claim_authorized: false,
    competitor_claim_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  };
  result.series_sha256 = sha(result);
  return Object.freeze(result);
}

export function buildOwnPerformanceSignal(seriesAnalysis) {
  if (!seriesAnalysis || seriesAnalysis.state_type !== 'OWN_PERFORMANCE_METRIC_SERIES_V1') throw new TypeError('metric series analysis required');
  const strongest = METRICS
    .map(metric => ({metric, data: seriesAnalysis.metrics[metric]}))
    .filter(item => item.data.velocity_per_hour !== null)
    .sort((a,b) => Math.abs(b.data.velocity_per_hour) - Math.abs(a.data.velocity_per_hour))[0] ?? null;
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'OWN_PERFORMANCE_SIGNAL_V1',
    company_id: seriesAnalysis.company_id,
    channel_id: seriesAnalysis.channel_id,
    content_key: seriesAnalysis.content_key,
    observed_at: seriesAnalysis.last_observed_at,
    quality_state: seriesAnalysis.quality_state,
    strongest_velocity_metric: strongest?.metric ?? null,
    strongest_velocity_per_hour: strongest?.data.velocity_per_hour ?? null,
    evidence_ref: `metric-series:${seriesAnalysis.series_sha256.slice(0, 24)}`,
    claim_type: 'OWN_PERFORMANCE_SIGNAL',
    platform_trend_claim_authorized: false,
    market_trend_claim_authorized: false,
    cross_platform_transfer_requires_separate_evidence: true,
    experiment_candidate_only: true,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export const METRIC_SERIES_V1_CONTRACT = Object.freeze({
  preserves_unknown_as_null: true,
  minimum_snapshots_for_velocity: 2,
  minimum_snapshots_for_acceleration: 3,
  own_performance_is_not_market_trend: true,
  no_imputed_metrics: true,
  no_external_writes: true,
  environment: 'PREPROD',
  additional_cost_eur: 0
});
