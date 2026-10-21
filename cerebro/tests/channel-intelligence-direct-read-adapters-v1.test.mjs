import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECT_READ_REQUIREMENTS_V1,
  DIRECT_READ_ADAPTERS_V1_CONTRACT,
  createSearchConsoleDirectAdapter,
  createGa4DirectAdapter,
  createMetaPageInsightsDirectAdapter,
  createLinkedInOrgAnalyticsDirectAdapter
} from '../marketing/channel-intelligence-direct-read-adapters-v1.mjs';

const fixed = () => Date.parse('2026-10-21T17:00:00.000Z');
const request = (collector_id, extra = {}) => ({
  company_id: 'fenix-capital',
  collector_id,
  connector_id: 'direct',
  watch_type: 'SEARCH_RADAR',
  channel_id: null,
  scope: 'global',
  cycle_id: 'cycle:1',
  data_access: 'AUTHORIZED_PUBLIC_OR_CONNECTED_READ_ONLY',
  write_authorized: false,
  publish_authorized: false,
  spend_authorized: false,
  prod_authorized: false,
  additional_cost_eur: 0,
  ...extra
});

function recorder(response) {
  const calls = [];
  return {
    calls,
    transport: async (call) => { calls.push(call); return response; }
  };
}

function persister() {
  const payloads = [];
  return {
    payloads,
    persist: async (payload) => {
      payloads.push(payload);
      return `payload:test:${payloads.length}`;
    }
  };
}

test('requirements remain read-only zero-additional-cost oriented', () => {
  assert.deepEqual(DIRECT_READ_REQUIREMENTS_V1.google_search_console.oauth_scopes, ['https://www.googleapis.com/auth/webmasters.readonly']);
  assert.deepEqual(DIRECT_READ_REQUIREMENTS_V1.google_analytics_data.oauth_scopes, ['https://www.googleapis.com/auth/analytics.readonly']);
  assert.deepEqual(DIRECT_READ_REQUIREMENTS_V1.meta_page_insights.permissions, ['read_insights','pages_read_engagement']);
  assert.deepEqual(DIRECT_READ_REQUIREMENTS_V1.linkedin_organization_analytics.permissions, ['r_organization_admin']);
  assert.equal(DIRECT_READ_ADAPTERS_V1_CONTRACT.provider_writes_authorized, false);
  assert.equal(DIRECT_READ_ADAPTERS_V1_CONTRACT.prod_authorized, false);
  assert.equal(DIRECT_READ_ADAPTERS_V1_CONTRACT.additional_cost_eur, 0);
});

