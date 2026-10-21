import crypto from 'node:crypto';

const PREPROD = 'PREPROD';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const DIRECT_READ_REQUIREMENTS_V1 = Object.freeze({
  google_search_console: Object.freeze({
    endpoint: 'https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query',
    oauth_scopes: Object.freeze(['https://www.googleapis.com/auth/webmasters.readonly']),
    zero_additional_cost_target: true
  }),
  google_analytics_data: Object.freeze({
    endpoint: 'https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport',
    oauth_scopes: Object.freeze(['https://www.googleapis.com/auth/analytics.readonly']),
    zero_additional_cost_target: true
  }),
  meta_page_insights: Object.freeze({
    endpoint: 'https://graph.facebook.com/{apiVersion}/{pageId}/insights',
    permissions: Object.freeze(['read_insights','pages_read_engagement']),
    token_type: 'PAGE_ACCESS_TOKEN',
    zero_additional_cost_target: true
  }),
  linkedin_organization_analytics: Object.freeze({
    endpoint_family: 'https://api.linkedin.com/rest',
    permissions: Object.freeze(['r_organization_admin']),
    program: 'COMMUNITY_MANAGEMENT_API',
    zero_additional_cost_target: true
  })
});

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be opaque safe reference`);
  return out;
}

function plain(value, label = 'value', seen = new WeakSet()) {
  if (value === null || ['string','boolean','undefined'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular value`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, i) => plain(item, `${label}[${i}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (descriptor.enumerable) plain(descriptor.value, `${label}.${key}`, seen);
    }
  } finally { seen.delete(value); }
}

function hash(value, size = 24) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function dateWindow({clock, days = 28, lag_days = 3}) {
  const now = Number(clock());
  if (!Number.isFinite(now)) throw new TypeError('clock must return epoch milliseconds');
  const end = now - lag_days * 86_400_000;
  const start = end - (days - 1) * 86_400_000;
  return Object.freeze({start: isoDate(start), end: isoDate(end)});
}

function requireTransport(transport) {
  if (typeof transport !== 'function') throw new TypeError('transport function required');
  return transport;
}

function normalizeContext(request, expectedCollectorId) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('collector request object required');
  plain(request, 'collector_request');
  const companyId = text(request.company_id, 'company_id', 160);
  const collectorId = safeRef(request.collector_id, 'collector_id');
  if (collectorId !== expectedCollectorId) throw new Error('POLICY_CONFLICT:COLLECTOR_ID_MISMATCH');
  if (request.prod_authorized !== false || request.write_authorized !== false || request.publish_authorized !== false || request.spend_authorized !== false || Number(request.additional_cost_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:COLLECTOR_REQUEST_AUTHORITY');
  }
  return Object.freeze({companyId, collectorId, watchType: text(request.watch_type, 'watch_type', 80), channelId: request.channel_id ?? null});
}

async function persistPayload(persist, payload) {
  if (persist == null) return null;
  if (typeof persist !== 'function') throw new TypeError('persist must be function');
  const ref = await persist(payload);
  return safeRef(ref, 'payload_ref');
}

function resultBase({ctx, observedAt, signalCount, evidenceRef, payloadRef}) {
  return Object.freeze({
    company_id: ctx.companyId,
    collector_id: ctx.collectorId,
    watch_type: ctx.watchType,
    channel_id: ctx.channelId,
    observed_at: observedAt,
    signal_count: signalCount,
    evidence_ref: evidenceRef,
    payload_ref: payloadRef,
    read_only: true,
    external_side_effect_executed: false,
    write_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function createSearchConsoleDirectAdapter({collector_id, site_url, transport, persist = null, clock = Date.now, days = 28, lag_days = 3, row_limit = 1000} = {}) {
  const collectorId = safeRef(collector_id, 'collector_id');
  const siteUrl = text(site_url, 'site_url', 500);
  const call = requireTransport(transport);
  return async function searchConsoleAdapter(request) {
    const ctx = normalizeContext(request, collectorId);
    const window = dateWindow({clock, days, lag_days});
    const body = Object.freeze({startDate: window.start, endDate: window.end, dimensions: ['query'], rowLimit: row_limit, dataState: 'final'});
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const response = await call(Object.freeze({provider: 'GOOGLE_SEARCH_CONSOLE', method: 'POST', url, body, auth: 'BOUND_EXTERNALLY_READ_ONLY'}));
    plain(response, 'gsc_response');
    const rows = Array.isArray(response?.rows) ? response.rows : [];
    const payload = Object.freeze({provider: 'GOOGLE_SEARCH_CONSOLE', site_ref: `site:${hash(siteUrl)}`, window, row_count: rows.length, rows});
    const payloadRef = await persistPayload(persist, payload);
    const digest = hash(payload, 32);
    return resultBase({ctx, observedAt: new Date(Number(clock())).toISOString(), signalCount: rows.length, evidenceRef: `evidence:gsc:${digest}`, payloadRef});
  };
}

export function createGa4DirectAdapter({collector_id, property_id, transport, persist = null, clock = Date.now, days = 28, lag_days = 1, limit = 1000} = {}) {
  const collectorId = safeRef(collector_id, 'collector_id');
  const propertyId = text(String(property_id), 'property_id', 80);
  const call = requireTransport(transport);
  return async function ga4Adapter(request) {
    const ctx = normalizeContext(request, collectorId);
    const window = dateWindow({clock, days, lag_days});
    const body = Object.freeze({
      dateRanges: [{startDate: window.start, endDate: window.end}],
      dimensions: [{name: 'landingPage'}],
      metrics: [{name: 'sessions'}, {name: 'engagedSessions'}, {name: 'keyEvents'}],
      limit: String(limit),
      returnPropertyQuota: true
    });
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
    const response = await call(Object.freeze({provider: 'GOOGLE_ANALYTICS_DATA', method: 'POST', url, body, auth: 'BOUND_EXTERNALLY_READ_ONLY'}));
    plain(response, 'ga4_response');
    const rows = Array.isArray(response?.rows) ? response.rows : [];
    const payload = Object.freeze({provider: 'GOOGLE_ANALYTICS_DATA', property_ref: `property:${hash(propertyId)}`, window, row_count: rows.length, rows, rowCount: Number(response?.rowCount ?? rows.length)});
    const payloadRef = await persistPayload(persist, payload);
    const digest = hash(payload, 32);
    return resultBase({ctx, observedAt: new Date(Number(clock())).toISOString(), signalCount: rows.length, evidenceRef: `evidence:ga4:${digest}`, payloadRef});
  };
}

export function createMetaPageInsightsDirectAdapter({collector_id, page_id, transport, persist = null, clock = Date.now, api_version = 'v26.0', metrics = ['page_post_engagements','page_daily_follows']} = {}) {
  const collectorId = safeRef(collector_id, 'collector_id');
  const pageId = safeRef(String(page_id), 'page_id');
  const apiVersion = text(api_version, 'api_version', 40);
  const metricList = metrics.map((item, index) => text(item, `metrics[${index}]`, 100));
  const call = requireTransport(transport);
  return async function metaAdapter(request) {
    const ctx = normalizeContext(request, collectorId);
    const url = `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(pageId)}/insights?metric=${encodeURIComponent(metricList.join(','))}&period=day`;
    const response = await call(Object.freeze({provider: 'META_PAGE_INSIGHTS', method: 'GET', url, auth: 'BOUND_EXTERNALLY_PAGE_TOKEN_READ_ONLY'}));
    plain(response, 'meta_response');
    const rows = Array.isArray(response?.data) ? response.data : [];
    const payload = Object.freeze({provider: 'META_PAGE_INSIGHTS', page_ref: `page:${hash(pageId)}`, metric_count: rows.length, data: rows});
    const payloadRef = await persistPayload(persist, payload);
    const digest = hash(payload, 32);
    return resultBase({ctx, observedAt: new Date(Number(clock())).toISOString(), signalCount: rows.length, evidenceRef: `evidence:meta:${digest}`, payloadRef});
  };
}

export function createLinkedInOrgAnalyticsDirectAdapter({collector_id, organization_urn, transport, persist = null, clock = Date.now, linkedin_version} = {}) {
  const collectorId = safeRef(collector_id, 'collector_id');
  const organizationUrn = text(organization_urn, 'organization_urn', 200);
  const version = text(linkedin_version, 'linkedin_version', 20);
  const call = requireTransport(transport);
  return async function linkedinAdapter(request) {
    const ctx = normalizeContext(request, collectorId);
    const url = `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(organizationUrn)}`;
    const response = await call(Object.freeze({provider: 'LINKEDIN_COMMUNITY_MANAGEMENT', method: 'GET', url, headers: {'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0'}, auth: 'BOUND_EXTERNALLY_READ_ONLY'}));
    plain(response, 'linkedin_response');
    const rows = Array.isArray(response?.elements) ? response.elements : [];
    const payload = Object.freeze({provider: 'LINKEDIN_COMMUNITY_MANAGEMENT', organization_ref: `organization:${hash(organizationUrn)}`, element_count: rows.length, elements: rows});
    const payloadRef = await persistPayload(persist, payload);
    const digest = hash(payload, 32);
    return resultBase({ctx, observedAt: new Date(Number(clock())).toISOString(), signalCount: rows.length, evidenceRef: `evidence:linkedin:${digest}`, payloadRef});
  };
}

export const DIRECT_READ_ADAPTERS_V1_CONTRACT = Object.freeze({
  environment: PREPROD,
  read_only: true,
  secrets_in_adapter_output: false,
  transport_auth_binding: 'EXTERNAL_SECRET_STORE_OR_RUNTIME_CREDENTIAL_BINDING',
  provider_writes_authorized: false,
  prod_authorized: false,
  additional_cost_eur: 0
});
