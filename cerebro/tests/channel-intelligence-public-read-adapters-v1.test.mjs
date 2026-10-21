import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGoogleTrendsRss,
  createGoogleTrendsRssAdapter,
  createOfficialDocsFingerprintAdapter
} from '../marketing/channel-intelligence-public-read-adapters-v1.mjs';

const request = {
  company_id: 'fenix-capital',
  collector_id: 'collector:google-trends-rss:es',
  watch_type: 'TREND_RADAR',
  channel_id: 'instagram',
  write_authorized: false,
  publish_authorized: false,
  spend_authorized: false,
  prod_authorized: false,
  additional_cost_eur: 0
};

test('Google Trends RSS parser preserves public terms and traffic without inventing missing values', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[hipotecas 100]]></title><ht:approx_traffic>10K+</ht:approx_traffic><pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>euribor</title></item>
  </channel></rss>`;
  const items = parseGoogleTrendsRss(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'hipotecas 100');
  assert.equal(items[0].approx_traffic, 10000);
  assert.equal(items[1].approx_traffic, null);
  assert.equal(items[1].published_at, null);
});

test('Google Trends RSS adapter is read-only and zero-auth', async () => {
  const adapter = createGoogleTrendsRssAdapter({
    collector_id: request.collector_id,
    geo: 'ES',
    clock: () => Date.parse('2026-10-21T14:00:00Z'),
    fetch_text: async ({url, auth}) => {
      assert.match(url, /^https:\/\/trends\.google\.com\/trending\/rss\?geo=ES/);
      assert.equal(auth, 'NONE');
      return '<rss><channel><item><title>hipotecas</title><ht:approx_traffic>5K+</ht:approx_traffic></item></channel></rss>';
    },
    persist: async payload => {
      assert.equal(payload.source_family, 'SEARCH_PUBLIC_TRENDS');
      return 'payload:google-trends:test';
    }
  });
  const out = await adapter(request);
  assert.equal(out.signal_count, 1);
  assert.equal(out.read_only, true);
  assert.equal(out.external_side_effect_executed, false);
  assert.equal(out.prod_authorized, false);
  assert.equal(out.additional_cost_eur, 0);
});

test('official docs adapter fingerprints allowlisted public documentation', async () => {
  const adapter = createOfficialDocsFingerprintAdapter({
    collector_id: 'collector:linkedin:docs',
    docs_url: 'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/share-statistics',
    provider: 'LinkedIn',
    channel_id: 'linkedin',
    clock: () => Date.parse('2026-10-21T14:00:00Z'),
    fetch_text: async () => '<html>official docs v202610</html>'
  });
  const out = await adapter({...request, collector_id:'collector:linkedin:docs', watch_type:'PLATFORM_CAPABILITY_RADAR', channel_id:'linkedin'});
  assert.equal(out.signal_count, 1);
  assert.match(out.evidence_ref, /^evidence:official-docs:/);
});

test('official docs adapter blocks non-allowlisted hosts', () => {
  assert.throws(() => createOfficialDocsFingerprintAdapter({
    collector_id:'collector:x',
    docs_url:'https://example.com/docs',
    provider:'X',
    fetch_text:async()=>''
  }), /host not allowlisted/);
});