test('Search Console adapter builds readonly request and returns worker-safe collection', async () => {
  const io = recorder({rows: [{keys: ['hipoteca 100 cordoba'], clicks: 12, impressions: 100, ctr: 0.12, position: 4.2}]});
  const store = persister();
  const adapter = createSearchConsoleDirectAdapter({collector_id: 'collector:direct:gsc', site_url: 'https://fenixcapital.es/', transport: io.transport, persist: store.persist, clock: fixed});
  const out = await adapter(request('collector:direct:gsc'));
  assert.equal(io.calls.length, 1);
  assert.equal(io.calls[0].method, 'POST');
  assert.match(io.calls[0].url, /googleapis\.com\/webmasters\/v3\/sites\//);
  assert.equal(io.calls[0].auth, 'BOUND_EXTERNALLY_READ_ONLY');
  assert.equal(io.calls[0].body.endDate, '2026-10-18');
  assert.deepEqual(io.calls[0].body.dimensions, ['query']);
  assert.equal(out.signal_count, 1);
  assert.equal(out.payload_ref, 'payload:test:1');
  assert.equal(out.read_only, true);
  assert.equal(out.write_authorized, false);
  assert.equal(out.prod_authorized, false);
  assert.equal(out.additional_cost_eur, 0);
  assert.equal(store.payloads[0].provider, 'GOOGLE_SEARCH_CONSOLE');
});

test('GA4 adapter uses Analytics Data runReport and never carries credentials', async () => {
  const io = recorder({rowCount: 1, rows: [{dimensionValues: [{value: '/'}], metricValues: [{value: '10'}, {value: '8'}, {value: '2'}]}]});
  const adapter = createGa4DirectAdapter({collector_id: 'collector:direct:ga4', property_id: '484640617', transport: io.transport, clock: fixed});
  const out = await adapter(request('collector:direct:ga4', {watch_type: 'MARKET_RADAR'}));
  assert.equal(io.calls[0].method, 'POST');
  assert.match(io.calls[0].url, /analyticsdata\.googleapis\.com\/v1beta\/properties\/484640617:runReport/);
  assert.equal(io.calls[0].auth, 'BOUND_EXTERNALLY_READ_ONLY');
  assert.equal(JSON.stringify(io.calls[0]).includes('token'), false);
  assert.equal(out.signal_count, 1);
  assert.equal(out.payload_ref, null);
});

test('Meta adapter requests only page insights through externally bound page token', async () => {
  const io = recorder({data: [{name: 'page_post_engagements', period: 'day', values: [{value: 5}]}]});
  const adapter = createMetaPageInsightsDirectAdapter({collector_id: 'collector:direct:meta', page_id: '654319477768791', transport: io.transport, clock: fixed});
  const out = await adapter(request('collector:direct:meta', {watch_type: 'CHANNEL_HEALTH', channel_id: 'facebook'}));
  assert.equal(io.calls[0].method, 'GET');
  assert.match(io.calls[0].url, /graph\.facebook\.com\/v26\.0\/654319477768791\/insights/);
  assert.match(io.calls[0].url, /page_post_engagements/);
  assert.equal(io.calls[0].auth, 'BOUND_EXTERNALLY_PAGE_TOKEN_READ_ONLY');
  assert.equal(out.channel_id, 'facebook');
  assert.equal(out.signal_count, 1);
});

test('LinkedIn adapter is read-only and requires explicit version binding', async () => {
  const io = recorder({elements: [{organizationalEntity: 'urn:li:organization:123'}]});
  const adapter = createLinkedInOrgAnalyticsDirectAdapter({collector_id: 'collector:direct:linkedin', organization_urn: 'urn:li:organization:123', linkedin_version: '202610', transport: io.transport, clock: fixed});
  const out = await adapter(request('collector:direct:linkedin', {watch_type: 'CHANNEL_HEALTH', channel_id: 'linkedin'}));
  assert.equal(io.calls[0].method, 'GET');
  assert.equal(io.calls[0].headers['LinkedIn-Version'], '202610');
  assert.equal(io.calls[0].headers['X-Restli-Protocol-Version'], '2.0.0');
  assert.equal(io.calls[0].auth, 'BOUND_EXTERNALLY_READ_ONLY');
  assert.equal(out.signal_count, 1);
});

test('adapter rejects authority expansion before any provider call', async () => {
  const io = recorder({rows: []});
  const adapter = createSearchConsoleDirectAdapter({collector_id: 'collector:direct:gsc', site_url: 'https://fenixcapital.es/', transport: io.transport, clock: fixed});
  await assert.rejects(() => adapter(request('collector:direct:gsc', {prod_authorized: true})), /COLLECTOR_REQUEST_AUTHORITY/);
  assert.equal(io.calls.length, 0);
});

test('adapter rejects collector-id mismatch before any provider call', async () => {
  const io = recorder({rows: []});
  const adapter = createSearchConsoleDirectAdapter({collector_id: 'collector:direct:gsc', site_url: 'https://fenixcapital.es/', transport: io.transport, clock: fixed});
  await assert.rejects(() => adapter(request('collector:other')), /COLLECTOR_ID_MISMATCH/);
  assert.equal(io.calls.length, 0);
});
