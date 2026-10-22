const HOUR = 60 * 60 * 1000;

export const EVIDENCE_FRESHNESS_V1 = Object.freeze({
  TREND_RADAR: Object.freeze({fresh_ms: 4 * HOUR, expired_ms: 12 * HOUR}),
  CHANNEL_HEALTH: Object.freeze({fresh_ms: 8 * HOUR, expired_ms: 24 * HOUR}),
  COMPETITOR_RADAR: Object.freeze({fresh_ms: 18 * HOUR, expired_ms: 72 * HOUR}),
  MARKET_RADAR: Object.freeze({fresh_ms: 18 * HOUR, expired_ms: 72 * HOUR}),
  SEARCH_RADAR: Object.freeze({fresh_ms: 30 * HOUR, expired_ms: 72 * HOUR}),
  PLATFORM_CAPABILITY_RADAR: Object.freeze({fresh_ms: 48 * HOUR, expired_ms: 7 * 24 * HOUR}),
  WEB_VISUAL_RADAR: Object.freeze({fresh_ms: 30 * HOUR, expired_ms: 72 * HOUR})
});

export const SOURCE_FAMILIES_V1 = Object.freeze([
  'SOCIAL_OWN_PERFORMANCE',
  'SOCIAL_PUBLIC_TRENDS',
  'SEARCH_PUBLIC_TRENDS',
  'SEARCH_DEMAND',
  'WEB_ANALYTICS',
  'PUBLIC_COMPETITOR_OBSERVATION',
  'SEARCH_COMPETITOR',
  'PLATFORM_PUBLIC_DOCS',
  'WEB_VISUAL_CAPTURE'
]);

const SOURCE_FAMILY_SET = new Set(SOURCE_FAMILIES_V1);
const PLATFORM_TREND_FAMILIES = new Set(['SOCIAL_PUBLIC_TRENDS']);
const CROSS_PLATFORM_TREND_FAMILIES = new Set(['SEARCH_PUBLIC_TRENDS', 'SEARCH_DEMAND']);
const COMPETITOR_FAMILIES = new Set(['PUBLIC_COMPETITOR_OBSERVATION', 'SEARCH_COMPETITOR']);

const COMPANY_ALIASES = Object.freeze({
  'fenix-capital': Object.freeze(['fenix-capital', 'FENIX_CAPITAL'])
});

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function timestamp(value, label) {
  const raw = text(value, label, 80);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new TypeError(`${label} invalid timestamp`);
  return ms;
}

function normalizeWatchType(value) {
  const out = text(value, 'watch_type', 80).toUpperCase();
  if (!EVIDENCE_FRESHNESS_V1[out]) throw new Error(`unsupported watch_type: ${out}`);
  return out;
}

function normalizeSourceFamily(value) {
  const out = text(value, 'source_family', 100).toUpperCase();
  if (!SOURCE_FAMILY_SET.has(out)) throw new Error(`unsupported source_family: ${out}`);
  return out;
}

export function resolveCompanyReadAliases(company_id) {
  const canonical = text(company_id, 'company_id', 160);
  const aliases = COMPANY_ALIASES[canonical] ?? [canonical];
  return Object.freeze({
    canonical_company_id: canonical,
    accepted_read_aliases: Object.freeze([...aliases]),
    write_company_id: canonical,
    legacy_alias_write_allowed: false
  });
}

export function assessEvidenceFreshness({watch_type, observed_at, now_ms = Date.now()} = {}) {
  const watchType = normalizeWatchType(watch_type);
  const observedMs = timestamp(observed_at, 'observed_at');
  const now = Number(now_ms);
  if (!Number.isFinite(now) || now < observedMs) throw new TypeError('now_ms invalid or before observed_at');
  const ageMs = now - observedMs;
  const policy = EVIDENCE_FRESHNESS_V1[watchType];
  const state = ageMs <= policy.fresh_ms ? 'FRESH' : ageMs <= policy.expired_ms ? 'STALE' : 'EXPIRED';
  return Object.freeze({
    watch_type: watchType,
    observed_at: new Date(observedMs).toISOString(),
    age_ms: ageMs,
    freshness_state: state,
    usable_for_current_decision: state === 'FRESH',
    refresh_required: state !== 'FRESH',
    hard_block_current_claim: state === 'EXPIRED'
  });
}

export function governEvidenceClaim({
  claim_type,
  channel_id = null,
  sources,
  minimum_independent_sources = 2
} = {}) {
  const claimType = text(claim_type, 'claim_type', 100).toUpperCase();
  if (!Array.isArray(sources) || sources.length === 0) throw new TypeError('sources must be non-empty array');
  const normalized = sources.map((source, index) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError(`sources[${index}] object required`);
    return Object.freeze({
      source_id: text(source.source_id, `sources[${index}].source_id`, 200),
      source_family: normalizeSourceFamily(source.source_family),
      provider: text(source.provider, `sources[${index}].provider`, 120),
      fresh: source.fresh === true,
      independent_group: text(source.independent_group ?? source.provider, `sources[${index}].independent_group`, 120)
    });
  });
  const fresh = normalized.filter(source => source.fresh);
  const independentGroups = new Set(fresh.map(source => source.independent_group));
  const channel = channel_id == null ? null : text(channel_id, 'channel_id', 80).toLowerCase();

  if (claimType === 'OWN_PERFORMANCE_SIGNAL') {
    const valid = fresh.some(source => source.source_family === 'SOCIAL_OWN_PERFORMANCE');
    return Object.freeze({allowed: valid, claim_type: claimType, channel_id: channel, reason: valid ? 'OWN_NATIVE_OR_CONNECTED_PERFORMANCE_EVIDENCE' : 'NO_FRESH_OWN_PERFORMANCE_EVIDENCE'});
  }

  if (claimType === 'PLATFORM_TREND') {
    const valid = fresh.some(source => PLATFORM_TREND_FAMILIES.has(source.source_family));
    return Object.freeze({allowed: valid, claim_type: claimType, channel_id: channel, reason: valid ? 'PLATFORM_PUBLIC_TREND_EVIDENCE_PRESENT' : 'OWN_PERFORMANCE_OR_CROSS_PLATFORM_SIGNAL_IS_NOT_PLATFORM_TREND_PROOF'});
  }

  if (claimType === 'CROSS_PLATFORM_TREND') {
    const validFamilies = fresh.filter(source => CROSS_PLATFORM_TREND_FAMILIES.has(source.source_family));
    const groups = new Set(validFamilies.map(source => source.independent_group));
    const valid = groups.size >= minimum_independent_sources;
    return Object.freeze({allowed: valid, claim_type: claimType, channel_id: channel, independent_source_groups: groups.size, reason: valid ? 'MULTI_SOURCE_CROSS_PLATFORM_EVIDENCE' : 'INSUFFICIENT_INDEPENDENT_CROSS_PLATFORM_EVIDENCE'});
  }

  if (claimType === 'COMPETITOR_SIGNAL') {
    const valid = fresh.some(source => COMPETITOR_FAMILIES.has(source.source_family));
    return Object.freeze({allowed: valid, claim_type: claimType, channel_id: channel, reason: valid ? 'PUBLIC_COMPETITOR_EVIDENCE_PRESENT' : 'NO_FRESH_PUBLIC_COMPETITOR_EVIDENCE'});
  }

  if (claimType === 'MARKET_OPPORTUNITY') {
    const hasTrend = fresh.some(source => PLATFORM_TREND_FAMILIES.has(source.source_family) || CROSS_PLATFORM_TREND_FAMILIES.has(source.source_family));
    const hasDemandOrOwn = fresh.some(source => ['SEARCH_DEMAND','WEB_ANALYTICS','SOCIAL_OWN_PERFORMANCE'].includes(source.source_family));
    const valid = hasTrend && hasDemandOrOwn && independentGroups.size >= minimum_independent_sources;
    return Object.freeze({allowed: valid, claim_type: claimType, channel_id: channel, independent_source_groups: independentGroups.size, reason: valid ? 'TREND_PLUS_DEMAND_OR_OWN_EVIDENCE' : 'MARKET_OPPORTUNITY_REQUIRES_FRESH_MULTI_SOURCE_EVIDENCE'});
  }

  throw new Error(`unsupported claim_type: ${claimType}`);
}

export const CHANNEL_INTELLIGENCE_EVIDENCE_GOVERNANCE_V1 = Object.freeze({
  environment: 'PREPROD',
  canonical_company_id: 'fenix-capital',
  legacy_company_read_aliases: Object.freeze(['FENIX_CAPITAL']),
  legacy_alias_write_allowed: false,
  own_performance_is_not_market_trend: true,
  stale_evidence_cannot_drive_current_decision: true,
  competitor_private_metrics_must_not_be_invented: true,
  additional_cost_eur: 0
});
